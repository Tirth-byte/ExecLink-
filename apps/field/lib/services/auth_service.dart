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
  AuthService({http.Client? client, String baseUrl = ApiConfig.baseUrl})
    : _client = client ?? http.Client(),
      _baseUrl = baseUrl;

  final http.Client _client;
  final String _baseUrl;

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

  Future<String> login(String email, String password) async {
    try {
      final response = await _client
          .post(
            Uri.parse('$_baseUrl/auth/login'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'email': email, 'password': password}),
          )
          .timeout(const Duration(seconds: 10));

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
          'ExecLink server returned ${response.statusCode}.',
        );
      }
      throw AuthFailure(
        AuthFailureCode.responseInvalid,
        'Unexpected login response (${response.statusCode}).',
      );
    } on AuthFailure {
      rethrow;
    } on SocketException catch (error) {
      throw AuthFailure(
        AuthFailureCode.backendUnreachable,
        'Unable to reach the ExecLink API.',
        cause: error,
      );
    } on http.ClientException catch (error) {
      throw AuthFailure(
        AuthFailureCode.backendUnreachable,
        'Unable to reach the ExecLink API.',
        cause: error,
      );
    } on TimeoutException catch (error) {
      throw AuthFailure(
        AuthFailureCode.backendUnreachable,
        'The ExecLink API connection timed out.',
        cause: error,
      );
    } on FormatException catch (error) {
      throw AuthFailure(
        AuthFailureCode.responseInvalid,
        'Login response was not valid JSON.',
        cause: error,
      );
    }
  }

  Future<User> fetchMe() async {
    final token = await getToken();
    if (token == null) throw Exception('No token found');

    try {
      final response = await _client
          .get(
            Uri.parse('$_baseUrl/auth/me'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
            },
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        return User.fromJson(_decodeObject(response.body));
      }
      if (response.statusCode == 401 || response.statusCode == 403) {
        throw const AuthFailure(
          AuthFailureCode.unauthorized,
          'Your ExecLink session is not authorized.',
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
    } on SocketException catch (error) {
      throw AuthFailure(
        AuthFailureCode.backendUnreachable,
        'Unable to reach the ExecLink API.',
        cause: error,
      );
    } on http.ClientException catch (error) {
      throw AuthFailure(
        AuthFailureCode.backendUnreachable,
        'Unable to reach the ExecLink API.',
        cause: error,
      );
    } on TimeoutException catch (error) {
      throw AuthFailure(
        AuthFailureCode.backendUnreachable,
        'The ExecLink API connection timed out.',
        cause: error,
      );
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
