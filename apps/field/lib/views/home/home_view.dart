import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../models/execution_event.dart';
import '../../models/schedule_activity.dart';
import '../../providers/field_providers.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/status_badge.dart';

class HomeView extends ConsumerStatefulWidget {
  const HomeView({super.key});

  @override
  ConsumerState<HomeView> createState() => _HomeViewState();
}

class _HomeViewState extends ConsumerState<HomeView> {
  String _activityFilter = 'all'; // all, structural, mechanical, electrical

  void _showSyncQueueSheet(
    BuildContext context,
    List<ExecutionEvent> events,
    bool isOffline,
  ) {
    final pendingEvents = events
        .where(
          (e) =>
              e.syncStatus == SyncStatus.pending ||
              e.syncStatus == SyncStatus.failed,
        )
        .toList();

    showModalBottomSheet(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.65,
        minChildSize: 0.4,
        maxChildSize: 0.9,
        builder: (_, scrollController) => Container(
          decoration: const BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
          ),
          child: ListView(
            controller: scrollController,
            padding: const EdgeInsets.all(20),
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Offline SQLite Queue', style: AppTypography.titleLg),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 3,
                    ),
                    decoration: BoxDecoration(
                      color: isOffline
                          ? AppColors.warningBg
                          : AppColors.successBg,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      isOffline ? 'OFFLINE SIM' : 'CONNECTED',
                      style: AppTypography.monoSm.copyWith(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: isOffline
                            ? AppColors.warning
                            : AppColors.success,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                '${pendingEvents.length} items currently stored in local SQLite queue awaiting server handshake.',
                style: AppTypography.bodySm.copyWith(
                  color: AppColors.textMuted,
                ),
              ),
              const Divider(height: 24),
              if (pendingEvents.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 24),
                  child: Center(
                    child: Column(
                      children: [
                        Icon(
                          Icons.cloud_done,
                          size: 40,
                          color: AppColors.success,
                        ),
                        SizedBox(height: 8),
                        Text('All field updates synchronized with server!'),
                      ],
                    ),
                  ),
                )
              else
                ...pendingEvents.map(
                  (ev) => Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceMuted,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              ev.clientEventId,
                              style: AppTypography.monoSm.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            StatusBadge(
                              status: ev.syncStatus == SyncStatus.failed
                                  ? 'failed'
                                  : 'pending',
                              isDense: true,
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(ev.evidence.text, style: AppTypography.bodySmBold),
                        if (ev.syncError != null) ...[
                          const SizedBox(height: 4),
                          Text(
                            'Last retry error: ${ev.syncError}',
                            style: AppTypography.bodySm.copyWith(
                              color: AppColors.danger,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              const SizedBox(height: 16),
              if (!isOffline && pendingEvents.isNotEmpty)
                SizedBox(
                  width: double.infinity,
                  height: 46,
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.sync),
                    label: const Text('FORCE SYNC ALL NOW'),
                    onPressed: () async {
                      Navigator.of(ctx).pop();
                      final count = await ref
                          .read(eventsProvider)
                          .syncAllPending();
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                              'Successfully synchronized $count items!',
                            ),
                          ),
                        );
                      }
                    },
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final activitiesNotifier = ref.watch(activitiesProvider);
    final eventsNotifier = ref.watch(eventsProvider);
    final offlineNotifier = ref.watch(offlineModeProvider);

    final activities = activitiesNotifier.activities;
    final events = eventsNotifier.events;
    final isOffline = offlineNotifier.isOffline;

    final pendingCount = events
        .where(
          (e) =>
              e.syncStatus == SyncStatus.pending ||
              e.syncStatus == SyncStatus.failed,
        )
        .length;
    final delayedOrBlocked = events
        .where(
          (e) =>
              e.extractedFacts.eventType == 'delayed' ||
              e.extractedFacts.eventType == 'blocked' ||
              (e.extractedFacts.delayReason != null &&
                  e.extractedFacts.delayReason!.isNotEmpty),
        )
        .toList();

    final filteredActivities = activities.where((act) {
      if (_activityFilter == 'all') return true;
      return act.discipline.toLowerCase() == _activityFilter;
    }).toList();

    final user = ref.watch(authProvider).user;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Text('ExecLink Field'),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 6,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.actionBg,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    'PRJ-METRO-001',
                    style: AppTypography.monoSm.copyWith(
                      fontSize: 10,
                      color: AppColors.action,
                    ),
                  ),
                ),
              ],
            ),
            Text(
              user != null
                  ? '${user.role}: ${user.name} | ${user.projectName} | ${user.reportingScope}'
                  : 'Supervisor: Asha | Today: Sep 26, 2026',
              style: AppTypography.bodySm.copyWith(color: AppColors.textMuted),
            ),
          ],
        ),
        actions: [
          Row(
            children: [
              Text(
                isOffline ? 'Offline' : 'Online',
                style: AppTypography.bodySmBold.copyWith(
                  color: isOffline ? AppColors.warning : AppColors.success,
                  fontSize: 12,
                ),
              ),
              Switch(
                value: isOffline,
                activeThumbColor: AppColors.warning,
                onChanged: (val) {
                  ref.read(offlineModeProvider.notifier).setOffline(val);
                  ref.read(eventsProvider.notifier).toggleOffline(val);
                },
              ),
              const SizedBox(width: 8),
              IconButton(
                icon: const Icon(Icons.logout, size: 20),
                onPressed: () => ref.read(authProvider.notifier).logout(),
              ),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await ref.read(activitiesProvider).loadActivities();
          await ref.read(eventsProvider).syncAllPending();
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // 1. Sync Banner
            InkWell(
              onTap: () => _showSyncQueueSheet(context, events, isOffline),
              borderRadius: BorderRadius.circular(8),
              child: _buildSyncBanner(context, ref, isOffline, pendingCount),
            ),
            const SizedBox(height: 16),

            // 2. Primary Fast Capture Actions
            Row(
              children: [
                Expanded(
                  child: _buildActionTile(
                    context,
                    title: 'Time Agent',
                    subtitle:
                        'Voice & multi-fact capture with structured preview',
                    icon: Icons.mic,
                    color: AppColors.action,
                    onTap: () => context.go('/time-agent'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildActionTile(
                    context,
                    title: 'Quick Update',
                    subtitle: 'One-tap Started, Progress, Blocked, Done',
                    icon: Icons.flash_on,
                    color: AppColors.info,
                    onTap: () => context.go('/quick-update'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // 3. Blocked / Delayed Alerts (if any)
            if (delayedOrBlocked.isNotEmpty) ...[
              _buildBlockedAlertCard(delayedOrBlocked.first),
              const SizedBox(height: 20),
            ],

            // 4. Today's Assigned Activities Section with discipline filter
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  "TODAY'S WORK (${filteredActivities.length})",
                  style: AppTypography.bodySmBold.copyWith(
                    letterSpacing: 0.5,
                    color: AppColors.textMuted,
                  ),
                ),
                Text(
                  'Snapshot SNP-DEMO-001',
                  style: AppTypography.monoSm.copyWith(
                    fontSize: 11,
                    color: AppColors.textMuted,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Quick Filter Chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildFilterChip('all', 'All Disciplines'),
                  const SizedBox(width: 6),
                  _buildFilterChip('structural', 'Structural'),
                  const SizedBox(width: 6),
                  _buildFilterChip('mechanical', 'Mechanical'),
                  const SizedBox(width: 6),
                  _buildFilterChip('electrical', 'Electrical'),
                ],
              ),
            ),
            const SizedBox(height: 10),

            if (activitiesNotifier.isLoading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(24),
                  child: CircularProgressIndicator(),
                ),
              )
            else if (activitiesNotifier.error != null)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(
                    'Error loading schedule: ${activitiesNotifier.error}',
                  ),
                ),
              )
            else
              Column(
                children: filteredActivities
                    .map((act) => _buildActivityCard(context, act))
                    .toList(),
              ),
            const SizedBox(height: 20),

            // 5. Recent Field Submissions
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'RECENT FIELD SUBMISSIONS (${events.length})',
                  style: AppTypography.bodySmBold.copyWith(
                    letterSpacing: 0.5,
                    color: AppColors.textMuted,
                  ),
                ),
                TextButton(
                  onPressed: () => context.go('/history'),
                  child: const Text('View All History →'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ...events
                .take(3)
                .map((e) => _buildRecentEventCard(context, ref, e)),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String key, String label) {
    final isSelected = _activityFilter == key;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      selectedColor: AppColors.action,
      labelStyle: AppTypography.bodySmBold.copyWith(
        fontSize: 11,
        color: isSelected ? Colors.white : AppColors.text,
      ),
      onSelected: (sel) {
        if (sel) setState(() => _activityFilter = key);
      },
    );
  }

  Widget _buildSyncBanner(
    BuildContext context,
    WidgetRef ref,
    bool isOffline,
    int pendingCount,
  ) {
    if (pendingCount == 0 && !isOffline) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: AppColors.successBg,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppColors.success.withValues(alpha: 0.3)),
        ),
        child: Row(
          children: [
            const Icon(Icons.cloud_done, color: AppColors.success, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'All field captures synchronized with ExecLink backend (Tap to inspect)',
                style: AppTypography.bodySm.copyWith(
                  color: AppColors.success,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            const Icon(Icons.chevron_right, size: 16, color: AppColors.success),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: isOffline ? AppColors.warningBg : AppColors.infoBg,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: (isOffline ? AppColors.warning : AppColors.info).withValues(
            alpha: 0.3,
          ),
        ),
      ),
      child: Row(
        children: [
          Icon(
            isOffline ? Icons.cloud_off : Icons.cloud_upload,
            color: isOffline ? AppColors.warning : AppColors.info,
            size: 20,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isOffline
                      ? 'Offline Mode Active ($pendingCount in SQLite queue)'
                      : '$pendingCount updates queued for offline sync',
                  style: AppTypography.bodySmBold.copyWith(
                    color: isOffline ? AppColors.warning : AppColors.info,
                  ),
                ),
                Text(
                  'Tap to inspect queue or force synchronize',
                  style: AppTypography.bodySm.copyWith(
                    color: AppColors.textMuted,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
          const Icon(Icons.chevron_right, size: 16, color: AppColors.textMuted),
        ],
      ),
    );
  }

  Widget _buildActionTile(
    BuildContext context, {
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        constraints: const BoxConstraints(minHeight: 120),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(icon, color: color, size: 22),
                ),
                const Icon(
                  Icons.arrow_forward_ios,
                  size: 14,
                  color: AppColors.textMuted,
                ),
              ],
            ),
            const SizedBox(height: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: AppTypography.bodyMdBold),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: AppTypography.bodySm.copyWith(fontSize: 11),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBlockedAlertCard(ExecutionEvent event) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.dangerBg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.danger.withValues(alpha: 0.3)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.warning_amber_rounded,
            color: AppColors.danger,
            size: 22,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'SITE DELAY / BLOCKER REPORTED',
                      style: AppTypography.bodySmBold.copyWith(
                        color: AppColors.danger,
                        fontSize: 11,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const StatusBadge(status: 'blocked', isDense: true),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  event.evidence.text,
                  style: AppTypography.bodySmBold.copyWith(
                    color: AppColors.text,
                  ),
                ),
                if (event.extractedFacts.delayReason != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    'Reason: ${event.extractedFacts.delayReason}',
                    style: AppTypography.bodySm.copyWith(
                      color: AppColors.danger,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActivityCard(BuildContext context, ScheduleActivity act) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 6,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceMuted,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        'WBS ${act.wbs}',
                        style: AppTypography.monoSm.copyWith(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      act.id,
                      style: AppTypography.monoSm.copyWith(
                        fontSize: 11,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.actionBg,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    '${act.baselineProgressPercent}% Baseline',
                    style: AppTypography.monoSm.copyWith(
                      fontSize: 11,
                      color: AppColors.action,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              act.name,
              style: AppTypography.bodyMdBold.copyWith(fontSize: 15),
            ),
            const SizedBox(height: 6),

            // Progress indicator bar
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: act.baselineProgressPercent / 100.0,
                minHeight: 6,
                backgroundColor: AppColors.surfaceMuted,
                color: act.baselineProgressPercent > 0
                    ? AppColors.action
                    : AppColors.border,
              ),
            ),
            const SizedBox(height: 10),

            Row(
              children: [
                const Icon(
                  Icons.category_outlined,
                  size: 14,
                  color: AppColors.textMuted,
                ),
                const SizedBox(width: 4),
                Text(
                  act.discipline.toUpperCase(),
                  style: AppTypography.bodySm.copyWith(fontSize: 11),
                ),
                const SizedBox(width: 12),
                const Icon(
                  Icons.label_outline,
                  size: 14,
                  color: AppColors.textMuted,
                ),
                const SizedBox(width: 4),
                Text(
                  act.assetId,
                  style: AppTypography.monoSm.copyWith(fontSize: 11),
                ),
                const SizedBox(width: 12),
                const Icon(
                  Icons.place_outlined,
                  size: 14,
                  color: AppColors.textMuted,
                ),
                const SizedBox(width: 4),
                Text(
                  '${act.location.start.toInt()}-${act.location.end.toInt()}m',
                  style: AppTypography.bodySm.copyWith(fontSize: 11),
                ),
                const Spacer(),

                // Fast action buttons on the card itself
                OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(60, 32),
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                  ),
                  onPressed: () => context.go('/activity/${act.id}'),
                  child: const Text('Detail', style: TextStyle(fontSize: 11)),
                ),
                const SizedBox(width: 6),
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    minimumSize: const Size(70, 32),
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                  ),
                  icon: const Icon(Icons.flash_on, size: 12),
                  label: const Text('Update', style: TextStyle(fontSize: 11)),
                  onPressed: () =>
                      context.go('/quick-update?activityId=${act.id}'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRecentEventCard(
    BuildContext context,
    WidgetRef ref,
    ExecutionEvent event,
  ) {
    final proposal = ref.read(eventsProvider).getProposalForEvent(event.id);
    final topCandidate = proposal?.candidates.isNotEmpty == true
        ? proposal!.candidates.first
        : null;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    StatusBadge(status: event.status, isDense: true),
                    const SizedBox(width: 6),
                    if (event.syncStatus == SyncStatus.pending)
                      const StatusBadge(status: 'pending', isDense: true),
                  ],
                ),
                Text(
                  event.id,
                  style: AppTypography.monoSm.copyWith(
                    fontSize: 11,
                    color: AppColors.textMuted,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              event.evidence.text,
              style: AppTypography.bodySm.copyWith(color: AppColors.text),
            ),
            if (topCandidate != null) ...[
              const SizedBox(height: 6),
              Row(
                children: [
                  const Icon(Icons.link, size: 14, color: AppColors.action),
                  const SizedBox(width: 4),
                  Text(
                    'Proposed Match: ${topCandidate.activityId} (${(topCandidate.score * 100).toStringAsFixed(1)}%)',
                    style: AppTypography.monoSm.copyWith(
                      fontSize: 11,
                      color: AppColors.action,
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
