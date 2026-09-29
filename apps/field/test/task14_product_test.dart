import 'package:execlink_field/models/common_types.dart';
import 'package:execlink_field/providers/field_providers.dart';
import 'package:execlink_field/services/api_client.dart';
import 'package:execlink_field/services/demo_fixtures.dart';
import 'package:execlink_field/services/time_agent_extractor.dart';
import 'package:execlink_field/views/quick_update/quick_update_view.dart';
import 'package:execlink_field/widgets/evidence_attachment_field.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const attachment = EvidenceAttachment(
    id: 'EVD-1',
    type: EvidenceType.document,
    localPath: '/tmp/permit.pdf',
    fileName: 'permit.pdf',
    sizeBytes: 2048,
    capturedAt: '2026-09-28T10:00:00Z',
    source: 'file_picker',
    latitude: 28.6139,
    longitude: 77.2090,
    accuracyMetres: 8,
  );

  test('evidence metadata survives event JSON serialization', () {
    const evidence = Evidence(
      text: 'Permit evidence',
      attachments: [attachment],
    );
    final restored = Evidence.fromJson(evidence.toJson());

    expect(restored.attachments, hasLength(1));
    expect(restored.attachments.single.type, EvidenceType.document);
    expect(restored.attachments.single.fileName, 'permit.pdf');
    expect(restored.attachments.single.latitude, 28.6139);
  });

  testWidgets('evidence preview renders and can remove an attachment', (
    tester,
  ) async {
    var attachments = <EvidenceAttachment>[attachment];
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: StatefulBuilder(
            builder: (context, setState) => EvidenceAttachmentField(
              attachments: attachments,
              onChanged: (value) => setState(() => attachments = value),
            ),
          ),
        ),
      ),
    );

    expect(find.text('Evidence (1)'), findsOneWidget);
    expect(find.text('DOCUMENT'), findsOneWidget);
    await tester.tap(find.byTooltip('Remove permit.pdf'));
    await tester.pump();
    expect(find.text('No evidence attached'), findsOneWidget);
  });

  test('unrelated text remains intentionally unmatched', () {
    final result = TimeAgentExtractor.extract(
      'General housekeeping completed near the temporary store.',
    );
    expect(result.suggestedActivityId, isNull);
    expect(result.matchBand, 'unmatched');
  });

  testWidgets('Quick Update preselects activity and adapts status fields', (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          activitiesProvider.overrideWith((ref) {
            final notifier = ActivitiesNotifier(
              ApiClient(useLocalFallback: true),
            );
            notifier.activities = DemoFixtures.initialActivities;
            notifier.isLoading = false;
            return notifier;
          }),
        ],
        child: const MaterialApp(
          home: QuickUpdateView(initialActivityId: 'ACT-1.2.1'),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.textContaining('Pier P12 reinforcement'), findsWidgets);

    await tester.ensureVisible(find.text('In Progress'));
    await tester.tap(find.text('In Progress'));
    await tester.pump();
    expect(find.text('Progress'), findsOneWidget);
    expect(find.byType(Slider), findsOneWidget);

    await tester.ensureVisible(find.text('Blocked'));
    await tester.tap(find.text('Blocked'));
    await tester.pump();
    expect(find.text('Blocker category'), findsOneWidget);
    expect(find.text('Blocker reason'), findsOneWidget);
  });
}
