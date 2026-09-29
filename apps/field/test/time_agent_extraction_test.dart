import 'package:flutter_test/flutter_test.dart';
import 'package:execlink_field/services/time_agent_extractor.dart';

void main() {
  group('TimeAgentExtractor Tests', () {
    test('Golden P-110 scenario extracts structured facts, time, asset, and blocker', () {
      const sentence =
          'Line 24 P-110 erection completed at 10:35. Hydrotest blocked due to permit.';
      final result = TimeAgentExtractor.extract(sentence);

      expect(result.eventType, 'completed');
      expect(result.facts.assetId, 'P-110');
      expect(result.facts.discipline, 'mechanical');
      expect(result.facts.workType, 'erection');
      expect(result.facts.delayReason, isNotNull);
      expect(result.facts.delayReason!.toLowerCase(), contains('permit'));
      expect(result.suggestedActivityId, 'ACT-3.1.1');
      expect(result.confidenceScore, greaterThanOrEqualTo(0.90));
      expect(result.matchBand, 'auto_suggest');
      expect(result.observedTimestamp.hour, 10);
      expect(result.observedTimestamp.minute, 35);
    });

    test('Golden Flow 1 Pier P12 rebar scenario extracts structural facts and chainage', () {
      const sentence =
          'Fixed 3 tonnes of rebar at Pier P12, chainage 12+410 to 12+425.';
      final result = TimeAgentExtractor.extract(sentence);

      expect(result.facts.assetId, 'PIER-P12');
      expect(result.facts.discipline, 'structural');
      expect(result.facts.workType, 'reinforcement');
      expect(result.facts.quantity, isNotNull);
      expect(result.facts.quantity!.value, 3.0);
      expect(result.facts.quantity!.unit, 't');
      expect(result.facts.location, isNotNull);
      expect(result.facts.location!.start, 12410);
      expect(result.facts.location!.end, 12425);
      expect(result.suggestedActivityId, 'ACT-1.2.1');
      expect(result.confidenceScore, greaterThanOrEqualTo(0.90));
      expect(result.matchBand, 'auto_suggest');
    });

    test('Multi-fact extraction cleanly extracts two distinct execution facts from compound utterance', () {
      const sentence =
          'Line 24 P-110 erection completed at 10:35. Hydrotest blocked due to permit.';
      final multi = TimeAgentExtractor.extractMultiFact(sentence);

      expect(multi.length, 2);

      // Fact 1: Erection completed
      final fact1 = multi[0];
      expect(fact1.eventType, 'completed');
      expect(fact1.facts.assetId, 'P-110');
      expect(fact1.facts.discipline, 'mechanical');
      expect(fact1.facts.workType, 'erection');
      expect(fact1.suggestedActivityId, 'ACT-3.1.1');
      expect(fact1.confidenceScore, greaterThanOrEqualTo(0.90));

      // Fact 2: Hydrotest blocked due to permit
      final fact2 = multi[1];
      expect(fact2.eventType, 'blocked');
      expect(fact2.facts.discipline, 'piping');
      expect(fact2.facts.workType, 'hydrotest');
      expect(fact2.facts.delayReason, isNotNull);
      expect(fact2.facts.delayReason!.toLowerCase(), contains('permit'));
    });
  });
}
