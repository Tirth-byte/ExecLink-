import 'common_types.dart';

/// Read-only snapshot activity from the baseline schedule.
/// In accordance with ExecLink integrity rules, the Field app never writes
/// or mutates schedule progress actuals; it only references activities
/// for proposal linking.
class ScheduleActivity {
  final String id;
  final String projectId;
  final String snapshotId;
  final String wbs;
  final int level;
  final String name;
  final String discipline;
  final String workType;
  final String assetId;
  final LocationInterval location;
  final String plannedStart;
  final String plannedFinish;
  final Quantity? plannedQuantity;
  final int baselineProgressPercent;

  const ScheduleActivity({
    required this.id,
    required this.projectId,
    required this.snapshotId,
    required this.wbs,
    required this.level,
    required this.name,
    required this.discipline,
    required this.workType,
    required this.assetId,
    required this.location,
    required this.plannedStart,
    required this.plannedFinish,
    this.plannedQuantity,
    required this.baselineProgressPercent,
  });

  factory ScheduleActivity.fromJson(Map<String, dynamic> json) {
    return ScheduleActivity(
      id: json['id'] as String? ?? '',
      projectId: json['projectId'] as String? ?? '',
      snapshotId: json['snapshotId'] as String? ?? '',
      wbs: json['wbs'] as String? ?? '',
      level: (json['level'] as num?)?.toInt() ?? 6,
      name: json['name'] as String? ?? '',
      discipline: json['discipline'] as String? ?? '',
      workType: json['workType'] as String? ?? '',
      assetId: json['assetId'] as String? ?? '',
      location: json['location'] != null
          ? LocationInterval.fromJson(json['location'] as Map<String, dynamic>)
          : const LocationInterval(start: 0, end: 0),
      plannedStart: json['plannedStart'] as String? ?? '',
      plannedFinish: json['plannedFinish'] as String? ?? '',
      plannedQuantity: json['plannedQuantity'] != null
          ? Quantity.fromJson(json['plannedQuantity'] as Map<String, dynamic>)
          : null,
      baselineProgressPercent:
          (json['actualProgressPercent'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'projectId': projectId,
    'snapshotId': snapshotId,
    'wbs': wbs,
    'level': level,
    'name': name,
    'discipline': discipline,
    'workType': workType,
    'assetId': assetId,
    'location': location.toJson(),
    'plannedStart': plannedStart,
    'plannedFinish': plannedFinish,
    if (plannedQuantity != null) 'plannedQuantity': plannedQuantity!.toJson(),
    'actualProgressPercent': baselineProgressPercent,
  };
}
