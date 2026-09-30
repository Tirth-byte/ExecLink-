import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:open_filex/open_filex.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/app_typography.dart';
import '../../models/common_types.dart';
import '../../models/execution_event.dart';
import '../../models/match_proposal.dart';
import '../../providers/auth_provider.dart';
import '../../providers/field_providers.dart';
import '../../widgets/confidence_badge.dart';
import '../../widgets/status_badge.dart';

class HistoryView extends ConsumerStatefulWidget {
  const HistoryView({super.key});

  @override
  ConsumerState<HistoryView> createState() => _HistoryViewState();
}

class _HistoryViewState extends ConsumerState<HistoryView> {
  String _selectedFilter = 'all';
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  String _formatDateTime(String? isoString) {
    if (isoString == null || isoString.isEmpty) return '—';
    try {
      final dt = DateTime.parse(isoString).toLocal();
      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];
      final month = months[dt.month - 1];
      final day = dt.day;
      final year = dt.year;
      final hour = dt.hour > 12 ? dt.hour - 12 : (dt.hour == 0 ? 12 : dt.hour);
      final minute = dt.minute.toString().padLeft(2, '0');
      final period = dt.hour >= 12 ? 'PM' : 'AM';
      return '$day $month $year · $hour:$minute $period';
    } catch (_) {
      return isoString;
    }
  }

  String _resolveReporterName(String? reporterId) {
    final authUser = ref.read(authProvider).user;
    if (reporterId == 'USR-SUP-001' || reporterId == null || reporterId.isEmpty) {
      return authUser?.name != null
          ? '${authUser!.name} (${authUser.role})'
          : 'Asha Rao (Field Supervisor)';
    }
    if (authUser != null && authUser.id == reporterId) {
      return '${authUser.name} (${authUser.role})';
    }
    return reporterId;
  }

  void _showEventDetail(ExecutionEvent event, MatchProposal? proposal) {
    showModalBottomSheet(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      useSafeArea: true,
      isDismissible: true,
      enableDrag: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black54,
      builder: (ctx) => Container(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.sizeOf(context).height * 0.92,
        ),
        decoration: const BoxDecoration(
          color: FieldColors.surface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
        ),
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Top Bar with Drag handle and Close button
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 12, 0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const SizedBox(width: 36),
                    // Drag handle
                    Container(
                      width: 36,
                      height: 4,
                      decoration: BoxDecoration(
                        color: FieldColors.border,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    // Close button
                    IconButton(
                      icon: const Icon(Icons.close_rounded, size: 22),
                      color: FieldColors.textSecondary,
                      tooltip: 'Close Event Detail',
                      visualDensity: VisualDensity.compact,
                      onPressed: () => Navigator.of(ctx).pop(),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: SingleChildScrollView(
                  padding: EdgeInsets.fromLTRB(
                    20,
                    4,
                    20,
                    MediaQuery.paddingOf(context).bottom + 36,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Header: Event ID & Status Badge with responsive layout
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Expanded(
                            child: Text(
                              event.id,
                              style: FieldTypography.cardTitle.copyWith(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                              ),
                              overflow: TextOverflow.ellipsis,
                              maxLines: 1,
                            ),
                          ),
                          const SizedBox(width: 10),
                          StatusBadge(status: event.status),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // Human-readable metadata summary container
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: FieldColors.surfaceMuted,
                          borderRadius: BorderRadius.circular(FieldRadius.card),
                          border: Border.all(color: FieldColors.border, width: 1),
                        ),
                        child: Column(
                          children: [
                            _buildMetaRow('Observed', _formatDateTime(event.observedAt)),
                            const SizedBox(height: 6),
                            _buildMetaRow('Reported by', _resolveReporterName(event.reporterId)),
                            const SizedBox(height: 6),
                            _buildMetaRow(
                              'Sync Status',
                              event.syncStatus == SyncStatus.synced
                                  ? 'Synced to Cloud'
                                  : event.syncStatus == SyncStatus.pending
                                  ? 'Pending local sync'
                                  : 'Sync failed',
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Evidence / Field Note Text
                      Text(
                        'EVIDENCE / FIELD NOTE',
                        style: FieldTypography.statusText.copyWith(
                          letterSpacing: 0.5,
                          color: FieldColors.textMuted,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: FieldColors.surfaceRaised,
                          borderRadius: BorderRadius.circular(FieldRadius.card),
                          border: Border.all(color: FieldColors.border, width: 1),
                        ),
                        child: Text(
                          event.evidence.text,
                          style: FieldTypography.body.copyWith(fontSize: 13.5),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Attachments if any
                      if (event.evidence.attachments.isNotEmpty) ...[
                        Text(
                          'ATTACHED MEDIA EVIDENCE (${event.evidence.attachments.length})',
                          style: FieldTypography.statusText.copyWith(
                            letterSpacing: 0.5,
                            color: FieldColors.textMuted,
                          ),
                        ),
                        const SizedBox(height: 8),
                        ...event.evidence.attachments.map((att) => _buildAttachmentRow(att)),
                        const SizedBox(height: 16),
                      ],

                      // Extracted Facts
                      Text(
                        'EXTRACTED FACTS',
                        style: FieldTypography.statusText.copyWith(
                          letterSpacing: 0.5,
                          color: FieldColors.textMuted,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: FieldColors.surface,
                          borderRadius: BorderRadius.circular(FieldRadius.card),
                          border: Border.all(color: FieldColors.border, width: 1),
                        ),
                        child: Column(
                          children: [
                            if (event.extractedFacts.assetId != null) ...[
                              _buildFactRow('Asset / Tag', event.extractedFacts.assetId!),
                              const SizedBox(height: 6),
                            ],
                            if (event.extractedFacts.discipline != null) ...[
                              _buildFactRow('Discipline', event.extractedFacts.discipline!.toUpperCase()),
                              const SizedBox(height: 6),
                            ],
                            if (event.extractedFacts.workType != null) ...[
                              _buildFactRow('Work Type', event.extractedFacts.workType!),
                              const SizedBox(height: 6),
                            ],
                            if (event.extractedFacts.quantity != null) ...[
                              _buildFactRow('Quantity', event.extractedFacts.quantity!.display),
                              const SizedBox(height: 6),
                            ],
                            if (event.extractedFacts.location != null) ...[
                              _buildFactRow(
                          'Location',
                          '${event.extractedFacts.location!.alignment} ${event.extractedFacts.location!.start.toInt()}-${event.extractedFacts.location!.end.toInt()}m',
                        ),
                        const SizedBox(height: 6),
                      ],
                      if (event.extractedFacts.delayReason != null) ...[
                        const SizedBox(height: 2),
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: FieldColors.dangerBg,
                            borderRadius: BorderRadius.circular(FieldRadius.badge),
                            border: Border.all(color: FieldColors.dangerBorder),
                          ),
                          child: Row(
                            children: [
                              const Icon(
                                Icons.warning_amber_rounded,
                                size: 16,
                                color: FieldColors.danger,
                              ),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  'Delay: ${event.extractedFacts.delayReason}',
                                  style: FieldTypography.bodySmBold.copyWith(
                                    color: FieldColors.danger,
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Intelligence Match Proposal
                if (proposal != null && proposal.candidates.isNotEmpty) ...[
                  Text(
                    'INTELLIGENCE MATCH PROPOSAL',
                    style: FieldTypography.statusText.copyWith(
                      letterSpacing: 0.5,
                      color: FieldColors.textMuted,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ...proposal.candidates.map(
                    (cand) => Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: FieldColors.surface,
                        borderRadius: BorderRadius.circular(FieldRadius.card),
                        border: Border.all(color: FieldColors.border, width: 1),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      cand.activityId,
                                      style: FieldTypography.cardTitle.copyWith(
                                        fontSize: 14.5,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      'WBS ${cand.activityWbs}',
                                      style: FieldTypography.metadata.copyWith(
                                        color: FieldColors.textSecondary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              ConfidenceBadge(
                                score: cand.score,
                                band: cand.band,
                                isCompact: true,
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          const Divider(height: 1),
                          const SizedBox(height: 8),
                          SignalBreakdownWidget(signals: cand.explanation),
                        ],
                      ),
                    ),
                  ),
                ] else ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: FieldColors.surfaceMuted,
                      borderRadius: BorderRadius.circular(FieldRadius.card),
                      border: Border.all(color: FieldColors.border, width: 1),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.info_outline_rounded,
                          size: 16,
                          color: FieldColors.textMuted,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'No candidates matched above threshold (Unmatched / new proposal).',
                            style: FieldTypography.metadata.copyWith(
                              color: FieldColors.textSecondary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 16),

                // Technical / Audit Lineage Details Accordion
                Theme(
                  data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                  child: ExpansionTile(
                    tilePadding: EdgeInsets.zero,
                    title: Text(
                      'Technical & Audit Lineage',
                      style: FieldTypography.statusText.copyWith(
                        fontSize: 11,
                        color: FieldColors.textMuted,
                      ),
                    ),
                    children: [
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: FieldColors.surfaceMuted,
                          borderRadius: BorderRadius.circular(FieldRadius.control),
                          border: Border.all(color: FieldColors.borderSubtle),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Client ID: ${event.clientEventId}',
                              style: FieldTypography.monoSm.copyWith(fontSize: 11),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Event ID: ${event.id}',
                              style: FieldTypography.monoSm.copyWith(fontSize: 11),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Raw JSON Payload:',
                              style: FieldTypography.statusText.copyWith(
                                fontSize: 10,
                                color: FieldColors.textMuted,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              const JsonEncoder.withIndent('  ').convert(event.toJson()),
                              style: FieldTypography.monoSm.copyWith(fontSize: 9.5),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                SizedBox(
                  width: double.infinity,
                  height: 44,
                  child: OutlinedButton(
                    onPressed: () => Navigator.of(ctx).pop(),
                    style: OutlinedButton.styleFrom(
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(FieldRadius.control),
                      ),
                    ),
                    child: const Text('Close'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    ),
  ),
),
);
}

  Widget _buildMetaRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 90,
          child: Text(
            label,
            style: FieldTypography.metadata.copyWith(
              fontSize: 11.5,
              color: FieldColors.textMuted,
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: FieldTypography.bodyBold.copyWith(
              fontSize: 12,
              color: FieldColors.text,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildFactRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 90,
          child: Text(
            label,
            style: FieldTypography.metadata.copyWith(
              fontSize: 11.5,
              color: FieldColors.textMuted,
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: FieldTypography.monoSm.copyWith(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: FieldColors.text,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAttachmentRow(EvidenceAttachment item) {
    final isVideo = item.type == EvidenceType.video;
    final isPhoto = item.type == EvidenceType.photo;

    return InkWell(
      onTap: () {
        if (item.localPath.isNotEmpty && File(item.localPath).existsSync()) {
          OpenFilex.open(item.localPath);
        }
      },
      borderRadius: BorderRadius.circular(FieldRadius.control),
      child: Container(
        margin: const EdgeInsets.only(bottom: 6),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: FieldColors.surfaceMuted,
          borderRadius: BorderRadius.circular(FieldRadius.control),
          border: Border.all(color: FieldColors.borderSubtle),
        ),
        child: Row(
          children: [
            Icon(
              isVideo
                  ? Icons.videocam_rounded
                  : isPhoto
                  ? Icons.photo_rounded
                  : Icons.attach_file_rounded,
              size: 18,
              color: FieldColors.brand700,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.fileName,
                    style: FieldTypography.bodyBold.copyWith(fontSize: 12),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    '${(item.sizeBytes / 1024).toStringAsFixed(1)} KB · ${item.type.name.toUpperCase()}',
                    style: FieldTypography.metadata.copyWith(fontSize: 10.5),
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.chevron_right_rounded,
              size: 16,
              color: FieldColors.textMuted,
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final allEvents = ref.watch(eventsProvider).events;
    final search = _searchController.text.toLowerCase().trim();

    final filtered = allEvents.where((e) {
      if (_selectedFilter == 'pending' && e.syncStatus != SyncStatus.pending) {
        return false;
      }
      if (_selectedFilter == 'submitted' && e.status != 'submitted') {
        return false;
      }
      if (_selectedFilter == 'proposed' && e.status != 'proposed') {
        return false;
      }
      if (_selectedFilter == 'verified' && e.status != 'verified') {
        return false;
      }
      if (_selectedFilter == 'rejected' && e.status != 'rejected') {
        return false;
      }

      if (search.isNotEmpty) {
        final inId = e.id.toLowerCase().contains(search);
        final inText = e.evidence.text.toLowerCase().contains(search);
        final inAsset =
            e.extractedFacts.assetId?.toLowerCase().contains(search) ?? false;
        if (!inId && !inText && !inAsset) return false;
      }
      return true;
    }).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Capture History'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/');
            }
          },
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.sync_rounded),
            tooltip: 'Sync pending events',
            onPressed: () async {
              final count = await ref.read(eventsProvider).syncAllPending();
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Synchronized $count items')),
                );
              }
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter Tabs (Scrollable with clean edge padding)
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: Row(
              children: [
                _buildFilterChip('all', 'All (${allEvents.length})'),
                const SizedBox(width: 6),
                _buildFilterChip(
                  'pending',
                  'Pending Sync (${allEvents.where((e) => e.syncStatus == SyncStatus.pending).length})',
                ),
                const SizedBox(width: 6),
                _buildFilterChip('submitted', 'Awaiting Review'),
                const SizedBox(width: 6),
                _buildFilterChip('proposed', 'Proposed'),
                const SizedBox(width: 6),
                _buildFilterChip('verified', 'Verified'),
                const SizedBox(width: 6),
                _buildFilterChip('rejected', 'Rejected'),
              ],
            ),
          ),

          // Search Field
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: TextField(
              controller: _searchController,
              style: FieldTypography.body.copyWith(fontSize: 14),
              decoration: InputDecoration(
                hintText: 'Search by event ID, asset, or note...',
                prefixIcon: const Icon(Icons.search_rounded, size: 20),
                suffixIcon: search.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear_rounded, size: 18),
                        onPressed: () => setState(() => _searchController.clear()),
                      )
                    : null,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 10,
                ),
              ),
              onChanged: (_) => setState(() {}),
            ),
          ),

          // Events List with safe bottom padding
          Expanded(
            child: filtered.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.inbox_outlined,
                          size: 44,
                          color: FieldColors.textMuted,
                        ),
                        const SizedBox(height: 10),
                        Text(
                          'No execution events match filter',
                          style: FieldTypography.body.copyWith(
                            color: FieldColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 110),
                    itemCount: filtered.length,
                    itemBuilder: (context, index) {
                      final event = filtered[index];
                      final proposal = ref
                          .read(eventsProvider)
                          .getProposalForEvent(event.id);
                      final topCand = proposal?.candidates.isNotEmpty == true
                          ? proposal!.candidates.first
                          : null;

                      return Card(
                        margin: const EdgeInsets.only(bottom: 10),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(FieldRadius.card),
                          onTap: () => _showEventDetail(event, proposal),
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Top row: StatusBadge + Event ID
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Flexible(
                                      child: Wrap(
                                        spacing: 5,
                                        runSpacing: 4,
                                        crossAxisAlignment:
                                            WrapCrossAlignment.center,
                                        children: [
                                          StatusBadge(
                                            status: event.status,
                                            isDense: true,
                                          ),
                                          if (event.syncStatus ==
                                              SyncStatus.pending)
                                            const StatusBadge(
                                              status: 'pending',
                                              isDense: true,
                                            ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Flexible(
                                      child: Text(
                                        event.id,
                                        style: FieldTypography.monoSm.copyWith(
                                          fontSize: 11,
                                          color: FieldColors.textMuted,
                                        ),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),

                                // Evidence text
                                Text(
                                  event.evidence.text,
                                  style: FieldTypography.bodyBold.copyWith(
                                    fontSize: 13.5,
                                    height: 1.3,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 8),

                                // Bottom metadata & Confidence badge
                                Row(
                                  children: [
                                    Expanded(
                                      child: Wrap(
                                        spacing: 6,
                                        runSpacing: 4,
                                        crossAxisAlignment:
                                            WrapCrossAlignment.center,
                                        children: [
                                          if (event.extractedFacts.assetId !=
                                              null)
                                            Container(
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                horizontal: 6,
                                                vertical: 2,
                                              ),
                                              decoration: BoxDecoration(
                                                color: FieldColors.surfaceRaised,
                                                borderRadius:
                                                    BorderRadius.circular(
                                                  FieldRadius.badge,
                                                ),
                                              ),
                                              child: Text(
                                                event.extractedFacts.assetId!,
                                                style: FieldTypography.monoSm
                                                    .copyWith(
                                                  fontSize: 10,
                                                  fontWeight: FontWeight.w600,
                                                ),
                                              ),
                                            ),
                                          if (event.extractedFacts.discipline !=
                                              null)
                                            Text(
                                              event.extractedFacts.discipline!
                                                  .toUpperCase(),
                                              style: FieldTypography.metadata
                                                  .copyWith(
                                                fontSize: 11,
                                                fontWeight: FontWeight.w600,
                                                color: FieldColors.textMuted,
                                              ),
                                            ),
                                          if (event.extractedFacts.delayReason !=
                                              null)
                                            Container(
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                horizontal: 6,
                                                vertical: 2,
                                              ),
                                              decoration: BoxDecoration(
                                                color: FieldColors.dangerBg,
                                                borderRadius:
                                                    BorderRadius.circular(
                                                  FieldRadius.badge,
                                                ),
                                              ),
                                              child: Text(
                                                event.extractedFacts.delayReason!,
                                                style: FieldTypography.statusText
                                                    .copyWith(
                                                  fontSize: 9.5,
                                                  color: FieldColors.danger,
                                                ),
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ),
                                        ],
                                      ),
                                    ),
                                    if (topCand != null) ...[
                                      const SizedBox(width: 8),
                                      ConfidenceBadge(
                                        score: topCand.score,
                                        band: topCand.band,
                                        isCompact: true,
                                      ),
                                    ],
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String filterKey, String label) {
    final isSelected = _selectedFilter == filterKey;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      selectedColor: FieldColors.brand50,
      side: BorderSide(
        color: isSelected ? FieldColors.brand700 : FieldColors.border,
      ),
      labelStyle: FieldTypography.bodySmBold.copyWith(
        color: isSelected ? FieldColors.brand700 : FieldColors.text,
        fontSize: 12,
      ),
      onSelected: (sel) {
        if (sel) setState(() => _selectedFilter = filterKey);
      },
    );
  }
}
