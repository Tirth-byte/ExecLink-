import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../models/common_types.dart';
import '../../models/execution_event.dart';
import '../../models/extracted_facts.dart';
import '../../models/schedule_activity.dart';
import '../../providers/field_providers.dart';

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
  bool _attachPhoto = true;

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
        attachmentIds: _attachPhoto
            ? ['ATT-QUICK-${DateTime.now().millisecondsSinceEpoch}']
            : [],
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
          onPressed: () => context.go('/'),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // 1. Five Fast Action Buttons
          Text(
            'ONE-TOUCH FIELD STATUS',
            style: AppTypography.bodySmBold.copyWith(
              letterSpacing: 0.5,
              color: AppColors.textMuted,
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              _buildFastActionButton(
                'started',
                'Started',
                Icons.play_arrow,
                AppColors.info,
              ),
              const SizedBox(width: 8),
              _buildFastActionButton(
                'progress',
                'Progress',
                Icons.trending_up,
                AppColors.action,
              ),
              const SizedBox(width: 8),
              _buildFastActionButton(
                'completed',
                'Done',
                Icons.check,
                AppColors.success,
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              _buildFastActionButton(
                'delayed',
                'Delayed',
                Icons.timer,
                AppColors.warning,
              ),
              const SizedBox(width: 8),
              _buildFastActionButton(
                'blocked',
                'Blocked',
                Icons.block,
                AppColors.danger,
              ),
            ],
          ),
          const SizedBox(height: 20),

          // 2. Select Relevant Activity
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'SELECT RELEVANT ACTIVITY',
                    style: AppTypography.bodySmBold.copyWith(
                      letterSpacing: 0.5,
                      color: AppColors.textMuted,
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
                          style: AppTypography.bodySm,
                        ),
                      );
                    }).toList(),
                    onChanged: (act) {
                      if (act != null) _selectActivity(act);
                    },
                  ),
                  const SizedBox(height: 12),

                  // Quick Asset Tag selection
                  Text('Asset / Tag:', style: AppTypography.bodySmBold),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 6,
                    children: ['PIER-P12', 'P-110', 'STN-03', 'LINE-24'].map((
                      tag,
                    ) {
                      final isSelected = _assetController.text == tag;
                      return ChoiceChip(
                        label: Text(tag),
                        selected: isSelected,
                        onSelected: (sel) {
                          if (sel) setState(() => _assetController.text = tag);
                        },
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 12),

                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _assetController,
                          decoration: const InputDecoration(
                            labelText: 'Asset ID / Tag',
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          initialValue: _selectedDiscipline,
                          decoration: const InputDecoration(
                            labelText: 'Discipline',
                          ),
                          items: const [
                            DropdownMenuItem(
                              value: 'structural',
                              child: Text('Structural'),
                            ),
                            DropdownMenuItem(
                              value: 'mechanical',
                              child: Text('Mechanical'),
                            ),
                            DropdownMenuItem(
                              value: 'piping',
                              child: Text('Piping'),
                            ),
                            DropdownMenuItem(
                              value: 'electrical',
                              child: Text('Electrical'),
                            ),
                            DropdownMenuItem(
                              value: 'civil',
                              child: Text('Civil'),
                            ),
                          ],
                          onChanged: (val) {
                            if (val != null)
                              setState(() => _selectedDiscipline = val);
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _locationController,
                          decoration: const InputDecoration(
                            labelText: 'Location / Chainage',
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: _quantityController,
                          decoration: const InputDecoration(
                            labelText: 'Quantity (Optional)',
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Highlight Delay Reason if delayed or blocked
                  if (_selectedAction == 'delayed' ||
                      _selectedAction == 'blocked') ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: _selectedAction == 'blocked'
                            ? AppColors.dangerBg
                            : AppColors.warningBg,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'REPORT REASON FOR ${_selectedAction.toUpperCase()}',
                            style: AppTypography.bodySmBold.copyWith(
                              color: _selectedAction == 'blocked'
                                  ? AppColors.danger
                                  : AppColors.warning,
                              fontSize: 11,
                            ),
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            controller: _delayReasonController,
                            decoration: const InputDecoration(
                              hintText: 'e.g. Permit delay, Preceding activity incomplete, Weather',
                              filled: true,
                              fillColor: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Wrap(
                            spacing: 6,
                            runSpacing: 4,
                            children:
                                [
                                  'Permit delay',
                                  'Material shortage',
                                  'Access blocked',
                                  'Heavy rain / weather',
                                  'Preceding trade pending',
                                ].map((reason) {
                                  return ActionChip(
                                    label: Text(
                                      reason,
                                      style: const TextStyle(fontSize: 10),
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
                    const SizedBox(height: 12),
                  ],

                  TextField(
                    controller: _notesController,
                    maxLines: 2,
                    decoration: const InputDecoration(
                      labelText: 'Notes / Supervisor Field Evidence',
                    ),
                  ),
                  const SizedBox(height: 12),

                  Row(
                    children: [
                      Checkbox(
                        value: _attachPhoto,
                        activeColor: AppColors.action,
                        onChanged: (val) =>
                            setState(() => _attachPhoto = val ?? false),
                      ),
                      const Expanded(
                        child: Text(
                          'Attach camera photo & GPS coordinates metadata',
                          style: AppTypography.bodySm,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton.icon(
                      icon: const Icon(Icons.send),
                      label: Text(
                        'SUBMIT ${_selectedAction.toUpperCase()} UPDATE',
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
        borderRadius: BorderRadius.circular(8),
        child: Container(
          height: 60,
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? color : AppColors.surface,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isSelected ? color : AppColors.border,
              width: isSelected ? 2 : 1,
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 20, color: isSelected ? Colors.white : color),
              const SizedBox(height: 2),
              Text(
                label,
                style: AppTypography.bodySmBold.copyWith(
                  color: isSelected ? Colors.white : AppColors.text,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
