import 'package:execlink_field/main.dart';
import 'package:execlink_field/views/today/widgets/today_activity_card.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  Future<void> pumpAt(WidgetTester tester, Size size) async {
    tester.view.physicalSize = size;
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    await tester.pumpWidget(const ProviderScope(child: ExecLinkFieldApp()));
    await tester.pumpAndSettle();
  }

  testWidgets('Today renders operational activity cards and filters', (
    tester,
  ) async {
    await pumpAt(tester, const Size(393, 852));
    expect(find.text("Today's Work"), findsOneWidget);
    expect(find.text("Today's Activities"), findsOneWidget);
    expect(find.byType(TodayActivityCard), findsWidgets);
    expect(find.text('Pier P12 reinforcement fixing'), findsOneWidget);

    await tester.tap(find.text('Completed').first);
    await tester.pumpAndSettle();
    expect(find.text('Line 24 P-110 equipment erection'), findsOneWidget);
    expect(find.text('Pier P12 reinforcement fixing'), findsNothing);
  });

  for (final size in const [Size(320, 568), Size(393, 852), Size(430, 932)]) {
    testWidgets('Today has no overflow at ${size.width.toInt()}px width', (
      tester,
    ) async {
      await pumpAt(tester, size);
      expect(find.text("Today's Work"), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.fling(
        find.byType(CustomScrollView),
        const Offset(0, -900),
        1200,
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });
  }
}
