import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

import '../models/execution_event.dart';

class QueueItem {
  final String id;
  final String clientEventId;
  final String projectId;
  final String payloadJson;
  final SyncStatus syncStatus;
  final int retryCount;
  final String? syncError;
  final String createdAt;
  final String updatedAt;

  const QueueItem({
    required this.id,
    required this.clientEventId,
    required this.projectId,
    required this.payloadJson,
    required this.syncStatus,
    this.retryCount = 0,
    this.syncError,
    required this.createdAt,
    required this.updatedAt,
  });

  ExecutionEvent toExecutionEvent() {
    final decoded = jsonDecode(payloadJson) as Map<String, dynamic>;
    return ExecutionEvent.fromJson(decoded)
        .copyWith(syncStatus: syncStatus, syncError: syncError);
  }

  Map<String, dynamic> toSqliteRow() => {
    'id': id,
    'client_event_id': clientEventId,
    'project_id': projectId,
    'payload_json': payloadJson,
    'sync_status': syncStatus.name,
    'retry_count': retryCount,
    'sync_error': syncError,
    'created_at': createdAt,
    'updated_at': updatedAt,
  };

  QueueItem copyWith({
    SyncStatus? syncStatus,
    int? retryCount,
    String? syncError,
    bool clearError = false,
    String? updatedAt,
  }) {
    return QueueItem(
      id: id,
      clientEventId: clientEventId,
      projectId: projectId,
      payloadJson: payloadJson,
      syncStatus: syncStatus ?? this.syncStatus,
      retryCount: retryCount ?? this.retryCount,
      syncError: clearError ? null : (syncError ?? this.syncError),
      createdAt: createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

/// Resilient SQLite-compatible offline queue for ExecutionEvent submissions.
/// Strict adherence to QA-S02: This queue stores only field ExecutionEvent
/// proposals awaiting sync and never writes schedule actuals.
class SqliteFieldQueue {
  static const String tableName = 'field_execution_event_queue';

  static const String ddlSchema = '''
CREATE TABLE IF NOT EXISTS field_execution_event_queue (
  id TEXT PRIMARY KEY,
  client_event_id TEXT NOT NULL UNIQUE,
  project_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  sync_status TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  sync_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
''';

  final Map<String, QueueItem> _rows = {};
  Database? _database;
  late final Future<void> ready;

  SqliteFieldQueue() {
    ready = _initialize();
  }

  bool get _supportsSqlite => !kIsWeb && (Platform.isAndroid || Platform.isIOS);

  Future<void> _initialize() async {
    if (!_supportsSqlite) return;
    final databasePath = p.join(await getDatabasesPath(), 'execlink_field.db');
    _database = await openDatabase(
      databasePath,
      version: 1,
      onCreate: (db, _) => db.execute(ddlSchema),
    );
    final stored = await _database!.query(tableName);
    for (final row in stored) {
      final item = _fromSqliteRow(row);
      _rows[item.clientEventId] = item;
    }
  }

  QueueItem _fromSqliteRow(Map<String, Object?> row) => QueueItem(
    id: row['id']! as String,
    clientEventId: row['client_event_id']! as String,
    projectId: row['project_id']! as String,
    payloadJson: row['payload_json']! as String,
    syncStatus: SyncStatus.values.firstWhere(
      (value) => value.name == row['sync_status'],
      orElse: () => SyncStatus.pending,
    ),
    retryCount: row['retry_count']! as int,
    syncError: row['sync_error'] as String?,
    createdAt: row['created_at']! as String,
    updatedAt: row['updated_at']! as String,
  );

  void _persist(QueueItem item) {
    final database = _database;
    if (database == null) return;
    database.insert(
      tableName,
      item.toSqliteRow(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  void enqueue(ExecutionEvent event) {
    final now = DateTime.now().toUtc().toIso8601String();
    final item = QueueItem(
      id: 'Q-${event.clientEventId}',
      clientEventId: event.clientEventId,
      projectId: event.projectId,
      payloadJson: jsonEncode(event.toJson()),
      syncStatus: event.syncStatus,
      retryCount: 0,
      syncError: event.syncError,
      createdAt: now,
      updatedAt: now,
    );
    _rows[item.clientEventId] = item;
    _persist(item);
  }

  List<QueueItem> getPending() {
    return _rows.values
        .where(
          (item) =>
              item.syncStatus == SyncStatus.pending ||
              item.syncStatus == SyncStatus.failed,
        )
        .toList();
  }

  void markSyncing(String clientEventId) {
    final item = _rows[clientEventId];
    if (item != null) {
      _rows[clientEventId] = item.copyWith(
        syncStatus: SyncStatus.syncing,
        updatedAt: DateTime.now().toUtc().toIso8601String(),
      );
      _persist(_rows[clientEventId]!);
    }
  }

  void markSynced(String clientEventId) {
    final item = _rows[clientEventId];
    if (item != null) {
      _rows[clientEventId] = item.copyWith(
        syncStatus: SyncStatus.synced,
        clearError: true,
        updatedAt: DateTime.now().toUtc().toIso8601String(),
      );
      _persist(_rows[clientEventId]!);
    }
  }

  void markFailed(String clientEventId, String error) {
    final item = _rows[clientEventId];
    if (item != null) {
      _rows[clientEventId] = item.copyWith(
        syncStatus: SyncStatus.failed,
        retryCount: item.retryCount + 1,
        syncError: error,
        updatedAt: DateTime.now().toUtc().toIso8601String(),
      );
      _persist(_rows[clientEventId]!);
    }
  }

  List<QueueItem> getAll() {
    return _rows.values.toList()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
  }

  int get pendingCount =>
      _rows.values.where((i) => i.syncStatus == SyncStatus.pending).length;
}
