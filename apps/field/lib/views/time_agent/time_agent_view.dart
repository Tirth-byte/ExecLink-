import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/app_typography.dart';
import '../../models/common_types.dart';
import '../../models/execution_event.dart';
import '../../providers/field_providers.dart';
import '../../services/time_agent_extractor.dart';
import '../../widgets/confidence_badge.dart';
import '../../widgets/field_evidence_section.dart';

class TimeAgentView extends ConsumerStatefulWidget {
  const TimeAgentView({super.key});

  @override
  ConsumerState<TimeAgentView> createState() => _TimeAgentViewState();
}

class _TimeAgentViewState extends ConsumerState<TimeAgentView>
    with SingleTickerProviderStateMixin {
  final TextEditingController _transcriptController = TextEditingController();
  final TextEditingController _descriptionController = TextEditingController();
  final TextEditingController _assetController = TextEditingController();
  final TextEditingController _timeController = TextEditingController();
  final TextEditingController _delayReasonController = TextEditingController();
  final TextEditingController _quantityController = TextEditingController();

  final stt.SpeechToText _speech = stt.SpeechToText();
  bool _speechInitialized = false;
  bool _isListening = false;
  String? _speechError;

  String _selectedEventType = 'completed';
  String _selectedDiscipline = 'mechanical';
  List<EvidenceAttachment> _attachments = [];
  late AnimationController _pulseController;

  static const String goldenP110Prompt =
      'Line 24 P-110 erection completed at 10:35. Hydrotest blocked due to permit.';
  static const String goldenP12RebarPrompt =
      'Fixed 3 tonnes of rebar at Pier P12, chainage 12+410 to 12+425.';
  static const String demoAmbiguousPrompt =
      'Crew working at P12; preparation continuing.';
  static const String demoUnmatchedPrompt =
      'Drain cleaning near depot entrance.';

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    );

    _initSpeechRecognizer();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _applyTranscript(goldenP110Prompt);
    });
  }

  Future<void> _initSpeechRecognizer() async {
    try {
      _speechInitialized = await _speech.initialize(
        onError: (error) {
          if (mounted) {
            setState(() {
              _isListening = false;
              _pulseController.stop();
              _speechError = 'Microphone paused. Tap to retry.';
            });
          }
        },
        onStatus: (status) {
          if (mounted && (status == 'done' || status == 'notListening')) {
            if (_isListening) {
              setState(() {
                _isListening = false;
                _pulseController.stop();
              });
            }
          }
        },
      );
    } catch (_) {
      _speechInitialized = false;
    }
  }

  @override
  void dispose() {
    _speech.stop();
    _pulseController.dispose();
    _transcriptController.dispose();
    _descriptionController.dispose();
    _assetController.dispose();
    _timeController.dispose();
    _delayReasonController.dispose();
    _quantityController.dispose();
    super.dispose();
  }

  void _applyTranscript(String text) {
    _transcriptController.text = text;
    ref.read(timeAgentProvider).setTranscript(text);

    final current = ref.read(timeAgentProvider).extraction;
    if (current != null) {
      _loadFactIntoForm(current);
    }
  }

  void _loadFactIntoForm(ExtractionResult fact) {
    setState(() {
      _descriptionController.text = fact.description;
      _assetController.text = fact.facts.assetId ?? '';
      _selectedEventType = fact.eventType;
      _selectedDiscipline = fact.facts.discipline ?? 'mechanical';
      _timeController.text =
          '${fact.observedTimestamp.hour.toString().padLeft(2, '0')}:${fact.observedTimestamp.minute.toString().padLeft(2, '0')}';
      _delayReasonController.text = fact.facts.delayReason ?? '';
      _quantityController.text = fact.facts.quantity != null
          ? '${fact.facts.quantity!.value} ${fact.facts.quantity!.unit}'
          : '';
    });
  }

  void _saveCurrentFormIntoNotifier() {
    final state = ref.read(timeAgentProvider);
    final current = state.extraction;
    if (current == null) return;

    final updatedFacts = current.facts.copyWith(
      eventType: _selectedEventType,
      assetId: _assetController.text.trim().isNotEmpty
          ? _assetController.text.trim()
          : null,
      discipline: _selectedDiscipline,
      delayReason: _delayReasonController.text.trim().isNotEmpty
          ? _delayReasonController.text.trim()
          : null,
    );

    final updatedResult = current.copyWith(
      description: _descriptionController.text.trim(),
      eventType: _selectedEventType,
      facts: updatedFacts,
    );

    ref.read(timeAgentProvider).updateCurrentFact(updatedResult);
  }

  void _selectFact(int index) {
    _saveCurrentFormIntoNotifier();
    ref.read(timeAgentProvider).selectFactIndex(index);
    final fact = ref.read(timeAgentProvider).extraction;
    if (fact != null) {
      _loadFactIntoForm(fact);
    }
  }

  Future<void> _toggleVoiceCapture() async {
    HapticFeedback.selectionClick();

    if (_isListening) {
      await _speech.stop();
      if (mounted) {
        setState(() {
          _isListening = false;
          _pulseController.stop();
          _speechError = null;
        });
      }
      return;
    }

    setState(() {
      _speechError = null;
    });

    if (!_speechInitialized) {
      await _initSpeechRecognizer();
    }

    if (!_speechInitialized) {
      if (mounted) {
        setState(() {
          _speechError = 'Microphone or speech permission unavailable. Please check settings.';
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Microphone access is unavailable. You can still type updates or load test scenarios.',
            ),
            duration: Duration(seconds: 3),
          ),
        );
      }
      return;
    }

    setState(() => _isListening = true);
    _pulseController.repeat(reverse: true);

    try {
      await _speech.listen(
        onResult: (result) {
          if (mounted && result.recognizedWords.isNotEmpty) {
            _applyTranscript(result.recognizedWords);
          }
        },
        listenOptions: stt.SpeechListenOptions(
          listenMode: stt.ListenMode.dictation,
          cancelOnError: true,
          partialResults: true,
        ),
      );
    } catch (e) {
      if (mounted) {
        setState(() {
          _isListening = false;
          _pulseController.stop();
          _speechError = 'Could not start voice capture. Tap mic to retry.';
        });
      }
    }
  }

  Future<void> _submitSingleProposal() async {
    _saveCurrentFormIntoNotifier();
    final state = ref.read(timeAgentProvider);
    final ext = state.extraction;
    if (ext == null) return;

    final eventId = 'EVT-FIELD-${DateTime.now().millisecondsSinceEpoch}';
    final nowIso = DateTime.now().toUtc().toIso8601String();

    final newEvent = ExecutionEvent(
      id: eventId,
      projectId: 'PRJ-DEMO-001',
      reporterId: 'USR-SUP-001',
      observedAt: nowIso,
      receivedAt: nowIso,
      evidence: Evidence(
        text: ext.description,
        transcript: _transcriptController.text.trim(),
        attachmentIds: _attachments.map((a) => a.id).toList(),
        attachments: _attachments,
      ),
      extractedFacts: ext.facts,
      status: 'submitted',
      clientEventId: eventId,
      syncStatus: SyncStatus.synced,
    );

    final submitted = await ref.read(eventsProvider).submitEvent(newEvent);
    if (mounted) _showSubmissionDialog([submitted]);
  }

  Future<void> _submitAllFacts() async {
    _saveCurrentFormIntoNotifier();
    final state = ref.read(timeAgentProvider);
    final factsToSubmit = state.multiFacts.isNotEmpty
        ? state.multiFacts
        : (state.extraction != null
              ? [state.extraction!]
              : <ExtractionResult>[]);

    if (factsToSubmit.isEmpty) return;

    final List<ExecutionEvent> submittedEvents = [];
    final nowIso = DateTime.now().toUtc().toIso8601String();

    for (int i = 0; i < factsToSubmit.length; i++) {
      final fact = factsToSubmit[i];
      final eventId = 'EVT-FIELD-${DateTime.now().millisecondsSinceEpoch}-$i';

      // Multi-fact evidence assignment: get evidence that applies to fact i
      final assignedAttachments = _attachments.where((a) =>
        a.assignedFactIndexes.isEmpty || a.assignedFactIndexes.contains(i)
      ).toList();

      final newEvent = ExecutionEvent(
        id: eventId,
        projectId: 'PRJ-DEMO-001',
        reporterId: 'USR-SUP-001',
        observedAt: nowIso,
        receivedAt: nowIso,
        evidence: Evidence(
          text: fact.description,
          transcript: _transcriptController.text.trim(),
          attachmentIds: assignedAttachments.map((a) => a.id).toList(),
          attachments: assignedAttachments,
        ),
        extractedFacts: fact.facts,
        status: 'submitted',
        clientEventId: eventId,
        syncStatus: SyncStatus.synced,
      );

      final submitted = await ref.read(eventsProvider).submitEvent(newEvent);
      submittedEvents.add(submitted);
    }

    if (mounted) _showSubmissionDialog(submittedEvents);
  }

  void _showSubmissionDialog(List<ExecutionEvent> events) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        title: Row(
          children: [
            const Icon(Icons.check_circle, color: AppColors.success, size: 24),
            const SizedBox(width: 8),
            Text(
              events.length > 1
                  ? '${events.length} Proposals Submitted'
                  : 'Proposal Submitted',
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${events.length} ExecutionEvent proposal(s) queued for planner verification.',
              style: AppTypography.bodyMdBold,
            ),
            const SizedBox(height: 10),
            ...events.map(
              (ev) => Container(
                margin: const EdgeInsets.only(bottom: 6),
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.surfaceMuted,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Row(
                  children: [
                    Text(
                      ev.id,
                      style: AppTypography.monoSm.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        ev.evidence.text,
                        style: AppTypography.bodySm,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'Rule reminder: Field submits event proposals only. Baseline actuals update upon authorized planner verification.',
              style: AppTypography.bodySm.copyWith(
                color: AppColors.textMuted,
                fontSize: 11,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              context.go('/history');
            },
            child: const Text('View History'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              _applyTranscript('');
              context.go('/');
            },
            child: const Text('Done'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(timeAgentProvider);
    final ext = state.extraction;
    final multiFacts = state.multiFacts;
    final selectedIdx = state.selectedFactIndex;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Time Agent Capture'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/capture');
            }
          },
        ),
      ),
      body: SafeArea(
        top: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 40),
          children: [
            // 1. Microphone & Voice Capture Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Flexible(
                          child: Text(
                            'SPEECH / TRANSCRIPT INPUT',
                            style: FieldTypography.statusText.copyWith(
                              letterSpacing: 0.5,
                              color: FieldColors.textMuted,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 7,
                            vertical: 2.5,
                          ),
                          decoration: BoxDecoration(
                            color: FieldColors.brand50,
                            borderRadius: BorderRadius.circular(FieldRadius.badge),
                            border: Border.all(color: FieldColors.brand100),
                          ),
                          child: Text(
                            'Multi-Fact Engine',
                            style: FieldTypography.monoSm.copyWith(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: FieldColors.brand700,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        GestureDetector(
                          onTap: _toggleVoiceCapture,
                          child: AnimatedBuilder(
                            animation: _pulseController,
                            builder: (context, child) {
                              return AnimatedContainer(
                                duration: const Duration(milliseconds: 180),
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: _isListening
                                      ? FieldColors.danger
                                      : FieldColors.brand700,
                                  border: Border.all(
                                    color: _isListening
                                        ? FieldColors.danger.withValues(
                                            alpha: 0.3 + 0.4 * _pulseController.value,
                                          )
                                        : Colors.transparent,
                                    width: _isListening ? 3 : 0,
                                  ),
                                ),
                                child: Icon(
                                  _isListening
                                      ? Icons.mic
                                      : Icons.mic_none_rounded,
                                  color: Colors.white,
                                  size: 22,
                                ),
                              );
                            },
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _isListening
                                    ? 'Listening…'
                                    : 'Tap to speak',
                                style: FieldTypography.bodyBold.copyWith(
                                  fontSize: 14,
                                  color: _isListening
                                      ? FieldColors.danger
                                      : FieldColors.text,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                _isListening
                                    ? 'Tap again to stop · Speaks directly into note'
                                    : 'Speaks site update directly into transcript',
                                style: FieldTypography.metadata.copyWith(
                                  fontSize: 11.5,
                                  color: FieldColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    if (_speechError != null) ...[
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: FieldColors.warningBg,
                          borderRadius: BorderRadius.circular(FieldRadius.control),
                          border: Border.all(color: FieldColors.warning.withValues(alpha: 0.3)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.info_outline_rounded, size: 14, color: FieldColors.warning),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                _speechError!,
                                style: FieldTypography.metadata.copyWith(
                                  fontSize: 11,
                                  color: FieldColors.warning,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 14),
                    TextField(
                      controller: _transcriptController,
                      maxLines: 3,
                      style: FieldTypography.body.copyWith(fontSize: 14),
                      decoration: const InputDecoration(
                        labelText: 'Site Audio Transcript / Multi-Fact Note',
                        hintText: 'Speak or type what happened on site...',
                      ),
                      onChanged: (text) => _applyTranscript(text),
                    ),
                    const SizedBox(height: 14),

                    // 1.1 Field Evidence Section (Camera, Photos, Video, Multi-Fact Assignment)
                    FieldEvidenceSection(
                      attachments: _attachments,
                      onChanged: (items) => setState(() => _attachments = items),
                      factLabels: multiFacts.length > 1
                          ? multiFacts
                              .asMap()
                              .entries
                              .map((e) =>
                                  'Fact ${e.key + 1}: ${e.value.eventType.toUpperCase()}')
                              .toList()
                          : const [],
                    ),
                    const SizedBox(height: 14),

                    // Quick test scenario list
                    Text(
                      'Quick Test Scenarios (Tap to load):',
                      style: FieldTypography.statusText.copyWith(
                        fontSize: 11,
                        color: FieldColors.textMuted,
                      ),
                    ),
                    const SizedBox(height: 8),
                    _buildScenarioButton(
                      icon: Icons.auto_awesome_rounded,
                      iconColor: FieldColors.brand700,
                      iconBg: FieldColors.brand50,
                      title: 'P-110 Erection + Hydrotest Blocker',
                      subtitle: 'Multi-Fact compound event',
                      onTap: () => _applyTranscript(goldenP110Prompt),
                    ),
                    const SizedBox(height: 6),
                    _buildScenarioButton(
                      icon: Icons.construction_rounded,
                      iconColor: FieldColors.brand700,
                      iconBg: FieldColors.brand50,
                      title: 'Pier P12 Rebar (3 tonnes)',
                      subtitle: 'Single high-confidence match',
                      onTap: () => _applyTranscript(goldenP12RebarPrompt),
                    ),
                    const SizedBox(height: 6),
                    _buildScenarioButton(
                      icon: Icons.visibility_outlined,
                      iconColor: FieldColors.warning,
                      iconBg: FieldColors.warningBg,
                      title: 'P12 Preparation (Ambiguous)',
                      subtitle: 'Review confidence band',
                      onTap: () => _applyTranscript(demoAmbiguousPrompt),
                    ),
                    const SizedBox(height: 6),
                    _buildScenarioButton(
                      icon: Icons.help_outline_rounded,
                      iconColor: FieldColors.danger,
                      iconBg: FieldColors.dangerBg,
                      title: 'Drain cleaning near depot',
                      subtitle: 'Unmatched / new proposal',
                      onTap: () => _applyTranscript(demoUnmatchedPrompt),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // 2. Structured Preview & Multi-Fact Selector
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Section Header with extracted count pill
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Flexible(
                          child: Text(
                            'STRUCTURED PREVIEW & EDIT',
                            style: FieldTypography.statusText.copyWith(
                              letterSpacing: 0.5,
                              color: FieldColors.textMuted,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 7,
                            vertical: 2.5,
                          ),
                          decoration: BoxDecoration(
                            color: FieldColors.brand50,
                            borderRadius: BorderRadius.circular(FieldRadius.badge),
                            border: Border.all(color: FieldColors.brand100),
                          ),
                          child: Text(
                            multiFacts.length > 1
                                ? '${multiFacts.length} facts extracted'
                                : '1 fact extracted',
                            style: FieldTypography.monoSm.copyWith(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: FieldColors.brand700,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Multi-Fact selector cards if > 1 fact extracted
                    if (multiFacts.length > 1) ...[
                      LayoutBuilder(
                        builder: (context, constraints) {
                          final isNarrow = constraints.maxWidth < 320;
                          if (multiFacts.length == 2 && !isNarrow) {
                            return Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(
                                  child: _buildFactCard(
                                    fact: multiFacts[0],
                                    index: 0,
                                    isSelected: selectedIdx == 0,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: _buildFactCard(
                                    fact: multiFacts[1],
                                    index: 1,
                                    isSelected: selectedIdx == 1,
                                  ),
                                ),
                              ],
                            );
                          }

                          return SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: Row(
                              children: multiFacts.asMap().entries.map((entry) {
                                final idx = entry.key;
                                final fact = entry.value;
                                return Container(
                                  width: constraints.maxWidth * 0.72,
                                  margin: EdgeInsets.only(
                                    right: idx < multiFacts.length - 1 ? 8 : 0,
                                  ),
                                  child: _buildFactCard(
                                    fact: fact,
                                    index: idx,
                                    isSelected: selectedIdx == idx,
                                  ),
                                );
                              }).toList(),
                            ),
                          );
                        },
                      ),
                      const SizedBox(height: 14),
                    ],

                    // Predicted match card
                    if (ext?.suggestedActivityId != null) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: FieldColors.surfaceMuted,
                          borderRadius: BorderRadius.circular(FieldRadius.control),
                          border: Border.all(color: FieldColors.border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                Flexible(
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(
                                        Icons.auto_awesome_rounded,
                                        color: FieldColors.brand700,
                                        size: 14,
                                      ),
                                      const SizedBox(width: 5),
                                      Flexible(
                                        child: Text(
                                          'PREDICTED MATCH',
                                          style: FieldTypography.statusText.copyWith(
                                            fontSize: 10,
                                            color: FieldColors.brand700,
                                            letterSpacing: 0.5,
                                          ),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 8),
                                ConfidenceBadge(
                                  score: ext!.confidenceScore,
                                  band: ext.matchBand,
                                  isCompact: true,
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              ext.suggestedActivityId!,
                              style: FieldTypography.monoSm.copyWith(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: FieldColors.text,
                              ),
                            ),
                            if (ext.suggestedActivityName != null &&
                                ext.suggestedActivityName!.isNotEmpty) ...[
                              const SizedBox(height: 2),
                              Text(
                                ext.suggestedActivityName!,
                                style: FieldTypography.bodySm.copyWith(
                                  color: FieldColors.textSecondary,
                                  height: 1.3,
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),
                    ],

                    // Event Status Action Chips (3 on top row, 2 on second row)
                    Text(
                      'EVENT STATUS ACTION',
                      style: FieldTypography.statusText.copyWith(
                        fontSize: 11,
                        color: FieldColors.textMuted,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        _buildFastActionButton(
                          'started',
                          'Started',
                          Icons.play_arrow_rounded,
                          FieldColors.info,
                        ),
                        const SizedBox(width: 6),
                        _buildFastActionButton(
                          'progress',
                          'Progress',
                          Icons.trending_up_rounded,
                          FieldColors.brand700,
                        ),
                        const SizedBox(width: 6),
                        _buildFastActionButton(
                          'completed',
                          'Completed',
                          Icons.check_rounded,
                          FieldColors.success,
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        _buildFastActionButton(
                          'delayed',
                          'Delayed',
                          Icons.schedule_rounded,
                          FieldColors.warning,
                        ),
                        const SizedBox(width: 6),
                        _buildFastActionButton(
                          'blocked',
                          'Blocked',
                          Icons.block_rounded,
                          FieldColors.danger,
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // Description Field
                    TextField(
                      controller: _descriptionController,
                      style: FieldTypography.body.copyWith(fontSize: 14),
                      decoration: const InputDecoration(
                        labelText: 'Extracted Activity / Description',
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Responsive 2-column fields
                    LayoutBuilder(
                      builder: (context, constraints) {
                        final isNarrow = constraints.maxWidth < 320;
                        if (isNarrow) {
                          return Column(
                            children: [
                              TextField(
                                controller: _assetController,
                                style: FieldTypography.body.copyWith(fontSize: 14),
                                decoration: const InputDecoration(
                                  labelText: 'Asset / Tag',
                                  hintText: 'e.g. P-110, PIER-P12',
                                ),
                              ),
                              const SizedBox(height: 12),
                              TextField(
                                controller: _timeController,
                                style: FieldTypography.body.copyWith(fontSize: 14),
                                decoration: const InputDecoration(
                                  labelText: 'Observed Time',
                                  hintText: 'e.g. 10:35',
                                ),
                              ),
                              const SizedBox(height: 12),
                              _buildDisciplineDropdown(),
                              const SizedBox(height: 12),
                              TextField(
                                controller: _quantityController,
                                style: FieldTypography.body.copyWith(fontSize: 14),
                                decoration: const InputDecoration(
                                  labelText: 'Quantity (Optional)',
                                  hintText: 'e.g. 3 t, 15 m',
                                ),
                              ),
                            ],
                          );
                        }

                        return Column(
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: TextField(
                                    controller: _assetController,
                                    style: FieldTypography.body.copyWith(
                                      fontSize: 14,
                                    ),
                                    decoration: const InputDecoration(
                                      labelText: 'Asset / Tag',
                                      hintText: 'e.g. P-110, PIER-P12',
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: TextField(
                                    controller: _timeController,
                                    style: FieldTypography.body.copyWith(
                                      fontSize: 14,
                                    ),
                                    decoration: const InputDecoration(
                                      labelText: 'Observed Time',
                                      hintText: 'e.g. 10:35',
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                Expanded(child: _buildDisciplineDropdown()),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: TextField(
                                    controller: _quantityController,
                                    style: FieldTypography.body.copyWith(
                                      fontSize: 14,
                                    ),
                                    decoration: const InputDecoration(
                                      labelText: 'Quantity (Optional)',
                                      hintText: 'e.g. 3 t, 15 m',
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        );
                      },
                    ),
                    const SizedBox(height: 12),

                    // Highlight Delay/Blocker Reason if delayed or blocked
                    if (_selectedEventType == 'delayed' ||
                        _selectedEventType == 'blocked') ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: _selectedEventType == 'blocked'
                              ? FieldColors.dangerBg
                              : FieldColors.warningBg,
                          borderRadius: BorderRadius.circular(FieldRadius.control),
                          border: Border.all(
                            color: _selectedEventType == 'blocked'
                                ? FieldColors.dangerBorder
                                : FieldColors.warningBorder,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'REPORT REASON FOR ${_selectedEventType.toUpperCase()}',
                              style: FieldTypography.statusText.copyWith(
                                color: _selectedEventType == 'blocked'
                                    ? FieldColors.danger
                                    : FieldColors.warning,
                                fontSize: 10.5,
                              ),
                            ),
                            const SizedBox(height: 8),
                            TextField(
                              controller: _delayReasonController,
                              style: FieldTypography.body.copyWith(fontSize: 13.5),
                              decoration: const InputDecoration(
                                hintText: 'e.g. Permit delay, Access issue',
                                fillColor: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),
                    ] else ...[
                      TextField(
                        controller: _delayReasonController,
                        style: FieldTypography.body.copyWith(fontSize: 14),
                        decoration: const InputDecoration(
                          labelText: 'Delay / Blocker Reason (if applicable)',
                          hintText: 'e.g. Permit delay, Access issue',
                        ),
                      ),
                      const SizedBox(height: 14),
                    ],

                    // Submission Action Buttons
                    if (multiFacts.length > 1) ...[
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton.icon(
                          icon: const Icon(Icons.done_all_rounded, size: 20),
                          label: Text(
                            'Submit All ${multiFacts.length} Facts',
                            style: FieldTypography.button,
                          ),
                          onPressed: _submitAllFacts,
                        ),
                      ),
                      const SizedBox(height: 8),
                      SizedBox(
                        width: double.infinity,
                        height: 42,
                        child: OutlinedButton.icon(
                          icon: const Icon(Icons.send_rounded, size: 16),
                          label: Text(
                            'Submit Only Fact ${selectedIdx + 1} (${_selectedEventType.toUpperCase()})',
                            style: FieldTypography.button.copyWith(
                              fontSize: 13.5,
                            ),
                          ),
                          onPressed: _descriptionController.text.trim().isEmpty
                              ? null
                              : _submitSingleProposal,
                        ),
                      ),
                    ] else ...[
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton.icon(
                          icon: const Icon(Icons.send_rounded, size: 20),
                          label: const Text(
                            'Submit Event Proposal',
                            style: FieldTypography.button,
                          ),
                          onPressed: _descriptionController.text.trim().isEmpty
                              ? null
                              : _submitSingleProposal,
                        ),
                      ),
                    ],
                    const SizedBox(height: 10),
                    Center(
                      child: Text(
                        'Field submits proposals only. Baseline actuals update upon planner verification.',
                        style: FieldTypography.metadata.copyWith(
                          fontSize: 11,
                          color: FieldColors.textMuted,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFactCard({
    required ExtractionResult fact,
    required int index,
    required bool isSelected,
  }) {
    final statusColor = fact.eventType == 'completed'
        ? FieldColors.success
        : fact.eventType == 'blocked'
        ? FieldColors.danger
        : fact.eventType == 'delayed'
        ? FieldColors.warning
        : FieldColors.brand700;

    final statusBg = fact.eventType == 'completed'
        ? FieldColors.successBg
        : fact.eventType == 'blocked'
        ? FieldColors.dangerBg
        : fact.eventType == 'delayed'
        ? FieldColors.warningBg
        : FieldColors.brand50;

    final statusBorder = fact.eventType == 'completed'
        ? FieldColors.successBorder
        : fact.eventType == 'blocked'
        ? FieldColors.dangerBorder
        : fact.eventType == 'delayed'
        ? FieldColors.warningBorder
        : FieldColors.brand100;

    return InkWell(
      onTap: () => _selectFact(index),
      borderRadius: BorderRadius.circular(FieldRadius.control),
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: isSelected ? FieldColors.brand50 : FieldColors.surface,
          borderRadius: BorderRadius.circular(FieldRadius.control),
          border: Border.all(
            color: isSelected ? FieldColors.brand700 : FieldColors.border,
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Fact ${index + 1}',
                    style: FieldTypography.monoSm.copyWith(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: isSelected ? FieldColors.brand700 : FieldColors.text,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 4),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 5,
                    vertical: 1.5,
                  ),
                  decoration: BoxDecoration(
                    color: statusBg,
                    borderRadius: BorderRadius.circular(FieldRadius.badge),
                    border: Border.all(color: statusBorder),
                  ),
                  child: Text(
                    fact.eventType.toUpperCase(),
                    style: FieldTypography.statusText.copyWith(
                      fontSize: 9,
                      color: statusColor,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              fact.description,
              style: FieldTypography.bodySm.copyWith(
                fontSize: 12,
                color: FieldColors.text,
                height: 1.3,
                fontWeight: isSelected ? FontWeight.w500 : FontWeight.w400,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildScenarioButton({
    required IconData icon,
    required Color iconColor,
    required Color iconBg,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(FieldRadius.control),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: FieldColors.surfaceRaised,
          borderRadius: BorderRadius.circular(FieldRadius.control),
          border: Border.all(color: FieldColors.borderSubtle),
        ),
        child: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: iconBg,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Icon(icon, size: 16, color: iconColor),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: FieldTypography.bodyBold.copyWith(fontSize: 12.5),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    subtitle,
                    style: FieldTypography.metadata.copyWith(
                      fontSize: 10.5,
                      color: FieldColors.textMuted,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
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

  Widget _buildFastActionButton(
    String type,
    String label,
    IconData icon,
    Color color,
  ) {
    final isSelected = _selectedEventType == type;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _selectedEventType = type),
        borderRadius: BorderRadius.circular(FieldRadius.control),
        child: Container(
          height: 40,
          padding: const EdgeInsets.symmetric(horizontal: 4),
          decoration: BoxDecoration(
            color: isSelected ? color : FieldColors.surface,
            borderRadius: BorderRadius.circular(FieldRadius.control),
            border: Border.all(
              color: isSelected ? color : FieldColors.border,
              width: isSelected ? 1.5 : 1,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 15,
                color: isSelected ? Colors.white : color,
              ),
              const SizedBox(width: 4),
              Flexible(
                child: Text(
                  label,
                  style: FieldTypography.bodySmBold.copyWith(
                    color: isSelected ? Colors.white : FieldColors.text,
                    fontSize: 11.5,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDisciplineDropdown() {
    return DropdownButtonFormField<String>(
      isExpanded: true,
      initialValue: _selectedDiscipline,
      decoration: const InputDecoration(labelText: 'Discipline'),
      items: const [
        DropdownMenuItem(value: 'mechanical', child: Text('Mechanical', overflow: TextOverflow.ellipsis)),
        DropdownMenuItem(value: 'piping', child: Text('Piping', overflow: TextOverflow.ellipsis)),
        DropdownMenuItem(value: 'structural', child: Text('Structural', overflow: TextOverflow.ellipsis)),
        DropdownMenuItem(value: 'electrical', child: Text('Electrical', overflow: TextOverflow.ellipsis)),
        DropdownMenuItem(value: 'civil', child: Text('Civil', overflow: TextOverflow.ellipsis)),
        DropdownMenuItem(value: 'instrumentation', child: Text('Instrumentation', overflow: TextOverflow.ellipsis)),
      ],
      onChanged: (val) {
        if (val != null) setState(() => _selectedDiscipline = val);
      },
    );
  }
}
