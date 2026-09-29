class ApiConfig {
  static const String baseUrl = String.fromEnvironment(
    'EXECLINK_API_BASE_URL',
    defaultValue: 'http://127.0.0.1:8000/api/v1',
  );
  static const String environment = String.fromEnvironment(
    'EXECLINK_ENVIRONMENT',
    defaultValue: 'development',
  );
}
