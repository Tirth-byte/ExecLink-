import 'common_types.dart';
import 'extracted_facts.dart';
import '../core/constants/project_context.dart';

enum SyncStatus { pending, syncing, synced, failed }

class ExecutionEvent {
  final String id;
  final String projectId;
  final String reporterId;
  final String observedAt;
  final String receivedAt;
  final Evidence evidence;
  final ExtractedFacts extractedFacts;
  final String status; // 'submitted' | 'proposed' | 'verified' | 'rejected'
  final String clientEventId;
  final SyncStatus syncStatus;
  final String? syncError;

  const ExecutionEvent({
    required this.id,
    required this.projectId,
    required this.reporterId,
    required this.observedAt,
    required this.receivedAt,
    required this.evidence,
    required this.extractedFacts,
    required this.status,
    required this.clientEventId,
    this.syncStatus = SyncStatus.synced,
    this.syncError,
  });

  factory ExecutionEvent.fromJson(Map<String, dynamic> json) {
    return ExecutionEvent(
      id: json['id'] as String? ?? '',
      projectId:
          json['projectId'] as String? ?? ProjectContext.defaultProjectId,
      reporterId: json['reporterId'] as String? ?? 'USR-SUP-001',
      observedAt:
          json['observedAt'] as String? ??
          DateTime.now().toUtc().toIso8601String(),
      receivedAt:
          json['receivedAt'] as String? ??
          DateTime.now().toUtc().toIso8601String(),
      evidence: Evidence.fromJson(
        json['evidence'] as Map<String, dynamic>? ?? {},
      ),
      extractedFacts: ExtractedFacts.fromJson(
        json['extractedFacts'] as Map<String, dynamic>? ?? {},
      ),
      status: json['status'] as String? ?? 'submitted',
      clientEventId:
          json['clientEventId'] as String? ?? json['id'] as String? ?? '',
      syncStatus: _parseSyncStatus(json['syncStatus'] as String?),
      syncError: json['syncError'] as String?,
    );
  }

  static SyncStatus _parseSyncStatus(String? raw) {
    switch (raw) {
      case 'pending':
        return SyncStatus.pending;
      case 'syncing':
        return SyncStatus.syncing;
      case 'failed':
        return SyncStatus.failed;
      default:
        return SyncStatus.synced;
    }
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'projectId': projectId,
    'reporterId': reporterId,
    'observedAt': observedAt,
    'receivedAt': receivedAt,
    'evidence': evidence.toJson(),
    'extractedFacts': extractedFacts.toJson(),
    'status': status,
    'clientEventId': clientEventId,
    'syncStatus': syncStatus.name,
    if (syncError != null) 'syncError': syncError,
  };

  ExecutionEvent copyWith({
    String? id,
    String? projectId,
    String? reporterId,
    String? observedAt,
    String? receivedAt,
    Evidence? evidence,
    ExtractedFacts? extractedFacts,
    String? status,
    String? clientEventId,
    SyncStatus? syncStatus,
    String? syncError,
  }) {
    return ExecutionEvent(
      id: id ?? this.id,
      projectId: projectId ?? this.projectId,
      reporterId: reporterId ?? this.reporterId,
      observedAt: observedAt ?? this.observedAt,
      receivedAt: receivedAt ?? this.receivedAt,
      evidence: evidence ?? this.evidence,
      extractedFacts: extractedFacts ?? this.extractedFacts,
      status: status ?? this.status,
      clientEventId: clientEventId ?? this.clientEventId,
      syncStatus: syncStatus ?? this.syncStatus,
      syncError: syncError ?? this.syncError,
    );
  }
}
