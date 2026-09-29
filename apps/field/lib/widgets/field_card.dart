import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/theme/app_colors.dart';
import '../core/theme/app_theme.dart';

/// Canonical ExecLink Field Card.
///
/// Features:
/// - Crisp true white surface
/// - Neutral 1px border (#D8E2EA)
/// - 12px corner radius
/// - Flat, quiet elevation (no heavy shadows)
class FieldCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry margin;
  final Color backgroundColor;
  final double borderRadius;
  final BoxBorder? border;
  final VoidCallback? onTap;

  const FieldCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(14),
    this.margin = EdgeInsets.zero,
    this.backgroundColor = FieldColors.surface,
    this.borderRadius = FieldRadius.card,
    this.border,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveBorder = border is Border
        ? (border as Border).top
        : const BorderSide(color: FieldColors.border, width: 1);

    if (onTap != null) {
      return Padding(
        padding: margin,
        child: Material(
          color: backgroundColor,
          clipBehavior: Clip.antiAlias,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(borderRadius),
            side: effectiveBorder,
          ),
          child: InkWell(
            onTap: () {
              HapticFeedback.lightImpact();
              onTap!();
            },
            borderRadius: BorderRadius.circular(borderRadius),
            splashColor: FieldColors.action.withValues(alpha: 0.06),
            highlightColor: FieldColors.action.withValues(alpha: 0.03),
            child: Padding(padding: padding, child: child),
          ),
        ),
      );
    }

    return Container(
      margin: margin,
      padding: padding,
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(borderRadius),
        border: border ?? Border.all(color: FieldColors.border, width: 1),
      ),
      child: child,
    );
  }
}
