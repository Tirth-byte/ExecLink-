import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../models/execution_event.dart';
import '../../models/match_proposal.dart';
import '../../providers/field_providers.dart';
import '../../widgets/confidence_badge.dart';
import '../../widgets/status_badge.dart';

class HistoryView extends ConsumerStatefulWidget {
  const HistoryView({super.key});

  @override
  ConsumerState<HistoryView> createState() => _HistoryViewState();
}

class _HistoryViewState extends ConsumerState<HistoryView> {
  String _selectedFilter =
      'all'; // all, pending, submitted, proposed, verified, rejected
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _showEventDetail(ExecutionEvent event, MatchProposal? proposal) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.85,
        minChildSize: 0.5,
        maxChildSize: 0.95,
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
                  Text(event.id, style: AppTypography.titleLg),
                  StatusBadge(status: event.status),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                'Client ID: ${event.clientEventId}',
                style: AppTypography.monoSm.copyWith(
                  color: AppColors.textMuted,
                ),
              ),
              Text(
                'Observed: ${event.observedAt} | Reporter: ${event.reporterId}',
                style: AppTypography.bodySm.copyWith(
                  color: AppColors.textMuted,
                ),
              ),
              const Divider(height: 24),

              Text(
                'EVIDENCE / FIELD TEXT',
                style: AppTypography.bodySmBold.copyWith(
                  letterSpacing: 0.5,
                  color: AppColors.textMuted,
                ),
              ),
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.surfaceMuted,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(event.evidence.text, style: AppTypography.bodyMd),
              ),
              const SizedBox(height: 16),

              Text(
                'EXTRACTED FACTS',
                style: AppTypography.bodySmBold.copyWith(
                  letterSpacing: 0.5,
                  color: AppColors.textMuted,
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: [
                  if (event.extractedFacts.assetId != null)
                    Chip(label: Text('Asset: ${event.extractedFacts.assetId}')),
                  if (event.extractedFacts.discipline != null)
                    Chip(
                      label: Text(
                        'Discipline: ${event.extractedFacts.discipline}',
                      ),
                    ),
                  if (event.extractedFacts.workType != null)
                    Chip(label: Text('Work: ${event.extractedFacts.workType}')),
                  if (event.extractedFacts.delayReason != null)
                    Chip(
                      backgroundColor: AppColors.dangerBg,
                      label: Text(
                        'Delay: ${event.extractedFacts.delayReason}',
                        style: const TextStyle(color: AppColors.danger),
                      ),
                    ),
                  if (event.extractedFacts.quantity != null)
                    Chip(
                      label: Text(
                        'Qty: ${event.extractedFacts.quantity!.display}',
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 16),

              if (proposal != null && proposal.candidates.isNotEmpty) ...[
                Text(
                  'INTELLIGENCE MATCH PROPOSAL',
                  style: AppTypography.bodySmBold.copyWith(
                    letterSpacing: 0.5,
                    color: AppColors.textMuted,
                  ),
                ),
                const SizedBox(height: 8),
                ...proposal.candidates.map(
                  (cand) => Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.canvas,
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
                              'Candidate: ${cand.activityId} (WBS ${cand.activityWbs})',
                              style: AppTypography.bodyMdBold,
                            ),
                            ConfidenceBadge(score: cand.score, band: cand.band),
                          ],
                        ),
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
                    color: AppColors.surfaceMuted,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    'No candidates matched above threshold (Unmatched / new activity proposal).',
                    style: AppTypography.bodySm,
                  ),
                ),
              ],

              const SizedBox(height: 16),
              ExpansionTile(
                title: Text(
                  'View Raw Contract JSON Payload',
                  style: AppTypography.bodySmBold,
                ),
                children: [
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    color: AppColors.surfaceMuted,
                    child: Text(
                      const JsonEncoder.withIndent('  ')
                          .convert(event.toJson()),
                      style: AppTypography.monoSm.copyWith(fontSize: 10),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final allEvents = ref.watch(eventsProvider).events;
    final search = _searchController.text.toLowerCase().trim();

    final filtered = allEvents.where((e) {
      if (_selectedFilter == 'pending' && e.syncStatus != SyncStatus.pending)
        return false;
      if (_selectedFilter == 'submitted' && e.status != 'submitted')
        return false;
      if (_selectedFilter == 'proposed' && e.status != 'proposed') return false;
      if (_selectedFilter == 'verified' && e.status != 'verified') return false;
      if (_selectedFilter == 'rejected' && e.status != 'rejected') return false;

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
          onPressed: () => context.go('/'),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.sync),
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
          // Filter Tabs
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
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
              decoration: InputDecoration(
                hintText: 'Search by event ID, asset, or note...',
                prefixIcon: const Icon(Icons.search, size: 20),
                suffixIcon: search.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        onPressed: () =>
                            setState(() => _searchController.clear()),
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

          // Events List
          Expanded(
            child: filtered.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.inbox,
                          size: 48,
                          color: AppColors.textMuted,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'No execution events match filter',
                          style: AppTypography.bodyMd,
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
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
                          borderRadius: BorderRadius.circular(12),
                          onTap: () => _showEventDetail(event, proposal),
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Row(
                                      children: [
                                        StatusBadge(
                                          status: event.status,
                                          isDense: true,
                                        ),
                                        const SizedBox(width: 6),
                                        if (event.syncStatus ==
                                            SyncStatus.pending)
                                          const StatusBadge(
                                            status: 'pending',
                                            isDense: true,
                                          ),
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
                                const SizedBox(height: 8),
                                Text(
                                  event.evidence.text,
                                  style: AppTypography.bodyMdBold.copyWith(
                                    fontSize: 13,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    if (event.extractedFacts.assetId !=
                                        null) ...[
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 6,
                                          vertical: 2,
                                        ),
                                        decoration: BoxDecoration(
                                          color: AppColors.surfaceMuted,
                                          borderRadius: BorderRadius.circular(
                                            4,
                                          ),
                                        ),
                                        child: Text(
                                          event.extractedFacts.assetId!,
                                          style: AppTypography.monoSm.copyWith(
                                            fontSize: 10,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 6),
                                    ],
                                    if (event.extractedFacts.discipline !=
                                        null) ...[
                                      Text(
                                        event.extractedFacts.discipline!
                                            .toUpperCase(),
                                        style: AppTypography.bodySm.copyWith(
                                          fontSize: 11,
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                    ],
                                    if (event.extractedFacts.delayReason !=
                                        null) ...[
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 6,
                                          vertical: 2,
                                        ),
                                        decoration: BoxDecoration(
                                          color: AppColors.dangerBg,
                                          borderRadius: BorderRadius.circular(
                                            4,
                                          ),
                                        ),
                                        child: Text(
                                          event.extractedFacts.delayReason!,
                                          style: const TextStyle(
                                            fontSize: 10,
                                            color: AppColors.danger,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 6),
                                    ],
                                    const Spacer(),
                                    if (topCand != null)
                                      ConfidenceBadge(
                                        score: topCand.score,
                                        band: topCand.band,
                                      ),
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
      selectedColor: AppColors.action,
      labelStyle: AppTypography.bodySmBold.copyWith(
        color: isSelected ? Colors.white : AppColors.text,
        fontSize: 12,
      ),
      onSelected: (sel) {
        if (sel) setState(() => _selectedFilter = filterKey);
      },
    );
  }
}
