import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/config/api_config.dart';
import 'core/theme/app_theme.dart';
import 'router/app_router.dart';

void main() {
  if (kDebugMode) {
    debugPrint('[ExecLink] API: ${ApiConfig.baseUrl}');
    debugPrint('[ExecLink] Environment: ${ApiConfig.environment}');
  }
  runApp(const ProviderScope(child: ExecLinkFieldApp()));
}

class ExecLinkFieldApp extends ConsumerWidget {
  const ExecLinkFieldApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);

    return MaterialApp.router(
      title: 'ExecLink Field',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      routerConfig: router,
    );
  }
}
