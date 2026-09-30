import 'package:flutter/material.dart';
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
import '../../widgets/field_evidence_section.dart';

class QuickUpdateView extends ConsumerStatefulWidget {
  final String? initialActivityId;

  const QuickUpdateView({super.key, this.initialActivityId});

  @override
  ConsumerState<QuickUpdateView> createState() => _QuickUpdateViewState();
}

class _QuickUpdateViewState extends ConsumerState<QuickUpdateView> {
  String _selectedAction =
      'completed'; // started, progress, completed, delayed, blocked
  ScheduleActivity? _selectedActivity;

  final TextEditingController _notesController = TextEditingController();
  final TextEditingController _assetController = TextEditingController();
  final TextEditingController _locationController = TextEditingController();
  final TextEditingController _delayReasonController = TextEditingController();
  final TextEditingController _quantityController = TextEditingController();

  String _selectedDiscipline = 'structural';
  List<EvidenceAttachment> _attachments = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final activities = ref.read(activitiesProvider).activities;
      if (widget.initialActivityId != null) {
        final found = activities
            .where((a) => a.id == widget.initialActivityId)
            .firstOrNull;
        if (found != null) {
          _selectActivity(found);
          return;
        }
      }
      if (activities.isNotEmpty) {
        _selectActivity(activities.first);
      }
    });
  }

  @override
  void dispose() {
    _notesController.dispose();
    _assetController.dispose();
    _locationController.dispose();
    _delayReasonController.dispose();
    _quantityController.dispose();
    super.dispose();
  }

  void _selectActivity(ScheduleActivity act) {
    setState(() {
      _selectedActivity = act;
      _assetController.text = act.assetId;
      _selectedDiscipline = act.discipline;
      _locationController.text =
          '${act.location.alignment} ${act.location.start.toInt()}-${act.location.end.toInt()}m';
      _notesController.text = 'Execution update for ${act.name}';
    });
  }

  Future<void> _submitQuickUpdate() async {
    final nowIso = DateTime.now().toUtc().toIso8601String();
    final eventId = 'EVT-FIELD-${DateTime.now().millisecondsSinceEpoch}';

    final text = _notesController.text.trim().isNotEmpty
        ? _notesController.text.trim()
        : '${_selectedAction.toUpperCase()}: ${_selectedActivity?.name ?? _assetController.text}';

    final facts = ExtractedFacts(
      eventType: _selectedAction,
      assetId: _assetController.text.trim().isNotEmpty
          ? _assetController.text.trim()
          : _selectedActivity?.assetId,
      discipline: _selectedDiscipline,
      workType: _selectedActivity?.workType,
      location: _selectedActivity?.location,
      delayReason:
          (_selectedAction == 'delayed' || _selectedAction == 'blocked')
          ? (_delayReasonController.text.trim().isNotEmpty
                ? _delayReasonController.text.trim()
                : 'Site delay reported by supervisor')
          : null,
      contractor: 'L&T Heavy Civil',
      keywords: [
        _selectedAction,
        if (_selectedActivity != null) _selectedActivity!.id.toLowerCase(),
        if (_assetController.text.isNotEmpty)
          _assetController.text.toLowerCase(),
      ],
    );

    final event = ExecutionEvent(
      id: eventId,
      projectId: 'PRJ-DEMO-001',
      reporterId: 'USR-SUP-001',
      observedAt: nowIso,
      receivedAt: nowIso,
      evidence: Evidence(
        text: text,
        attachmentIds: _attachments.map((a) => a.id).toList(),
        attachments: _attachments,
      ),
      extractedFacts: facts,
      status: 'submitted',
      clientEventId: eventId,
      syncStatus: SyncStatus.synced,
    );

    await ref.read(eventsProvider).submitEvent(event);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Field update submitted (ID: $eventId)'),
          backgroundColor: AppColors.action,
        ),
      );
      context.go('/history');
    }
  }

  @override
  Widget build(BuildContext context) {
    final activities = ref.watch(activitiesProvider).activities;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Quick Update'),
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
      ),
      body: SafeArea(
        top: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 110),
          children: [
            // 1. Five Fast Action Buttons
            Text(
              'ONE-TOUCH FIELD STATUS',
              style: FieldTypography.statusText.copyWith(
                letterSpacing: 0.5,
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
            const SizedBox(height: 16),

            // 2. Select Relevant Activity
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'SELECT RELEVANT ACTIVITY',
                      style: FieldTypography.statusText.copyWith(
                        letterSpacing: 0.5,
                        color: FieldColors.textMuted,
                      ),
                    ),
                    const SizedBox(height: 10),
                    DropdownButtonFormField<ScheduleActivity>(
                      initialValue: _selectedActivity,
                      isExpanded: true,
                      decoration: const InputDecoration(
                        labelText: 'Schedule Activity Target',
                      ),
                      items: activities.map((act) {
                        return DropdownMenuItem<ScheduleActivity>(
                          value: act,
                          child: Text(
                            '${act.id}: ${act.name}',
                            overflow: TextOverflow.ellipsis,
                            style: FieldTypography.bodySm.copyWith(
                              fontSize: 13,
                            ),
                          ),
                        );
                      }).toList(),
                      onChanged: (act) {
                        if (act != null) _selectActivity(act);
                      },
                    ),
                    const SizedBox(height: 14),

                    // Quick Asset Tag selection
                    Text(
                      'Asset / Tag:',
                      style: FieldTypography.statusText.copyWith(
                        fontSize: 11,
                        color: FieldColors.textMuted,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      children: ['PIER-P12', 'P-110', 'STN-03', 'LINE-24'].map((
                        tag,
                      ) {
                        final isSelected = _assetController.text == tag;
                        return ChoiceChip(
                          label: Text(tag),
                          selected: isSelected,
                          selectedColor: FieldColors.brand50,
                          side: BorderSide(
                            color: isSelected
                                ? FieldColors.brand700
                                : FieldColors.border,
                          ),
                          labelStyle: FieldTypography.monoSm.copyWith(
                            color: isSelected
                                ? FieldColors.brand700
                                : FieldColors.text,
                            fontSize: 11,
                            fontWeight: isSelected
                                ? FontWeight.w700
                                : FontWeight.w500,
                          ),
                          onSelected: (sel) {
                            if (sel) {
                              setState(() => _assetController.text = tag);
                            }
                          },
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 14),

                    // Responsive 2-column fields
                    LayoutBuilder(
                      builder: (context, constraints) {
                        final isNarrow = constraints.maxWidth < 320;
                        if (isNarrow) {
                          return Column(
                            children: [
                              TextField(
                                controller: _assetController,
                                style: FieldTypography.body.copyWith(
                                  fontSize: 14,
                                ),
                                decoration: const InputDecoration(
                                  labelText: 'Asset ID / Tag',
                                ),
                              ),
                              const SizedBox(height: 12),
                              _buildDisciplineDropdown(),
                              const SizedBox(height: 12),
                              TextField(
                                controller: _locationController,
                                style: FieldTypography.body.copyWith(
                                  fontSize: 14,
                                ),
                                decoration: const InputDecoration(
                                  labelText: 'Location / Chainage',
                                ),
                              ),
                              const SizedBox(height: 12),
                              TextField(
                                controller: _quantityController,
                                style: FieldTypography.body.copyWith(
                                  fontSize: 14,
                                ),
                                decoration: const InputDecoration(
                                  labelText: 'Quantity (Optional)',
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
                                      labelText: 'Asset ID / Tag',
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(child: _buildDisciplineDropdown()),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                Expanded(
                                  child: TextField(
                                    controller: _locationController,
                                    style: FieldTypography.body.copyWith(
                                      fontSize: 14,
                                    ),
                                    decoration: const InputDecoration(
                                      labelText: 'Location / Chainage',
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: TextField(
                                    controller: _quantityController,
                                    style: FieldTypography.body.copyWith(
                                      fontSize: 14,
                                    ),
                                    decoration: const InputDecoration(
                                      labelText: 'Quantity (Optional)',
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        );
                      },
                    ),
                    const SizedBox(height: 14),

                    // Highlight Delay Reason if delayed or blocked
                    if (_selectedAction == 'delayed' ||
                        _selectedAction == 'blocked') ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: _selectedAction == 'blocked'
                              ? FieldColors.dangerBg
                              : FieldColors.warningBg,
                          borderRadius: BorderRadius.circular(FieldRadius.control),
                          border: Border.all(
                            color: _selectedAction == 'blocked'
                                ? FieldColors.dangerBorder
                                : FieldColors.warningBorder,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'REPORT REASON FOR ${_selectedAction.toUpperCase()}',
                              style: FieldTypography.statusText.copyWith(
                                color: _selectedAction == 'blocked'
                                    ? FieldColors.danger
                                    : FieldColors.warning,
                                fontSize: 10.5,
                              ),
                            ),
                            const SizedBox(height: 8),
                            TextField(
                              controller: _delayReasonController,
                              style: FieldTypography.body.copyWith(
                                fontSize: 13.5,
                              ),
                              decoration: const InputDecoration(
                                hintText:
                                    'e.g. Permit delay, Preceding activity incomplete, Weather',
                                fillColor: Colors.white,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 6,
                              runSpacing: 4,
                              children: [
                                'Permit delay',
                                'Material shortage',
                                'Access blocked',
                                'Heavy rain / weather',
                                'Preceding trade pending',
                              ].map((reason) {
                                return ActionChip(
                                  label: Text(
                                    reason,
                                    style: const TextStyle(fontSize: 10.5),
                                  ),
                                  onPressed: () {
                                    setState(
                                      () => _delayReasonController.text =
                                          reason,
                                    );
                                  },
                                );
                              }).toList(),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),
                    ],

                    TextField(
                      controller: _notesController,
                      maxLines: 2,
                      style: FieldTypography.body.copyWith(fontSize: 14),
                      decoration: const InputDecoration(
                        labelText: 'Notes / Supervisor Field Evidence',
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Reusable Field Evidence Component
                    FieldEvidenceSection(
                      attachments: _attachments,
                      onChanged: (items) =>
                          setState(() => _attachments = items),
                    ),
                    const SizedBox(height: 16),

                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.send_rounded, size: 20),
                        label: Text(
                          'Submit ${_selectedAction.toUpperCase()} Update',
                          style: FieldTypography.button,
                        ),
                        onPressed: _submitQuickUpdate,
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

  Widget _buildFastActionButton(
    String action,
    String label,
    IconData icon,
    Color color,
  ) {
    final isSelected = _selectedAction == action;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _selectedAction = action),
        borderRadius: BorderRadius.circular(FieldRadius.control),
        child: Container(
          height: 42,
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
                size: 16,
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
        DropdownMenuItem(value: 'structural', child: Text('Structural', overflow: TextOverflow.ellipsis)),
        DropdownMenuItem(value: 'mechanical', child: Text('Mechanical', overflow: TextOverflow.ellipsis)),
        DropdownMenuItem(value: 'piping', child: Text('Piping', overflow: TextOverflow.ellipsis)),
        DropdownMenuItem(value: 'electrical', child: Text('Electrical', overflow: TextOverflow.ellipsis)),
        DropdownMenuItem(value: 'civil', child: Text('Civil', overflow: TextOverflow.ellipsis)),
      ],
      onChanged: (val) {
        if (val != null) {
          setState(() => _selectedDiscipline = val);
        }
      },
    );
  }
}
