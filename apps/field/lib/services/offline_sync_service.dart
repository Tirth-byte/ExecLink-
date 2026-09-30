import 'package:uuid/uuid.dart';

import '../models/common_types.dart';
import '../models/execution_event.dart';
import '../models/match_proposal.dart';
import 'api_client.dart';
import 'demo_fixtures.dart';
import 'sqlite_queue_service.dart';

class OfflineSyncService {
  final ApiClient apiClient;
  final SqliteFieldQueue sqliteQueue = SqliteFieldQueue();
  final _uuid = const Uuid();

  bool simulateOffline = false;
  final List<ExecutionEvent> _events = [];
  final Map<String, MatchProposal> _proposals = {};

  OfflineSyncService({required this.apiClient}) {
    // Seed initial demo events and populate SQLite queue
    for (final evt in DemoFixtures.initialEvents) {
      _events.add(evt);
      sqliteQueue.enqueue(evt);
      sqliteQueue.markSynced(evt.clientEventId);
      _proposals[evt.id] = DemoFixtures.createDeterministicProposal(evt);
    }
  }

  Future<void> initialize() async {
    await sqliteQueue.ready;
    for (final item in sqliteQueue.getAll()) {
      final event = item.toExecutionEvent();
      final index = _events.indexWhere(
        (existing) => existing.clientEventId == event.clientEventId,
      );
      if (index >= 0) {
        _events[index] = event;
      } else {
        _events.add(event);
      }
    }
    _events.sort((a, b) => b.receivedAt.compareTo(a.receivedAt));
  }

  List<ExecutionEvent> get allEvents => List.unmodifiable(_events);
  Map<String, MatchProposal> get proposals => Map.unmodifiable(_proposals);

  int get pendingCount =>
      _events.where((e) => e.syncStatus == SyncStatus.pending).length;
  bool get hasPending => pendingCount > 0;

  String generateClientEventId() {
    return 'EVT-FIELD-${DateTime.now().millisecondsSinceEpoch}-${_uuid.v4().substring(0, 8)}';
  }

  /// Helper to upload un-synced attachments for an event
  Future<ExecutionEvent> _uploadEventAttachments(
    String projectId,
    ExecutionEvent event,
  ) async {
    final attachments = event.evidence.attachments;
    if (attachments.isEmpty) return event;

    final List<EvidenceAttachment> updatedAttachments = [];
    final List<String> updatedIds = [];

    for (final att in attachments) {
      if (att.syncStatus != 'synced' && att.localPath.isNotEmpty) {
        try {
          final uploaded = await apiClient.uploadEvidence(
            projectId: projectId,
            attachment: att,
          );
          updatedAttachments.add(uploaded);
          updatedIds.add(uploaded.id);
        } catch (_) {
          // If upload fails, retain local attachment as pending
          updatedAttachments.add(att);
          updatedIds.add(att.id);
        }
      } else {
        updatedAttachments.add(att);
        updatedIds.add(att.id);
      }
    }

    return event.copyWith(
      evidence: Evidence(
        text: event.evidence.text,
        transcript: event.evidence.transcript,
        attachmentIds: updatedIds,
        attachments: updatedAttachments,
      ),
    );
  }

  /// Queue or submit an execution event
  Future<ExecutionEvent> submitEvent(ExecutionEvent newEvent) async {
    await sqliteQueue.ready;
    final eventWithClientId = newEvent.clientEventId.isEmpty
        ? newEvent.copyWith(clientEventId: generateClientEventId())
        : newEvent;

    if (simulateOffline) {
      // Retain as pending in resilient SQLite queue with local evidence
      final pendingEvent = eventWithClientId.copyWith(
        syncStatus: SyncStatus.pending,
      );
      sqliteQueue.enqueue(pendingEvent);
      _events.insert(0, pendingEvent);
      return pendingEvent;
    }

    try {
      // 1. Upload local attachments first if online
      final preparedEvent = await _uploadEventAttachments(
        eventWithClientId.projectId,
        eventWithClientId,
      );

      // 2. Submit execution event
      final res = await apiClient.submitEvent(
        projectId: preparedEvent.projectId,
        event: preparedEvent,
      );

      final syncedEvent = preparedEvent.copyWith(
        syncStatus: SyncStatus.synced,
        status: 'submitted',
      );
      sqliteQueue.enqueue(syncedEvent);
      sqliteQueue.markSynced(syncedEvent.clientEventId);
      _events.insert(0, syncedEvent);

      if (res['proposal'] != null) {
        final prop = MatchProposal.fromJson(
          res['proposal'] as Map<String, dynamic>,
        );
        _proposals[syncedEvent.id] = prop;
      }

      return syncedEvent;
    } catch (e) {
      // Mark as pending retry in SQLite queue on network failure
      final pendingEvent = eventWithClientId.copyWith(
        syncStatus: SyncStatus.pending,
        syncError: e.toString(),
      );
      sqliteQueue.enqueue(pendingEvent);
      sqliteQueue.markFailed(pendingEvent.clientEventId, e.toString());
      _events.insert(0, pendingEvent);
      return pendingEvent;
    }
  }

  /// Sync all pending events from queue
  Future<int> syncPending() async {
    await sqliteQueue.ready;
    if (simulateOffline) return 0;

    int syncedCount = 0;
    for (int i = 0; i < _events.length; i++) {
      final ev = _events[i];
      if (ev.syncStatus == SyncStatus.pending ||
          ev.syncStatus == SyncStatus.failed) {
        try {
          _events[i] = ev.copyWith(syncStatus: SyncStatus.syncing);
          sqliteQueue.markSyncing(ev.clientEventId);

          // Upload attachments first
          final preparedEvent = await _uploadEventAttachments(
            ev.projectId,
            ev,
          );

          final res = await apiClient.submitEvent(
            projectId: preparedEvent.projectId,
            event: preparedEvent,
          );
          _events[i] = preparedEvent.copyWith(
            syncStatus: SyncStatus.synced,
            syncError: null,
          );
          sqliteQueue.markSynced(ev.clientEventId);

          if (res['proposal'] != null) {
            final prop = MatchProposal.fromJson(
              res['proposal'] as Map<String, dynamic>,
            );
            _proposals[ev.id] = prop;
          }
          syncedCount++;
        } catch (e) {
          _events[i] = ev.copyWith(
            syncStatus: SyncStatus.failed,
            syncError: e.toString(),
          );
          sqliteQueue.markFailed(ev.clientEventId, e.toString());
        }
      }
    }
    return syncedCount;
  }
}
