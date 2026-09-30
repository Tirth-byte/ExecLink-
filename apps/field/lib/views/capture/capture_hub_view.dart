import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/app_typography.dart';
import '../../widgets/field_buttons.dart';
import '../../widgets/field_page_header.dart';

class CaptureHubView extends StatelessWidget {
  const CaptureHubView({super.key});

  @override
  Widget build(BuildContext context) => ListView(
    key: const PageStorageKey('capture-scroll'),
    padding: const EdgeInsets.only(bottom: 110),
    children: [
      const FieldPageHeader(
        title: 'Field Capture',
        subtitle: 'Speak naturally or update a known schedule activity.',
        padding: EdgeInsets.fromLTRB(16, 14, 16, 12),
      ),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Column(
          children: [
            // 1. Time Agent Card (Identical card geometry)
            _CaptureCard(
              tag: 'INTELLIGENT CAPTURE',
              tagColor: FieldColors.brand700,
              tagBg: FieldColors.brand50,
              tagBorder: FieldColors.brand100,
              icon: Icons.mic_rounded,
              iconBg: FieldColors.brand50,
              iconBorder: FieldColors.brand100,
              iconColor: FieldColors.brand700,
              title: 'Time Agent',
              description: 'Describe site events naturally. ExecLink extracts activities, progress, and blockers.',
              button: FieldPrimaryButton(
                text: 'Open Time Agent',
                icon: Icons.auto_awesome_rounded,
                isFullWidth: true,
                height: 44,
                onPressed: () {
                  HapticFeedback.lightImpact();
                  context.push('/time-agent');
                },
              ),
              onTap: () {
                HapticFeedback.lightImpact();
                context.push('/time-agent');
              },
            ),

            const SizedBox(height: 12),

            // 2. Quick Update Card (Identical card geometry)
            _CaptureCard(
              tag: 'DIRECT UPDATE',
              tagColor: FieldColors.textSecondary,
              tagBg: FieldColors.surfaceRaised,
              tagBorder: FieldColors.borderSubtle,
              icon: Icons.edit_note_rounded,
              iconBg: FieldColors.surfaceRaised,
              iconBorder: FieldColors.border,
              iconColor: FieldColors.text,
              title: 'Quick Update',
              description: 'Manually update progress, quantities, or report site delays against known activities.',
              button: FieldSecondaryButton(
                text: 'Open Quick Update',
                icon: Icons.edit_note_rounded,
                isFullWidth: true,
                height: 44,
                onPressed: () {
                  HapticFeedback.lightImpact();
                  context.push('/quick-update');
                },
              ),
              onTap: () {
                HapticFeedback.lightImpact();
                context.push('/quick-update');
              },
            ),
          ],
        ),
      ),
    ],
  );
}

class _CaptureCard extends StatelessWidget {
  final String tag;
  final Color tagColor;
  final Color tagBg;
  final Color tagBorder;
  final IconData icon;
  final Color iconBg;
  final Color iconBorder;
  final Color iconColor;
  final String title;
  final String description;
  final Widget button;
  final VoidCallback onTap;

  const _CaptureCard({
    required this.tag,
    required this.tagColor,
    required this.tagBg,
    required this.tagBorder,
    required this.icon,
    required this.iconBg,
    required this.iconBorder,
    required this.iconColor,
    required this.title,
    required this.description,
    required this.button,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: FieldColors.surface,
        borderRadius: BorderRadius.circular(FieldRadius.card),
        border: Border.all(color: FieldColors.border, width: 1),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(FieldRadius.card),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Tag pill
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 7,
                    vertical: 2.5,
                  ),
                  decoration: BoxDecoration(
                    color: tagBg,
                    borderRadius: BorderRadius.circular(FieldRadius.badge),
                    border: Border.all(color: tagBorder, width: 1),
                  ),
                  child: Text(
                    tag,
                    style: FieldTypography.statusText.copyWith(
                      color: tagColor,
                      fontSize: 10,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                // Icon + Info row
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: iconBg,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: iconBorder, width: 1),
                      ),
                      child: Icon(icon, color: iconColor, size: 22),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            style: FieldTypography.cardTitle.copyWith(
                              fontSize: 16.5,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            description,
                            style: FieldTypography.metadata.copyWith(
                              color: FieldColors.textSecondary,
                              height: 1.35,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // Primary / Secondary action
                button,
              ],
            ),
          ),
        ),
      ),
    );
  }
}
