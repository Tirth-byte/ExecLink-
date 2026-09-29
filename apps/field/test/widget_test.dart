import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:execlink_field/main.dart';

void main() {
  testWidgets('ExecLink Field app smoke test and Time Agent flow', (
    WidgetTester tester,
  ) async {
    // Set a realistic mobile viewport size
    tester.view.physicalSize = const Size(800, 1200);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(const ProviderScope(child: ExecLinkFieldApp()));

    // Initial render
    await tester.pumpAndSettle();

    // Verify AppBar and Core sections
    expect(find.text('ExecLink Field'), findsOneWidget);
    expect(find.text('PRJ-DEMO-001'), findsOneWidget);

    // Switch to Capture tab
    await tester.tap(find.text('Capture'));
    await tester.pumpAndSettle();

    // Navigate to Time Agent
    expect(find.text('Open Time Agent'), findsOneWidget);
    await tester.tap(find.text('Open Time Agent'));
    await tester.pumpAndSettle();

    expect(find.text('Time Agent'), findsOneWidget);
    await tester.enterText(
      find.byKey(const Key('time-agent-transcript')),
      'Line 24 P-110 erection completed at 10:35. Hydrotest blocked due to permit.',
    );
    await tester.pump();
    final analyze = find.widgetWithText(FilledButton, 'Analyze update');
    await tester.ensureVisible(analyze);
    await tester.tap(analyze);
    await tester.pumpAndSettle();
    expect(find.text('ExecLink understood'), findsOneWidget);

    // Verify P-110 candidate preview is rendered
    expect(find.textContaining('P-110'), findsWidgets);

    final submitFinder = find.textContaining('Submit 2 updates');
    expect(submitFinder, findsOneWidget);
    await tester.ensureVisible(submitFinder);
    await tester.pumpAndSettle();

    // Tap submit event proposal
    await tester.tap(submitFinder);
    await tester.pumpAndSettle();

    expect(find.textContaining('Capture History'), findsWidgets);
  });
}
