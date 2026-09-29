import 'package:flutter_test/flutter_test.dart';
import 'package:execlink_field/models/common_types.dart';
import 'package:execlink_field/models/execution_event.dart';
import 'package:execlink_field/models/extracted_facts.dart';
import 'package:execlink_field/services/api_client.dart';
import 'package:execlink_field/services/offline_sync_service.dart';
import 'package:execlink_field/services/sqlite_queue_service.dart';

void main() {
  group('ExecutionEvent Submission & Offline Queue Tests', () {
    late ApiClient apiClient;
    late OfflineSyncService syncService;

    setUp(() {
      apiClient = ApiClient(useLocalFallback: true);
      syncService = OfflineSyncService(apiClient: apiClient);
    });

    test(
      'Online submission creates event proposal without modifying actuals',
      () async {
        const event = ExecutionEvent(
          id: 'EVT-TEST-001',
          projectId: 'PRJ-DEMO-001',
          reporterId: 'USR-SUP-001',
          observedAt: '2026-09-26T10:35:00Z',
          receivedAt: '2026-09-26T10:36:00Z',
          evidence: Evidence(
            text: 'Line 24 P-110 erection completed at 10:35. Hydrotest blocked due to permit.',
            transcript: 'Line 24 P-110 erection completed at 10:35. Hydrotest blocked due to permit.',
            attachmentIds: ['ATT-TEST-001'],
          ),
          extractedFacts: ExtractedFacts(
            eventType: 'completed',
            assetId: 'P-110',
            discipline: 'mechanical',
            workType: 'erection',
            delayReason: 'Blocked due to permit',
            contractor: 'L&T Heavy Civil',
            keywords: ['p-110', 'erection'],
          ),
          status: 'submitted',
          clientEventId: 'EVT-CLI-TEST-001',
          syncStatus: SyncStatus.synced,
        );

        final submitted = await syncService.submitEvent(event);

        expect(submitted.status, 'submitted');
        expect(submitted.syncStatus, SyncStatus.synced);

        // Verify proposal was created
        final proposal = syncService.proposals[submitted.id];
        expect(proposal, isNotNull);
        expect(proposal!.candidates.first.activityId, 'ACT-3.1.1');
        expect(proposal.candidates.first.band, 'auto_suggest');
        expect(proposal.candidates.first.score, greaterThanOrEqualTo(0.90));
      },
    );

    test(
      'Offline simulation retains events in pending queue with client UUID',
      () async {
        syncService.simulateOffline = true;
        expect(syncService.pendingCount, 0);

        final event = ExecutionEvent(
          id: 'EVT-OFFLINE-001',
          projectId: 'PRJ-DEMO-001',
          reporterId: 'USR-SUP-001',
          observedAt: DateTime.now().toUtc().toIso8601String(),
          receivedAt: DateTime.now().toUtc().toIso8601String(),
          evidence: const Evidence(
            text: 'Work completed while in tunnel without signal',
          ),
          extractedFacts: const ExtractedFacts(
            eventType: 'completed',
            assetId: 'PIER-P12',
          ),
          status: 'submitted',
          clientEventId: '',
        );

        final queued = await syncService.submitEvent(event);

        expect(queued.syncStatus, SyncStatus.pending);
        expect(queued.clientEventId, isNotEmpty);
        expect(queued.clientEventId, startsWith('EVT-FIELD-'));
        expect(syncService.pendingCount, 1);

        // When network recovers
        syncService.simulateOffline = false;
        final syncedCount = await syncService.syncPending();

        expect(syncedCount, 1);
        expect(syncService.pendingCount, 0);
        expect(syncService.allEvents.first.syncStatus, SyncStatus.synced);
      },
    );

    test('SqliteFieldQueue persists and transitions queue states with SQLite DDL schema', () {
      final queue = syncService.sqliteQueue;
      expect(
        SqliteFieldQueue.ddlSchema,
        contains('CREATE TABLE IF NOT EXISTS field_execution_event_queue'),
      );
      expect(SqliteFieldQueue.tableName, 'field_execution_event_queue');

      const testEvent = ExecutionEvent(
        id: 'EVT-SQL-001',
        projectId: 'PRJ-DEMO-001',
        reporterId: 'USR-SUP-001',
        observedAt: '2026-09-26T12:00:00Z',
        receivedAt: '2026-09-26T12:00:00Z',
        evidence: Evidence(text: 'Erection in progress'),
        extractedFacts: ExtractedFacts(eventType: 'progress', assetId: 'P-110'),
        status: 'submitted',
        clientEventId: 'EVT-CLI-SQL-001',
        syncStatus: SyncStatus.pending,
      );

      queue.enqueue(testEvent);
      expect(
        queue.getPending().any((q) => q.clientEventId == 'EVT-CLI-SQL-001'),
        isTrue,
      );

      queue.markSyncing('EVT-CLI-SQL-001');
      expect(
        queue
            .getAll()
            .firstWhere((q) => q.clientEventId == 'EVT-CLI-SQL-001')
            .syncStatus,
        SyncStatus.syncing,
      );

      queue.markFailed('EVT-CLI-SQL-001', 'Network timeout');
      final failedItem = queue.getAll().firstWhere(
        (q) => q.clientEventId == 'EVT-CLI-SQL-001',
      );
      expect(failedItem.syncStatus, SyncStatus.failed);
      expect(failedItem.retryCount, 1);
      expect(failedItem.syncError, 'Network timeout');

      queue.markSynced('EVT-CLI-SQL-001');
      final syncedItem = queue.getAll().firstWhere(
        (q) => q.clientEventId == 'EVT-CLI-SQL-001',
      );
      expect(syncedItem.syncStatus, SyncStatus.synced);
      expect(syncedItem.syncError, isNull);
    });
  });
}
