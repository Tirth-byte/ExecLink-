import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:execlink_field/main.dart';
import 'package:execlink_field/widgets/field_bottom_navigation.dart';

void main() {
  group('Task 12 — Field App Shell & Navigation Tests', () {
    testWidgets(
      'Renders top bar, project context, and connectivity indicator',
      (WidgetTester tester) async {
        tester.view.physicalSize = const Size(800, 1400);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.resetPhysicalSize);

        await tester.pumpWidget(const ProviderScope(child: ExecLinkFieldApp()));
        await tester.pumpAndSettle();

        // Top bar title & project context
        expect(find.text('ExecLink Field'), findsOneWidget);
        expect(find.text('PRJ-DEMO-001'), findsOneWidget);
        expect(find.textContaining('North River Expansion'), findsOneWidget);
        expect(find.textContaining('Asha'), findsOneWidget);

        // Connectivity indicator
        expect(find.text('Synced'), findsOneWidget);

        // Today's Work page header & sections
        expect(find.text("Today's Work"), findsOneWidget);
        expect(find.textContaining('Sunday, 28 Sep'), findsOneWidget);
        expect(find.text("Today's Activities"), findsOneWidget);

        // Bottom navigation tabs
        expect(find.text('Today'), findsOneWidget);
        expect(find.text('Capture'), findsOneWidget);
        expect(find.text('History'), findsOneWidget);
      },
    );

    testWidgets('Bottom navigation tab switching preserves shell and state', (
      WidgetTester tester,
    ) async {
      tester.view.physicalSize = const Size(800, 1400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(const ProviderScope(child: ExecLinkFieldApp()));
      await tester.pumpAndSettle();

      // 1. Initial tab: Today
      expect(find.text("Today's Work"), findsOneWidget);

      // 2. Switch to Capture tab
      await tester.tap(find.text('Capture'));
      await tester.pumpAndSettle();

      expect(find.text('Field Capture'), findsOneWidget);
      expect(find.text('Time Agent'), findsOneWidget);
      expect(find.text('Quick Update'), findsOneWidget);
      // Top bar remains constant
      expect(find.text('ExecLink Field'), findsOneWidget);

      // 3. Switch to History tab
      await tester.tap(find.text('History'));
      await tester.pumpAndSettle();

      expect(find.textContaining('History'), findsWidgets);
      // Top bar remains constant
      expect(find.text('ExecLink Field'), findsOneWidget);

      // 4. Return to Today tab
      await tester.tap(find.text('Today'));
      await tester.pumpAndSettle();

      expect(find.text("Today's Work"), findsOneWidget);
    });

    testWidgets('Tapping profile avatar opens supervisor profile sheet', (
      WidgetTester tester,
    ) async {
      tester.view.physicalSize = const Size(800, 1400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(const ProviderScope(child: ExecLinkFieldApp()));
      await tester.pumpAndSettle();

      // Tap profile avatar
      await tester.tap(find.text('A'));
      await tester.pumpAndSettle();

      expect(find.text('Civil Field Supervisor'), findsOneWidget);
      expect(find.text('Area B · Civil & Structural'), findsOneWidget);
      expect(find.textContaining('T. Patel'), findsOneWidget);

      // Dismiss profile sheet
      await tester.tap(find.text('Close'));
      await tester.pumpAndSettle();

      expect(find.text('Civil Field Supervisor'), findsNothing);
    });

    testWidgets('Tapping connectivity indicator opens sync queue sheet', (
      WidgetTester tester,
    ) async {
      tester.view.physicalSize = const Size(800, 1400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(const ProviderScope(child: ExecLinkFieldApp()));
      await tester.pumpAndSettle();

      // Tap Synced indicator
      await tester.tap(find.text('Synced'));
      await tester.pumpAndSettle();

      expect(find.text('Field Sync Queue'), findsOneWidget);
      expect(find.text('Simulate Offline Mode'), findsOneWidget);

      // Dismiss sync sheet
      await tester.tap(find.text('Close'));
      await tester.pumpAndSettle();
      expect(find.text('Field Sync Queue'), findsNothing);
    });

    testWidgets(
      'Safe responsive layout on iPhone Pro viewport (393 x 852) with zero overflow',
      (WidgetTester tester) async {
        tester.view.physicalSize = const Size(393, 852);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.resetPhysicalSize);

        await tester.pumpWidget(const ProviderScope(child: ExecLinkFieldApp()));
        await tester.pumpAndSettle();

        // Verify top bar and restrained placeholder
        expect(find.text('ExecLink Field'), findsOneWidget);
        expect(find.text("Today's Work"), findsOneWidget);
        expect(find.text('Pier P12 reinforcement fixing'), findsOneWidget);

        // Switch to Capture
        await tester.tap(find.text('Capture'));
        await tester.pumpAndSettle();

        expect(find.text('Field Capture'), findsOneWidget);
        expect(
          find.text('Speak naturally or update a known schedule activity.'),
          findsOneWidget,
        );
        expect(find.text('Time Agent'), findsOneWidget);
        expect(find.text('Quick Update'), findsOneWidget);

        // Return to Today tab
        await tester.tap(find.text('Today'));
        await tester.pumpAndSettle();
      },
    );

    testWidgets(
      'Safe responsive layout on compact iPhone viewport (375 x 812) with zero overflow',
      (WidgetTester tester) async {
        tester.view.physicalSize = const Size(375, 812);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.resetPhysicalSize);

        await tester.pumpWidget(const ProviderScope(child: ExecLinkFieldApp()));
        await tester.pumpAndSettle();

        expect(find.text('ExecLink Field'), findsOneWidget);
        expect(find.text("Today's Work"), findsOneWidget);
        expect(find.text('Pier P12 reinforcement fixing'), findsOneWidget);

        // Bottom nav height is at least 54px touch target
        final bottomNavFinder = find.byType(FieldBottomNavigation);
        expect(bottomNavFinder, findsOneWidget);
        final navSize = tester.getSize(bottomNavFinder);
        expect(navSize.height, greaterThanOrEqualTo(54.0));
      },
    );
  });
}
