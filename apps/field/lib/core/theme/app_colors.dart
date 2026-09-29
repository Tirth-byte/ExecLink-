import 'package:flutter/material.dart';

/// Canonical ExecLink Field Color Architecture.
///
/// Principles:
/// - 80–90% neutral foundation (canvas, crisp white surfaces, navy/slate text, neutral borders)
/// - ONE cohesive Brand Blue-Teal family (no royal blue, cyan fragmentation, or random blues)
/// - Semantic colors are NOT branding (Green = verified/completed, Amber = review/delay, Red = blocked/unmatched)
/// - AI Confidence is BRAND BLUE/TEAL, NEVER GREEN (confidence is not planner verification)
abstract class FieldColors {
  FieldColors._();

  // ---------------------------------------------------------------------------
  // A. NEUTRAL FOUNDATION
  // ---------------------------------------------------------------------------
  /// Neutral app canvas
  static const Color canvas = Color(0xFFF5F7F8);

  /// Primary surface (cards, sheets, modals, app bar)
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceElevated = Color(0xFFFFFFFF);

  /// Secondary subtle surface (nested containers, inactive controls)
  static const Color surfaceMuted = Color(0xFFF8FAFB);

  /// Raised/interactive neutral surface (segmented tracks, chips)
  static const Color surfaceRaised = Color(0xFFF2F6F8);

  /// Primary text (Deep Navy - never pure black)
  static const Color text = Color(0xFF102A43);

  /// Secondary text (Slate navy for labels, descriptions)
  static const Color textSecondary = Color(0xFF58718A);

  /// Muted text (Timestamps, placeholders, inactive icons)
  static const Color textMuted = Color(0xFF7D91A5);

  /// Tertiary subtle text
  static const Color textTertiary = Color(0xFF9FB3C8);

  /// Primary neutral border (cards, inputs, dividers)
  static const Color border = Color(0xFFD8E2EA);

  /// Subtle divider / secondary border
  static const Color borderSubtle = Color(0xFFE7EDF2);
  static const Color borderLight = Color(0xFFE7EDF2);

  // ---------------------------------------------------------------------------
  // B. EXEC LINK BRAND FAMILY (Blue-Teal)
  // ---------------------------------------------------------------------------
  static const Color brand700 = Color(0xFF086F8F);
  static const Color brand600 = Color(0xFF087EA4);
  static const Color brand500 = Color(0xFF1596B8);
  static const Color brand100 = Color(0xFFDFF3F8);
  static const Color brand50 = Color(0xFFEFF9FB);

  /// Primary interactive action color
  static const Color action = brand700;
  static const Color actionHover = brand600;
  static const Color focus = brand600;

  /// Soft brand background for active states, selected filters, badge fills
  static const Color actionBg = brand50;
  static const Color actionBorder = brand100;

  /// Brand/In-progress semantic identity (consolidated with brand family)
  static const Color info = brand700;
  static const Color infoBg = brand50;
  static const Color infoBorder = brand100;

  // ---------------------------------------------------------------------------
  // C. SEMANTIC COLORS (Strict Semantic Discipline)
  // ---------------------------------------------------------------------------
  // SUCCESS / VERIFIED / COMPLETED (Dark green text/icon, soft bg, subtle border)
  static const Color success = Color(0xFF15803D);
  static const Color successBg = Color(0xFFF0FDF4);
  static const Color successBorder = Color(0xFFBBF7D0);

  // WARNING / REVIEW / DELAY (Dark amber, soft warm cream, subtle border)
  static const Color warning = Color(0xFFB45309);
  static const Color warningBg = Color(0xFFFFFBEB);
  static const Color warningBorder = Color(0xFFFDE68A);

  // DANGER / BLOCKED / UNMATCHED (Dark red, very soft red bg, subtle border)
  static const Color danger = Color(0xFFB91C1C);
  static const Color dangerBg = Color(0xFFFEF2F2);
  static const Color dangerBorder = Color(0xFFFECACA);
  static const Color critical = danger;
  static const Color criticalBg = dangerBg;
  static const Color criticalBorder = dangerBorder;

  // ---------------------------------------------------------------------------
  // D. AI MATCH CONFIDENCE (Never green — uses brand blue/teal)
  // ---------------------------------------------------------------------------
  static const Color confidenceHigh = brand700;
  static const Color confidenceHighBg = brand50;
  static const Color confidenceHighBorder = brand100;

  static const Color confidenceReview = warning;
  static const Color confidenceReviewBg = warningBg;
  static const Color confidenceReviewBorder = warningBorder;

  static const Color confidenceUnmatched = danger;
  static const Color confidenceUnmatchedBg = dangerBg;
  static const Color confidenceUnmatchedBorder = dangerBorder;
}

/// Backward-compatible alias for FieldColors
typedef AppColors = FieldColors;
