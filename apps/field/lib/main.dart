import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/theme/app_theme.dart';
import 'router/app_router.dart';

void main() {
  runApp(const ProviderScope(child: ExecLinkFieldApp()));
}

class ExecLinkFieldApp extends StatefulWidget {
  const ExecLinkFieldApp({super.key});

  static const bool _performanceOverlayEnabled = bool.fromEnvironment(
    'EXECLINK_PERFORMANCE_OVERLAY',
    defaultValue: false,
  );

  @override
  State<ExecLinkFieldApp> createState() => _ExecLinkFieldAppState();
}

class _ExecLinkFieldAppState extends State<ExecLinkFieldApp> {
  late final appRouter = createAppRouter();

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'ExecLink Field',
      debugShowCheckedModeBanner: false,
      showPerformanceOverlay: ExecLinkFieldApp._performanceOverlayEnabled,
      theme: AppTheme.lightTheme,
      routerConfig: appRouter,
    );
  }
}
