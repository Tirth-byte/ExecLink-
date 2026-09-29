import 'package:execlink_field/views/history/history_view.dart';
import 'package:execlink_field/views/quick_update/quick_update_view.dart';
import 'package:execlink_field/views/time_agent/time_agent_view.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  Future<void> pumpView(WidgetTester tester, Size size, Widget child) async {
    tester.view.physicalSize = size;
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          debugShowCheckedModeBanner: false,
          home: Scaffold(body: child),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  for (final size in const [Size(320, 568), Size(393, 852), Size(430, 932)]) {
    testWidgets('Time Agent remains usable at ${size.width.toInt()}px', (
      tester,
    ) async {
      await pumpView(tester, size, const TimeAgentView());
      await tester.enterText(
        find.byKey(const Key('time-agent-transcript')),
        'Line 24 P-110 erection completed at 10:35. Hydrotest blocked due to permit.',
      );
      await tester.pump();
      final analyze = find.widgetWithText(FilledButton, 'Analyze update');
      await tester.ensureVisible(analyze);
      final onAnalyze = tester.widget<FilledButton>(analyze).onPressed;
      expect(onAnalyze, isNotNull);
      onAnalyze!();
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });

    testWidgets('Quick Update remains usable at ${size.width.toInt()}px', (
      tester,
    ) async {
      await pumpView(tester, size, const QuickUpdateView());
      expect(find.text('Status'), findsOneWidget);
      expect(find.textContaining('Submit completed update'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.ensureVisible(find.text('Blocked'));
      await tester.tap(find.text('Blocked'));
      await tester.pumpAndSettle();
      expect(find.text('Blocker reason'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('History filters do not overflow at ${size.width.toInt()}px', (
      tester,
    ) async {
      await pumpView(tester, size, const HistoryView());
      expect(find.text('Capture History'), findsOneWidget);
      expect(find.text('Pending'), findsOneWidget);
      final exception = tester.takeException();
      expect(exception, isNull);
    });
  }
}
