enum FieldActivityStatus { inProgress, completed, blocked, needUpdate }

class FieldActivity {
  final String id;
  final String title;
  final String discipline;
  final String assetTag;
  final String location;
  final double? plannedQuantity;
  final String? unit;
  final String? plannedTodayText;
  final int progress; // 0 to 100
  final FieldActivityStatus status;
  final String lastUpdated;
  final String? blockerReason;
  final bool requiresUpdate;

  const FieldActivity({
    required this.id,
    required this.title,
    required this.discipline,
    required this.assetTag,
    required this.location,
    this.plannedQuantity,
    this.unit,
    this.plannedTodayText,
    required this.progress,
    required this.status,
    required this.lastUpdated,
    this.blockerReason,
    this.requiresUpdate = false,
  });

  String get statusLabel {
    switch (status) {
      case FieldActivityStatus.inProgress:
        return 'In Progress';
      case FieldActivityStatus.completed:
        return 'Completed';
      case FieldActivityStatus.blocked:
        return 'Blocked';
      case FieldActivityStatus.needUpdate:
        return 'Need Update';
    }
  }

  bool get isBlocked => status == FieldActivityStatus.blocked;
  bool get isCompleted => status == FieldActivityStatus.completed;
  bool get needsUpdate =>
      status == FieldActivityStatus.needUpdate || requiresUpdate;

  FieldActivity copyWith({
    int? progress,
    FieldActivityStatus? status,
    String? lastUpdated,
    String? blockerReason,
    bool? requiresUpdate,
  }) => FieldActivity(
    id: id,
    title: title,
    discipline: discipline,
    assetTag: assetTag,
    location: location,
    plannedQuantity: plannedQuantity,
    unit: unit,
    plannedTodayText: plannedTodayText,
    progress: progress ?? this.progress,
    status: status ?? this.status,
    lastUpdated: lastUpdated ?? this.lastUpdated,
    blockerReason: blockerReason ?? this.blockerReason,
    requiresUpdate: requiresUpdate ?? this.requiresUpdate,
  );
}
