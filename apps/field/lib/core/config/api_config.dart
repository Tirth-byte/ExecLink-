class ApiConfig {
  static const String baseUrl = String.fromEnvironment(
    'EXECLINK_API_BASE_URL',
    defaultValue: 'https://execlink-api.onrender.com/api/v1',
  );
  static const String environment = String.fromEnvironment(
    'EXECLINK_ENVIRONMENT',
    defaultValue: 'production',
  );
  static const Duration requestTimeout = Duration(seconds: 15);
}
