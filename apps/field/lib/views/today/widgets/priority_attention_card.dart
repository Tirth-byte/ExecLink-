import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/app_typography.dart';
import '../../../models/field_activity.dart';
import '../../../widgets/field_buttons.dart';
import '../../../widgets/field_status_badge.dart';

class PriorityAttentionCard extends StatelessWidget {
  final FieldActivity activity;
  final VoidCallback onUpdateStatus;
  final VoidCallback onTapCard;

  const PriorityAttentionCard({
    super.key,
    required this.activity,
    required this.onUpdateStatus,
    required this.onTapCard,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Section Label (Restrained semantic warning/attention)
          Padding(
            padding: const EdgeInsets.only(left: 2, bottom: 6),
            child: Row(
              children: [
                const Icon(
                  Icons.warning_amber_rounded,
                  size: 15,
                  color: FieldColors.danger,
                ),
                const SizedBox(width: 6),
                Text(
                  'ATTENTION REQUIRED',
                  style: FieldTypography.statusText.copyWith(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: FieldColors.danger,
                    letterSpacing: 0.6,
                  ),
                ),
              ],
            ),
          ),

          // Main Card: True White surface, neutral 1px border (NOT an all-red card!)
          Material(
            color: FieldColors.surface,
            borderRadius: BorderRadius.circular(FieldRadius.card),
            child: InkWell(
              onTap: onTapCard,
              borderRadius: BorderRadius.circular(FieldRadius.card),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(FieldRadius.card),
                  border: Border.all(color: FieldColors.border, width: 1),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header row: ID + Status Badge
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Text(
                          activity.id,
                          style: FieldTypography.monoSm.copyWith(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w700,
                            color: FieldColors.text,
                          ),
                        ),
                        const FieldStatusBadge(
                          status: 'blocked',
                          isDense: true,
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),

                    // Title
                    Text(
                      activity.title,
                      style: FieldTypography.cardTitle.copyWith(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 5),

                    // Blocker reason & context with small red indicator
                    Row(
                      children: [
                        Container(
                          width: 6,
                          height: 6,
                          decoration: const BoxDecoration(
                            color: FieldColors.danger,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            activity.blockerReason != null
                                ? 'Blocked · ${activity.blockerReason}'
                                : 'Blocked · Action required',
                            style: FieldTypography.bodySmBold.copyWith(
                              color: FieldColors.danger,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '${activity.location} · ${activity.discipline}',
                      style: FieldTypography.metadata.copyWith(
                        color: FieldColors.textMuted,
                        fontSize: 11.5,
                      ),
                    ),
                    const SizedBox(height: 10),

                    // Action Row
                    Align(
                      alignment: Alignment.centerRight,
                      child: FieldDangerButton(
                        text: 'Update Status',
                        icon: Icons.edit_note_rounded,
                        onPressed: onUpdateStatus,
                        height: 34,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
