import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../models/execution_event.dart';
import '../../providers/field_providers.dart';
import '../../widgets/status_badge.dart';

class ActivityDetailView extends ConsumerWidget {
  final String activityId;

  const ActivityDetailView({super.key, required this.activityId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activities = ref.watch(activitiesProvider).activities;
    final activity = activities.where((a) => a.id == activityId).firstOrNull;

    final allEvents = ref.watch(eventsProvider).events;
    // Find events mentioning this activity or asset
    final linkedEvents = allEvents.where((e) {
      final actIdMatch =
          e.evidence.text.contains(activityId) ||
          e.extractedFacts.keywords.contains(activityId.toLowerCase());
      final assetMatch =
          activity != null &&
          e.extractedFacts.assetId != null &&
          e.extractedFacts.assetId!.toLowerCase() ==
              activity.assetId.toLowerCase();
      return actIdMatch || assetMatch;
    }).toList();

    if (activity == null) {
      return Scaffold(
        appBar: AppBar(title: Text(activityId)),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.search_off,
                size: 48,
                color: AppColors.textMuted,
              ),
              const SizedBox(height: 12),
              Text(
                'Activity $activityId not found in schedule snapshot.',
                style: AppTypography.bodyMd,
              ),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () => context.go('/'),
                child: const Text('Back to Home'),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('${activity.id} Detail'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/'),
        ),
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(16),
        decoration: const BoxDecoration(
          color: AppColors.surface,
          border: Border(top: BorderSide(color: AppColors.border)),
        ),
        child: ElevatedButton.icon(
          icon: const Icon(Icons.add_task),
          label: const Text('LOG FIELD UPDATE FOR THIS ACTIVITY'),
          onPressed: () =>
              context.go('/quick-update?activityId=${activity.id}'),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // 1. Identity & WBS Header Card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceMuted,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          'WBS ${activity.wbs} (Level ${activity.level})',
                          style: AppTypography.monoSm.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.actionBg,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          '${activity.baselineProgressPercent}% Baseline Progress',
                          style: AppTypography.monoSm.copyWith(
                            color: AppColors.action,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(activity.name, style: AppTypography.titleLg),
                  const SizedBox(height: 8),
                  Text(
                    'Discipline: ${activity.discipline.toUpperCase()} • Asset: ${activity.assetId} • Work: ${activity.workType}',
                    style: AppTypography.bodySm,
                  ),
                  const SizedBox(height: 12),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: activity.baselineProgressPercent / 100.0,
                      minHeight: 8,
                      backgroundColor: AppColors.surfaceMuted,
                      color: activity.baselineProgressPercent > 0
                          ? AppColors.action
                          : AppColors.border,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // 2. Schedule Specification Details
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'SCHEDULE SPECIFICATIONS',
                    style: AppTypography.bodySmBold.copyWith(
                      letterSpacing: 0.5,
                      color: AppColors.textMuted,
                    ),
                  ),
                  const SizedBox(height: 12),
                  _buildDetailRow('Project ID', activity.projectId),
                  _buildDetailRow('Snapshot ID', activity.snapshotId),
                  _buildDetailRow('Planned Start', activity.plannedStart),
                  _buildDetailRow('Planned Finish', activity.plannedFinish),
                  _buildDetailRow(
                    'Location',
                    'Alignment ${activity.location.alignment}, ${activity.location.start.toInt()}m to ${activity.location.end.toInt()}m',
                  ),
                  if (activity.plannedQuantity != null)
                    _buildDetailRow(
                      'Planned Quantity',
                      activity.plannedQuantity!.display,
                    ),
                  _buildDetailRow(
                    'Baseline Schedule Actual',
                    '${activity.baselineProgressPercent}% (Authorized verification required to advance)',
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // 3. Field Capture History for this Activity
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'PREVIOUS FIELD UPDATES (${linkedEvents.length})',
                style: AppTypography.bodySmBold.copyWith(
                  letterSpacing: 0.5,
                  color: AppColors.textMuted,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (linkedEvents.isEmpty)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Center(
                  child: Text(
                    'No field events submitted for this activity yet.',
                    style: AppTypography.bodySm,
                  ),
                ),
              ),
            )
          else
            ...linkedEvents.map(
              (evt) => _buildLinkedEventCard(context, ref, evt),
            ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 140,
            child: Text(
              label,
              style: AppTypography.bodySm.copyWith(color: AppColors.textMuted),
            ),
          ),
          Expanded(child: Text(value, style: AppTypography.bodySmBold)),
        ],
      ),
    );
  }

  Widget _buildLinkedEventCard(
    BuildContext context,
    WidgetRef ref,
    ExecutionEvent event,
  ) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    StatusBadge(status: event.status, isDense: true),
                    const SizedBox(width: 6),
                    Text(
                      event.id,
                      style: AppTypography.monoSm.copyWith(
                        fontSize: 11,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ],
                ),
                Text(
                  event.observedAt.substring(0, 10),
                  style: AppTypography.monoSm.copyWith(fontSize: 11),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(event.evidence.text, style: AppTypography.bodySm),
            if (event.extractedFacts.delayReason != null) ...[
              const SizedBox(height: 4),
              Text(
                'Delay: ${event.extractedFacts.delayReason}',
                style: AppTypography.bodySm.copyWith(color: AppColors.danger),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
