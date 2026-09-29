import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/app_typography.dart';

class ShiftSummaryBar extends StatelessWidget {
  final int totalCount;
  final int completedCount;
  final int needUpdateCount;
  final int blockedCount;
  final Function(String filter)? onSelectFilter;

  const ShiftSummaryBar({
    super.key,
    required this.totalCount,
    required this.completedCount,
    required this.needUpdateCount,
    required this.blockedCount,
    this.onSelectFilter,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
      decoration: BoxDecoration(
        color: FieldColors.surface,
        borderRadius: BorderRadius.circular(FieldRadius.card),
        border: Border.all(color: FieldColors.border, width: 1),
      ),
      child: Row(
        children: [
          _buildSummaryItem(
            count: '$totalCount',
            label: 'Assigned',
            countColor: FieldColors.text,
            labelColor: FieldColors.textSecondary,
            onTap: () => onSelectFilter?.call('all'),
          ),
          _buildDivider(),
          _buildSummaryItem(
            count: '$completedCount',
            label: 'Completed',
            countColor: FieldColors.success,
            labelColor: FieldColors.textSecondary,
            onTap: () => onSelectFilter?.call('completed'),
          ),
          _buildDivider(),
          _buildSummaryItem(
            count: '$needUpdateCount',
            label: 'Need Update',
            countColor: FieldColors.warning,
            labelColor: FieldColors.warning,
            isEmphasized: true,
            onTap: () => onSelectFilter?.call('needUpdate'),
          ),
          _buildDivider(),
          _buildSummaryItem(
            count: '$blockedCount',
            label: 'Blocked',
            countColor: FieldColors.danger,
            labelColor: FieldColors.danger,
            isEmphasized: true,
            onTap: () => onSelectFilter?.call('needUpdate'),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryItem({
    required String count,
    required String label,
    required Color countColor,
    required Color labelColor,
    bool isEmphasized = false,
    VoidCallback? onTap,
  }) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(FieldRadius.control),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 2, horizontal: 2),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                count,
                style: FieldTypography.monoSm.copyWith(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: countColor,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                label,
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontFamily: FieldTypography.fontFamily,
                  fontSize: 10.5,
                  fontWeight: isEmphasized ? FontWeight.w600 : FontWeight.w500,
                  color: labelColor,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDivider() {
    return Container(
      width: 1,
      height: 22,
      color: FieldColors.borderSubtle,
    );
  }
}
