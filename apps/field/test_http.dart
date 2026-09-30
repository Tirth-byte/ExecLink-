import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:execlink_field/core/config/api_config.dart';

void main() async {
  try {
    debugPrint('Testing /health...');
    final h = await http
        .get(Uri.parse('${ApiConfig.baseUrl}/health'))
        .timeout(const Duration(seconds: 3));
    debugPrint('Health response status: ${h.statusCode}');

    debugPrint('Testing /login...');
    final r = await http
        .post(
          Uri.parse('${ApiConfig.baseUrl}/auth/login'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'email': 'asha@execlink.demo',
            'password': 'Demo123!',
          }),
        )
        .timeout(ApiConfig.requestTimeout);
    final payload = jsonDecode(r.body) as Map<String, dynamic>;
    debugPrint(
      'Login response status: ${r.statusCode}; '
      'signed token present: ${payload['token'] is String}',
    );
  } catch (e) {
    debugPrint('Exception: ${e.runtimeType}');
  }
}
