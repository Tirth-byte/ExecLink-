import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/theme/app_colors.dart';
import '../core/theme/app_typography.dart';

class FieldBottomNavigation extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  const FieldBottomNavigation({
    super.key,
    required this.currentIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: FieldColors.surface,
        border: Border(top: BorderSide(color: FieldColors.border, width: 1)),
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 54,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 1. TODAY TAB
              Expanded(
                child: _buildNavItem(
                  index: 0,
                  label: 'Today',
                  icon: Icons.calendar_today_outlined,
                  activeIcon: Icons.calendar_today_rounded,
                  isActive: currentIndex == 0,
                ),
              ),

              // 2. CAPTURE TAB (Subtle brand-tinted rounded container)
              Expanded(
                child: _buildCaptureNavItem(isActive: currentIndex == 1),
              ),

              // 3. HISTORY TAB
              Expanded(
                child: _buildNavItem(
                  index: 2,
                  label: 'History',
                  icon: Icons.history_rounded,
                  activeIcon: Icons.manage_history_rounded,
                  isActive: currentIndex == 2,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem({
    required int index,
    required String label,
    required IconData icon,
    required IconData activeIcon,
    required bool isActive,
  }) {
    final color = isActive ? FieldColors.action : FieldColors.textSecondary;

    return Semantics(
      label: label,
      selected: isActive,
      button: true,
      child: InkWell(
        onTap: () {
          HapticFeedback.selectionClick();
          onTap(index);
        },
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            SizedBox(
              height: 22,
              child: Icon(isActive ? activeIcon : icon, size: 20, color: color),
            ),
            const SizedBox(height: 3),
            Text(
              label,
              style: FieldTypography.metadataMedium.copyWith(
                fontSize: 11,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCaptureNavItem({required bool isActive}) {
    final textColor =
        isActive ? FieldColors.action : FieldColors.textSecondary;
    final iconColor =
        isActive ? FieldColors.brand700 : FieldColors.textSecondary;
    final bgColor =
        isActive ? FieldColors.brand50 : FieldColors.surfaceRaised;
    final borderColor =
        isActive ? FieldColors.brand100 : FieldColors.border;

    return Semantics(
      label: 'Capture',
      selected: isActive,
      button: true,
      child: InkWell(
        onTap: () {
          HapticFeedback.selectionClick();
          onTap(1);
        },
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 32,
              height: 22,
              decoration: BoxDecoration(
                color: bgColor,
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: borderColor, width: 1),
              ),
              alignment: Alignment.center,
              child: Icon(Icons.add_rounded, size: 17, color: iconColor),
            ),
            const SizedBox(height: 3),
            Text(
              'Capture',
              style: FieldTypography.metadataMedium.copyWith(
                fontSize: 11,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
                color: textColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
