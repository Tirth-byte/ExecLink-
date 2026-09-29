import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../widgets/field_app_shell.dart';
import '../views/today/today_view.dart';
import '../views/capture/capture_hub_view.dart';
import '../views/history/history_view.dart';
import '../views/time_agent/time_agent_view.dart';
import '../views/quick_update/quick_update_view.dart';
import '../views/activity_detail/activity_detail_view.dart';

final GlobalKey<NavigatorState> _rootNavigatorKey = GlobalKey<NavigatorState>(
  debugLabel: 'root',
);

GoRouter createAppRouter() => GoRouter(
  navigatorKey: _rootNavigatorKey,
  initialLocation: '/',
  routes: [
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
