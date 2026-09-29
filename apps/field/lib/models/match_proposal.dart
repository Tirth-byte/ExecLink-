class SignalExplanation {
  final String signal;
  final double score;
  final double weight;
  final double contribution;
  final String explanation;
  final bool missing;

  const SignalExplanation({
    required this.signal,
    required this.score,
    required this.weight,
    required this.contribution,
    required this.explanation,
    this.missing = false,
  });

  factory SignalExplanation.fromJson(Map<String, dynamic> json) {
    return SignalExplanation(
      signal: json['signal'] as String? ?? '',
      score: (json['score'] as num?)?.toDouble() ?? 0.0,
      weight: (json['weight'] as num?)?.toDouble() ?? 0.0,
      contribution: (json['contribution'] as num?)?.toDouble() ?? 0.0,
      explanation: json['explanation'] as String? ?? '',
      missing: json['missing'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
    'signal': signal,
    'score': score,
    'weight': weight,
    'contribution': contribution,
    'explanation': explanation,
    'missing': missing,
  };
}

class MatchCandidate {
  final String activityId;
  final String activityWbs;
  final double score;
  final String band; // 'auto_suggest' | 'review' | 'unmatched'
  final List<SignalExplanation> explanation;

  const MatchCandidate({
    required this.activityId,
    required this.activityWbs,
    required this.score,
    required this.band,
    required this.explanation,
  });

  factory MatchCandidate.fromJson(Map<String, dynamic> json) {
    return MatchCandidate(
      activityId: json['activityId'] as String? ?? '',
      activityWbs: json['activityWbs'] as String? ?? '',
      score: (json['score'] as num?)?.toDouble() ?? 0.0,
      band: json['band'] as String? ?? 'review',
      explanation:
          (json['explanation'] as List<dynamic>?)
              ?.map(
                (e) => SignalExplanation.fromJson(e as Map<String, dynamic>),
              )
              .toList() ??
          const [],
    );
  }

  Map<String, dynamic> toJson() => {
    'activityId': activityId,
    'activityWbs': activityWbs,
    'score': score,
    'band': band,
    'explanation': explanation.map((e) => e.toJson()).toList(),
  };
}

class MatchProposal {
  final String id;
  final String projectId;
  final String executionEventId;
  final String snapshotId;
  final String engineVersion;
  final String configVersion;
  final String mode; // 'primary' | 'deterministic_fallback'
  final String status; // 'proposed' | 'verified' | 'rejected'
  final List<MatchCandidate> candidates;
  final String createdAt;

  const MatchProposal({
    required this.id,
    required this.projectId,
    required this.executionEventId,
    required this.snapshotId,
    required this.engineVersion,
    required this.configVersion,
    required this.mode,
    required this.status,
    required this.candidates,
    required this.createdAt,
  });

  factory MatchProposal.fromJson(Map<String, dynamic> json) {
    return MatchProposal(
      id: json['id'] as String? ?? '',
      projectId: json['projectId'] as String? ?? '',
      executionEventId: json['executionEventId'] as String? ?? '',
      snapshotId: json['snapshotId'] as String? ?? '',
      engineVersion: json['engineVersion'] as String? ?? '1.0.0',
      configVersion: json['configVersion'] as String? ?? '1.0.0',
      mode: json['mode'] as String? ?? 'deterministic_fallback',
      status: json['status'] as String? ?? 'proposed',
      candidates:
          (json['candidates'] as List<dynamic>?)
              ?.map((e) => MatchCandidate.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      createdAt: json['createdAt'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'projectId': projectId,
    'executionEventId': executionEventId,
    'snapshotId': snapshotId,
    'engineVersion': engineVersion,
    'configVersion': configVersion,
    'mode': mode,
    'status': status,
    'candidates': candidates.map((e) => e.toJson()).toList(),
    'createdAt': createdAt,
  };
}
