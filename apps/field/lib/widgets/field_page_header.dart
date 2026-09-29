import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';
import '../core/theme/app_typography.dart';

class FieldPageHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final Widget? action;
  final EdgeInsetsGeometry padding;

  const FieldPageHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.action,
    this.padding = const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding,
      child: action == null
          ? _HeaderText(title: title, subtitle: subtitle)
          : Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: _HeaderText(title: title, subtitle: subtitle),
                ),
                if (action != null) ...[const SizedBox(width: 12), action!],
              ],
            ),
    );
  }
}

class _HeaderText extends StatelessWidget {
  const _HeaderText({required this.title, this.subtitle});
  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    mainAxisSize: MainAxisSize.min,
    children: [
      Text(
        title,
        maxLines: 2,
        softWrap: true,
        style: AppTypography.pageTitle.copyWith(
          fontSize: MediaQuery.sizeOf(context).width < 360 ? 24 : 28,
        ),
      ),
      if (subtitle != null && subtitle!.isNotEmpty) ...[
        const SizedBox(height: 3),
        Text(
          subtitle!,
          softWrap: true,
          style: AppTypography.metadata.copyWith(
            color: AppColors.textSecondary,
          ),
        ),
      ],
    ],
  );
}
