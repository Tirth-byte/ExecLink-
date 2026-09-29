import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';

import '../models/field_activity.dart';
import 'field_providers.dart';

final todayActivitiesSeed = <FieldActivity>[
  const FieldActivity(
    id: 'ACT-1.2.1',
    title: 'Pier P12 reinforcement fixing',
    discipline: 'Structural',
    assetTag: 'PIER-P12',
    location: 'Chainage 12+400 – 12+430',
    plannedQuantity: 3.0,
    unit: 't',
    plannedTodayText: 'Fix 3.0 tonnes reinforcement',
    progress: 65,
    status: FieldActivityStatus.inProgress,
    lastUpdated: '08:42',
    requiresUpdate: true,
  ),
  const FieldActivity(
    id: 'ACT-3.1.1',
    title: 'Line 24 P-110 equipment erection',
    discipline: 'Piping / Mechanical',
    assetTag: 'P-110',
    location: 'Area B — East Yard',
    plannedQuantity: 1.0,
    unit: 'ea',
    plannedTodayText: 'Erection & alignment complete',
    progress: 100,
    status: FieldActivityStatus.completed,
    lastUpdated: '07:15',
    requiresUpdate: false,
  ),
  const FieldActivity(
    id: 'ACT-3.1.2',
    title: 'Hydrotest — Line 24 P-110',
    discipline: 'Piping',
    assetTag: 'P-110',
    location: 'Area B',
    plannedQuantity: 1.0,
    unit: 'test',
    plannedTodayText: 'Pressure test package Line 24',
    progress: 0,
    status: FieldActivityStatus.blocked,
    blockerReason: 'Permit pending',
    lastUpdated: '09:15',
    requiresUpdate: false,
  ),
  const FieldActivity(
    id: 'ACT-4.2.3',
    title: 'Cable tray installation — STN-03',
    discipline: 'Electrical',
    assetTag: 'STN-03',
    location: 'Substation Zone',
    plannedQuantity: 120.0,
    unit: 'm',
    plannedTodayText: 'Install 120m secondary tray',
    progress: 40,
    status: FieldActivityStatus.needUpdate,
    lastUpdated: 'Yesterday',
    requiresUpdate: true,
  ),
  const FieldActivity(
    id: 'ACT-2.4.2',
    title: 'Column shuttering — Grid C7',
    discipline: 'Civil',
    assetTag: 'GRID-C7',
    location: 'Pier Zone',
    plannedQuantity: 45.0,
    unit: 'm²',
    plannedTodayText: 'Erect 45m² formwork shuttering',
    progress: 80,
    status: FieldActivityStatus.inProgress,
    lastUpdated: '10:20',
    requiresUpdate: true,
  ),
  const FieldActivity(
    id: 'ACT-5.1.4',
    title: 'Instrument junction box inspection',
    discipline: 'Instrumentation',
    assetTag: 'JB-204',
    location: 'Process Area',
    plannedQuantity: 4.0,
    unit: 'boxes',
    plannedTodayText: 'QC inspection & continuity check',
    progress: 100,
    status: FieldActivityStatus.completed,
    lastUpdated: '11:05',
    requiresUpdate: false,
  ),
];

enum ActivityFilter { all, needUpdate, completed }

final todayFilterProvider = StateProvider<ActivityFilter>(
  (ref) => ActivityFilter.all,
);

final todayActivitiesProvider = Provider<List<FieldActivity>>((ref) {
  final events = ref.watch(eventsProvider).events;
  return todayActivitiesSeed.map((activity) {
    final matching = events.where((event) {
      final facts = event.extractedFacts;
      return facts.assetId == activity.assetTag ||
          facts.keywords.contains(activity.id.toLowerCase());
    });
    if (matching.isEmpty) return activity;
    final latest = matching.first;
    final type = latest.extractedFacts.eventType;
    final status = switch (type) {
      'completed' => FieldActivityStatus.completed,
      'blocked' => FieldActivityStatus.blocked,
      _ => FieldActivityStatus.inProgress,
    };
    final progressQuantity = latest.extractedFacts.quantity;
    final progress = type == 'completed'
        ? 100
        : progressQuantity?.unit == '%'
        ? progressQuantity!.value.round().clamp(0, 100)
        : activity.progress;
    return activity.copyWith(
      status: status,
      progress: progress,
      lastUpdated: 'Just now',
      blockerReason: latest.extractedFacts.delayReason,
      requiresUpdate: false,
    );
  }).toList();
});

final filteredTodayActivitiesProvider = Provider<List<FieldActivity>>((ref) {
  final activities = ref.watch(todayActivitiesProvider);
  final filter = ref.watch(todayFilterProvider);

  switch (filter) {
    case ActivityFilter.all:
      return activities;
    case ActivityFilter.needUpdate:
      return activities.where((a) => a.needsUpdate || a.isBlocked).toList();
    case ActivityFilter.completed:
      return activities.where((a) => a.isCompleted).toList();
  }
});
