import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';
import '../core/theme/app_typography.dart';
import '../models/match_proposal.dart';

class ConfidenceBadge extends StatelessWidget {
  final double score;
  final String band;
  final bool isCompact;

  const ConfidenceBadge({
    super.key,
    required this.score,
    required this.band,
    this.isCompact = false,
  });

  @override
  Widget build(BuildContext context) {
    final Color bg;
    final Color fg;
    final Color borderColor;
    final String label;
    final IconData icon;

    final pct = (score * 100).toStringAsFixed(0);

    if (band == 'auto_suggest' || score >= 0.90) {
      // AI Confidence uses Brand Blue-Teal, NEVER Green
      bg = FieldColors.confidenceHighBg;
      fg = FieldColors.confidenceHigh;
      borderColor = FieldColors.confidenceHighBorder;
      label = isCompact ? '$pct% match' : '$pct% match confidence';
      icon = Icons.auto_awesome_rounded;
    } else if (band == 'review' || score >= 0.70) {
      bg = FieldColors.confidenceReviewBg;
      fg = FieldColors.confidenceReview;
      borderColor = FieldColors.confidenceReviewBorder;
      label = isCompact ? '$pct% review' : '$pct% review confidence';
      icon = Icons.visibility_outlined;
    } else {
      bg = FieldColors.confidenceUnmatchedBg;
      fg = FieldColors.confidenceUnmatched;
      borderColor = FieldColors.confidenceUnmatchedBorder;
      label = isCompact ? 'Unmatched' : 'Unmatched · $pct%';
      icon = Icons.help_outline_rounded;
    }

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: isCompact ? 6 : 7,
        vertical: isCompact ? 2 : 2.5,
      ),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: borderColor, width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: isCompact ? 11 : 12, color: fg),
          const SizedBox(width: 4),
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: FieldTypography.monoSm.copyWith(
                fontSize: isCompact ? 9.5 : 10,
                fontWeight: FontWeight.w600,
                color: fg,
                letterSpacing: 0.1,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class SignalBreakdownWidget extends StatelessWidget {
  final List<SignalExplanation> signals;

  const SignalBreakdownWidget({super.key, required this.signals});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'EXPLAINABLE MATCH SIGNALS',
          style: FieldTypography.statusText.copyWith(
            fontSize: 10.5,
            letterSpacing: 0.5,
            color: FieldColors.textMuted,
          ),
        ),
        const SizedBox(height: 8),
        ...signals.map((sig) {
          final isHigh = sig.score >= 0.8;
          final isZero = sig.score == 0.0 || sig.missing;
          final color = isZero
              ? FieldColors.textMuted
              : isHigh
              ? FieldColors.action
              : FieldColors.warning;

          return Padding(
            padding: const EdgeInsets.only(bottom: 6.0),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 82,
                  child: Text(
                    sig.signal.toUpperCase(),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: FieldTypography.monoSm.copyWith(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: color,
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    sig.explanation,
                    style: FieldTypography.bodySm.copyWith(
                      fontSize: 12,
                      color: FieldColors.text,
                      height: 1.3,
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  '+${(sig.contribution * 100).toStringAsFixed(1)}%',
                  style: FieldTypography.monoSm.copyWith(
                    fontSize: 10.5,
                    color: color,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }
}
