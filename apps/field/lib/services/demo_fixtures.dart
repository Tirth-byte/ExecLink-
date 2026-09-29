import '../models/common_types.dart';
import '../models/schedule_activity.dart';
import '../models/execution_event.dart';
import '../models/extracted_facts.dart';
import '../models/match_proposal.dart';

class DemoFixtures {
  static List<ScheduleActivity> get initialActivities => [
    const ScheduleActivity(
      id: 'ACT-1.2.1',
      projectId: 'PRJ-DEMO-001',
      snapshotId: 'SNP-DEMO-001',
      wbs: '1.2.1',
      level: 6,
      name: 'Pier P12 reinforcement fixing',
      discipline: 'structural',
      workType: 'reinforcement',
      assetId: 'PIER-P12',
      location: LocationInterval(
        kind: 'chainage',
        alignment: 'BL',
        start: 12400,
        end: 12430,
        unit: 'm',
      ),
      plannedStart: '2026-09-24',
      plannedFinish: '2026-09-28',
      plannedQuantity: Quantity(value: 20, unit: 't'),
      baselineProgressPercent: 30,
    ),
    const ScheduleActivity(
      id: 'ACT-1.2.2',
      projectId: 'PRJ-DEMO-001',
      snapshotId: 'SNP-DEMO-001',
      wbs: '1.2.2',
      level: 6,
      name: 'Pier P12 formwork installation',
      discipline: 'structural',
      workType: 'formwork',
      assetId: 'PIER-P12',
      location: LocationInterval(
        kind: 'chainage',
        alignment: 'BL',
        start: 12400,
        end: 12430,
        unit: 'm',
      ),
      plannedStart: '2026-09-26',
      plannedFinish: '2026-09-30',
      baselineProgressPercent: 10,
    ),
    const ScheduleActivity(
      id: 'ACT-2.1',
      projectId: 'PRJ-DEMO-001',
      snapshotId: 'SNP-DEMO-001',
      wbs: '2.1',
      level: 5,
      name: 'Station electrical interface works',
      discipline: 'electrical',
      workType: 'cable-installation',
      assetId: 'STN-03',
      location: LocationInterval(
        kind: 'chainage',
        alignment: 'BL',
        start: 15800,
        end: 16100,
        unit: 'm',
      ),
      plannedStart: '2026-10-01',
      plannedFinish: '2026-10-12',
      baselineProgressPercent: 0,
    ),
    const ScheduleActivity(
      id: 'ACT-3.1.1',
      projectId: 'PRJ-DEMO-001',
      snapshotId: 'SNP-DEMO-001',
      wbs: '3.1.1',
      level: 6,
      name: 'Line 24 P-110 equipment erection',
      discipline: 'mechanical',
      workType: 'erection',
      assetId: 'P-110',
      location: LocationInterval(
        kind: 'chainage',
        alignment: 'BL',
        start: 18200,
        end: 18250,
        unit: 'm',
      ),
      plannedStart: '2026-09-26',
      plannedFinish: '2026-09-29',
      baselineProgressPercent: 0,
    ),
  ];

  static List<ExecutionEvent> get initialEvents => [
    const ExecutionEvent(
      id: 'EVT-DEMO-001',
      projectId: 'PRJ-DEMO-001',
      reporterId: 'USR-SUP-001',
      observedAt: '2026-09-26T04:30:00Z',
      receivedAt: '2026-09-26T04:31:00Z',
      evidence: Evidence(
        text: 'Fixed 3 tonnes of rebar at Pier P12, chainage 12+410 to 12+425.',
        attachmentIds: ['ATT-DEMO-001'],
      ),
      extractedFacts: ExtractedFacts(
        eventType: 'progress',
        assetId: 'PIER-P12',
        discipline: 'structural',
        workType: 'rebar-fixing',
        location: LocationInterval(
          kind: 'chainage',
          alignment: 'BL',
          start: 12410,
          end: 12425,
          unit: 'm',
        ),
        quantity: Quantity(value: 3, unit: 't'),
        keywords: ['pier', 'rebar', 'fixed'],
      ),
      status: 'submitted',
      clientEventId: 'EVT-DEMO-001',
      syncStatus: SyncStatus.synced,
    ),
    const ExecutionEvent(
      id: 'EVT-DEMO-002',
      projectId: 'PRJ-DEMO-001',
      reporterId: 'USR-SUP-001',
      observedAt: '2026-09-26T05:00:00Z',
      receivedAt: '2026-09-26T05:02:00Z',
      evidence: Evidence(
        text: 'Crew working at P12; preparation continuing.',
        attachmentIds: [],
      ),
      extractedFacts: ExtractedFacts(
        eventType: 'progress',
        assetId: 'PIER-P12',
        discipline: 'structural',
        location: LocationInterval(
          kind: 'chainage',
          alignment: 'BL',
          start: 12405,
          end: 12420,
          unit: 'm',
        ),
        keywords: ['crew', 'preparation'],
      ),
      status: 'submitted',
      clientEventId: 'EVT-DEMO-002',
      syncStatus: SyncStatus.synced,
    ),
    const ExecutionEvent(
      id: 'EVT-DEMO-003',
      projectId: 'PRJ-DEMO-001',
      reporterId: 'USR-SUP-001',
      observedAt: '2026-09-26T05:30:00Z',
      receivedAt: '2026-09-26T05:31:00Z',
      evidence: Evidence(
        text: 'Drain cleaning near depot entrance.',
        attachmentIds: [],
      ),
      extractedFacts: ExtractedFacts(
        eventType: 'progress',
        discipline: 'civil',
        workType: 'drain-cleaning',
        keywords: ['drain', 'cleaning', 'depot'],
      ),
      status: 'submitted',
      clientEventId: 'EVT-DEMO-003',
      syncStatus: SyncStatus.synced,
    ),
  ];

  static MatchProposal createDeterministicProposal(ExecutionEvent event) {
    final lower = event.evidence.text.toLowerCase();
    final List<MatchCandidate> candidates = [];

    if (lower.contains('p-110') || lower.contains('line 24')) {
      candidates.add(
        const MatchCandidate(
          activityId: 'ACT-3.1.1',
          activityWbs: '3.1.1',
          score: 0.9450,
          band: 'auto_suggest',
          explanation: [
            SignalExplanation(
              signal: 'asset',
              score: 1.0,
              weight: 0.40,
              contribution: 0.40,
              explanation: 'Exact asset tag match: P-110',
            ),
            SignalExplanation(
              signal: 'discipline',
              score: 1.0,
              weight: 0.20,
              contribution: 0.20,
              explanation: 'Discipline matched: mechanical/piping',
            ),
            SignalExplanation(
              signal: 'location',
              score: 0.90,
              weight: 0.15,
              contribution: 0.135,
              explanation: 'Line 24 spatial corridor match',
            ),
            SignalExplanation(
              signal: 'text',
              score: 0.95,
              weight: 0.10,
              contribution: 0.095,
              explanation: 'High token overlap on equipment erection',
            ),
            SignalExplanation(
              signal: 'workType',
              score: 1.0,
              weight: 0.10,
              contribution: 0.10,
              explanation: 'Synonym match: erection',
            ),
            SignalExplanation(
              signal: 'temporal',
              score: 0.30,
              weight: 0.05,
              contribution: 0.015,
              explanation: 'Planned window active today',
            ),
          ],
        ),
      );
    } else if (lower.contains('pier p12') || lower.contains('rebar')) {
      candidates.add(
        const MatchCandidate(
          activityId: 'ACT-1.2.1',
          activityWbs: '1.2.1',
          score: 0.9400,
          band: 'auto_suggest',
          explanation: [
            SignalExplanation(
              signal: 'asset',
              score: 1.0,
              weight: 0.40,
              contribution: 0.40,
              explanation: 'Exact asset match: PIER-P12',
            ),
            SignalExplanation(
              signal: 'discipline',
              score: 1.0,
              weight: 0.20,
              contribution: 0.20,
              explanation: 'Discipline structural matched',
            ),
            SignalExplanation(
              signal: 'location',
              score: 0.88,
              weight: 0.15,
              contribution: 0.132,
              explanation: 'Chainage 12+410-12+425 within 12+400-12+430',
            ),
            SignalExplanation(
              signal: 'text',
              score: 0.85,
              weight: 0.10,
              contribution: 0.085,
              explanation: 'Tokens: pier, rebar, fixed matched',
            ),
            SignalExplanation(
              signal: 'workType',
              score: 0.90,
              weight: 0.10,
              contribution: 0.090,
              explanation: 'Synonym rebar-fixing to reinforcement',
            ),
            SignalExplanation(
              signal: 'temporal',
              score: 0.66,
              weight: 0.05,
              contribution: 0.033,
              explanation: 'Observation within planned dates',
            ),
          ],
        ),
      );
    } else {
      candidates.add(
        const MatchCandidate(
          activityId: 'ACT-2.1',
          activityWbs: '2.1',
          score: 0.4500,
          band: 'unmatched',
          explanation: [
            SignalExplanation(
              signal: 'asset',
              score: 0.0,
              weight: 0.40,
              contribution: 0.0,
              explanation: 'No asset match found',
              missing: true,
            ),
            SignalExplanation(
              signal: 'discipline',
              score: 0.5,
              weight: 0.20,
              contribution: 0.10,
              explanation: 'Discipline partial overlap',
            ),
            SignalExplanation(
              signal: 'location',
              score: 0.0,
              weight: 0.15,
              contribution: 0.0,
              explanation: 'Location mismatch',
              missing: true,
            ),
            SignalExplanation(
              signal: 'text',
              score: 0.35,
              weight: 0.10,
              contribution: 0.035,
              explanation: 'Low lexical similarity',
            ),
            SignalExplanation(
              signal: 'workType',
              score: 0.0,
              weight: 0.10,
              contribution: 0.0,
              explanation: 'No workType synonym',
              missing: true,
            ),
            SignalExplanation(
              signal: 'temporal',
              score: 0.20,
              weight: 0.05,
              contribution: 0.010,
              explanation: 'Outside target window',
            ),
          ],
        ),
      );
    }

    return MatchProposal(
      id: 'PROP-${event.id}',
      projectId: event.projectId,
      executionEventId: event.id,
      snapshotId: 'SNP-DEMO-001',
      engineVersion: '1.0.0',
      configVersion: '1.0.0',
      mode: 'deterministic_fallback',
      status: 'proposed',
      candidates: candidates,
      createdAt: DateTime.now().toUtc().toIso8601String(),
    );
  }
}
