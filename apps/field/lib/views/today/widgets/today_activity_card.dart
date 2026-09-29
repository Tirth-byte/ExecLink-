import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/app_typography.dart';
import '../../../models/field_activity.dart';
import '../../../widgets/field_buttons.dart';
import '../../../widgets/field_status_badge.dart';

class TodayActivityCard extends StatelessWidget {
  final FieldActivity activity;
  final VoidCallback onTapCard;
  final VoidCallback onUpdate;

  const TodayActivityCard({
    super.key,
    required this.activity,
    required this.onTapCard,
    required this.onUpdate,
  });

  @override
  Widget build(BuildContext context) {
    final statusString = _resolveStatusString(activity.status);

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Material(
        color: FieldColors.surface,
        borderRadius: BorderRadius.circular(FieldRadius.card),
        child: InkWell(
          onTap: onTapCard,
          borderRadius: BorderRadius.circular(FieldRadius.card),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(FieldRadius.card),
              border: Border.all(color: FieldColors.border, width: 1),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                // 1. Header: Activity ID & Status Badge
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      activity.id,
                      style: FieldTypography.monoSm.copyWith(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: FieldColors.text,
                      ),
                    ),
                    FieldStatusBadge(status: statusString, isDense: true),
                  ],
                ),
                const SizedBox(height: 5),

                // 2. Activity Title
                Text(
                  activity.title,
                  style: FieldTypography.cardTitle.copyWith(
                    fontSize: 14.5,
                    height: 1.25,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 3),

                // 3. Discipline · Asset/Tag · Location
                Text(
                  '${activity.discipline} · ${activity.assetTag}',
                  style: FieldTypography.metadata.copyWith(
                    color: FieldColors.textMuted,
                    fontSize: 11.5,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  activity.location,
                  style: FieldTypography.metadata.copyWith(
                    color: FieldColors.textMuted,
                    fontSize: 11.5,
                  ),
                  maxLines: 2,
                  softWrap: true,
                ),

                // 4. Planned Today text if present
                if (activity.plannedTodayText != null) ...[
                  const SizedBox(height: 5),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 3.5,
                    ),
                    decoration: BoxDecoration(
                      color: FieldColors.surfaceRaised,
                      borderRadius: BorderRadius.circular(FieldRadius.badge),
                      border: Border.all(
                        color: FieldColors.borderSubtle,
                        width: 1,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.assignment_outlined,
                          size: 12,
                          color: FieldColors.textMuted,
                        ),
                        const SizedBox(width: 5),
                        Flexible(
                          child: Text(
                            activity.plannedTodayText!,
                            style: FieldTypography.metadata.copyWith(
                              fontSize: 11,
                              color: FieldColors.text,
                            ),
                            maxLines: 2,
                            softWrap: true,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                // 5. Progress Indicator (Normalized height & brand/success color)
                const SizedBox(height: 7),
                if (!activity.isBlocked) ...[
                  Row(
                    children: [
                      Expanded(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(3),
                          child: LinearProgressIndicator(
                            value: activity.progress / 100.0,
                            minHeight: 5,
                            backgroundColor: FieldColors.surfaceRaised,
                            color: activity.isCompleted
                                ? FieldColors.success
                                : FieldColors.action,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '${activity.progress}%',
                        style: FieldTypography.monoSm.copyWith(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: activity.isCompleted
                              ? FieldColors.success
                              : FieldColors.text,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 7),
                ],

                // 6. Footer: Metadata (verification/update) & Action CTA
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // Last update / verification metadata
                    Flexible(
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            activity.isCompleted
                                ? Icons.verified_outlined
                                : Icons.schedule_rounded,
                            size: 12,
                            color: activity.isCompleted
                                ? FieldColors.success
                                : FieldColors.textMuted,
                          ),
                          const SizedBox(width: 4),
                          Flexible(
                            child: Text(
                              activity.isCompleted
                                  ? 'Verified by planner'
                                  : activity.lastUpdated == 'Yesterday'
                                  ? 'Updated yesterday'
                                  : 'Updated ${activity.lastUpdated}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: FieldTypography.metadata.copyWith(
                                fontSize: 11,
                                color: activity.isCompleted
                                    ? FieldColors.textSecondary
                                    : FieldColors.textMuted,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),

                    // Action CTA (No duplicate state, brand-tinted or danger button)
                    _buildActionButton(context),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildActionButton(BuildContext context) {
    if (activity.isCompleted) {
      // Completed card: do NOT repeat "Completed" badge twice.
      // Top status is COMPLETED. Bottom row indicates execution verification lineage.
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
        decoration: BoxDecoration(
          color: FieldColors.surfaceRaised,
          borderRadius: BorderRadius.circular(FieldRadius.badge),
          border: Border.all(color: FieldColors.border, width: 1),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.check_circle_rounded,
              size: 12,
              color: FieldColors.success,
            ),
            const SizedBox(width: 4),
            Text(
              '100% Executed',
              style: FieldTypography.monoSm.copyWith(
                fontSize: 10.5,
                fontWeight: FontWeight.w600,
                color: FieldColors.textSecondary,
                letterSpacing: 0.2,
              ),
            ),
          ],
        ),
      );
    }

    if (activity.isBlocked) {
      // Blocked card CTA: calm danger button
      return FieldDangerButton(
        text: 'Update Status',
        icon: Icons.edit_note_rounded,
        onPressed: onUpdate,
        height: 34,
      );
    }

    // In Progress / Needs Update: Brand 50 background + Brand 700 text (restrained, elegant)
    return FieldSubtleButton(
      text: 'Update',
      icon: Icons.edit_note_rounded,
      onPressed: onUpdate,
      height: 34,
      padding: const EdgeInsets.symmetric(horizontal: 10),
    );
  }

  String _resolveStatusString(FieldActivityStatus status) {
    switch (status) {
      case FieldActivityStatus.inProgress:
        return 'in progress';
      case FieldActivityStatus.completed:
        return 'completed';
      case FieldActivityStatus.blocked:
        return 'blocked';
      case FieldActivityStatus.needUpdate:
        return 'need update';
    }
  }
}
