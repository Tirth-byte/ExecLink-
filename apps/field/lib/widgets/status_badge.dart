import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';
import '../core/theme/app_theme.dart';
import '../core/theme/app_typography.dart';

class StatusBadge extends StatelessWidget {
  final String status;
  final bool isDense;

  const StatusBadge({super.key, required this.status, this.isDense = false});

  @override
  Widget build(BuildContext context) {
    final s = status.toLowerCase();
    final Color bg;
    final Color fg;
    final Color borderColor;
    final IconData icon;
    String label = status.toUpperCase();

    if (s == 'verified' || s == 'completed' || s == 'synced') {
      bg = FieldColors.successBg;
      fg = FieldColors.success;
      borderColor = FieldColors.successBorder;
      icon = Icons.check_circle_outline_rounded;
      if (s == 'synced') label = 'SYNCED';
      if (s == 'verified') label = 'VERIFIED';
      if (s == 'completed') label = 'COMPLETED';
    } else if (s == 'proposed' ||
        s == 'progress' ||
        s == 'in_progress' ||
        s == 'inprogress' ||
        s == 'in progress' ||
        s == 'started' ||
        s == 'syncing') {
      // Brand Blue-Teal
      bg = FieldColors.infoBg;
      fg = FieldColors.info;
      borderColor = FieldColors.infoBorder;
      icon = s == 'syncing' ? Icons.sync_rounded : Icons.schedule_rounded;
      if (s == 'proposed') label = 'MATCHED';
      if (s == 'progress' ||
          s == 'in_progress' ||
          s == 'inprogress' ||
          s == 'in progress') {
        label = 'IN PROGRESS';
      }
      if (s == 'started') label = 'STARTED';
      if (s == 'syncing') label = 'SYNCING';
    } else if (s == 'submitted' ||
        s == 'delayed' ||
        s == 'review' ||
        s == 'pending') {
      bg = FieldColors.warningBg;
      fg = FieldColors.warning;
      borderColor = FieldColors.warningBorder;
      icon = s == 'pending'
          ? Icons.cloud_queue_rounded
          : Icons.hourglass_empty_rounded;
      if (s == 'submitted') label = 'AWAITING REVIEW';
      if (s == 'delayed') label = 'DELAYED';
      if (s == 'pending') label = 'PENDING SYNC';
    } else if (s == 'rejected' ||
        s == 'blocked' ||
        s == 'failed' ||
        s == 'unmatched') {
      bg = FieldColors.dangerBg;
      fg = FieldColors.danger;
      borderColor = FieldColors.dangerBorder;
      icon = Icons.error_outline_rounded;
      if (s == 'blocked') label = 'BLOCKED';
      if (s == 'rejected') label = 'REJECTED';
      if (s == 'failed') label = 'SYNC FAILED';
      if (s == 'unmatched') label = 'UNMATCHED';
    } else {
      bg = FieldColors.surfaceRaised;
      fg = FieldColors.textSecondary;
      borderColor = FieldColors.border;
      icon = Icons.info_outline_rounded;
    }

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: isDense ? 6 : 8,
        vertical: isDense ? 2 : 3.5,
      ),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(FieldRadius.badge),
        border: Border.all(color: borderColor, width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: isDense ? 10.5 : 12, color: fg),
          const SizedBox(width: 4),
          Text(
            label,
            style: FieldTypography.statusText.copyWith(
              fontSize: isDense ? 9.5 : 11,
              color: fg,
              letterSpacing: 0.3,
            ),
          ),
        ],
      ),
    );
  }
}
