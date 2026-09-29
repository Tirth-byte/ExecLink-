import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/theme/app_colors.dart';
import '../core/theme/app_typography.dart';
import '../models/execution_event.dart';
import '../providers/field_providers.dart';

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
    final offlineNotifier = ref.read(offlineModeProvider);
    final eventsNotifier = ref.read(eventsProvider);
    final isOffline = offlineNotifier.isOffline;
    final events = eventsNotifier.events;
    final pendingEvents = events
        .where(
          (e) =>
              e.syncStatus == SyncStatus.pending ||
              e.syncStatus == SyncStatus.failed,
        )
        .toList();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.sizeOf(ctx).height * 0.75,
        ),
        decoration: const BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
        ),
        child: SafeArea(
          top: false,
          child: SingleChildScrollView(
            physics: const ClampingScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(18, 10, 18, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 36,
                    height: 4,
                    margin: const EdgeInsets.only(bottom: 14),
                    decoration: BoxDecoration(
                      color: AppColors.border,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Field Sync Queue',
                      style: AppTypography.cardTitle,
                    ),
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
                        border: Border.all(
                          color:
                              (isOffline
                                      ? AppColors.warning
                                      : AppColors.success)
                                  .withValues(alpha: 0.3),
                        ),
                      ),
                      child: Text(
                        isOffline ? 'OFFLINE' : 'CONNECTED',
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
                  pendingEvents.isEmpty
                      ? 'All field updates are safely recorded and synced.'
                      : '${pendingEvents.length} update${pendingEvents.length == 1 ? '' : 's'} stored on device, syncing automatically.',
                  style: AppTypography.metadata,
                ),
                const SizedBox(height: 4),
                Text(
                  'Last successful sync: Just now',
                  style: AppTypography.metadata.copyWith(
                    fontSize: 11.5,
                    color: AppColors.textMuted,
                  ),
                ),
                const Divider(height: 24),

                // Offline toggle simulation
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Simulate Offline Mode',
                          style: AppTypography.bodyBold,
                        ),
                        Text(
                          'Test offline field capture & deferred syncing',
                          style: AppTypography.metadata.copyWith(
                            color: AppColors.textMuted,
                            fontSize: 11.5,
                          ),
                        ),
                      ],
                    ),
                    Switch(
                      value: isOffline,
                      activeTrackColor: AppColors.warning,
                      onChanged: (val) {
                        HapticFeedback.selectionClick();
                        ref.read(offlineModeProvider).setOffline(val);
                        ref.read(eventsProvider).toggleOffline(val);
                      },
                    ),
                  ],
                ),
                const Divider(height: 24),

                if (pendingEvents.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 24),
                    child: Center(
                      child: Column(
                        children: [
                          Icon(
                            Icons.check_circle_outline_rounded,
                            size: 32,
                            color: AppColors.success,
                          ),
                          SizedBox(height: 8),
                          Text(
                            'All field updates synchronized with server',
                            style: AppTypography.bodyMedium,
                          ),
                        ],
                      ),
                    ),
                  )
                else
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
                              Text(
                                ev.id,
                                style: AppTypography.monoSm.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 6,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.warningBg,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  'Pending Sync',
                                  style: AppTypography.metadataMedium.copyWith(
                                    fontSize: 10.5,
                                    color: AppColors.warning,
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

                if (pendingEvents.isNotEmpty && !isOffline) ...[
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: () async {
                      HapticFeedback.lightImpact();
                      await ref.read(eventsProvider).syncAllPending();
                      if (context.mounted) Navigator.pop(context);
                    },
                    icon: const Icon(Icons.sync_rounded, size: 16),
                    label: const Text('Sync All Pending Now'),
                  ),
                ],
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  height: 44,
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(ctx),
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
      ),
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
          child: Container(
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
