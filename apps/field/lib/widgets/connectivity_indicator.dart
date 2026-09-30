import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/theme/app_colors.dart';
import '../core/theme/app_typography.dart';
import '../models/execution_event.dart';
import '../providers/field_providers.dart';
import '../services/offline_sync_service.dart';

enum ConnectivityStatus { synced, syncing, offline, pending }

class ConnectivityIndicator extends ConsumerWidget {
  final ConnectivityStatus? overrideStatus;
  final int? overridePendingCount;
  final VoidCallback? onTap;

  const ConnectivityIndicator({
    super.key,
    this.overrideStatus,
    this.overridePendingCount,
    this.onTap,
  });

  void _showSyncQueueSheet(BuildContext context, WidgetRef ref) {
    HapticFeedback.lightImpact();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      sheetAnimationStyle: const AnimationStyle(
        duration: Duration(milliseconds: 240),
        curve: Curves.easeOutCubic,
        reverseDuration: Duration(milliseconds: 200),
        reverseCurve: Curves.easeOutCubic,
      ),
      builder: (ctx) => const FieldSyncQueueSheet(),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final offlineNotifier = ref.watch(offlineModeProvider);
    final eventsNotifier = ref.watch(eventsProvider);

    final isOffline =
        overrideStatus == ConnectivityStatus.offline ||
        (overrideStatus == null && offlineNotifier.isOffline);

    final events = eventsNotifier.events;
    final pendingCount =
        overridePendingCount ??
        events
            .where(
              (e) =>
                  e.syncStatus == SyncStatus.pending ||
                  e.syncStatus == SyncStatus.failed,
            )
            .length;

    // Determine visual status
    final ConnectivityStatus effectiveStatus;
    if (overrideStatus != null) {
      effectiveStatus = overrideStatus!;
    } else if (isOffline) {
      effectiveStatus = ConnectivityStatus.offline;
    } else if (eventsNotifier.isSyncing) {
      effectiveStatus = ConnectivityStatus.syncing;
    } else if (pendingCount > 0) {
      effectiveStatus = ConnectivityStatus.pending;
    } else {
      effectiveStatus = ConnectivityStatus.synced;
    }

    final Color dotColor;
    final Color textColor;
    final Color bgColor;
    final String label;
    final IconData? icon;

    switch (effectiveStatus) {
      case ConnectivityStatus.offline:
        dotColor = AppColors.warning;
        textColor = AppColors.warning;
        bgColor = AppColors.warningBg;
        label = 'Offline';
        icon = Icons.cloud_off_rounded;
        break;
      case ConnectivityStatus.pending:
        dotColor = AppColors.warning;
        textColor = AppColors.warning;
        bgColor = AppColors.warningBg;
        label = '$pendingCount Pending';
        icon = Icons.cloud_upload_outlined;
        break;
      case ConnectivityStatus.syncing:
        dotColor = AppColors.info;
        textColor = AppColors.info;
        bgColor = AppColors.infoBg;
        label = 'Syncing...';
        icon = Icons.sync_rounded;
        break;
      case ConnectivityStatus.synced:
        dotColor = AppColors.success;
        textColor = AppColors.textSecondary;
        bgColor = AppColors.surfaceMuted;
        label = 'Synced';
        icon = null;
        break;
    }

    return Semantics(
      label: 'Sync Status: $label',
      button: true,
      child: InkWell(
        onTap: onTap ?? () => _showSyncQueueSheet(context, ref),
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 160),
            curve: Curves.easeOutCubic,
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: bgColor,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: effectiveStatus == ConnectivityStatus.synced
                    ? AppColors.border
                    : dotColor.withValues(alpha: 0.3),
                width: 1,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (icon != null) ...[
                  Icon(icon, size: 12, color: dotColor),
                  const SizedBox(width: 4),
                ] else ...[
                  Container(
                    width: 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: dotColor,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 5),
                ],
                Text(
                  label,
                  style: AppTypography.metadataMedium.copyWith(
                    fontSize: 11,
                    color: textColor,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class FieldSyncQueueSheet extends ConsumerStatefulWidget {
  final VoidCallback? onClose;

  const FieldSyncQueueSheet({super.key, this.onClose});

  @override
  ConsumerState<FieldSyncQueueSheet> createState() =>
      _FieldSyncQueueSheetState();
}

class _FieldSyncQueueSheetState extends ConsumerState<FieldSyncQueueSheet> {
  String _formatLastSync(DateTime? dt) {
    if (dt == null) return 'Never';
    final diff = DateTime.now().difference(dt);
    if (diff.inSeconds < 45) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${dt.day}/${dt.month} ${dt.hour}:${dt.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final offlineNotifier = ref.watch(offlineModeProvider);
    final eventsNotifier = ref.watch(eventsProvider);

    final isOffline = offlineNotifier.isOffline;
    final isSimulated = offlineNotifier.isSimulatedOffline;
    final isSyncing = eventsNotifier.isSyncing;
    final connectionState = eventsNotifier.connectionState;
    final events = eventsNotifier.events;
    final pendingEvents = events
        .where(
          (e) =>
              e.syncStatus == SyncStatus.pending ||
              e.syncStatus == SyncStatus.failed ||
              e.syncStatus == SyncStatus.syncing,
        )
        .toList();

    // Badge styling & semantics
    final String badgeLabel;
    final Color badgeBg;
    final Color badgeFg;
    final IconData badgeIcon;

    if (isOffline) {
      badgeLabel = pendingEvents.isNotEmpty
          ? 'OFFLINE (${pendingEvents.length})'
          : 'OFFLINE';
      badgeBg = AppColors.warningBg;
      badgeFg = AppColors.warning;
      badgeIcon = Icons.cloud_off_rounded;
    } else if (isSyncing || connectionState == FieldConnectionState.reconnecting) {
      badgeLabel = 'SYNCING';
      badgeBg = AppColors.infoBg;
      badgeFg = AppColors.info;
      badgeIcon = Icons.sync_rounded;
    } else if (pendingEvents.isNotEmpty) {
      badgeLabel = 'CONNECTED (${pendingEvents.length} PENDING)';
      badgeBg = AppColors.warningBg;
      badgeFg = AppColors.warning;
      badgeIcon = Icons.cloud_queue_rounded;
    } else {
      badgeLabel = 'CONNECTED';
      badgeBg = AppColors.successBg;
      badgeFg = AppColors.success;
      badgeIcon = Icons.check_circle_outline_rounded;
    }

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.sizeOf(context).height * 0.82,
      ),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
          physics: const ClampingScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(18, 12, 18, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Drag Handle
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

              // Title & Status Badge
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Flexible(
                    child: Text(
                      'Field Sync Queue',
                      style: AppTypography.cardTitle.copyWith(
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 160),
                    curve: Curves.easeOutCubic,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: badgeBg,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(
                        color: badgeFg.withValues(alpha: 0.3),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (isSyncing || connectionState == FieldConnectionState.reconnecting)
                          Padding(
                            padding: const EdgeInsets.only(right: 5),
                            child: SizedBox(
                              width: 10,
                              height: 10,
                              child: CircularProgressIndicator(
                                strokeWidth: 1.5,
                                color: badgeFg,
                              ),
                            ),
                          )
                        else
                          Padding(
                            padding: const EdgeInsets.only(right: 4),
                            child: Icon(badgeIcon, size: 12, color: badgeFg),
                          ),
                        Text(
                          badgeLabel,
                          style: AppTypography.monoSm.copyWith(
                            fontSize: 10.5,
                            fontWeight: FontWeight.bold,
                            color: badgeFg,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Dynamic Status Subtitle
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 200),
                switchInCurve: Curves.easeOutCubic,
                switchOutCurve: Curves.easeOutCubic,
                child: Align(
                  key: ValueKey<String>('$isOffline-$isSyncing-${pendingEvents.length}'),
                  alignment: Alignment.centerLeft,
                  child: Text(
                    isOffline
                        ? (pendingEvents.isEmpty
                            ? 'Offline Mode active. Field updates will be queued safely on this device.'
                            : '${pendingEvents.length} update${pendingEvents.length == 1 ? '' : 's'} waiting to sync once online.')
                        : isSyncing
                        ? 'Synchronizing field updates with ExecLink server...'
                        : pendingEvents.isEmpty
                        ? 'All field updates are safely recorded and synchronized.'
                        : '${pendingEvents.length} update${pendingEvents.length == 1 ? '' : 's'} stored on device, syncing automatically.',
                    style: AppTypography.metadata.copyWith(
                      fontSize: 12.5,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 4),

              Text(
                'Last successful sync: ${_formatLastSync(offlineNotifier.lastSuccessfulSync)}',
                style: AppTypography.metadata.copyWith(
                  fontSize: 11.5,
                  color: AppColors.textMuted,
                ),
              ),
              const Divider(height: 24),

              // Offline Toggle Simulation Switch
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTap: () {
                        HapticFeedback.selectionClick();
                        ref.read(eventsProvider).toggleOffline(!isSimulated);
                      },
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Simulate Offline Mode',
                            style: AppTypography.bodyBold,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Test offline field capture & deferred syncing',
                            style: AppTypography.metadata.copyWith(
                              color: AppColors.textMuted,
                              fontSize: 11.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Switch(
                    value: isSimulated,
                    activeTrackColor: AppColors.warning,
                    onChanged: (val) {
                      HapticFeedback.selectionClick();
                      ref.read(eventsProvider).toggleOffline(val);
                    },
                  ),
                ],
              ),
              const Divider(height: 24),

              // Queue Content
              if (pendingEvents.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 20),
                  child: Center(
                    child: Column(
                      children: [
                        Icon(
                          isOffline
                              ? Icons.cloud_queue_rounded
                              : Icons.check_circle_outline_rounded,
                          size: 32,
                          color: isOffline
                              ? AppColors.warning
                              : AppColors.success,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          isOffline
                              ? 'No updates waiting in offline queue'
                              : 'All field updates synchronized with server',
                          style: AppTypography.bodyMedium,
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                )
              else ...[
                Text(
                  'QUEUED FOR SYNC (${pendingEvents.length})',
                  style: AppTypography.metadataMedium.copyWith(
                    fontSize: 11,
                    color: AppColors.textMuted,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 8),
                ...pendingEvents.map(
                  (ev) => Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceMuted,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Flexible(
                              child: Text(
                                ev.id,
                                style: AppTypography.monoSm.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 6,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: ev.syncStatus == SyncStatus.failed
                                    ? AppColors.dangerBg
                                    : ev.syncStatus == SyncStatus.syncing
                                    ? AppColors.infoBg
                                    : AppColors.warningBg,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                ev.syncStatus == SyncStatus.failed
                                    ? 'Failed (Retryable)'
                                    : ev.syncStatus == SyncStatus.syncing
                                    ? 'Syncing...'
                                    : 'Pending Sync',
                                style: AppTypography.metadataMedium.copyWith(
                                  fontSize: 10.5,
                                  color: ev.syncStatus == SyncStatus.failed
                                      ? AppColors.danger
                                      : ev.syncStatus == SyncStatus.syncing
                                      ? AppColors.info
                                      : AppColors.warning,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          ev.evidence.text,
                          style: AppTypography.metadata,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ),
              ],

              if (pendingEvents.isNotEmpty && !isOffline) ...[
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  height: 46,
                  child: ElevatedButton.icon(
                    onPressed: isSyncing
                        ? null
                        : () async {
                            HapticFeedback.lightImpact();
                            await ref.read(eventsProvider).syncAllPending();
                          },
                    icon: isSyncing
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: AppColors.surface,
                            ),
                          )
                        : const Icon(Icons.sync_rounded, size: 16),
                    label: Text(
                      isSyncing ? 'Syncing...' : 'Sync All Pending Now',
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                height: 44,
                child: OutlinedButton(
                  onPressed: widget.onClose ?? () => Navigator.pop(context),
                  style: OutlinedButton.styleFrom(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: const Text('Close'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
