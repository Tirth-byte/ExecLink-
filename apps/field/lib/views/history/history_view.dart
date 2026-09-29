import 'dart:convert';
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/app_typography.dart';
import '../../models/execution_event.dart';
import '../../models/match_proposal.dart';
import '../../providers/field_providers.dart';
import '../../widgets/confidence_badge.dart';
import '../../widgets/status_badge.dart';
import '../../widgets/field_page_header.dart';
import '../../widgets/evidence_attachment_field.dart';

class HistoryView extends ConsumerStatefulWidget {
  const HistoryView({super.key});

  @override
  ConsumerState<HistoryView> createState() => _HistoryViewState();
}

class _HistoryViewState extends ConsumerState<HistoryView> {
  String _selectedFilter =
      'all'; // all, pending, submitted, proposed, verified, rejected, unmatched
  final TextEditingController _searchController = TextEditingController();
  Timer? _searchDebounce;
  String _searchQuery = '';

  void _showMoreFilters() {
    HapticFeedback.lightImpact();
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      backgroundColor: FieldColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(FieldRadius.sheet),
        ),
      ),
      builder: (sheetContext) => SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Filter updates', style: FieldTypography.sectionTitle),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final option in const {
                    'proposed': 'Matched',
                    'unmatched': 'Unmatched',
                    'verified': 'Verified',
                    'rejected': 'Rejected',
                  }.entries)
                    ChoiceChip(
                      label: Text(option.value),
                      selected: _selectedFilter == option.key,
                      selectedColor: FieldColors.brand50,
                      labelStyle: FieldTypography.bodySmBold.copyWith(
                        color: _selectedFilter == option.key
                            ? FieldColors.brand700
                            : FieldColors.textSecondary,
                      ),
                      side: BorderSide(
                        color: _selectedFilter == option.key
                            ? FieldColors.brand100
                            : FieldColors.border,
                      ),
                      onSelected: (_) {
                        setState(() => _selectedFilter = option.key);
                        Navigator.pop(sheetContext);
                      },
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
  void dispose() {
    _searchDebounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _showEventDetail(ExecutionEvent event, MatchProposal? proposal) {
    HapticFeedback.lightImpact();
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
            color: FieldColors.surface,
            borderRadius: BorderRadius.vertical(
              top: Radius.circular(FieldRadius.sheet),
            ),
          ),
          child: ListView(
            controller: scrollController,
            padding: const EdgeInsets.all(20),
            children: [
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: FieldColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    event.id,
                    style: FieldTypography.cardTitle.copyWith(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  StatusBadge(status: event.status),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                'Client ID: ${event.clientEventId}',
                style: FieldTypography.monoSm.copyWith(
                  color: FieldColors.textMuted,
                ),
              ),
              Text(
                'Observed: ${event.observedAt.substring(0, 16)} · Reporter: ${event.reporterId}',
                style: FieldTypography.metadata.copyWith(
                  color: FieldColors.textMuted,
                ),
              ),
              const Divider(height: 24),

              Text(
                'SYNC & REVIEW',
                style: FieldTypography.statusText.copyWith(
                  letterSpacing: 0.5,
                  color: FieldColors.textMuted,
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: [
                  StatusBadge(status: event.syncStatus.name),
                  StatusBadge(status: event.status),
                ],
              ),
              const SizedBox(height: 16),

              Text(
                'EVIDENCE / FIELD TEXT',
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
                  borderRadius: BorderRadius.circular(FieldRadius.control),
                  border: Border.all(color: FieldColors.borderSubtle),
                ),
                child: Text(
                  event.evidence.text,
                  style: FieldTypography.body,
                ),
              ),
              const SizedBox(height: 16),

              if (event.evidence.attachments.isNotEmpty) ...[
                Text(
                  'EVIDENCE ATTACHMENTS',
                  style: FieldTypography.statusText.copyWith(
                    letterSpacing: 0.5,
                    color: FieldColors.textMuted,
                  ),
                ),
                const SizedBox(height: 8),
                EvidencePreviewStrip(attachments: event.evidence.attachments),
                const SizedBox(height: 16),
              ],

              Text(
                'EXTRACTED FACTS',
                style: FieldTypography.statusText.copyWith(
                  letterSpacing: 0.5,
                  color: FieldColors.textMuted,
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: [
                  if (event.extractedFacts.assetId != null)
                    _FactPill(
                      label: 'Asset: ${event.extractedFacts.assetId}',
                      color: FieldColors.text,
                      bg: FieldColors.surfaceRaised,
                      border: FieldColors.border,
                    ),
                  if (event.extractedFacts.discipline != null)
                    _FactPill(
                      label:
                          'Discipline: ${event.extractedFacts.discipline!.toUpperCase()}',
                      color: FieldColors.text,
                      bg: FieldColors.surfaceRaised,
                      border: FieldColors.border,
                    ),
                  if (event.extractedFacts.workType != null)
                    _FactPill(
                      label: 'Work: ${event.extractedFacts.workType}',
                      color: FieldColors.text,
                      bg: FieldColors.surfaceRaised,
                      border: FieldColors.border,
                    ),
                  if (event.extractedFacts.delayReason != null)
                    _FactPill(
                      label: 'Delay: ${event.extractedFacts.delayReason}',
                      color: FieldColors.danger,
                      bg: FieldColors.dangerBg,
                      border: FieldColors.dangerBorder,
                    ),
                  if (event.extractedFacts.quantity != null)
                    _FactPill(
                      label: 'Qty: ${event.extractedFacts.quantity!.display}',
                      color: FieldColors.text,
                      bg: FieldColors.surfaceRaised,
                      border: FieldColors.border,
                    ),
                ],
              ),
              const SizedBox(height: 16),

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
                      border: Border.all(color: FieldColors.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              '${cand.activityId} (WBS ${cand.activityWbs})',
                              style: FieldTypography.cardTitle.copyWith(
                                fontSize: 14,
                              ),
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
                    color: FieldColors.surfaceRaised,
                    borderRadius: BorderRadius.circular(FieldRadius.control),
                    border: Border.all(color: FieldColors.borderSubtle),
                  ),
                  child: Text(
                    'No candidates matched above threshold (Unmatched / new activity proposal).',
                    style: FieldTypography.metadata,
                  ),
                ),
              ],

              const SizedBox(height: 16),
              ExpansionTile(
                title: Text(
                  'View Raw Contract JSON Payload',
                  style: FieldTypography.bodyBold.copyWith(fontSize: 13),
                ),
                children: [
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: FieldColors.surfaceRaised,
                      borderRadius: BorderRadius.circular(FieldRadius.control),
                      border: Border.all(color: FieldColors.borderSubtle),
                    ),
                    child: Text(
                      const JsonEncoder.withIndent('  ')
                          .convert(event.toJson()),
                      style: FieldTypography.monoSm.copyWith(fontSize: 10),
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
    final eventsNotifier = ref.read(eventsProvider);
    final search = _searchQuery.toLowerCase().trim();

    final isAdvancedFilterActive =
        _selectedFilter != 'all' &&
        _selectedFilter != 'pending' &&
        _selectedFilter != 'submitted';

    final filtered = allEvents.where((e) {
      if (_selectedFilter == 'pending' && e.syncStatus != SyncStatus.pending) {
        return false;
      }
      if (_selectedFilter == 'submitted' && e.status != 'submitted') {
        return false;
      }
      final proposal = eventsNotifier.getProposalForEvent(e.id);
      final hasMatch = proposal?.candidates.isNotEmpty == true;
      if (_selectedFilter == 'proposed' && !hasMatch) return false;
      if (_selectedFilter == 'unmatched' && hasMatch) return false;
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

    return Column(
      children: [
        // Left-aligned header normalized with Today's Work scale
        const FieldPageHeader(
          title: 'Capture History',
          subtitle: 'Submitted updates and sync status',
          padding: EdgeInsets.fromLTRB(16, 14, 16, 6),
        ),

        // Unified Segmented Filter + Compact Filter Icon Button
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          child: Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(3),
                  decoration: BoxDecoration(
                    color: FieldColors.surfaceRaised,
                    borderRadius: BorderRadius.circular(FieldRadius.input),
                    border: Border.all(
                      color: FieldColors.borderSubtle,
                      width: 1,
                    ),
                  ),
                  child: Row(
                    children: [
                      Expanded(child: _buildCompactFilter('all', 'All')),
                      Expanded(
                        child: _buildCompactFilter('pending', 'Pending'),
                      ),
                      Expanded(
                        child: _buildCompactFilter('submitted', 'Review'),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              // Compact 40-42px filter icon button with neutral border
              Semantics(
                label: 'More history filters',
                button: true,
                child: Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: isAdvancedFilterActive
                        ? FieldColors.brand50
                        : FieldColors.surface,
                    borderRadius: BorderRadius.circular(FieldRadius.control),
                    border: Border.all(
                      color: isAdvancedFilterActive
                          ? FieldColors.brand100
                          : FieldColors.border,
                      width: 1,
                    ),
                  ),
                  child: IconButton(
                    onPressed: _showMoreFilters,
                    icon: Icon(
                      Icons.tune_rounded,
                      size: 18,
                      color: isAdvancedFilterActive
                          ? FieldColors.brand700
                          : FieldColors.textSecondary,
                    ),
                    tooltip: 'More filters',
                    padding: EdgeInsets.zero,
                  ),
                ),
              ),
            ],
          ),
        ),

        // Compact Search Field
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          child: TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: 'Search by event ID, asset, or note...',
              prefixIcon: const Icon(
                Icons.search,
                size: 18,
                color: FieldColors.textMuted,
              ),
              suffixIcon: search.isNotEmpty
                  ? IconButton(
                      icon: const Icon(
                        Icons.clear,
                        size: 16,
                        color: FieldColors.textMuted,
                      ),
                      onPressed: () => setState(() {
                        _searchController.clear();
                        _searchQuery = '';
                      }),
                    )
                  : null,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 9,
              ),
            ),
            onChanged: (value) {
              _searchDebounce?.cancel();
              _searchDebounce = Timer(const Duration(milliseconds: 250), () {
                if (mounted) setState(() => _searchQuery = value);
              });
            },
          ),
        ),

        // Denser, Harmonized Events List
        Expanded(
          child: filtered.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        Icons.inbox_outlined,
                        size: 40,
                        color: FieldColors.textMuted,
                      ),
                      const SizedBox(height: 10),
                      Text(
                        allEvents.isEmpty
                            ? 'No field updates yet.'
                            : 'No updates match these filters.',
                        style: FieldTypography.metadata.copyWith(
                          color: FieldColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                  itemCount: filtered.length,
                  itemBuilder: (context, index) {
                    final event = filtered[index];
                    final proposal = ref
                        .read(eventsProvider)
                        .getProposalForEvent(event.id);
                    final topCand = proposal?.candidates.isNotEmpty == true
                        ? proposal!.candidates.first
                        : null;

                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      decoration: BoxDecoration(
                        color: FieldColors.surface,
                        borderRadius: BorderRadius.circular(FieldRadius.card),
                        border: Border.all(color: FieldColors.border, width: 1),
                      ),
                      child: Material(
                        color: Colors.transparent,
                        child: InkWell(
                          borderRadius: BorderRadius.circular(FieldRadius.card),
                          onTap: () => _showEventDetail(event, proposal),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 12,
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Top row: Status Badge & Event ID
                                Wrap(
                                  alignment: WrapAlignment.spaceBetween,
                                  crossAxisAlignment: WrapCrossAlignment.center,
                                  spacing: 8,
                                  runSpacing: 4,
                                  children: [
                                    Wrap(
                                      spacing: 6,
                                      runSpacing: 4,
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
                                    Text(
                                      event.id,
                                      style: FieldTypography.monoSm.copyWith(
                                        fontSize: 11,
                                        color: FieldColors.textMuted,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),

                                // Evidence description text
                                Text(
                                  event.evidence.text,
                                  style: FieldTypography.cardTitle.copyWith(
                                    fontSize: 13.5,
                                    height: 1.35,
                                    color: FieldColors.text,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),

                                // Attachments row if any
                                if (event.evidence.attachments.isNotEmpty) ...[
                                  const SizedBox(height: 6),
                                  Row(
                                    children: [
                                      const Icon(
                                        Icons.attach_file_rounded,
                                        size: 13,
                                        color: FieldColors.textMuted,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        '${event.evidence.attachments.length} evidence attachment${event.evidence.attachments.length == 1 ? '' : 's'}',
                                        style:
                                            FieldTypography.metadata.copyWith(
                                              fontSize: 11,
                                              color: FieldColors.textMuted,
                                            ),
                                      ),
                                    ],
                                  ),
                                ],
                                const SizedBox(height: 8),

                                // Bottom metadata row: Plain Metadata (Asset · Discipline) & State Badges
                                Builder(
                                  builder: (context) {
                                    final metaParts = <String>[];
                                    if (event.extractedFacts.assetId != null &&
                                        event.extractedFacts.assetId!.isNotEmpty) {
                                      metaParts.add(event.extractedFacts.assetId!);
                                    }
                                    if (event.extractedFacts.discipline != null &&
                                        event.extractedFacts.discipline!.isNotEmpty) {
                                      metaParts.add(
                                        event.extractedFacts.discipline!.toUpperCase(),
                                      );
                                    }
                                    final metaString = metaParts.join(' · ');

                                    return Wrap(
                                      alignment: WrapAlignment.spaceBetween,
                                      crossAxisAlignment: WrapCrossAlignment.center,
                                      spacing: 8,
                                      runSpacing: 4,
                                      children: [
                                        if (metaString.isNotEmpty)
                                          Text(
                                            metaString,
                                            style: FieldTypography.metadata.copyWith(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w600,
                                              color: FieldColors.textSecondary,
                                              letterSpacing: 0.2,
                                            ),
                                          )
                                        else
                                          const SizedBox.shrink(),
                                        Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            if (event.extractedFacts.delayReason != null)
                                              Padding(
                                                padding: const EdgeInsets.only(right: 6),
                                                child: StatusBadge(
                                                  status: 'delayed',
                                                  isDense: true,
                                                ),
                                              ),
                                            if (topCand != null)
                                              ConfidenceBadge(
                                                score: topCand.score,
                                                band: topCand.band,
                                              )
                                            else if (proposal != null &&
                                                proposal.candidates.isEmpty)
                                              const StatusBadge(
                                                status: 'unmatched',
                                                isDense: true,
                                              ),
                                          ],
                                        ),
                                      ],
                                    );
                                  },
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildCompactFilter(String filterKey, String label) {
    final isSelected = _selectedFilter == filterKey;
    return Semantics(
      selected: isSelected,
      button: true,
      child: AnimatedContainer(
        duration: FieldMotion.quick,
        decoration: BoxDecoration(
          color: isSelected ? FieldColors.brand50 : Colors.transparent,
          borderRadius: BorderRadius.circular(FieldRadius.control),
          border: isSelected
              ? Border.all(color: FieldColors.brand100, width: 1)
              : null,
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: () {
              HapticFeedback.selectionClick();
              setState(() => _selectedFilter = filterKey);
            },
            borderRadius: BorderRadius.circular(FieldRadius.control),
            child: SizedBox(
              height: 38,
              child: Center(
                child: Text(
                  label,
                  style: FieldTypography.bodySmBold.copyWith(
                    color: isSelected
                        ? FieldColors.brand700
                        : FieldColors.textSecondary,
                    fontSize: 12,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _FactPill extends StatelessWidget {
  final String label;
  final Color color;
  final Color bg;
  final Color border;

  const _FactPill({
    required this.label,
    required this.color,
    required this.bg,
    required this.border,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(FieldRadius.badge),
        border: Border.all(color: border, width: 1),
      ),
      child: Text(
        label,
        style: FieldTypography.metadata.copyWith(
          fontSize: 11,
          fontWeight: FontWeight.w500,
          color: color,
        ),
      ),
    );
  }
}
