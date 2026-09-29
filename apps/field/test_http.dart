import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:execlink_field/core/config/api_config.dart';

void main() async {
  try {
    print('Testing /health...');
    final h = await http
        .get(Uri.parse('${ApiConfig.baseUrl}/health'))
        .timeout(const Duration(seconds: 3));
    print('Health response: ${h.statusCode} ${h.body}');

    print('Testing /login...');
    final r = await http.post(
      Uri.parse('${ApiConfig.baseUrl}/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': 'asha@execlink.demo', 'password': 'Demo123!'}),
    ).timeout(Duration(seconds: 3));
    print('Login response: ${r.statusCode} ${r.body}');
  } catch (e) {
    print('Exception: ${e.runtimeType} $e');
  }
}
