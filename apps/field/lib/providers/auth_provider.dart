import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/foundation.dart';

import '../services/auth_service.dart';
import '../core/config/api_config.dart';

final authServiceProvider = Provider<AuthService>((ref) => AuthService());

class AuthState {
  final User? user;
  final String? token;
  final bool isLoading;
  final bool isInitializing;
  final String? loadingStatus;
  final String? error;

  AuthState({
    this.user,
    this.token,
    this.isLoading = false,
    this.isInitializing = false,
    this.loadingStatus,
    this.error,
  });

  AuthState copyWith({
    User? user,
    String? token,
    bool? isLoading,
    bool? isInitializing,
    String? loadingStatus,
    bool clearLoadingStatus = false,
    String? error,
    bool clearError = false,
  }) {
    return AuthState(
      user: user ?? this.user,
      token: token ?? this.token,
      isLoading: isLoading ?? this.isLoading,
      isInitializing: isInitializing ?? this.isInitializing,
      loadingStatus:
          clearLoadingStatus ? null : (loadingStatus ?? this.loadingStatus),
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class AuthNotifier extends Notifier<AuthState> {
  AuthService get _authService => ref.read(authServiceProvider);

  @override
  AuthState build() {
    _init();
    return AuthState(isInitializing: true);
  }

  Future<void> _init() async {
    try {
      final token = await _authService.getToken();
      if (token != null && token.isNotEmpty) {
        try {
          final user = await _authService.fetchMe();
          state = state.copyWith(
            user: user,
            token: token,
            isInitializing: false,
            isLoading: false,
          );
          return;
        } on AuthFailure catch (failure) {
          if (failure.code == AuthFailureCode.unauthorized ||
              failure.code == AuthFailureCode.invalidCredentials) {
            // Explicitly invalid / expired token -> clear and prompt sign in
            await _authService.logout();
          } else {
            // Transient network failure during cold start: clear session gracefully
            await _authService.logout();
          }
        } catch (_) {
          await _authService.logout();
        }
      }
    } catch (_) {
      // Storage read error
    }
    state = state.copyWith(isInitializing: false, isLoading: false);
  }

  Future<void> login(String email, String password) async {
    // Prevent duplicate simultaneous login taps
    if (state.isLoading) return;

    final trimmedEmail = email.trim();
    if (trimmedEmail.isEmpty || password.isEmpty) {
      state = state.copyWith(
        error: 'Please enter both email and password.',
        isLoading: false,
        clearLoadingStatus: true,
      );
      return;
    }

    state = state.copyWith(
      isLoading: true,
      loadingStatus: 'Connecting securely...',
      clearError: true,
    );

    try {
      final token = await _authService.login(
        trimmedEmail,
        password,
        onStatusUpdate: (status) {
          state = state.copyWith(loadingStatus: status);
        },
      );

      state = state.copyWith(
        token: token,
        loadingStatus: 'Loading profile...',
      );

      final user = await _authService.fetchMe(
        onStatusUpdate: (status) {
          state = state.copyWith(loadingStatus: status);
        },
      );

      state = state.copyWith(
        user: user,
        token: token,
        isLoading: false,
        clearLoadingStatus: true,
        clearError: true,
      );
    } on AuthFailure catch (failure) {
      if (kDebugMode) {
        debugPrint(
          '[ExecLink Auth] ${failure.code.label} '
          'url=${ApiConfig.baseUrl} cause=${failure.cause ?? failure.message}',
        );
      }
      final friendlyError = switch (failure.code) {
        AuthFailureCode.backendUnreachable =>
          'Unable to connect to ExecLink. Check your network connection and try again.',
        AuthFailureCode.invalidCredentials =>
          'Email or password is incorrect.',
        AuthFailureCode.unauthorized =>
          'Your session is no longer authorized. Please sign in again.',
        AuthFailureCode.serverError =>
          'ExecLink is temporarily starting up or unavailable. Please try again.',
        AuthFailureCode.responseInvalid =>
          'ExecLink returned an unexpected response. Please try again.',
      };
      state = state.copyWith(
        error: friendlyError,
        isLoading: false,
        clearLoadingStatus: true,
      );
    } catch (error) {
      if (kDebugMode) {
        debugPrint(
          '[ExecLink Auth] ${AuthFailureCode.responseInvalid.label} '
          'url=${ApiConfig.baseUrl} cause=$error',
        );
      }
      state = state.copyWith(
        error: 'An unexpected error occurred. Please try again.',
        isLoading: false,
        clearLoadingStatus: true,
      );
    }
  }

  Future<void> logout() async {
    await _authService.logout();
    state = AuthState(isLoading: false, isInitializing: false);
  }
}

final authProvider = NotifierProvider<AuthNotifier, AuthState>(
  AuthNotifier.new,
);
