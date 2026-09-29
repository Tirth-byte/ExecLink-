import 'package:flutter/material.dart';

import '../core/theme/app_typography.dart';

class FieldSectionHeader extends StatelessWidget {
  final String title;
  final Widget? badge;
  final Widget? action;
  final EdgeInsetsGeometry padding;

  const FieldSectionHeader({
    super.key,
    required this.title,
    this.badge,
    this.action,
    this.padding = const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Flexible(
                  child: Text(
                    title,
                    style: AppTypography.sectionTitle,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                if (badge != null) ...[const SizedBox(width: 8), badge!],
              ],
            ),
          ),
          if (action != null) ...[const SizedBox(width: 8), action!],
        ],
      ),
    );
  }
}
