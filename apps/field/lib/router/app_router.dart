import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/auth_provider.dart';
import '../widgets/field_app_shell.dart';
import '../views/today/today_view.dart';
import '../views/capture/capture_hub_view.dart';
import '../views/history/history_view.dart';
import '../views/time_agent/time_agent_view.dart';
import '../views/quick_update/quick_update_view.dart';
import '../views/activity_detail/activity_detail_view.dart';
import '../views/login/login_view.dart';

final GlobalKey<NavigatorState> _rootNavigatorKey = GlobalKey<NavigatorState>(
  debugLabel: 'root',
);

final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/',
    redirect: (context, state) {
      final isGoingToLogin = state.uri.path == '/login';

      if (authState.token == null && !isGoingToLogin) {
        print('[ExecLink Router] destination: /login');
        return '/login';
      }
      if (authState.token != null && isGoingToLogin) {
        print('[ExecLink Router] destination: /');
        return '/';
      }
      print('[ExecLink Router] destination: (no redirect)');
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (BuildContext context, GoRouterState state) =>
            const LoginView(),
      ),

      // -------------------------------------------------------------------------
      // PRIMARY APPLICATION SHELL (Today, Capture, History)
      // -------------------------------------------------------------------------
      StatefulShellRoute.indexedStack(
        builder:
            (
              BuildContext context,
              GoRouterState state,
              StatefulNavigationShell navigationShell,
            ) {
              return FieldAppShell(
                currentIndex: navigationShell.currentIndex,
                projectName: authState.user?.projectName ?? 'ExecLink Project',
                projectId: authState.user?.projectId ?? 'Project',
                operatorName: authState.user?.name ?? 'Supervisor',
                operatorRole: authState.user?.role ?? 'Field Supervisor',
                reportingScope:
                    authState.user?.reportingScope ?? 'Reporting scope',
                onLogout: () => ref.read(authProvider.notifier).logout(),
                onTabSelected: (int index) {
                  navigationShell.goBranch(
                    index,
                    initialLocation: index == navigationShell.currentIndex,
                  );
                },
                child: navigationShell,
              );
            },
        branches: [
          // BRANCH 0: TODAY
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/',
                builder: (BuildContext context, GoRouterState state) =>
                    const TodayView(),
              ),
            ],
          ),

          // BRANCH 1: CAPTURE
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/capture',
                builder: (BuildContext context, GoRouterState state) =>
                    const CaptureHubView(),
              ),
            ],
          ),

          // BRANCH 2: HISTORY
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/history',
                builder: (BuildContext context, GoRouterState state) =>
                    const HistoryView(),
              ),
            ],
          ),
        ],
      ),

      // -------------------------------------------------------------------------
      // SUB-ROUTES (Pushed above bottom navigation bar)
      // -------------------------------------------------------------------------
      GoRoute(
        path: '/time-agent',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (BuildContext context, GoRouterState state) =>
            const TimeAgentView(),
      ),
      GoRoute(
        path: '/quick-update',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (BuildContext context, GoRouterState state) {
          final activityId = state.uri.queryParameters['activityId'];
          return QuickUpdateView(initialActivityId: activityId);
        },
      ),
      GoRoute(
        path: '/activity/:id',
        parentNavigatorKey: _rootNavigatorKey,
        builder: (BuildContext context, GoRouterState state) {
          final id = state.pathParameters['id'] ?? '';
          return ActivityDetailView(activityId: id);
        },
      ),
    ],
  );
});
