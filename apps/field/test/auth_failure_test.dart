import 'dart:convert';

import 'package:execlink_field/services/auth_service.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  test('auth failure codes remain explicit and stable for diagnostics', () {
    expect(AuthFailureCode.backendUnreachable.label, 'BACKEND_UNREACHABLE');
    expect(
      AuthFailureCode.invalidCredentials.label,
      'AUTH_INVALID_CREDENTIALS',
    );
    expect(AuthFailureCode.unauthorized.label, 'AUTH_UNAUTHORIZED');
    expect(AuthFailureCode.serverError.label, 'SERVER_ERROR');
    expect(AuthFailureCode.responseInvalid.label, 'RESPONSE_INVALID');
  });

  test('connection failures are classified as backend unreachable', () async {
    final service = AuthService(
      client: MockClient((_) async => throw http.ClientException('refused')),
      baseUrl: 'http://127.0.0.1:1/api/v1',
    );

    await expectLater(
      service.login('asha@execlink.demo', 'Demo123!'),
      throwsA(
        isA<AuthFailure>().having(
          (failure) => failure.code,
          'code',
          AuthFailureCode.backendUnreachable,
        ),
      ),
    );
  });

  test('login status and payload failures retain distinct codes', () async {
    Future<AuthFailureCode> classify(http.Response response) async {
      final service = AuthService(
        client: MockClient((_) async => response),
        baseUrl: 'http://test.invalid/api/v1',
      );
      try {
        await service.login('asha@execlink.demo', 'Demo123!');
      } on AuthFailure catch (failure) {
        return failure.code;
      }
      fail('Expected an AuthFailure');
    }

    expect(
      await classify(
        http.Response(
          jsonEncode({
            'error': {'message': 'Invalid email or password'},
          }),
          401,
        ),
      ),
      AuthFailureCode.invalidCredentials,
    );
    expect(
      await classify(http.Response('temporarily unavailable', 503)),
      AuthFailureCode.serverError,
    );
    expect(
      await classify(http.Response(jsonEncode({'unexpected': true}), 200)),
      AuthFailureCode.responseInvalid,
    );
  });
}
