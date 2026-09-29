import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/theme/app_colors.dart';
import '../core/theme/app_theme.dart';
import '../core/theme/app_typography.dart';

/// Canonical Primary Button (Brand 700 background, white text)
class FieldPrimaryButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool isLoading;
  final bool isFullWidth;
  final double height;
  final Color? backgroundColor;

  const FieldPrimaryButton({
    super.key,
    required this.text,
    required this.onPressed,
    this.icon,
    this.isLoading = false,
    this.isFullWidth = true,
    this.height = 48,
    this.backgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    final style = ElevatedButton.styleFrom(
      backgroundColor: backgroundColor ?? FieldColors.action,
      foregroundColor: FieldColors.surface,
      disabledBackgroundColor: FieldColors.textMuted.withValues(alpha: 0.25),
      minimumSize: Size(isFullWidth ? double.infinity : 88, height),
      padding: const EdgeInsets.symmetric(horizontal: 16),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(FieldRadius.input),
      ),
      textStyle: FieldTypography.button,
      elevation: 0,
    );

    final Widget btn;
    if (isLoading) {
      btn = ElevatedButton(
        onPressed: null,
        style: style,
        child: const SizedBox(
          width: 20,
          height: 20,
          child: CircularProgressIndicator(
            strokeWidth: 2,
            valueColor: AlwaysStoppedAnimation<Color>(FieldColors.surface),
          ),
        ),
      );
    } else if (icon != null) {
      btn = ElevatedButton.icon(
        onPressed: onPressed == null
            ? null
            : () {
                HapticFeedback.lightImpact();
                onPressed!();
              },
        style: style,
        icon: Icon(icon, size: 18),
        label: Text(text, maxLines: 1, overflow: TextOverflow.ellipsis),
      );
    } else {
      btn = ElevatedButton(
        onPressed: onPressed == null
            ? null
            : () {
                HapticFeedback.lightImpact();
                onPressed!();
              },
        style: style,
        child: Text(text, maxLines: 1, overflow: TextOverflow.ellipsis),
      );
    }

    return isFullWidth
        ? SizedBox(width: double.infinity, height: height, child: btn)
        : btn;
  }
}

/// Canonical Secondary Button (White surface, neutral border, primary text)
class FieldSecondaryButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool isFullWidth;
  final double height;

  const FieldSecondaryButton({
    super.key,
    required this.text,
    required this.onPressed,
    this.icon,
    this.isFullWidth = true,
    this.height = 48,
  });

  @override
  Widget build(BuildContext context) {
    final style = OutlinedButton.styleFrom(
      backgroundColor: FieldColors.surface,
      foregroundColor: FieldColors.text,
      side: const BorderSide(color: FieldColors.border, width: 1),
      minimumSize: Size(isFullWidth ? double.infinity : 88, height),
      padding: const EdgeInsets.symmetric(horizontal: 16),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(FieldRadius.input),
      ),
      textStyle: FieldTypography.button,
    );

    final Widget btn;
    if (icon != null) {
      btn = OutlinedButton.icon(
        onPressed: onPressed == null
            ? null
            : () {
                HapticFeedback.lightImpact();
                onPressed!();
              },
        style: style,
        icon: Icon(icon, size: 18, color: FieldColors.text),
        label: Text(text, maxLines: 1, overflow: TextOverflow.ellipsis),
      );
    } else {
      btn = OutlinedButton(
        onPressed: onPressed == null
            ? null
            : () {
                HapticFeedback.lightImpact();
                onPressed!();
              },
        style: style,
        child: Text(text, maxLines: 1, overflow: TextOverflow.ellipsis),
      );
    }

    return isFullWidth
        ? SizedBox(width: double.infinity, height: height, child: btn)
        : btn;
  }
}

/// Canonical Subtle / Tonal Button (Brand 50 background, Brand 700 text/icon)
class FieldSubtleButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool isFullWidth;
  final double height;
  final EdgeInsetsGeometry? padding;

  const FieldSubtleButton({
    super.key,
    required this.text,
    required this.onPressed,
    this.icon,
    this.isFullWidth = false,
    this.height = 38,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    final style = ElevatedButton.styleFrom(
      backgroundColor: FieldColors.brand50,
      foregroundColor: FieldColors.brand700,
      elevation: 0,
      minimumSize: Size(isFullWidth ? double.infinity : 64, height),
      padding: padding ?? const EdgeInsets.symmetric(horizontal: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(FieldRadius.control),
        side: const BorderSide(color: FieldColors.brand100, width: 1),
      ),
      textStyle: FieldTypography.bodySmBold.copyWith(
        color: FieldColors.brand700,
        fontSize: 12,
      ),
    );

    final Widget btn;
    if (icon != null) {
      btn = ElevatedButton.icon(
        onPressed: onPressed == null
            ? null
            : () {
                HapticFeedback.lightImpact();
                onPressed!();
              },
        style: style,
        icon: Icon(icon, size: 15, color: FieldColors.brand700),
        label: Text(text, maxLines: 1, overflow: TextOverflow.ellipsis),
      );
    } else {
      btn = ElevatedButton(
        onPressed: onPressed == null
            ? null
            : () {
                HapticFeedback.lightImpact();
                onPressed!();
              },
        style: style,
        child: Text(text, maxLines: 1, overflow: TextOverflow.ellipsis),
      );
    }

    return isFullWidth
        ? SizedBox(width: double.infinity, height: height, child: btn)
        : btn;
  }
}

/// Canonical Danger Action Button (Destructive / Blocker updates)
class FieldDangerButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool isFullWidth;
  final double height;

  const FieldDangerButton({
    super.key,
    required this.text,
    required this.onPressed,
    this.icon,
    this.isFullWidth = false,
    this.height = 38,
  });

  @override
  Widget build(BuildContext context) {
    final style = OutlinedButton.styleFrom(
      backgroundColor: FieldColors.dangerBg,
      foregroundColor: FieldColors.danger,
      side: const BorderSide(color: FieldColors.dangerBorder, width: 1),
      minimumSize: Size(isFullWidth ? double.infinity : 64, height),
      padding: const EdgeInsets.symmetric(horizontal: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(FieldRadius.control),
      ),
      textStyle: FieldTypography.bodySmBold.copyWith(
        color: FieldColors.danger,
        fontSize: 12,
      ),
    );

    final Widget btn;
    if (icon != null) {
      btn = OutlinedButton.icon(
        onPressed: onPressed == null
            ? null
            : () {
                HapticFeedback.lightImpact();
                onPressed!();
              },
        style: style,
        icon: Icon(icon, size: 15, color: FieldColors.danger),
        label: Text(text, maxLines: 1, overflow: TextOverflow.ellipsis),
      );
    } else {
      btn = OutlinedButton(
        onPressed: onPressed == null
            ? null
            : () {
                HapticFeedback.lightImpact();
                onPressed!();
              },
        style: style,
        child: Text(text, maxLines: 1, overflow: TextOverflow.ellipsis),
      );
    }

    return isFullWidth
        ? SizedBox(width: double.infinity, height: height, child: btn)
        : btn;
  }
}
