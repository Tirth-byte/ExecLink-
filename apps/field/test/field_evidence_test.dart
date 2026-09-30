import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:execlink_field/models/common_types.dart';
import 'package:execlink_field/models/execution_event.dart';
import 'package:execlink_field/models/extracted_facts.dart';
import 'package:execlink_field/services/api_client.dart';
import 'package:execlink_field/services/offline_sync_service.dart';
import 'package:execlink_field/widgets/field_evidence_section.dart';

void main() {
  group('Field Evidence Pipeline Models & Serialization', () {
    test('EvidenceAttachment serializes and deserializes integrity properties correctly', () {
      const attachment = EvidenceAttachment(
        id: 'EVD-TEST-001',
        type: EvidenceType.photo,
        localPath: '/tmp/test.jpg',
        fileName: 'test.jpg',
        sizeBytes: 1024,
        capturedAt: '2026-09-26T10:35:00Z',
        uploadedAt: '2026-09-26T10:36:00Z',
        source: 'camera',
        sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        syncStatus: 'synced',
        assignedFactIndexes: [0, 1],
      );

      final json = attachment.toJson();
      expect(json['id'], 'EVD-TEST-001');
      expect(json['type'], 'photo');
      expect(json['sha256'], 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
      expect(json['assignedFactIndexes'], [0, 1]);

      final reconstructed = EvidenceAttachment.fromJson(json);
      expect(reconstructed.id, attachment.id);
      expect(reconstructed.type, attachment.type);
      expect(reconstructed.sha256, attachment.sha256);
      expect(reconstructed.assignedFactIndexes, [0, 1]);
    });

    test('copyWith properly mutates evidence fields', () {
      const initial = EvidenceAttachment(
        id: 'EVD-1',
        type: EvidenceType.photo,
        localPath: '/tmp/p.jpg',
        fileName: 'p.jpg',
        sizeBytes: 500,
        capturedAt: '2026-09-26T10:00:00Z',
        source: 'camera',
      );

      final updated = initial.copyWith(
        syncStatus: 'synced',
        mediaUrl: '/api/v1/projects/PRJ-1/evidence/EVD-1/media',
        assignedFactIndexes: [1],
      );

      expect(updated.syncStatus, 'synced');
      expect(updated.mediaUrl, '/api/v1/projects/PRJ-1/evidence/EVD-1/media');
      expect(updated.assignedFactIndexes, [1]);
      expect(updated.id, 'EVD-1');
    });
  });

  group('FieldEvidenceSection Widget Tests', () {
    testWidgets('renders action buttons and attached count badge', (tester) async {
      List<EvidenceAttachment> currentAttachments = [];

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatefulBuilder(
              builder: (context, setState) {
                return FieldEvidenceSection(
                  attachments: currentAttachments,
                  onChanged: (items) => setState(() => currentAttachments = items),
                  factLabels: const ['Fact 1: COMPLETED', 'Fact 2: BLOCKED'],
                );
              },
            ),
          ),
        ),
      );

      expect(find.text('FIELD EVIDENCE'), findsOneWidget);
      expect(find.text('0 attached'), findsOneWidget);
      expect(find.text('Take Photo'), findsOneWidget);
      expect(find.text('Photos'), findsOneWidget);
      expect(find.text('Video'), findsOneWidget);
    });

    testWidgets('renders multi-fact assignment chips when multiple facts provided', (tester) async {
      const sampleAttachment = EvidenceAttachment(
        id: 'EVD-SAMPLE-01',
        type: EvidenceType.photo,
        localPath: '',
        fileName: 'sample_p110.jpg',
        sizeBytes: 2048,
        capturedAt: '2026-09-26T10:35:00Z',
        source: 'camera',
        assignedFactIndexes: [0],
      );

      List<EvidenceAttachment> attachments = [sampleAttachment];

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatefulBuilder(
              builder: (context, setState) {
                return FieldEvidenceSection(
                  attachments: attachments,
                  onChanged: (items) => setState(() => attachments = items),
                  factLabels: const ['Fact 1: COMPLETED', 'Fact 2: BLOCKED'],
                );
              },
            ),
          ),
        ),
      );

      expect(find.text('1 attached'), findsOneWidget);
      expect(find.text('sample_p110.jpg'), findsOneWidget);
      expect(find.text('Applies to:'), findsOneWidget);
      expect(find.text('Fact 1: COMPLETED'), findsOneWidget);
      expect(find.text('Fact 2: BLOCKED'), findsOneWidget);

      // Tap to toggle assignment to Fact 2
      await tester.tap(find.text('Fact 2: BLOCKED'));
      await tester.pumpAndSettle();

      expect(attachments.first.assignedFactIndexes, contains(1));
    });
  });

  group('Offline Evidence Queue Integration', () {
    test('OfflineSyncService retains pending attachments when simulateOffline is enabled', () async {
      final apiClient = ApiClient(useLocalFallback: true);
      final syncService = OfflineSyncService(apiClient: apiClient);
      syncService.simulateOffline = true;

      const testEvidence = EvidenceAttachment(
        id: 'EVD-OFFLINE-001',
        type: EvidenceType.photo,
        localPath: '/tmp/offline.jpg',
        fileName: 'offline.jpg',
        sizeBytes: 4096,
        capturedAt: '2026-09-26T10:35:00Z',
        source: 'camera',
        syncStatus: 'pending',
      );

      final event = ExecutionEvent(
        id: 'EVT-OFFLINE-1',
        projectId: 'PRJ-DEMO-001',
        reporterId: 'USR-SUP-001',
        observedAt: '2026-09-26T10:35:00Z',
        receivedAt: '2026-09-26T10:35:00Z',
        evidence: const Evidence(
          text: 'Offline update with photo',
          attachmentIds: ['EVD-OFFLINE-001'],
          attachments: [testEvidence],
        ),
        extractedFacts: const ExtractedFacts(
          eventType: 'progress',
          discipline: 'civil',
        ),
        status: 'submitted',
        clientEventId: 'EVT-OFFLINE-1',
        syncStatus: SyncStatus.pending,
      );

      final submitted = await syncService.submitEvent(event);
      expect(submitted.syncStatus, SyncStatus.pending);
      expect(submitted.evidence.attachments.first.syncStatus, 'pending');
      expect(syncService.pendingCount, greaterThan(0));

      // Re-enable online and sync
      syncService.simulateOffline = false;
      final syncedCount = await syncService.syncPending();
      expect(syncedCount, greaterThan(0));
    });
  });
}
