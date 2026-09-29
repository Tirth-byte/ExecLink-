import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/app_typography.dart';
import '../../models/execution_event.dart';
import '../../providers/field_providers.dart';
import '../../widgets/field_buttons.dart';
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
                color: FieldColors.textMuted,
              ),
              const SizedBox(height: 12),
              Text(
                'Activity $activityId not found in schedule snapshot.',
                style: FieldTypography.body,
              ),
              const SizedBox(height: 12),
              FieldPrimaryButton(
                text: 'Back to Home',
                isFullWidth: false,
                onPressed: () => context.go('/'),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: FieldColors.canvas,
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
          color: FieldColors.surface,
          border: Border(top: BorderSide(color: FieldColors.borderSubtle)),
        ),
        child: FieldPrimaryButton(
          icon: Icons.add_task_rounded,
          text: 'LOG FIELD UPDATE FOR THIS ACTIVITY',
          onPressed: () =>
              context.go('/quick-update?activityId=${activity.id}'),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // 1. Identity & WBS Header Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: FieldColors.surface,
              borderRadius: BorderRadius.circular(FieldRadius.card),
              border: Border.all(color: FieldColors.border, width: 1),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  alignment: WrapAlignment.spaceBetween,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: FieldColors.surfaceRaised,
                        borderRadius: BorderRadius.circular(FieldRadius.badge),
                        border: Border.all(color: FieldColors.borderSubtle),
                      ),
                      child: Text(
                        'WBS ${activity.wbs} (Level ${activity.level})',
                        style: FieldTypography.monoSm.copyWith(
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
                        color: FieldColors.brand50,
                        borderRadius: BorderRadius.circular(FieldRadius.badge),
                        border: Border.all(color: FieldColors.brand100),
                      ),
                      child: Text(
                        '${activity.baselineProgressPercent}% Baseline Progress',
                        style: FieldTypography.monoSm.copyWith(
                          color: FieldColors.brand700,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(activity.name, style: FieldTypography.sectionTitle),
                const SizedBox(height: 6),
                Text(
                  'Discipline: ${activity.discipline.toUpperCase()} • Asset: ${activity.assetId} • Work: ${activity.workType}',
                  style: FieldTypography.metadata,
                ),
                const SizedBox(height: 12),
                ClipRRect(
                  borderRadius: BorderRadius.circular(3),
                  child: LinearProgressIndicator(
                    value: activity.baselineProgressPercent / 100.0,
                    minHeight: 6,
                    backgroundColor: FieldColors.surfaceRaised,
                    color: activity.baselineProgressPercent > 0
                        ? FieldColors.action
                        : FieldColors.border,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // 2. Schedule Specification Details
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: FieldColors.surface,
              borderRadius: BorderRadius.circular(FieldRadius.card),
              border: Border.all(color: FieldColors.border, width: 1),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'SCHEDULE SPECIFICATIONS',
                  style: FieldTypography.statusText.copyWith(
                    letterSpacing: 0.5,
                    color: FieldColors.textMuted,
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
          const SizedBox(height: 16),

          // 3. Field Capture History for this Activity
          Text(
            'PREVIOUS FIELD UPDATES (${linkedEvents.length})',
            style: FieldTypography.statusText.copyWith(
              letterSpacing: 0.5,
              color: FieldColors.textMuted,
            ),
          ),
          const SizedBox(height: 8),
          if (linkedEvents.isEmpty)
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: FieldColors.surface,
                borderRadius: BorderRadius.circular(FieldRadius.card),
                border: Border.all(color: FieldColors.border, width: 1),
              ),
              child: Center(
                child: Text(
                  'No field events submitted for this activity yet.',
                  style: FieldTypography.metadata,
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
              style: FieldTypography.metadata.copyWith(color: FieldColors.textMuted),
            ),
          ),
          Expanded(child: Text(value, style: FieldTypography.bodyBold.copyWith(fontSize: 13))),
        ],
      ),
    );
  }

  Widget _buildLinkedEventCard(
    BuildContext context,
    WidgetRef ref,
    ExecutionEvent event,
  ) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: FieldColors.surface,
        borderRadius: BorderRadius.circular(FieldRadius.card),
        border: Border.all(color: FieldColors.border, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  StatusBadge(status: event.status, isDense: true),
                  const SizedBox(width: 6),
                  Text(
                    event.id,
                    style: FieldTypography.monoSm.copyWith(
                      fontSize: 11,
                      color: FieldColors.textMuted,
                    ),
                  ),
                ],
              ),
              Text(
                event.observedAt.substring(0, 10),
                style: FieldTypography.monoSm.copyWith(
                  fontSize: 11,
                  color: FieldColors.textMuted,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(event.evidence.text, style: FieldTypography.body),
          if (event.extractedFacts.delayReason != null) ...[
            const SizedBox(height: 4),
            Text(
              'Delay: ${event.extractedFacts.delayReason}',
              style: FieldTypography.metadata.copyWith(
                color: FieldColors.danger,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
