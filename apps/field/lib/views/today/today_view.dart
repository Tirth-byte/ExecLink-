import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/constants/project_context.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/app_typography.dart';
import '../../providers/today_work_provider.dart';
import '../../widgets/field_buttons.dart';
import '../../widgets/field_page_header.dart';
import 'widgets/today_activity_card.dart';

class TodayView extends ConsumerWidget {
  const TodayView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final activities = ref.watch(filteredTodayActivitiesProvider);
    final filter = ref.watch(todayFilterProvider);

    return CustomScrollView(
      key: const PageStorageKey('today-scroll'),
      slivers: [
        const SliverToBoxAdapter(
          child: FieldPageHeader(
            title: "Today's Work",
            subtitle: 'Sunday, 28 Sep 2026 · ${ProjectContext.defaultShift}',
            padding: EdgeInsets.fromLTRB(16, 12, 16, 4),
          ),
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 2, 16, 6),
            child: Container(
              height: 48,
              padding: const EdgeInsets.all(3),
              decoration: BoxDecoration(
                color: FieldColors.surfaceRaised,
                borderRadius: BorderRadius.circular(FieldRadius.input),
                border: Border.all(color: FieldColors.borderSubtle, width: 1),
              ),
              child: Stack(
                children: [
                  Positioned.fill(
                    child: AnimatedAlign(
                      duration: const Duration(milliseconds: 180),
                      curve: Curves.easeOutCubic,
                      alignment: filter == ActivityFilter.all
                          ? Alignment.centerLeft
                          : filter == ActivityFilter.needUpdate
                          ? Alignment.center
                          : Alignment.centerRight,
                      child: FractionallySizedBox(
                        widthFactor: 1 / 3,
                        child: Container(
                          decoration: BoxDecoration(
                            color: FieldColors.brand50,
                            borderRadius: BorderRadius.circular(
                              FieldRadius.control,
                            ),
                            border: Border.all(
                              color: FieldColors.brand100,
                              width: 1,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  Row(
                    children: [
                      Expanded(
                        child: _FilterSegment(
                          label: 'All',
                          selected: filter == ActivityFilter.all,
                          onTap: () {
                            HapticFeedback.selectionClick();
                            ref.read(todayFilterProvider.notifier).state =
                                ActivityFilter.all;
                          },
                        ),
                      ),
                      Expanded(
                        child: _FilterSegment(
                          label: 'Needs update',
                          selected: filter == ActivityFilter.needUpdate,
                          onTap: () {
                            HapticFeedback.selectionClick();
                            ref.read(todayFilterProvider.notifier).state =
                                ActivityFilter.needUpdate;
                          },
                        ),
                      ),
                      Expanded(
                        child: _FilterSegment(
                          label: 'Completed',
                          selected: filter == ActivityFilter.completed,
                          onTap: () {
                            HapticFeedback.selectionClick();
                            ref.read(todayFilterProvider.notifier).state =
                                ActivityFilter.completed;
                          },
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
        const SliverToBoxAdapter(
          child: Padding(
            padding: EdgeInsets.fromLTRB(16, 2, 16, 4),
            child: Text(
              "Today's Activities",
              style: FieldTypography.sectionTitle,
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: AnimatedSize(
            duration: const Duration(milliseconds: 180),
            curve: Curves.easeOutCubic,
            alignment: Alignment.topCenter,
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 180),
              switchInCurve: Curves.easeOutCubic,
              switchOutCurve: Curves.easeOutCubic,
              transitionBuilder: (child, animation) {
                return FadeTransition(
                  opacity: animation,
                  child: SlideTransition(
                    position: Tween<Offset>(
                      begin: const Offset(0.0, 0.03),
                      end: Offset.zero,
                    ).animate(
                      CurvedAnimation(
                        parent: animation,
                        curve: Curves.easeOutCubic,
                      ),
                    ),
                    child: child,
                  ),
                );
              },
              child: activities.isEmpty
                  ? _EmptyToday(
                      key: ValueKey('empty-${filter.name}'),
                      onRecord: () => context.push('/quick-update'),
                    )
                  : Column(
                      key: ValueKey('list-${filter.name}'),
                      children: activities.map((activity) {
                        return TodayActivityCard(
                          key: ValueKey(activity.id),
                          activity: activity,
                          onTapCard: () => context.push(
                            '/quick-update?activityId=${activity.id}',
                          ),
                          onUpdate: () => context.push(
                            '/quick-update?activityId=${activity.id}',
                          ),
                        );
                      }).toList(),
                    ),
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 110),
            child: FieldSecondaryButton(
              text: 'Record unplanned work',
              icon: Icons.add_rounded,
              onPressed: () {
                HapticFeedback.lightImpact();
                context.push('/quick-update');
              },
            ),
          ),
        ),
      ],
    );
  }
}

class _FilterSegment extends StatelessWidget {
  const _FilterSegment({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
    selected: selected,
    button: true,
    child: Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(FieldRadius.control),
        child: SizedBox(
          height: 38,
          child: Center(
            child: AnimatedDefaultTextStyle(
              duration: const Duration(milliseconds: 180),
              curve: Curves.easeOutCubic,
              style: FieldTypography.bodySmBold.copyWith(
                fontSize: 12,
                color: selected
                    ? FieldColors.brand700
                    : FieldColors.textSecondary,
              ),
              child: Text(label, textAlign: TextAlign.center),
            ),
          ),
        ),
      ),
    ),
  );
}

class _EmptyToday extends StatelessWidget {
  const _EmptyToday({super.key, required this.onRecord});
  final VoidCallback onRecord;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
    child: Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: FieldColors.surface,
        borderRadius: BorderRadius.circular(FieldRadius.card),
        border: Border.all(color: FieldColors.border, width: 1),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.event_available_outlined,
            color: FieldColors.textSecondary,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'No scheduled activities for this shift.',
                  style: FieldTypography.bodyBold,
                ),
                const SizedBox(height: 2),
                Text(
                  'Unexpected work can still be captured and routed for review.',
                  style: FieldTypography.metadata.copyWith(
                    color: FieldColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
          TextButton(
            onPressed: onRecord,
            child: const Text(
              'Record work',
              style: TextStyle(color: FieldColors.action),
            ),
          ),
        ],
      ),
    ),
  );
}
