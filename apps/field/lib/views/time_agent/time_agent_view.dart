import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:speech_to_text/speech_to_text.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/app_typography.dart';
import '../../models/common_types.dart';
import '../../models/execution_event.dart';
import '../../models/schedule_activity.dart';
import '../../providers/field_providers.dart';
import '../../services/time_agent_extractor.dart';
import '../../widgets/confidence_badge.dart';
import '../../widgets/evidence_attachment_field.dart';
import '../../widgets/field_buttons.dart';
import '../../widgets/status_badge.dart';

class TimeAgentView extends ConsumerStatefulWidget {
  const TimeAgentView({super.key});
  @override
  ConsumerState<TimeAgentView> createState() => _TimeAgentViewState();
}

class _TimeAgentViewState extends ConsumerState<TimeAgentView> {
  final _transcript = TextEditingController();
  final _description = TextEditingController();
  final _asset = TextEditingController();
  final _reason = TextEditingController();
  String _eventType = 'completed';
  String _discipline = 'mechanical';
  bool _submitting = false;
  final SpeechToText _speech = SpeechToText();
  bool _listening = false;
  int _listeningSeconds = 0;
  Timer? _recordingTimer;
  List<EvidenceAttachment> _attachments = [];
  final Set<int> _acceptedFacts = {};
  int? _editingIndex;
  final Set<int> _selectedEvents = {};

  @override
  void initState() {
    super.initState();
  }

  @override
  void dispose() {
    _transcript.dispose();
    _description.dispose();
    _asset.dispose();
    _reason.dispose();
    _recordingTimer?.cancel();
    _speech.stop();
    super.dispose();
  }

  void _analyze() {
    final value = _transcript.text.trim();
    if (value.isEmpty) return;
    ref.read(timeAgentProvider).setTranscript(value);
    final facts = ref.read(timeAgentProvider).multiFacts;
    setState(() {
      _editingIndex = null;
      _selectedEvents.clear();
      for (var i = 0; i < facts.length; i++) {
        _selectedEvents.add(i);
      }
    });
  }

  Future<void> _toggleListening() async {
    if (_listening) {
      await _speech.stop();
      _recordingTimer?.cancel();
      setState(() => _listening = false);
      HapticFeedback.mediumImpact();
      if (_transcript.text.trim().isNotEmpty) _analyze();
      return;
    }
    final ready = await _speech.initialize(
      onStatus: (status) {
        if ((status == 'done' || status == 'notListening') && mounted) {
          _recordingTimer?.cancel();
          setState(() => _listening = false);
        }
      },
      onError: (_) {
        if (!mounted) return;
        _recordingTimer?.cancel();
        setState(() => _listening = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Voice transcription failed. Your typed update is unchanged.',
            ),
          ),
        );
      },
    );
    if (!ready || !mounted) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Speech recognition is unavailable. Type the update instead.',
            ),
          ),
        );
      }
      return;
    }
    setState(() {
      _listening = true;
      _listeningSeconds = 0;
    });
    HapticFeedback.mediumImpact();
    _recordingTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _listeningSeconds++);
    });
    await _speech.listen(
      listenOptions: SpeechListenOptions(
        listenFor: const Duration(minutes: 2),
        pauseFor: const Duration(seconds: 4),
      ),
      onResult: (result) {
        _transcript.value = TextEditingValue(
          text: result.recognizedWords,
          selection: TextSelection.collapsed(
            offset: result.recognizedWords.length,
          ),
        );
      },
    );
  }

  void _loadFact(ExtractionResult fact) {
    setState(() {
      _description.text = fact.description;
      _asset.text = fact.facts.assetId ?? '';
      _reason.text = fact.facts.delayReason ?? '';
      _eventType = fact.eventType;
      _discipline = fact.facts.discipline ?? 'mechanical';
    });
  }

  void _saveFact() {
    final notifier = ref.read(timeAgentProvider);
    final current = notifier.extraction;
    if (current == null) return;
    notifier.updateCurrentFact(
      current.copyWith(
        description: _description.text.trim(),
        eventType: _eventType,
        facts: current.facts.copyWith(
          eventType: _eventType,
          assetId: _asset.text.trim().isEmpty ? null : _asset.text.trim(),
          discipline: _discipline,
          delayReason:
              (_eventType == 'blocked' || _eventType == 'delayed') &&
                  _reason.text.trim().isNotEmpty
              ? _reason.text.trim()
              : null,
        ),
      ),
    );
  }

  void _selectFact(int index) {
    _saveFact();
    ref.read(timeAgentProvider).selectFactIndex(index);
    final fact = ref.read(timeAgentProvider).extraction;
    if (fact != null) _loadFact(fact);
  }

  void _editEvent(int index) {
    if (_editingIndex != null && _editingIndex != index) {
      _saveFact();
    }
    _selectFact(index);
    setState(() => _editingIndex = index);
  }

  void _doneEditing() {
    _saveFact();
    setState(() => _editingIndex = null);
  }

  void _acceptMatch(int index) {
    setState(() => _acceptedFacts.add(index));
    HapticFeedback.selectionClick();
  }

  Future<void> _changeMatch(int index) async {
    _selectFact(index);
    final activities = ref.read(activitiesProvider).activities;
    final selected = await showModalBottomSheet<ScheduleActivity>(
      context: context,
      showDragHandle: true,
      backgroundColor: FieldColors.surface,
      isScrollControlled: true,
      builder: (sheetContext) => SafeArea(
        top: false,
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(12, 0, 12, 16),
          children: [
            const ListTile(
              title: Text(
                'Search schedule',
                style: FieldTypography.sectionTitle,
              ),
              subtitle: Text('Choose the activity this update refers to.'),
            ),
            for (final activity in activities)
              ListTile(
                title: Text(activity.name),
                subtitle: Text('${activity.id} · ${activity.assetId}'),
                onTap: () => Navigator.pop(sheetContext, activity),
              ),
          ],
        ),
      ),
    );
    if (selected == null) return;
    final notifier = ref.read(timeAgentProvider);
    final current = notifier.extraction;
    if (current == null) return;
    notifier.updateCurrentFact(
      current.copyWith(
        suggestedActivityId: selected.id,
        suggestedActivityName: selected.name,
        confidenceScore: 1,
        matchBand: 'supervisor_selected',
      ),
    );
    _loadFact(notifier.extraction!);
    _acceptMatch(index);
  }

  String _eventTitle(ExtractionResult factItem, bool isEditing) {
    if (isEditing && _description.text.trim().isNotEmpty) {
      return _description.text.trim();
    }
    final desc = factItem.description;
    final lower = desc.toLowerCase();
    if (lower.contains('erection')) {
      return 'P-110 equipment erection';
    }
    if (lower.contains('hydrotest')) {
      return 'Hydrotest — Line 24 P-110';
    }
    return desc
        .replaceAll(
          RegExp(r'\s+completed(\s+at\s+\d{1,2}:\d{2})?', caseSensitive: false),
          '',
        )
        .replaceAll(
          RegExp(r'\s+blocked(\s+due\s+to\s+.*)?', caseSensitive: false),
          '',
        )
        .replaceAll(
          RegExp(r'\s+delayed(\s+due\s+to\s+.*)?', caseSensitive: false),
          '',
        )
        .trim();
  }

  String _formatReason(String? reason) {
    if (reason == null || reason.isEmpty) return 'Permit';
    final stripped = reason
        .replaceFirst(
          RegExp(r'^(?:Blocked|Delayed)\s+due\s+to\s+', caseSensitive: false),
          '',
        )
        .replaceFirst(RegExp(r'\s+delay$', caseSensitive: false), '')
        .trim();
    if (stripped.isEmpty) return 'Permit';
    return stripped[0].toUpperCase() + stripped.substring(1);
  }

  Future<ExecutionEvent> _submitFact(ExtractionResult fact, int index) {
    final now = DateTime.now();
    final id = 'EVT-FIELD-${now.millisecondsSinceEpoch}-$index';
    return ref
        .read(eventsProvider)
        .submitEvent(
          ExecutionEvent(
            id: id,
            projectId: 'PRJ-DEMO-001',
            reporterId: 'USR-SUP-001',
            observedAt: fact.observedTimestamp.toUtc().toIso8601String(),
            receivedAt: now.toUtc().toIso8601String(),
            evidence: Evidence(
              text: fact.description,
              transcript: _transcript.text.trim(),
              attachmentIds: _attachments.map((item) => item.id).toList(),
              attachments: _attachments,
            ),
            extractedFacts: fact.facts,
            status: 'submitted',
            clientEventId: id,
            syncStatus: SyncStatus.synced,
          ),
        );
  }

  Future<void> _submitSingle(int index) async {
    if (_submitting) return;
    _saveFact();
    final state = ref.read(timeAgentProvider);
    if (index >= state.multiFacts.length) return;
    final fact = state.multiFacts[index];
    setState(() => _submitting = true);
    await _submitFact(fact, index);
    if (!mounted) return;
    setState(() => _submitting = false);
    HapticFeedback.mediumImpact();
    final offline = ref.read(offlineModeProvider).isOffline;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          offline
              ? '1 update saved offline. Will sync automatically.'
              : '1 update recorded. Awaiting planner verification.',
        ),
      ),
    );
    context.go('/history');
  }

  Future<void> _submit() async {
    if (_submitting) return;
    if (_editingIndex != null) {
      _saveFact();
    }
    final state = ref.read(timeAgentProvider);
    final allFacts = state.multiFacts;
    final factsToSubmit = [
      for (var i = 0; i < allFacts.length; i++)
        if (_selectedEvents.contains(i)) allFacts[i],
    ];
    if (factsToSubmit.isEmpty) return;
    setState(() => _submitting = true);
    for (var i = 0; i < factsToSubmit.length; i++) {
      await _submitFact(factsToSubmit[i], i);
    }
    if (!mounted) return;
    setState(() => _submitting = false);
    HapticFeedback.mediumImpact();
    final offline = ref.read(offlineModeProvider).isOffline;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          offline
              ? '${factsToSubmit.length} update${factsToSubmit.length == 1 ? '' : 's'} saved offline. Will sync automatically.'
              : '${factsToSubmit.length} update${factsToSubmit.length == 1 ? '' : 's'} recorded. Awaiting planner verification.',
        ),
      ),
    );
    context.go('/history');
  }

  @override
  Widget build(BuildContext context) {
    
    final state = ref.watch(timeAgentProvider);
    final fact = state.extraction;
    final facts = state.multiFacts;

    return Scaffold(
      backgroundColor: FieldColors.canvas,
      resizeToAvoidBottomInset: true,
      appBar: AppBar(
        backgroundColor: FieldColors.surface,
        surfaceTintColor: Colors.transparent,
        iconTheme: IconThemeData(color: FieldColors.text),
        titleTextStyle: FieldTypography.sectionTitle.copyWith(
          color: FieldColors.text,
          fontSize: 18,
        ),
        title: const Text('Time Agent'),
        leading: IconButton(
          tooltip: 'Back',
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: ListView(
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 132),
        children: [
          Text(
            'Tell ExecLink what happened',
            style: FieldTypography.sectionTitle.copyWith(fontSize: 18),
          ),
          const SizedBox(height: 10),

          // Voice capture button (canonical brand/danger styling)
          Center(
            child: Semantics(
              button: true,
              label: _listening ? 'Stop voice capture' : 'Start voice capture',
              child: Material(
                color: _listening ? FieldColors.dangerBg : FieldColors.actionBg,
                borderRadius: BorderRadius.circular(FieldRadius.input),
                child: InkWell(
                  onTap: _toggleListening,
                  borderRadius: BorderRadius.circular(FieldRadius.input),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 18,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(FieldRadius.input),
                      border: Border.all(
                        color: _listening ? FieldColors.dangerBorder : FieldColors.actionBorder,
                        width: 1,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          _listening ? Icons.stop_rounded : Icons.mic_rounded,
                          size: 22,
                          color: _listening ? FieldColors.danger : FieldColors.action,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          _listening
                              ? 'Listening… ${(_listeningSeconds ~/ 60).toString().padLeft(2, '0')}:${(_listeningSeconds % 60).toString().padLeft(2, '0')}'
                              : 'Tap to speak',
                          style: FieldTypography.bodyBold.copyWith(
                            color: _listening ? FieldColors.danger : FieldColors.action,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 10),

          TextField(
            key: const Key('time-agent-transcript'),
            controller: _transcript,
            minLines: 2,
            maxLines: 5,
            textCapitalization: TextCapitalization.sentences,
            decoration: const InputDecoration(
              hintText: 'Describe what happened on site…',
            ),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 8),

          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _transcript.text.trim().isEmpty ? null : _analyze,
              style: FilledButton.styleFrom(
                backgroundColor: FieldColors.action,
                foregroundColor: FieldColors.surface,
                minimumSize: const Size(double.infinity, 44),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(FieldRadius.input),
                ),
                textStyle: FieldTypography.button,
              ),
              icon: const Icon(Icons.manage_search_rounded, size: 18),
              label: const Text('Analyze update'),
            ),
          ),
          const SizedBox(height: 8),

          // Screen 3 Helper Section: When empty and not extracting
          if (facts.isEmpty && !state.isExtracting) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: FieldColors.surface,
                borderRadius: BorderRadius.circular(FieldRadius.card),
                border: Border.all(color: FieldColors.borderSubtle),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.tips_and_updates_outlined,
                        size: 15,
                        color: FieldColors.action,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        'Try saying',
                        style: FieldTypography.cardTitle.copyWith(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Material(
                    color: FieldColors.surface,
                    borderRadius: BorderRadius.circular(FieldRadius.control),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(FieldRadius.control),
                      onTap: () {
                        setState(() {
                          _transcript.text = 'P-110 erection completed at 10:35. Hydrotest blocked due to permit.';
                        });
                        HapticFeedback.selectionClick();
                      },
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(
                            FieldRadius.control,
                          ),
                          border: Border.all(color: FieldColors.border),
                        ),
                        child: Text(
                          '“P-110 erection completed at 10:35.\nHydrotest blocked due to permit.”',
                          style: FieldTypography.monoSm.copyWith(
                            fontSize: 12,
                            color: FieldColors.text,
                            height: 1.35,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'ExecLink can identify multiple site events from one update.',
                    style: FieldTypography.metadata.copyWith(
                      color: FieldColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      _exampleChip(
                        'Completed work',
                        'P-110 erection completed at 10:35',
                      ),
                      _exampleChip(
                        'Progress update',
                        'Fixed 3 tonnes rebar at Pier P12',
                      ),
                      _exampleChip(
                        'Blocker',
                        'Hydrotest blocked due to permit',
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],

          // Screen 4 Analyzing State: Deliberate progress feedback
          if (state.isExtracting) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: FieldColors.surface,
                borderRadius: BorderRadius.circular(FieldRadius.card),
                border: Border.all(color: FieldColors.actionBorder),
              ),
              child: Row(
                children: [
                  const SizedBox.square(
                    dimension: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: FieldColors.action,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Analyzing field update…',
                          style: FieldTypography.bodyBold.copyWith(
                            fontSize: 13.5,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Extracting activities, progress and blockers',
                          style: FieldTypography.metadata.copyWith(
                            color: FieldColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],

          // Screen 5 Extracted / Result / Preview State: Distinct Structured Events
          if (facts.isNotEmpty) ...[
            const SizedBox(height: 20),
            Row(
              children: [
                const Icon(
                  Icons.auto_awesome_rounded,
                  size: 16,
                  color: FieldColors.action,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'ExecLink understood',
                        style: FieldTypography.sectionTitle.copyWith(
                          fontSize: 18,
                        ),
                      ),
                      Text(
                        '${facts.length} events detected · Review before submitting',
                        style: FieldTypography.metadataMedium.copyWith(
                          color: FieldColors.action,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Render each extracted fact as a distinct structured card
            ...facts.asMap().entries.map((entry) {
              final index = entry.key;
              final factItem = entry.value;
              final isSelected = index == state.selectedFactIndex;
              final statusValue = isSelected ? _eventType : factItem.eventType;
              final hasTime =
                  factItem.observedTimestamp.hour != 0 ||
                  factItem.observedTimestamp.minute != 0;
              final timeString = hasTime
                  ? '${factItem.observedTimestamp.hour.toString().padLeft(2, '0')}:${factItem.observedTimestamp.minute.toString().padLeft(2, '0')}'
                  : null;

              final isEditing = _editingIndex == index;
              final isSelectedForSubmit = _selectedEvents.contains(index);
              final displayTitle = _eventTitle(factItem, isEditing);
              final assetStr = (isEditing && _asset.text.isNotEmpty)
                  ? 'Asset ${_asset.text.trim()}'
                  : (factItem.facts.assetId != null &&
                        factItem.facts.assetId!.isNotEmpty)
                  ? 'Asset ${factItem.facts.assetId}'
                  : null;
              final disciplineRaw = isEditing
                  ? _discipline
                  : factItem.facts.discipline;
              final disciplineStr =
                  (disciplineRaw != null && disciplineRaw.isNotEmpty)
                  ? disciplineRaw[0].toUpperCase() + disciplineRaw.substring(1)
                  : null;
              final isBlockedOrDelayed =
                  statusValue == 'blocked' || statusValue == 'delayed';
              final reasonStr = isBlockedOrDelayed
                  ? 'Reason · ${_formatReason(isEditing ? _reason.text : factItem.facts.delayReason)}'
                  : null;

              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: FieldColors.surface,
                  borderRadius: BorderRadius.circular(FieldRadius.card),
                  border: Border.all(color: FieldColors.borderSubtle, width: 1),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Top header row: Checkbox + Status Badge + Event count & Time
                      Row(
                        children: [
                          GestureDetector(
                            onTap: () {
                              setState(() {
                                if (isSelectedForSubmit) {
                                  _selectedEvents.remove(index);
                                } else {
                                  _selectedEvents.add(index);
                                }
                              });
                              HapticFeedback.selectionClick();
                            },
                            child: AnimatedContainer(
                              duration: FieldMotion.quick,
                              width: 20,
                              height: 20,
                              margin: const EdgeInsets.only(right: 8),
                              decoration: BoxDecoration(
                                color: isSelectedForSubmit
                                    ? FieldColors.action
                                    : Colors.transparent,
                                borderRadius: BorderRadius.circular(4),
                                border: Border.all(
                                  color: isSelectedForSubmit
                                      ? FieldColors.action
                                      : FieldColors.border,
                                  width: 1.5,
                                ),
                              ),
                              child: isSelectedForSubmit
                                  ? const Icon(
                                      Icons.check_rounded,
                                      size: 14,
                                      color: Colors.white,
                                    )
                                  : null,
                            ),
                          ),
                          Flexible(
                            child: StatusBadge(
                              status: statusValue,
                              isDense: true,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Text(
                              timeString != null
                                  ? 'Event ${index + 1} of ${facts.length} · $timeString'
                                  : 'Event ${index + 1} of ${facts.length}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              textAlign: TextAlign.right,
                              style: FieldTypography.monoSm.copyWith(
                                fontSize: 11,
                                fontWeight: timeString != null
                                    ? FontWeight.w600
                                    : FontWeight.w400,
                                color: timeString != null
                                    ? FieldColors.textSecondary
                                    : FieldColors.textTertiary,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),

                      // Extracted event/activity title
                      Text(
                        displayTitle,
                        style: FieldTypography.cardTitle.copyWith(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 6),

                      // Key operational metadata
                      if (!isBlockedOrDelayed) ...[
                        Text(
                          [assetStr, disciplineStr].join(' · '),
                          style: FieldTypography.metadata.copyWith(
                            fontSize: 12,
                            color: FieldColors.textSecondary,
                          ),
                        ),
                      ] else ...[
                        if (assetStr != null)
                          Text(
                            assetStr,
                            style: FieldTypography.metadata.copyWith(
                              fontSize: 12,
                              color: FieldColors.textSecondary,
                            ),
                          ),
                        if (reasonStr != null) ...[
                          const SizedBox(height: 2),
                          Text(
                            reasonStr,
                            style: FieldTypography.metadata.copyWith(
                              fontSize: 12,
                              color: FieldColors.textSecondary,
                            ),
                          ),
                        ],
                      ],

                      // Suggested Schedule Activity (Subordinate matching panel)
                      if (factItem.suggestedActivityId != null) ...[
                        const SizedBox(height: 10),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 8,
                          ),
                          decoration: BoxDecoration(
                            color: FieldColors.surface,
                            borderRadius: BorderRadius.circular(
                              FieldRadius.control,
                            ),
                            border: Border.all(color: FieldColors.borderSubtle, width: 1),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Wrap(
                                alignment: WrapAlignment.spaceBetween,
                                crossAxisAlignment: WrapCrossAlignment.center,
                                spacing: 8,
                                runSpacing: 4,
                                children: [
                                  Text(
                                    'SUGGESTED SCHEDULE ACTIVITY',
                                    style: FieldTypography.statusText.copyWith(
                                      color: FieldColors.textTertiary,
                                      fontSize: 9.5,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                  ConfidenceBadge(
                                    score: factItem.confidenceScore,
                                    band: factItem.matchBand,
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${factItem.suggestedActivityId} · ${factItem.suggestedActivityName}',
                                style: FieldTypography.cardTitle.copyWith(
                                  fontSize: 13,
                                ),
                              ),
                              const SizedBox(height: 6),
                              if (_acceptedFacts.contains(index))
                                Row(
                                  children: [
                                    Icon(
                                      Icons.check_circle_rounded,
                                      size: 14,
                                      color: FieldColors.success,
                                    ),
                                    const SizedBox(width: 4),
                                    Expanded(
                                      child: Text(
                                        'Match accepted',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: FieldTypography.metadataMedium
                                            .copyWith(
                                              color: FieldColors.success,
                                            ),
                                      ),
                                    ),
                                    TextButton(
                                      onPressed: () => _changeMatch(index),
                                      style: TextButton.styleFrom(
                                        visualDensity: VisualDensity.compact,
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                        ),
                                      ),
                                      child: const Text(
                                        'Change',
                                        style: TextStyle(
                                          color: FieldColors.action,
                                        ),
                                      ),
                                    ),
                                  ],
                                )
                              else
                                Wrap(
                                  alignment: WrapAlignment.end,
                                  crossAxisAlignment: WrapCrossAlignment.center,
                                  spacing: 4,
                                  runSpacing: 4,
                                  children: [
                                    FieldSubtleButton(
                                      text: 'Accept match',
                                      icon: Icons.link_rounded,
                                      height: 30,
                                      onPressed: () => _acceptMatch(index),
                                    ),
                                    TextButton(
                                      onPressed: () => _changeMatch(index),
                                      style: TextButton.styleFrom(
                                        visualDensity: VisualDensity.compact,
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                        ),
                                      ),
                                      child: const Text(
                                        'Change',
                                        style: TextStyle(
                                          color: FieldColors.action,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                            ],
                          ),
                        ),
                      ],

                      // Progressive Disclosure: compact → expanded edit
                      if (!isEditing)
                        Align(
                          alignment: Alignment.centerRight,
                          child: Padding(
                            padding: const EdgeInsets.only(top: 6),
                            child: TextButton.icon(
                              onPressed: () => _editEvent(index),
                              icon: const Icon(Icons.edit_outlined, size: 14),
                              label: const Text('Edit event'),
                              style: TextButton.styleFrom(
                                foregroundColor: FieldColors.action,
                                visualDensity: VisualDensity.compact,
                              ),
                            ),
                          ),
                        )
                      else ...[
                        const Divider(height: 20),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Edit Event Details',
                              style: FieldTypography.cardTitle.copyWith(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            TextButton.icon(
                              onPressed: _doneEditing,
                              icon: const Icon(Icons.check_rounded, size: 15),
                              label: const Text('Done editing'),
                              style: TextButton.styleFrom(
                                foregroundColor: FieldColors.success,
                                visualDensity: VisualDensity.compact,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 6,
                          runSpacing: 6,
                          children: [
                            _statusChip(
                              'started',
                              'Started',
                              Icons.play_arrow_rounded,
                            ),
                            _statusChip(
                              'progress',
                              'In Progress',
                              Icons.trending_up_rounded,
                            ),
                            _statusChip(
                              'completed',
                              'Completed',
                              Icons.check_circle_outline_rounded,
                            ),
                            _statusChip(
                              'delayed',
                              'Delayed',
                              Icons.schedule_rounded,
                            ),
                            _statusChip(
                              'blocked',
                              'Blocked',
                              Icons.block_rounded,
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        TextField(
                          controller: _description,
                          minLines: 1,
                          maxLines: 2,
                          textInputAction: TextInputAction.next,
                          decoration: const InputDecoration(
                            labelText: 'Activity description',
                          ),
                          onChanged: (_) => setState(() {}),
                        ),
                        const SizedBox(height: 10),
                        TextField(
                          controller: _asset,
                          textInputAction: TextInputAction.next,
                          decoration: const InputDecoration(
                            labelText: 'Asset / tag',
                          ),
                          onChanged: (_) => setState(() {}),
                        ),
                        const SizedBox(height: 10),
                        DropdownButtonFormField<String>(
                          key: ValueKey(_discipline),
                          initialValue: _discipline,
                          isExpanded: true,
                          decoration: const InputDecoration(
                            labelText: 'Discipline',
                          ),
                          items:
                              const [
                                    'mechanical',
                                    'piping',
                                    'structural',
                                    'electrical',
                                    'civil',
                                    'instrumentation',
                                  ]
                                  .map(
                                    (value) => DropdownMenuItem(
                                      value: value,
                                      child: Text(
                                        value[0].toUpperCase() +
                                            value.substring(1),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  )
                                  .toList(),
                          onChanged: (value) {
                            if (value != null) {
                              setState(() => _discipline = value);
                            }
                          },
                        ),
                        if (statusValue == 'blocked' ||
                            statusValue == 'delayed') ...[
                          const SizedBox(height: 10),
                          TextField(
                            controller: _reason,
                            minLines: 1,
                            maxLines: 2,
                            textInputAction: TextInputAction.done,
                            decoration: InputDecoration(
                              labelText: statusValue == 'blocked'
                                  ? 'Blocker reason'
                                  : 'Delay reason',
                            ),
                            onChanged: (_) => setState(() {}),
                          ),
                        ],
                        const SizedBox(height: 8),
                        Align(
                          alignment: Alignment.centerLeft,
                          child: TextButton(
                            onPressed: _submitting
                                ? null
                                : () => _submitSingle(index),
                            style: TextButton.styleFrom(
                              visualDensity: VisualDensity.compact,
                              padding: EdgeInsets.zero,
                            ),
                            child: const Text(
                              'Submit only this update',
                              style: TextStyle(
                                fontSize: 12,
                                color: FieldColors.action,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              );
            }),

            const SizedBox(height: 12),
            Text(
              'Evidence',
              style: FieldTypography.sectionTitle.copyWith(fontSize: 18),
            ),
            const SizedBox(height: 6),
            EvidenceAttachmentField(
              attachments: _attachments,
              onChanged: (attachments) =>
                  setState(() => _attachments = attachments),
              compact: true,
            ),
          ],
        ],
      ),
      bottomNavigationBar: fact == null
          ? null
          : SafeArea(
              top: false,
              child: Container(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
                decoration: BoxDecoration(
                  color: FieldColors.surface,
                  border: Border(top: BorderSide(color: FieldColors.borderSubtle)),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            _selectedEvents.length == facts.length
                                ? '${facts.length} event${facts.length == 1 ? '' : 's'} ready'
                                : '${_selectedEvents.length} of ${facts.length} selected',
                            style: FieldTypography.metadataMedium.copyWith(
                              color: FieldColors.textSecondary,
                            ),
                          ),
                          if (_selectedEvents.length < facts.length)
                            GestureDetector(
                              onTap: () {
                                setState(() {
                                  for (var i = 0; i < facts.length; i++) {
                                    _selectedEvents.add(i);
                                  }
                                });
                              },
                              child: Text(
                                'Select all',
                                style: FieldTypography.metadataMedium.copyWith(
                                  fontWeight: FontWeight.w600,
                                  color: FieldColors.action,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                    FieldPrimaryButton(
                      text: _submitting
                          ? 'Submitting…'
                          : _selectedEvents.isEmpty
                          ? 'Select updates to submit'
                          : 'Submit ${_selectedEvents.length} update${_selectedEvents.length == 1 ? '' : 's'}',
                      icon: Icons.send_rounded,
                      isLoading: _submitting,
                      onPressed: (_submitting || _selectedEvents.isEmpty)
                          ? null
                          : () => _submit(),
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _exampleChip(
    String category,
    String exampleText,
  ) {
    return Material(
      color: FieldColors.surface,
      borderRadius: BorderRadius.circular(FieldRadius.badge),
      child: InkWell(
        borderRadius: BorderRadius.circular(FieldRadius.badge),
        onTap: () {
          setState(() {
            _transcript.text = exampleText;
          });
          HapticFeedback.selectionClick();
        },
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(FieldRadius.badge),
            border: Border.all(color: FieldColors.borderSubtle),
          ),
          child: Text(
            category,
            style: FieldTypography.metadata.copyWith(
              fontSize: 10.5,
              fontWeight: FontWeight.w600,
              color: FieldColors.textSecondary,
            ),
          ),
        ),
      ),
    );
  }

  Widget _statusChip(String value, String label, IconData icon) {
    final selected = _eventType == value;
    final Color selectedBg;
    final Color selectedFg;
    final Color selectedBorder;

    switch (value) {
      case 'completed':
        selectedBg = FieldColors.successBg;
        selectedFg = FieldColors.success;
        selectedBorder = FieldColors.successBorder;
        break;
      case 'blocked':
        selectedBg = FieldColors.dangerBg;
        selectedFg = FieldColors.danger;
        selectedBorder = FieldColors.dangerBorder;
        break;
      case 'delayed':
        selectedBg = FieldColors.warningBg;
        selectedFg = FieldColors.warning;
        selectedBorder = FieldColors.warningBorder;
        break;
      case 'started':
      case 'progress':
      default:
        selectedBg = FieldColors.actionBg;
        selectedFg = FieldColors.action;
        selectedBorder = FieldColors.actionBorder;
        break;
    }

    return ChoiceChip(
      avatar: Icon(
        icon,
        size: 16,
        color: selected ? selectedFg : FieldColors.textSecondary,
      ),
      label: Text(label),
      selected: selected,
      showCheckmark: false,
      backgroundColor: FieldColors.surface,
      selectedColor: selectedBg,
      side: BorderSide(color: selected ? selectedBorder : FieldColors.border, width: 1),
      labelStyle: FieldTypography.bodySmBold.copyWith(
        fontSize: 12,
        color: selected ? selectedFg : FieldColors.text,
      ),
      onSelected: (_) => setState(() {
        HapticFeedback.selectionClick();
        _eventType = value;
        if (value != 'blocked' && value != 'delayed') _reason.clear();
      }),
    );
  }
}
