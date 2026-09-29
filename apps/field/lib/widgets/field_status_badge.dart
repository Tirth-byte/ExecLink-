import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';
import '../core/theme/app_theme.dart';
import '../core/theme/app_typography.dart';

/// Canonical Status Badge for ExecLink Field.
///
/// Semantics:
/// - Green: completed, verified, synced
/// - Amber: review, delay, pending sync
/// - Red: blocked, failed, error, unmatched
/// - Brand Blue-Teal: in progress, active, started
/// - Neutral: default, metadata
class FieldStatusBadge extends StatelessWidget {
  final String status;
  final bool isDense;
  final IconData? customIcon;

  const FieldStatusBadge({
    super.key,
    required this.status,
    this.isDense = false,
    this.customIcon,
  });

  @override
  Widget build(BuildContext context) {
    final Color bg;
    final Color fg;
    final Color borderColor;
    final String label;
    final IconData icon;

    switch (status.toLowerCase()) {
      case 'verified':
      case 'synced':
      case 'completed':
        bg = FieldColors.successBg;
        fg = FieldColors.success;
        borderColor = FieldColors.successBorder;
        label = status.toUpperCase();
        icon = Icons.check_circle_outline_rounded;
        break;
      case 'in_progress':
      case 'inprogress':
      case 'in progress':
      case 'active':
      case 'started':
        // Brand Blue-Teal family for In-Progress
        bg = FieldColors.infoBg;
        fg = FieldColors.info;
        borderColor = FieldColors.infoBorder;
        label = 'IN PROGRESS';
        icon = Icons.timelapse_rounded;
        break;
      case 'pending':
      case 'queued':
        bg = FieldColors.warningBg;
        fg = FieldColors.warning;
        borderColor = FieldColors.warningBorder;
        label = 'PENDING SYNC';
        icon = Icons.schedule_rounded;
        break;
      case 'review':
      case 'review required':
      case 'review_required':
      case 'submitted':
        bg = FieldColors.warningBg;
        fg = FieldColors.warning;
        borderColor = FieldColors.warningBorder;
        label = 'AWAITING REVIEW';
        icon = Icons.rate_review_outlined;
        break;
      case 'need update':
      case 'need_update':
      case 'needs_update':
      case 'requires update':
        bg = FieldColors.warningBg;
        fg = FieldColors.warning;
        borderColor = FieldColors.warningBorder;
        label = 'NEED UPDATE';
        icon = Icons.edit_note_rounded;
        break;
      case 'delayed':
        bg = FieldColors.warningBg;
        fg = FieldColors.warning;
        borderColor = FieldColors.warningBorder;
        label = 'DELAYED';
        icon = Icons.warning_amber_rounded;
        break;
      case 'blocked':
      case 'failed':
      case 'error':
      case 'rejected':
        bg = FieldColors.dangerBg;
        fg = FieldColors.danger;
        borderColor = FieldColors.dangerBorder;
        label = status == 'rejected' ? 'REJECTED' : 'BLOCKED';
        icon = Icons.error_outline_rounded;
        break;
      case 'unmatched':
        bg = FieldColors.dangerBg;
        fg = FieldColors.danger;
        borderColor = FieldColors.dangerBorder;
        label = 'UNMATCHED';
        icon = Icons.help_outline_rounded;
        break;
      default:
        bg = FieldColors.surfaceRaised;
        fg = FieldColors.textSecondary;
        borderColor = FieldColors.border;
        label = status.toUpperCase();
        icon = Icons.info_outline_rounded;
        break;
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
          Icon(customIcon ?? icon, size: isDense ? 10.5 : 12, color: fg),
          const SizedBox(width: 4),
          Text(
            label,
            style: FieldTypography.statusText.copyWith(
              fontSize: isDense ? 9.5 : 11,
              fontWeight: FontWeight.w700,
              color: fg,
              letterSpacing: 0.3,
            ),
          ),
        ],
      ),
    );
  }
}
