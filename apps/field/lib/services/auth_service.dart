import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../core/config/api_config.dart';

enum AuthFailureCode {
  backendUnreachable('BACKEND_UNREACHABLE'),
  invalidCredentials('AUTH_INVALID_CREDENTIALS'),
  unauthorized('AUTH_UNAUTHORIZED'),
  serverError('SERVER_ERROR'),
  responseInvalid('RESPONSE_INVALID');

  const AuthFailureCode(this.label);
  final String label;
}

class AuthFailure implements Exception {
  const AuthFailure(this.code, this.message, {this.cause});

  final AuthFailureCode code;
  final String message;
  final Object? cause;

  @override
  String toString() => message;
}

class User {
  final String id;
  final String name;
  final String email;
  final String role;
  final String projectId;
  final String projectName;
  final String reportingScope;

  User({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.projectId,
    required this.projectName,
    required this.reportingScope,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    String assignedRole = "Guest";
    String projectId = "";
    String projectName = "Unknown Project";
    String reportingScope = "Unknown Area";

    if (json['memberships'] != null &&
        (json['memberships'] as List).isNotEmpty) {
      final m = json['memberships'][0];
      assignedRole = m['role'] ?? "Guest";

      // Formatting the role to Title Case (e.g. FIELD_SUPERVISOR -> Field Supervisor)
      assignedRole = assignedRole
          .split('_')
          .map(
            (w) => w.isNotEmpty
                ? '${w[0].toUpperCase()}${w.substring(1).toLowerCase()}'
                : '',
          )
          .join(' ');

      projectId = m['project_id'] ?? projectId;
      projectName = m['project_name'] ?? projectName;
      reportingScope = m['reporting_scope'] ?? reportingScope;
    }
    return User(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      role: assignedRole,
      projectId: projectId,
      projectName: projectName,
      reportingScope: reportingScope,
    );
  }
}

class AuthService {
  AuthService({http.Client? client, this.baseUrl = ApiConfig.baseUrl})
    : _client = client ?? http.Client();

  final http.Client _client;
  final String baseUrl;

  Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('execlink_token', token);
  }

  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('execlink_token');
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('execlink_token');
  }

  /// Performs an HTTP request with bounded retries for transient failures
  /// (e.g. SocketException, TimeoutException, 502/503/504 Bad Gateway / Service Unavailable).
  /// Strictly does NOT retry 400, 401, 403 or client-side validation errors.
  /// Bounded to MAX 2 attempts to tolerate Render cold start / transient timeout.
  Future<http.Response> _executeWithRetry({
    required Future<http.Response> Function() requestFn,
    int maxAttempts = 2,
    void Function(String status)? onStatusUpdate,
  }) async {
    int attempt = 0;
    while (true) {
      attempt++;
      try {
        if (attempt > 1) {
          onStatusUpdate?.call('Connecting to ExecLink (retrying)...');
        }
        final response = await requestFn();
        // Check for transient server startup status codes (502, 503, 504)
        if ((response.statusCode == 502 ||
                response.statusCode == 503 ||
                response.statusCode == 504) &&
            attempt < maxAttempts) {
          onStatusUpdate?.call('Connecting to ExecLink...');
          final backoffMs = 500 * attempt;
          await Future.delayed(Duration(milliseconds: backoffMs));
          continue;
        }
        return response;
      } on SocketException catch (error) {
        if (attempt >= maxAttempts) {
          throw AuthFailure(
            AuthFailureCode.backendUnreachable,
            'Unable to reach ExecLink. Check your network connection.',
            cause: error,
          );
        }
        onStatusUpdate?.call('Connecting to ExecLink...');
        await Future.delayed(Duration(milliseconds: 500 * attempt));
      } on http.ClientException catch (error) {
        if (attempt >= maxAttempts) {
          throw AuthFailure(
            AuthFailureCode.backendUnreachable,
            'Unable to reach ExecLink. Check your network connection.',
            cause: error,
          );
        }
        onStatusUpdate?.call('Connecting to ExecLink...');
        await Future.delayed(Duration(milliseconds: 500 * attempt));
      } on TimeoutException catch (error) {
        if (attempt >= maxAttempts) {
          throw AuthFailure(
            AuthFailureCode.backendUnreachable,
            'The request timed out. The server may be waking up, please try again.',
            cause: error,
          );
        }
        onStatusUpdate?.call('Connecting to ExecLink...');
        await Future.delayed(Duration(milliseconds: 500 * attempt));
      }
    }
  }

  Future<String> login(
    String email,
    String password, {
    void Function(String status)? onStatusUpdate,
  }) async {
    try {
      final response = await _executeWithRetry(
        onStatusUpdate: onStatusUpdate,
        requestFn: () => _client
            .post(
              Uri.parse('$baseUrl/auth/login'),
              headers: {'Content-Type': 'application/json'},
              body: jsonEncode({'email': email.trim(), 'password': password}),
            )
            .timeout(ApiConfig.requestTimeout),
      );

      if (response.statusCode == 200) {
        final data = _decodeObject(response.body);
        final token = data['token'];
        if (token is! String || token.isEmpty) {
          throw const AuthFailure(
            AuthFailureCode.responseInvalid,
            'Login response did not contain a valid token.',
          );
        }
        await saveToken(token);
        return token;
      }
      if (response.statusCode == 400 || response.statusCode == 401) {
        throw const AuthFailure(
          AuthFailureCode.invalidCredentials,
          'Email or password is incorrect.',
        );
      }
      if (response.statusCode >= 500) {
        throw AuthFailure(
          AuthFailureCode.serverError,
          'ExecLink server is temporarily unavailable or starting up. Please try again.',
        );
      }
      throw AuthFailure(
        AuthFailureCode.responseInvalid,
        'Unexpected login response (${response.statusCode}).',
      );
    } on AuthFailure {
      rethrow;
    } on FormatException catch (error) {
      throw AuthFailure(
        AuthFailureCode.responseInvalid,
        'Login response was not valid JSON.',
        cause: error,
      );
    }
  }

  Future<User> fetchMe({
    void Function(String status)? onStatusUpdate,
  }) async {
    final token = await getToken();
    if (token == null) {
      throw const AuthFailure(
        AuthFailureCode.unauthorized,
        'No active session token found.',
      );
    }

    try {
      final response = await _executeWithRetry(
        onStatusUpdate: onStatusUpdate,
        requestFn: () => _client
            .get(
              Uri.parse('$baseUrl/auth/me'),
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer $token',
              },
            )
            .timeout(ApiConfig.requestTimeout),
      );

      if (response.statusCode == 200) {
        return User.fromJson(_decodeObject(response.body));
      }
      if (response.statusCode == 401 || response.statusCode == 403) {
        throw const AuthFailure(
          AuthFailureCode.unauthorized,
          'Your session is no longer authorized. Please sign in again.',
        );
      }
      if (response.statusCode >= 500) {
        throw AuthFailure(
          AuthFailureCode.serverError,
          'ExecLink server returned ${response.statusCode}.',
        );
      }
      throw AuthFailure(
        AuthFailureCode.responseInvalid,
        'Unexpected profile response (${response.statusCode}).',
      );
    } on AuthFailure {
      rethrow;
    } on FormatException catch (error) {
      throw AuthFailure(
        AuthFailureCode.responseInvalid,
        'Profile response was not valid JSON.',
        cause: error,
      );
    }
  }

  Map<String, dynamic> _decodeObject(String body) {
    final decoded = jsonDecode(body);
    if (decoded is! Map<String, dynamic>) {
      throw const FormatException('Expected a JSON object');
    }
    return decoded;
  }
}

final authService = AuthService();
