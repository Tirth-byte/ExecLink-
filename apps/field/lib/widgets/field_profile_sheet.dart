import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/constants/project_context.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_theme.dart';
import '../core/theme/app_typography.dart';

/// Native iOS-inspired profile bottom sheet.
///
/// Presentation-only. All values are supplied by the caller so the sheet never
/// reaches into auth or project state itself.
class FieldProfileSheet extends StatelessWidget {
  final String operatorName;
  final String operatorRole;
  final String projectName;
  final String projectId;
  final String reportingScope;
  final String shift;
  final String controlsLineage;
  final VoidCallback onClose;
  final VoidCallback? onSignOut;

  const FieldProfileSheet({
    super.key,
    required this.operatorName,
    required this.operatorRole,
    required this.projectName,
    required this.projectId,
    required this.reportingScope,
    required this.shift,
    required this.controlsLineage,
    required this.onClose,
    this.onSignOut,
  });

  static Future<void> show({
    required BuildContext context,
    required String operatorName,
    required String operatorRole,
    required String projectName,
    required String projectId,
    required String reportingScope,
    String shift = ProjectContext.defaultShift,
    String controlsLineage = ProjectContext.defaultControlsLineage,
    VoidCallback? onSignOut,
  }) {
    HapticFeedback.lightImpact();

    return showModalBottomSheet<void>(
      context: context,
      useRootNavigator: true,
      backgroundColor: Colors.transparent,
      barrierColor: FieldColors.text.withValues(alpha: 0.42),
      isScrollControlled: true,
      enableDrag: true,
      isDismissible: true,
      constraints: const BoxConstraints(maxWidth: 560),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      clipBehavior: Clip.antiAlias,
      sheetAnimationStyle: const AnimationStyle(
        duration: Duration(milliseconds: 240),
        curve: Curves.easeOutCubic,
        reverseDuration: Duration(milliseconds: 200),
        reverseCurve: Curves.easeOutCubic,
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom,
          ),
          child: SafeArea(
            top: false,
            child: FieldProfileSheet(
              operatorName: operatorName,
              operatorRole: operatorRole,
              projectName: projectName,
              projectId: projectId,
              reportingScope: reportingScope,
              shift: shift,
              controlsLineage: controlsLineage,
              onClose: () => Navigator.of(ctx).pop(),
              onSignOut: onSignOut == null
                  ? null
                  : () => _confirmSignOut(ctx, onSignOut),
            ),
          ),
        );
      },
    );
  }

  /// Guards sign-out behind an explicit confirmation so a mis-tap can never end
  /// the session. The caller supplies the real logout implementation; this only
  /// decides whether to invoke it.
  static Future<void> _confirmSignOut(
    BuildContext context,
    VoidCallback onSignOut,
  ) async {
    final navigator = Navigator.of(context);
    final shouldSignOut = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: FieldColors.surface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        titlePadding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
        contentPadding: const EdgeInsets.fromLTRB(20, 10, 20, 0),
        actionsPadding: const EdgeInsets.fromLTRB(16, 8, 16, 14),
        title: Text(
          'Sign out of ExecLink?',
          style: AppTypography.cardTitle.copyWith(
            fontSize: 16.5,
            fontWeight: FontWeight.w700,
          ),
        ),
        content: Text(
          'Any safely queued field updates remain on this device.',
          style: FieldTypography.metadata.copyWith(
            fontSize: 13.5,
            color: FieldColors.textSecondary,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            style: TextButton.styleFrom(
              foregroundColor: FieldColors.textSecondary,
              textStyle: FieldTypography.button.copyWith(fontSize: 14.5),
            ),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            style: TextButton.styleFrom(
              foregroundColor: FieldColors.danger,
              textStyle: FieldTypography.button.copyWith(
                fontSize: 14.5,
                color: FieldColors.danger,
              ),
            ),
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );

    if (shouldSignOut == true) {
      // Dismiss the sheet before the caller's logout triggers a route redirect.
      // Captured before the await so no BuildContext crosses the async gap.
      navigator.pop();
      onSignOut();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: FieldColors.surface,
      child: SingleChildScrollView(
        physics: const ClampingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(22, 10, 22, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const _DragHandle(),
            const SizedBox(height: 16),
            _IdentityHeader(
              name: operatorName,
              role: operatorRole,
              projectLine: _projectLine(projectName, reportingScope),
            ),
            const SizedBox(height: 16),
            const _SectionDivider(),
            const SizedBox(height: 14),
            const _SectionEyebrow('Assignment'),
            const SizedBox(height: 8),
            _AssignmentCard(
              projectName: projectName,
              projectId: projectId,
              reportingScope: reportingScope,
              shift: shift,
            ),
            const SizedBox(height: 10),
            _LineageCard(lineage: controlsLineage),
            const SizedBox(height: 18),
            _SheetActions(onClose: onClose, onSignOut: onSignOut),
          ],
        ),
      ),
    );
  }

  /// Keeps the identity line to `Project · Area` so it never crowds the right
  /// edge. The full discipline-qualified scope already appears under
  /// Reporting scope, so repeating it here would be noise.
  static String _projectLine(String projectName, String reportingScope) {
    final area = reportingScope.split('·').first.trim();
    if (area.isEmpty || area == reportingScope.trim()) return projectName;
    return '$projectName · $area';
  }
}

// -----------------------------------------------------------------------------
// Structure
// -----------------------------------------------------------------------------

class _DragHandle extends StatelessWidget {
  const _DragHandle();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        width: 36,
        height: 4,
        decoration: BoxDecoration(
          color: FieldColors.border,
          borderRadius: BorderRadius.circular(2),
        ),
      ),
    );
  }
}

class _SectionDivider extends StatelessWidget {
  const _SectionDivider();

  @override
  Widget build(BuildContext context) {
    return Container(height: 1, color: FieldColors.borderSubtle);
  }
}

class _SectionEyebrow extends StatelessWidget {
  final String text;
  const _SectionEyebrow(this.text);

  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      style: FieldTypography.statusText.copyWith(
        fontSize: 11,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.9,
        color: FieldColors.textMuted,
      ),
    );
  }
}

// -----------------------------------------------------------------------------
// Identity
// -----------------------------------------------------------------------------

class _IdentityHeader extends StatelessWidget {
  final String name;
  final String role;
  final String projectLine;

  const _IdentityHeader({
    required this.name,
    required this.role,
    required this.projectLine,
  });

  @override
  Widget build(BuildContext context) {
    final initial = name.trim().isNotEmpty ? name.trim()[0].toUpperCase() : 'U';

    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: FieldColors.actionBg,
            shape: BoxShape.circle,
            border: Border.all(color: FieldColors.actionBorder, width: 1),
          ),
          alignment: Alignment.center,
          child: Text(
            initial,
            style: FieldTypography.cardTitle.copyWith(
              fontSize: 17,
              fontWeight: FontWeight.w700,
              color: FieldColors.action,
            ),
          ),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                name,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: FieldTypography.sectionTitle.copyWith(
                  fontSize: 21,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.4,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                role,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: AppTypography.bodyMedium.copyWith(
                  fontSize: 14.5,
                  color: FieldColors.textSecondary,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                projectLine,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: FieldTypography.metadata.copyWith(
                  fontSize: 12,
                  color: FieldColors.textMuted,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// -----------------------------------------------------------------------------
// Assignment
// -----------------------------------------------------------------------------

class _AssignmentCard extends StatelessWidget {
  final String projectName;
  final String projectId;
  final String reportingScope;
  final String shift;

  const _AssignmentCard({
    required this.projectName,
    required this.projectId,
    required this.reportingScope,
    required this.shift,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: FieldColors.surfaceMuted,
        borderRadius: BorderRadius.circular(FieldRadius.card),
        border: Border.all(color: FieldColors.borderSubtle, width: 1),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 18),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        // Without this the rows are centred, because a Column defaults to
        // CrossAxisAlignment.center.
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _AssignmentRow(label: 'Project', value: projectName),
          const _RowDivider(),
          _AssignmentRow(label: 'Project ID', value: projectId, isMono: true),
          const _RowDivider(),
          _AssignmentRow(label: 'Reporting scope', value: reportingScope),
          const _RowDivider(),
          _AssignmentRow(label: 'Current shift', value: shift, isLast: true),
        ],
      ),
    );
  }
}

class _RowDivider extends StatelessWidget {
  const _RowDivider();

  @override
  Widget build(BuildContext context) {
    return Container(height: 1, color: FieldColors.borderSubtle);
  }
}

/// Label above value so long values wrap naturally and never clip or crowd the
/// right edge on narrow iPhones. Everything shares one left edge.
class _AssignmentRow extends StatelessWidget {
  final String label;
  final String value;
  final bool isMono;
  final bool isLast;

  const _AssignmentRow({
    required this.label,
    required this.value,
    this.isMono = false,
    this.isLast = false,
  });

  @override
  Widget build(BuildContext context) {
    final valueStyle = isMono
        ? AppTypography.mono.copyWith(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: FieldColors.text,
            height: 1.3,
          )
        : AppTypography.bodyMedium.copyWith(
            fontSize: 15.5,
            fontWeight: FontWeight.w600,
            color: FieldColors.text,
            height: 1.3,
          );

    return Padding(
      padding: EdgeInsets.only(top: isLast ? 9 : 10, bottom: isLast ? 9 : 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            textAlign: TextAlign.left,
            style: FieldTypography.metadataMedium.copyWith(
              fontSize: 12.5,
              fontWeight: FontWeight.w500,
              color: FieldColors.textMuted,
            ),
          ),
          const SizedBox(height: 5),
          Text(
            value.isEmpty ? '—' : value,
            textAlign: TextAlign.left,
            style: valueStyle,
          ),
        ],
      ),
    );
  }
}

// -----------------------------------------------------------------------------
// Controls lineage
// -----------------------------------------------------------------------------

class _LineageCard extends StatelessWidget {
  final String lineage;
  const _LineageCard({required this.lineage});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
      decoration: BoxDecoration(
        color: FieldColors.successBg,
        borderRadius: BorderRadius.circular(FieldRadius.control),
        border: Border.all(color: FieldColors.successBorder, width: 1),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Icon(Icons.verified_rounded, size: 16, color: FieldColors.success),
          const SizedBox(width: 9),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Controls lineage',
                  style: FieldTypography.metadataMedium.copyWith(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                    color: FieldColors.success,
                  ),
                ),
                const SizedBox(height: 1),
                Text(
                  lineage,
                  style: FieldTypography.metadata.copyWith(
                    fontSize: 12.5,
                    color: FieldColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// -----------------------------------------------------------------------------
// Actions
// -----------------------------------------------------------------------------

class _SheetActions extends StatelessWidget {
  final VoidCallback onClose;
  final VoidCallback? onSignOut;

  const _SheetActions({required this.onClose, this.onSignOut});

  @override
  Widget build(BuildContext context) {
    final canSignOut = onSignOut != null;

    return SizedBox(
      width: double.infinity,
      child: Row(
        children: [
          Expanded(
            child: SizedBox(
              height: 50,
              child: OutlinedButton(
                onPressed: onClose,
                style: OutlinedButton.styleFrom(
                  backgroundColor: FieldColors.surface,
                  foregroundColor: FieldColors.text,
                  side: const BorderSide(color: FieldColors.border, width: 1),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(13),
                  ),
                  textStyle: FieldTypography.button.copyWith(fontSize: 14.5),
                ),
                child: const Text('Close'),
              ),
            ),
          ),
          if (canSignOut) ...[
            const SizedBox(width: 12),
            Expanded(
              child: SizedBox(
                height: 50,
                child: OutlinedButton.icon(
                  onPressed: onSignOut,
                  icon: const Icon(Icons.logout_rounded, size: 17),
                  label: const Text('Sign Out'),
                  style: OutlinedButton.styleFrom(
                    backgroundColor: FieldColors.dangerBg,
                    foregroundColor: FieldColors.danger,
                    side: const BorderSide(
                      color: FieldColors.dangerBorder,
                      width: 1,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(13),
                    ),
                    textStyle: FieldTypography.button.copyWith(
                      fontSize: 14.5,
                      color: FieldColors.danger,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
