import '../models/common_types.dart';
import '../models/extracted_facts.dart';

class ExtractionResult {
  final String rawTranscript;
  final String description;
  final String eventType;
  final ExtractedFacts facts;
  final String? suggestedActivityId;
  final String? suggestedActivityName;
  final double confidenceScore;
  final String matchBand; // 'auto_suggest' | 'review' | 'unmatched'
  final DateTime observedTimestamp;

  const ExtractionResult({
    required this.rawTranscript,
    required this.description,
    required this.eventType,
    required this.facts,
    this.suggestedActivityId,
    this.suggestedActivityName,
    this.confidenceScore = 0.0,
    this.matchBand = 'unmatched',
    required this.observedTimestamp,
  });

  ExtractionResult copyWith({
    String? rawTranscript,
    String? description,
    String? eventType,
    ExtractedFacts? facts,
    String? suggestedActivityId,
    String? suggestedActivityName,
    double? confidenceScore,
    String? matchBand,
    DateTime? observedTimestamp,
    bool clearSuggestedMatch = false,
  }) {
    return ExtractionResult(
      rawTranscript: rawTranscript ?? this.rawTranscript,
      description: description ?? this.description,
      eventType: eventType ?? this.eventType,
      facts: facts ?? this.facts,
      suggestedActivityId: clearSuggestedMatch
          ? null
          : (suggestedActivityId ?? this.suggestedActivityId),
      suggestedActivityName: clearSuggestedMatch
          ? null
          : (suggestedActivityName ?? this.suggestedActivityName),
      confidenceScore: confidenceScore ?? this.confidenceScore,
      matchBand: matchBand ?? this.matchBand,
      observedTimestamp: observedTimestamp ?? this.observedTimestamp,
    );
  }
}

class MultiFactResult {
  final String rawTranscript;
  final List<ExtractionResult> facts;

  const MultiFactResult({required this.rawTranscript, required this.facts});

  ExtractionResult get primary => facts.isNotEmpty
      ? facts.first
      : TimeAgentExtractor.extract(rawTranscript);
}

class TimeAgentExtractor {
  /// Extracts multiple distinct execution event facts from a supervisor utterance
  static List<ExtractionResult> extractMultiFact(
    String transcript, {
    DateTime? referenceDate,
  }) {
    final clean = transcript.trim();
    if (clean.isEmpty) return [];

    final ref = referenceDate ?? DateTime.now().toUtc();

    // Split on sentence terminators (. ! ? ; or newlines)
    final segments = clean
        .split(RegExp(r'(?<=[.?!;])\s+|\n+'))
        .map((s) => s.trim().replaceAll(RegExp(r'[.?!;]+$'), ''))
        .where((s) => s.isNotEmpty)
        .toList();

    if (segments.length <= 1) {
      return [
        _extractSingle(
          clean,
          ref,
          inheritedAsset: null,
          inheritedLocation: null,
        ),
      ];
    }

    final results = <ExtractionResult>[];
    String? contextualAsset;
    LocationInterval? contextualLocation;

    for (final seg in segments) {
      final res = _extractSingle(
        seg,
        ref,
        inheritedAsset: contextualAsset,
        inheritedLocation: contextualLocation,
      );
      if (res.facts.assetId != null) {
        contextualAsset = res.facts.assetId;
      }
      if (res.facts.location != null) {
        contextualLocation = res.facts.location;
      }
      results.add(res);
    }

    return results;
  }

  /// Backward-compatible single extract entry point
  static ExtractionResult extract(
    String transcript, {
    DateTime? referenceDate,
  }) {
    final multi = extractMultiFact(transcript, referenceDate: referenceDate);
    if (multi.isEmpty) {
      return _extractSingle(
        transcript,
        referenceDate ?? DateTime.now().toUtc(),
      );
    }
    // If the input has secondary facts (e.g. "Hydrotest blocked due to permit"),
    // fold secondary delay reason into primary if primary doesn't have one
    final primary = multi.first;
    if (primary.facts.delayReason == null && multi.length > 1) {
      for (final other in multi.skip(1)) {
        if (other.facts.delayReason != null) {
          return primary.copyWith(
            facts: primary.facts.copyWith(delayReason: other.facts.delayReason),
          );
        }
      }
    }
    return primary;
  }

  static ExtractionResult _extractSingle(
    String segment,
    DateTime ref, {
    String? inheritedAsset,
    LocationInterval? inheritedLocation,
  }) {
    final clean = segment.trim();
    final lower = clean.toLowerCase();

    // 1. Detect event type
    String eventType = 'progress';
    if (lower.contains('erection completed') ||
        lower.contains('completed') ||
        lower.contains('finished') ||
        lower.contains('installed')) {
      eventType = 'completed';
    } else if (lower.contains('blocked')) {
      eventType = 'blocked';
    } else if (lower.contains('delayed')) {
      eventType = 'delayed';
    } else if (lower.contains('started') || lower.contains('commenced')) {
      eventType = 'started';
    }

    // 2. Extract Asset Tag
    String? assetId;
    final equipMatch = RegExp(
      r'\b(PIER[-\s]?P?\d+|P-\d+|STN-\d+)\b',
      caseSensitive: false,
    ).firstMatch(clean);
    if (equipMatch != null) {
      final rawAsset = equipMatch.group(0)!;
      if (rawAsset.toLowerCase().startsWith('pier')) {
        final digits = RegExp(r'\d+').firstMatch(rawAsset)?.group(0) ?? '';
        assetId = 'PIER-P$digits';
      } else {
        assetId = rawAsset.toUpperCase();
      }
    } else {
      final lineMatch = RegExp(
        r'\bLINE[-\s]?\d+\b',
        caseSensitive: false,
      ).firstMatch(clean);
      if (lineMatch != null) {
        assetId = lineMatch.group(0)!.toUpperCase().replaceAll(' ', '-');
      } else if (inheritedAsset != null) {
        assetId = inheritedAsset;
      }
    }

    // 3. Extract Discipline & Work Type
    String? discipline;
    String? workType;
    if (lower.contains('rebar') || lower.contains('reinforcement')) {
      discipline = 'structural';
      workType = 'reinforcement';
    } else if (lower.contains('formwork')) {
      discipline = 'structural';
      workType = 'formwork';
    } else if (lower.contains('erection') || lower.contains('erected')) {
      discipline = 'mechanical';
      workType = 'erection';
    } else if (lower.contains('hydrotest')) {
      discipline = 'piping';
      workType = 'hydrotest';
    } else if (lower.contains('cable') || lower.contains('electrical')) {
      discipline = 'electrical';
      workType = 'cable-installation';
    } else if (lower.contains('drain') || lower.contains('excavat')) {
      discipline = 'civil';
      workType = 'drain-cleaning';
    }

    // 4. Extract Timestamp (e.g. "at 10:35")
    final timeMatch = RegExp(
      r'\b(?:at\s+)?(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?\b',
      caseSensitive: false,
    ).firstMatch(clean);
    DateTime eventTime = ref;
    if (timeMatch != null) {
      var hour = int.parse(timeMatch.group(1)!);
      final minute = int.parse(timeMatch.group(2)!);
      final meridiem = timeMatch.group(4)?.toLowerCase();
      if (meridiem == 'pm' && hour < 12) hour += 12;
      if (meridiem == 'am' && hour == 12) hour = 0;

      eventTime = DateTime.utc(ref.year, ref.month, ref.day, hour, minute);
    }

    // 5. Extract Chainage Location (e.g. "chainage 12+410 to 12+425")
    LocationInterval? location;
    final chainageMatch = RegExp(
      r'(?:chainage|ch\.?)\s*(\d+)\+(\d+)(?:\s*(?:to|-)\s*(\d+)\+(\d+))?',
      caseSensitive: false,
    ).firstMatch(clean);
    if (chainageMatch != null) {
      final start =
          double.parse(chainageMatch.group(1)!) * 1000 +
          double.parse(chainageMatch.group(2)!);
      double end = start;
      if (chainageMatch.group(3) != null && chainageMatch.group(4) != null) {
        end =
            double.parse(chainageMatch.group(3)!) * 1000 +
            double.parse(chainageMatch.group(4)!);
      }
      location = LocationInterval(
        kind: 'chainage',
        alignment: 'BL',
        start: start,
        end: end,
        unit: 'm',
      );
    } else if (inheritedLocation != null) {
      location = inheritedLocation;
    }

    // 6. Extract Quantity (e.g. "3 tonnes")
    Quantity? quantity;
    final qtyMatch = RegExp(
      r'\b(\d+(?:\.\d+)?)\s*(tonnes?|t|m3|cum|m|meters?|%)\b',
      caseSensitive: false,
    ).firstMatch(clean);
    if (qtyMatch != null) {
      final val = double.parse(qtyMatch.group(1)!);
      var unit = qtyMatch.group(2)!.toLowerCase();
      if (unit.startsWith('tonne') || unit == 't') unit = 't';
      quantity = Quantity(value: val, unit: unit);
    }

    // 7. Extract Delay Reason
    String? delayReason;
    if (lower.contains('blocked due to') || lower.contains('delayed due to')) {
      final match = RegExp(
        r'(?:blocked|delayed)\s+due\s+to\s+([^.,;\n]+)',
        caseSensitive: false,
      ).firstMatch(clean);
      if (match != null) {
        delayReason = 'Blocked due to ${match.group(1)!.trim()}';
      }
    } else if (lower.contains('permit')) {
      delayReason = 'Permit delay';
    }

    // 8. Description & Keywords
    String description = clean;
    final keywords = <String>{};
    if (assetId != null) keywords.add(assetId.toLowerCase());
    if (discipline != null) keywords.add(discipline);
    if (workType != null) keywords.add(workType);
    if (lower.contains('hydrotest')) keywords.add('hydrotest');
    if (lower.contains('permit')) keywords.add('permit');
    if (lower.contains('erection')) keywords.add('erection');
    if (lower.contains('p-110')) keywords.add('p-110');
    if (lower.contains('pier')) keywords.add('pier');
    if (lower.contains('rebar')) keywords.add('rebar');

    // 9. Predict matching candidate against demo schedule
    String? suggestedId;
    String? suggestedName;
    double score = 0.50;
    String band = 'unmatched';

    if (assetId == 'PIER-P12' &&
        (workType == 'reinforcement' || lower.contains('rebar'))) {
      suggestedId = 'ACT-1.2.1';
      suggestedName = 'Pier P12 reinforcement fixing';
      score = 0.94;
      band = 'auto_suggest';
    } else if (assetId == 'PIER-P12' &&
        (workType == 'formwork' || lower.contains('formwork'))) {
      suggestedId = 'ACT-1.2.2';
      suggestedName = 'Pier P12 formwork installation';
      score = 0.92;
      band = 'auto_suggest';
    } else if (lower.contains('hydrotest') &&
        (lower.contains('p-110') || assetId == 'P-110')) {
      suggestedId = 'ACT-3.1.2';
      suggestedName = 'Hydrotest — Line 24 P-110';
      score = 0.86;
      band = 'review';
    } else if (lower.contains('p-110') ||
        lower.contains('line 24') ||
        assetId == 'P-110') {
      suggestedId = 'ACT-3.1.1';
      suggestedName = 'Line 24 P-110 equipment erection';
      score = 0.94;
      band = 'auto_suggest';
    } else if (assetId == 'STN-03' || lower.contains('electrical')) {
      suggestedId = 'ACT-2.1';
      suggestedName = 'Station electrical interface works';
      score = 0.88;
      band = 'review';
    }

    final facts = ExtractedFacts(
      eventType: eventType,
      assetId: assetId,
      discipline: discipline,
      workType: workType,
      location: location,
      quantity: quantity,
      delayReason: delayReason,
      keywords: keywords.toList(),
    );

    return ExtractionResult(
      rawTranscript: clean,
      description: description,
      eventType: eventType,
      facts: facts,
      suggestedActivityId: suggestedId,
      suggestedActivityName: suggestedName,
      confidenceScore: score,
      matchBand: band,
      observedTimestamp: eventTime,
    );
  }
}
