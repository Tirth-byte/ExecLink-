import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/app_typography.dart';
import '../../models/common_types.dart';
import '../../models/execution_event.dart';
import '../../models/extracted_facts.dart';
import '../../models/schedule_activity.dart';
import '../../providers/field_providers.dart';
import '../../widgets/evidence_attachment_field.dart';
import '../../widgets/field_buttons.dart';

class QuickUpdateView extends ConsumerStatefulWidget {
  const QuickUpdateView({super.key, this.initialActivityId});
  final String? initialActivityId;

  @override
  ConsumerState<QuickUpdateView> createState() => _QuickUpdateViewState();
}

class _QuickUpdateViewState extends ConsumerState<QuickUpdateView> {
  String _status = 'completed';
  ScheduleActivity? _activity;
  bool _submitting = false;
  bool _manualActivity = false;
  String _discipline = 'civil';
  String _blockerCategory = 'Permit';
  double _progress = 50;
  List<EvidenceAttachment> _attachments = [];
  bool _prefillScheduled = false;
  final _notes = TextEditingController();
  final _asset = TextEditingController();
  final _location = TextEditingController();
  final _reason = TextEditingController();
  final _quantity = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final activities = ref.read(activitiesProvider).activities;
      final requested = widget.initialActivityId;
      ScheduleActivity? initial;
      if (requested != null) {
        for (final activity in activities) {
          if (activity.id == requested) initial = activity;
        }
      }
      if (initial != null) _selectActivity(initial);
    });
  }

  @override
  void dispose() {
    _notes.dispose();
    _asset.dispose();
    _location.dispose();
    _reason.dispose();
    _quantity.dispose();
    super.dispose();
  }

  void _selectActivity(ScheduleActivity activity) {
    setState(() {
      _activity = activity;
      _manualActivity = false;
      _asset.text = activity.assetId;
      _discipline = activity.discipline;
      _location.text =
          '${activity.location.alignment} ${activity.location.start.toInt()}–${activity.location.end.toInt()}m';
    });
  }

  Future<void> _submit() async {
    if (_submitting) return;
    if (_activity == null && _asset.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Choose an activity or enter an asset tag.'),
        ),
      );
      return;
    }
    setState(() => _submitting = true);
    final now = DateTime.now();
    final id = 'EVT-FIELD-${now.millisecondsSinceEpoch}';
    final reason = (_status == 'blocked' || _status == 'delayed')
        ? _reason.text.trim()
        : null;
    final facts = ExtractedFacts(
      eventType: _status,
      assetId: _asset.text.trim().isEmpty
          ? _activity?.assetId
          : _asset.text.trim(),
      discipline: _activity?.discipline ?? _discipline,
      workType: _activity?.workType,
      location: _activity?.location,
      quantity: _status == 'progress'
          ? Quantity(value: _progress, unit: '%')
          : double.tryParse(_quantity.text.trim()) == null
          ? null
          : Quantity(
              value: double.parse(_quantity.text.trim()),
              unit: _activity?.plannedQuantity?.unit ?? '',
            ),
      delayReason: reason?.isEmpty == true
          ? 'Site delay reported by supervisor'
          : reason == null
          ? null
          : '$_blockerCategory: $reason',
      contractor: 'L&T Heavy Civil',
      keywords: [_status, if (_activity != null) _activity!.id.toLowerCase()],
    );
    final event = ExecutionEvent(
      id: id,
      projectId: 'PRJ-DEMO-001',
      reporterId: 'USR-SUP-001',
      observedAt: now.toUtc().toIso8601String(),
      receivedAt: now.toUtc().toIso8601String(),
      evidence: Evidence(
        text: _notes.text.trim().isEmpty
            ? '${_labelFor(_status)}: ${_activity?.name ?? _asset.text.trim()}'
            : _notes.text.trim(),
        attachmentIds: const [],
        attachments: _attachments,
      ),
      extractedFacts: facts,
      status: 'submitted',
      clientEventId: id,
      syncStatus: SyncStatus.synced,
    );
    await ref.read(eventsProvider).submitEvent(event);
    if (!mounted) return;
    setState(() => _submitting = false);
    HapticFeedback.mediumImpact();
    final offline = ref.read(offlineModeProvider).isOffline;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          offline
              ? 'Update saved offline. It will sync automatically.'
              : 'Update recorded. Awaiting planner verification.',
        ),
      ),
    );
    context.go('/history');
  }

  @override
  Widget build(BuildContext context) {
    final activityState = ref.watch(activitiesProvider);
    if (!_prefillScheduled &&
        _activity == null &&
        widget.initialActivityId != null &&
        activityState.activities.isNotEmpty) {
      _prefillScheduled = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted || _activity != null) return;
        for (final activity in activityState.activities) {
          if (activity.id == widget.initialActivityId) {
            _selectActivity(activity);
            break;
          }
        }
      });
    }
    final needsReason = _status == 'blocked' || _status == 'delayed';
    final canSubmit =
        (_activity != null || _asset.text.trim().isNotEmpty) &&
        (!needsReason || _reason.text.trim().isNotEmpty) &&
        !_submitting;

    return Scaffold(
      backgroundColor: FieldColors.canvas,
      resizeToAvoidBottomInset: true,
      appBar: AppBar(
        title: const Text('Quick Update'),
        leading: IconButton(
          tooltip: 'Back',
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        bottom: false,
        child: ListView(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 120),
          children: [
            // Status Selector (Intentional 2-row adaptive grid)
            _Section(
              title: 'Status',
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: _statusButton(
                          'started',
                          Icons.play_arrow_rounded,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _statusButton(
                          'progress',
                          Icons.trending_up_rounded,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _statusButton(
                          'completed',
                          Icons.check_circle_outline_rounded,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: _statusButton(
                          'delayed',
                          Icons.schedule_rounded,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _statusButton(
                          'blocked',
                          Icons.block_rounded,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            _Section(
              title: 'Activity',
              child: activityState.isLoading
                  ? const LinearProgressIndicator(
                      minHeight: 2,
                      color: FieldColors.action,
                    )
                  : DropdownButtonFormField<ScheduleActivity>(
                      key: ValueKey(_activity?.id),
                      initialValue: _activity,
                      isExpanded: true,
                      hint: const Text('Choose schedule activity'),
                      items: activityState.activities
                          .map(
                            (activity) => DropdownMenuItem(
                              value: activity,
                              child: Text(
                                '${activity.id} · ${activity.name}',
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          )
                          .toList(),
                      onChanged: (value) {
                        if (value != null) _selectActivity(value);
                      },
                    ),
            ),
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton(
                onPressed: () => setState(() {
                  _manualActivity = !_manualActivity;
                  if (_manualActivity) {
                    _activity = null;
                  } else {
                    _asset.clear();
                    _location.clear();
                  }
                }),
                child: Text(
                  _manualActivity
                      ? 'Choose from schedule'
                      : 'Activity not listed?',
                  style: const TextStyle(color: FieldColors.action),
                ),
              ),
            ),
            if (_manualActivity) ...[
              TextField(
                controller: _asset,
                onChanged: (_) => setState(() {}),
                textCapitalization: TextCapitalization.characters,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'Asset / tag',
                  hintText: 'Required',
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      initialValue: _discipline,
                      isExpanded: true,
                      decoration: const InputDecoration(
                        labelText: 'Discipline',
                      ),
                      items:
                          const [
                                'civil',
                                'structural',
                                'mechanical',
                                'piping',
                                'electrical',
                                'instrumentation',
                              ]
                              .map(
                                (value) => DropdownMenuItem(
                                  value: value,
                                  child: Text(
                                    value[0].toUpperCase() + value.substring(1),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              )
                              .toList(),
                      onChanged: (value) {
                        if (value != null) setState(() => _discipline = value);
                      },
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: _location,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(labelText: 'Location'),
                    ),
                  ),
                ],
              ),
            ],
            if (_activity != null) ...[
              const SizedBox(height: 8),
              Container(
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
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: FieldColors.brand50,
                            borderRadius: BorderRadius.circular(
                              FieldRadius.badge,
                            ),
                            border: Border.all(color: FieldColors.brand100),
                          ),
                          child: Text(
                            _activity!.id,
                            style: FieldTypography.monoSm.copyWith(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: FieldColors.brand700,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _activity!.name,
                            style: FieldTypography.cardTitle.copyWith(
                              fontSize: 13.5,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 12,
                      runSpacing: 4,
                      children: [
                        _Meta(
                          icon: Icons.sell_outlined,
                          text: _activity!.assetId,
                        ),
                        _Meta(
                          icon: Icons.engineering_outlined,
                          text: _activity!.discipline.toUpperCase(),
                        ),
                        if (_location.text.isNotEmpty)
                          _Meta(
                            icon: Icons.place_outlined,
                            text: _location.text,
                          ),
                        if (_activity!.plannedQuantity != null)
                          _Meta(
                            icon: Icons.analytics_outlined,
                            text:
                                'Planned: ${_activity!.plannedQuantity!.display}',
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 20),

            _Section(
              title: 'Details',
              child: Column(
                children: [
                  if (needsReason) ...[
                    DropdownButtonFormField<String>(
                      initialValue: _blockerCategory,
                      decoration: InputDecoration(
                        labelText: _status == 'blocked'
                            ? 'Blocker category'
                            : 'Delay category',
                      ),
                      items:
                          const [
                                'Material',
                                'Permit',
                                'Equipment',
                                'Labour',
                                'Access',
                                'Weather',
                                'Design',
                                'Safety',
                                'Other',
                              ]
                              .map(
                                (value) => DropdownMenuItem(
                                  value: value,
                                  child: Text(value),
                                ),
                              )
                              .toList(),
                      onChanged: (value) {
                        if (value != null) {
                          setState(() => _blockerCategory = value);
                        }
                      },
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _reason,
                      onChanged: (_) => setState(() {}),
                      textInputAction: TextInputAction.next,
                      maxLines: 2,
                      decoration: InputDecoration(
                        labelText: _status == 'blocked'
                            ? 'Blocker reason'
                            : 'Delay reason',
                        hintText: 'Permit, access, material, weather…',
                        prefixIcon: Icon(
                          _status == 'blocked'
                              ? Icons.block_rounded
                              : Icons.schedule_rounded,
                          color: _status == 'blocked'
                              ? FieldColors.danger
                              : FieldColors.warning,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                  if (_status == 'progress') ...[
                    Row(
                      children: [
                        const Text(
                          'Progress',
                          style: FieldTypography.bodyBold,
                        ),
                        const Spacer(),
                        Text(
                          '${_progress.round()}%',
                          style: FieldTypography.monoSm.copyWith(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: FieldColors.action,
                          ),
                        ),
                      ],
                    ),
                    Semantics(
                      label: 'Progress percentage',
                      value: '${_progress.round()} percent',
                      child: Slider(
                        value: _progress,
                        min: 0,
                        max: 100,
                        divisions: 20,
                        activeColor: FieldColors.action,
                        inactiveColor: FieldColors.surfaceRaised,
                        label: '${_progress.round()}%',
                        onChanged: (value) => setState(() => _progress = value),
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],
                  if (_status == 'progress' || _status == 'completed') ...[
                    TextField(
                      controller: _quantity,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      textInputAction: TextInputAction.next,
                      decoration: InputDecoration(
                        labelText: _status == 'completed'
                            ? 'Completed quantity (optional)'
                            : 'Quantity completed (optional)',
                        suffixText: _activity?.plannedQuantity?.unit,
                        helperText: _activity?.plannedQuantity == null
                            ? null
                            : 'Planned: ${_activity!.plannedQuantity!.display}',
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                  TextField(
                    controller: _notes,
                    minLines: 2,
                    maxLines: 4,
                    textInputAction: TextInputAction.done,
                    decoration: const InputDecoration(
                      labelText: 'Site notes',
                      hintText: 'Add useful context for the planner',
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            _Section(
              title: 'Evidence',
              child: EvidenceAttachmentField(
                attachments: _attachments,
                onChanged: (attachments) =>
                    setState(() => _attachments = attachments),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
          decoration: const BoxDecoration(
            color: FieldColors.surface,
            border: Border(top: BorderSide(color: FieldColors.borderSubtle)),
          ),
          child: FieldPrimaryButton(
            text: _submitting ? 'Submitting…' : _submitLabel(_status),
            icon: Icons.send_rounded,
            isLoading: _submitting,
            onPressed: canSubmit ? _submit : null,
          ),
        ),
      ),
    );
  }

  Widget _statusButton(String value, IconData icon) {
    final selected = _status == value;
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
        selectedBg = FieldColors.brand50;
        selectedFg = FieldColors.brand700;
        selectedBorder = FieldColors.brand100;
        break;
    }

    final label = _labelFor(value);

    return Semantics(
      button: true,
      selected: selected,
      label: label,
      child: Material(
        color: selected ? selectedBg : FieldColors.surface,
        borderRadius: BorderRadius.circular(FieldRadius.control),
        child: InkWell(
          borderRadius: BorderRadius.circular(FieldRadius.control),
          onTap: () {
            HapticFeedback.selectionClick();
            setState(() {
              _status = value;
              if (value != 'blocked' && value != 'delayed') _reason.clear();
            });
          },
          child: Container(
            height: 40,
            padding: const EdgeInsets.symmetric(horizontal: 8),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(FieldRadius.control),
              border: Border.all(
                color: selected ? selectedBorder : FieldColors.border,
                width: 1,
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  icon,
                  size: 16,
                  color: selected ? selectedFg : FieldColors.textSecondary,
                ),
                const SizedBox(width: 6),
                Flexible(
                  child: Text(
                    label,
                    style: FieldTypography.bodySmBold.copyWith(
                      fontSize: 12,
                      color: selected ? selectedFg : FieldColors.text,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _labelFor(String value) => const {
    'started': 'Started',
    'progress': 'In Progress',
    'completed': 'Completed',
    'delayed': 'Delayed',
    'blocked': 'Blocked',
  }[value]!;

  String _submitLabel(String value) => const {
    'started': 'Submit started update',
    'progress': 'Submit progress update',
    'completed': 'Submit completed update',
    'delayed': 'Submit delay',
    'blocked': 'Submit blocker',
  }[value]!;
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.child});
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(title, style: FieldTypography.sectionTitle.copyWith(fontSize: 18)),
      const SizedBox(height: 10),
      child,
    ],
  );
}

class _Meta extends StatelessWidget {
  const _Meta({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(icon, size: 14, color: FieldColors.textMuted),
      const SizedBox(width: 4),
      Text(
        text,
        style: FieldTypography.metadata.copyWith(
          color: FieldColors.textSecondary,
        ),
      ),
    ],
  );
}
