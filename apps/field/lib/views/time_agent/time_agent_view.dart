import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
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

  String _selectedEventType = 'completed';
  String _selectedDiscipline = 'mechanical';
  List<EvidenceAttachment> _attachments = [];
  bool _isListening = false;
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
      duration: const Duration(milliseconds: 1000),
    );

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _applyTranscript(goldenP110Prompt);
    });
  }

  @override
  void dispose() {
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

  void _simulateVoiceCapture() {
    setState(() => _isListening = true);
    _pulseController.repeat(reverse: true);
    Future.delayed(const Duration(milliseconds: 800), () {
      if (mounted) {
        _pulseController.stop();
        setState(() => _isListening = false);
        _applyTranscript(goldenP110Prompt);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Voice audio transcribed and multi-fact preview generated.',
            ),
            duration: Duration(seconds: 2),
          ),
        );
      }
    });
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
          onPressed: () => context.go('/'),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
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
                      Text(
                        'SPEECH / TRANSCRIPT INPUT',
                        style: AppTypography.bodySmBold.copyWith(
                          letterSpacing: 0.5,
                          color: AppColors.textMuted,
                        ),
                      ),
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
                          'Multi-Fact Engine',
                          style: AppTypography.monoSm.copyWith(
                            fontSize: 10,
                            color: AppColors.action,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      GestureDetector(
                        onTap: _simulateVoiceCapture,
                        child: AnimatedBuilder(
                          animation: _pulseController,
                          builder: (context, child) {
                            return Container(
                              width: 56,
                              height: 56,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: _isListening
                                    ? AppColors.danger
                                    : AppColors.action,
                                boxShadow: _isListening
                                    ? [
                                        BoxShadow(
                                          color: AppColors.danger.withValues(
                                            alpha: 0.4,
                                          ),
                                          blurRadius:
                                              10 + 10 * _pulseController.value,
                                          spreadRadius:
                                              2 + 4 * _pulseController.value,
                                        ),
                                      ]
                                    : [],
                              ),
                              child: Icon(
                                _isListening ? Icons.mic : Icons.mic_none,
                                color: Colors.white,
                                size: 28,
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
                                  ? 'Listening to site audio...'
                                  : 'Tap mic or type update below',
                              style: AppTypography.bodyMdBold,
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Handles compound multi-sentence updates seamlessly.',
                              style: AppTypography.bodySm,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    controller: _transcriptController,
                    maxLines: 3,
                    style: AppTypography.bodyMd,
                    decoration: const InputDecoration(
                      labelText: 'Site Audio Transcript / Multi-Fact Note',
                      hintText: 'Speak or type what happened on site...',
                    ),
                    onChanged: (text) => _applyTranscript(text),
                  ),
                  const SizedBox(height: 12),

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
                  const SizedBox(height: 12),

                  // Quick test scenario chips
                  Text(
                    'Quick Test Scenarios (Tap to load):',
                    style: AppTypography.bodySmBold.copyWith(fontSize: 11),
                  ),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      ActionChip(
                        avatar: const Icon(
                          Icons.star,
                          size: 14,
                          color: AppColors.action,
                        ),
                        label: const Text(
                          'P-110 Erection + Hydrotest Blocker (Multi-Fact)',
                        ),
                        onPressed: () => _applyTranscript(goldenP110Prompt),
                      ),
                      ActionChip(
                        avatar: const Icon(
                          Icons.construction,
                          size: 14,
                          color: AppColors.info,
                        ),
                        label: const Text('Pier P12 Rebar (Flow 1)'),
                        onPressed: () => _applyTranscript(goldenP12RebarPrompt),
                      ),
                      ActionChip(
                        avatar: const Icon(
                          Icons.help_outline,
                          size: 14,
                          color: AppColors.warning,
                        ),
                        label: const Text('P12 Ambiguous (Flow 2)'),
                        onPressed: () => _applyTranscript(demoAmbiguousPrompt),
                      ),
                      ActionChip(
                        avatar: const Icon(
                          Icons.clear,
                          size: 14,
                          color: AppColors.danger,
                        ),
                        label: const Text('Unmatched Drain (Flow 3)'),
                        onPressed: () => _applyTranscript(demoUnmatchedPrompt),
                      ),
                    ],
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
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'STRUCTURED PREVIEW & EDIT',
                        style: AppTypography.bodySmBold.copyWith(
                          letterSpacing: 0.5,
                          color: AppColors.textMuted,
                        ),
                      ),
                      if (ext != null)
                        ConfidenceBadge(
                          score: ext.confidenceScore,
                          band: ext.matchBand,
                        ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // Multi-Fact selector tabs if > 1 fact extracted
                  if (multiFacts.length > 1) ...[
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceMuted,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(
                                Icons.auto_awesome,
                                size: 14,
                                color: AppColors.action,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                '${multiFacts.length} DISTINCT FACTS DETECTED — SELECT TO INSPECT/EDIT:',
                                style: AppTypography.bodySmBold.copyWith(
                                  fontSize: 10,
                                  color: AppColors.action,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: multiFacts.asMap().entries.map((entry) {
                              final idx = entry.key;
                              final fact = entry.value;
                              final isSelected = idx == selectedIdx;

                              return Expanded(
                                child: Padding(
                                  padding: EdgeInsets.only(
                                    right: idx < multiFacts.length - 1 ? 6 : 0,
                                  ),
                                  child: InkWell(
                                    onTap: () => _selectFact(idx),
                                    borderRadius: BorderRadius.circular(6),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(
                                        vertical: 8,
                                        horizontal: 8,
                                      ),
                                      decoration: BoxDecoration(
                                        color: isSelected
                                            ? AppColors.action
                                            : Colors.white,
                                        borderRadius: BorderRadius.circular(6),
                                        border: Border.all(
                                          color: isSelected
                                              ? AppColors.action
                                              : AppColors.border,
                                        ),
                                      ),
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            'Fact ${idx + 1}: ${fact.eventType.toUpperCase()}',
                                            style: AppTypography.monoSm
                                                .copyWith(
                                                  fontSize: 10,
                                                  color: isSelected
                                                      ? Colors.white
                                                      : AppColors.action,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            fact.description,
                                            style: AppTypography.bodySm
                                                .copyWith(
                                                  fontSize: 11,
                                                  color: isSelected
                                                      ? Colors.white
                                                      : AppColors.text,
                                                ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],

                  // Candidate preview alert
                  if (ext?.suggestedActivityId != null) ...[
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.actionBg,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: AppColors.action.withValues(alpha: 0.3),
                        ),
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.auto_awesome,
                            color: AppColors.action,
                            size: 18,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Predicted Match: ${ext!.suggestedActivityId}',
                                  style: AppTypography.bodySmBold.copyWith(
                                    color: AppColors.action,
                                  ),
                                ),
                                Text(
                                  ext.suggestedActivityName ?? '',
                                  style: AppTypography.bodySm.copyWith(
                                    color: AppColors.text,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),
                  ],

                  // Fast Status Action Chips
                  Text('Event Status Action:', style: AppTypography.bodySmBold),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 6,
                    children: [
                      _buildStatusChip(
                        'started',
                        'Started',
                        Icons.play_arrow,
                        AppColors.info,
                      ),
                      _buildStatusChip(
                        'progress',
                        'Progress',
                        Icons.trending_up,
                        AppColors.action,
                      ),
                      _buildStatusChip(
                        'completed',
                        'Completed',
                        Icons.check,
                        AppColors.success,
                      ),
                      _buildStatusChip(
                        'delayed',
                        'Delayed',
                        Icons.timer,
                        AppColors.warning,
                      ),
                      _buildStatusChip(
                        'blocked',
                        'Blocked',
                        Icons.block,
                        AppColors.danger,
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  TextField(
                    controller: _descriptionController,
                    decoration: const InputDecoration(
                      labelText: 'Extracted Activity / Description',
                    ),
                  ),
                  const SizedBox(height: 12),

                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _assetController,
                          decoration: const InputDecoration(
                            labelText: 'Asset / Tag',
                            hintText: 'e.g. P-110, PIER-P12',
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: _timeController,
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
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          initialValue: _selectedDiscipline,
                          decoration: const InputDecoration(
                            labelText: 'Discipline',
                          ),
                          items: const [
                            DropdownMenuItem(
                              value: 'mechanical',
                              child: Text('Mechanical'),
                            ),
                            DropdownMenuItem(
                              value: 'piping',
                              child: Text('Piping'),
                            ),
                            DropdownMenuItem(
                              value: 'structural',
                              child: Text('Structural'),
                            ),
                            DropdownMenuItem(
                              value: 'electrical',
                              child: Text('Electrical'),
                            ),
                            DropdownMenuItem(
                              value: 'civil',
                              child: Text('Civil'),
                            ),
                            DropdownMenuItem(
                              value: 'instrumentation',
                              child: Text('Instrumentation'),
                            ),
                          ],
                          onChanged: (val) {
                            if (val != null)
                              setState(() => _selectedDiscipline = val);
                          },
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: _quantityController,
                          decoration: const InputDecoration(
                            labelText: 'Quantity (Optional)',
                            hintText: 'e.g. 3 t, 15 m',
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  TextField(
                    controller: _delayReasonController,
                    decoration: const InputDecoration(
                      labelText: 'Delay / Blocker Reason (if applicable)',
                      hintText: 'e.g. Permit delay, Access issue',
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Submission Action Buttons
                  if (multiFacts.length > 1) ...[
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.done_all),
                        label: Text(
                          'SUBMIT ALL ${multiFacts.length} EXTRACTED FACTS',
                        ),
                        onPressed: _submitAllFacts,
                      ),
                    ),
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      height: 42,
                      child: OutlinedButton.icon(
                        icon: const Icon(Icons.send),
                        label: Text(
                          'Submit Only Fact ${selectedIdx + 1} (${_selectedEventType.toUpperCase()})',
                        ),
                        onPressed: _descriptionController.text.trim().isEmpty
                            ? null
                            : _submitSingleProposal,
                      ),
                    ),
                  ] else ...[
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.send),
                        label: const Text('SUBMIT EVENT PROPOSAL'),
                        onPressed: _descriptionController.text.trim().isEmpty
                            ? null
                            : _submitSingleProposal,
                      ),
                    ),
                  ],
                  const SizedBox(height: 8),
                  Center(
                    child: Text(
                      'Field submits proposals only. Baseline actuals update upon planner verification.',
                      style: AppTypography.bodySm.copyWith(
                        fontSize: 11,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusChip(
    String type,
    String label,
    IconData icon,
    Color color,
  ) {
    final isSelected = _selectedEventType == type;
    return ChoiceChip(
      avatar: Icon(icon, size: 14, color: isSelected ? Colors.white : color),
      label: Text(label),
      selected: isSelected,
      selectedColor: color,
      labelStyle: AppTypography.bodySmBold.copyWith(
        color: isSelected ? Colors.white : AppColors.text,
        fontSize: 11,
      ),
      onSelected: (sel) {
        if (sel) setState(() => _selectedEventType = type);
      },
    );
  }
}
