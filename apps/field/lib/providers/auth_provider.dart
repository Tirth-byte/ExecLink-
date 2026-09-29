import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/foundation.dart';

import '../services/auth_service.dart';
import '../core/config/api_config.dart';

class AuthState {
  final User? user;
  final String? token;
  final bool isLoading;
  final String? error;

  AuthState({this.user, this.token, this.isLoading = false, this.error});

  AuthState copyWith({
    User? user,
    String? token,
    bool? isLoading,
    String? error,
    bool clearError = false,
  }) {
    return AuthState(
      user: user ?? this.user,
      token: token ?? this.token,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() {
    _init();
    return AuthState(isLoading: true);
  }

  Future<void> _init() async {
    final token = await authService.getToken();
    if (token != null) {
      try {
        final user = await authService.fetchMe();
        state = state.copyWith(user: user, token: token, isLoading: false);
      } catch (e) {
        await authService.logout();
        state = state.copyWith(isLoading: false);
      }
    } else {
      state = state.copyWith(isLoading: false);
    }
  }

  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final token = await authService.login(email, password);
      final user = await authService.fetchMe();
      state = state.copyWith(user: user, token: token, isLoading: false);
    } on AuthFailure catch (failure) {
      if (kDebugMode) {
        debugPrint(
          '[ExecLink Auth] ${failure.code.label} '
          'url=${ApiConfig.baseUrl} cause=${failure.cause ?? failure.message}',
        );
      }
      final friendlyError = switch (failure.code) {
        AuthFailureCode.backendUnreachable => 'Unable to connect to ExecLink. Check the server connection and try again.',
        AuthFailureCode.invalidCredentials => 'Email or password is incorrect.',
        AuthFailureCode.unauthorized =>
          'Your session is no longer authorized. Please sign in again.',
        AuthFailureCode.serverError =>
          'ExecLink is temporarily unavailable. Please try again.',
        AuthFailureCode.responseInvalid =>
          'ExecLink returned an unexpected response. Please try again.',
      };
      state = state.copyWith(error: friendlyError, isLoading: false);
    } catch (error) {
      if (kDebugMode) {
        debugPrint(
          '[ExecLink Auth] ${AuthFailureCode.responseInvalid.label} '
          'url=${ApiConfig.baseUrl} cause=$error',
        );
      }
      state = state.copyWith(
        error: 'Something went wrong. Please try again.',
        isLoading: false,
      );
    }
  }

  Future<void> logout() async {
    await authService.logout();
    state = AuthState(isLoading: false);
  }
}

final authProvider = NotifierProvider<AuthNotifier, AuthState>(
  AuthNotifier.new,
);
