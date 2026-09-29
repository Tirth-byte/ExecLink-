import 'package:flutter/material.dart';

import 'app_colors.dart';

/// Normalized Canonical Typography for ExecLink Field.
///
/// Principles:
/// - Single font family ('Inter' for UI, 'IBM Plex Mono' for codes/IDs)
/// - Deep navy primary text (never pure black)
/// - Normalized scales:
///   * Page / Display: 28 (w700, -0.5 tracking)
///   * Section: 20 (w700, -0.3 tracking)
///   * Activity / Card Title: 16.5 (w600, -0.2 tracking)
///   * Body: 15 (w400 / w500 / w600)
///   * Metadata: 13 (w400 / w500, secondary text)
///   * Status / Badges: 11–12 (w600 / w700)
///   * Button: 15 (w600)
abstract class FieldTypography {
  FieldTypography._();

  static const String fontFamily = 'Inter';
  static const String monoFamily = 'IBM Plex Mono';

  // Primary Hierarchy
  static const TextStyle pageTitle = TextStyle(
    fontFamily: fontFamily,
    fontSize: 28,
    fontWeight: FontWeight.w700,
    color: FieldColors.text,
    letterSpacing: -0.5,
    height: 1.25,
  );

  static const TextStyle sectionTitle = TextStyle(
    fontFamily: fontFamily,
    fontSize: 20,
    fontWeight: FontWeight.w700,
    color: FieldColors.text,
    letterSpacing: -0.3,
    height: 1.3,
  );

  static const TextStyle cardTitle = TextStyle(
    fontFamily: fontFamily,
    fontSize: 16.5,
    fontWeight: FontWeight.w600,
    color: FieldColors.text,
    letterSpacing: -0.2,
    height: 1.35,
  );

  static const TextStyle body = TextStyle(
    fontFamily: fontFamily,
    fontSize: 15,
    fontWeight: FontWeight.w400,
    color: FieldColors.text,
    height: 1.45,
  );

  static const TextStyle bodyMedium = TextStyle(
    fontFamily: fontFamily,
    fontSize: 15,
    fontWeight: FontWeight.w500,
    color: FieldColors.text,
    height: 1.45,
  );

  static const TextStyle bodyBold = TextStyle(
    fontFamily: fontFamily,
    fontSize: 15,
    fontWeight: FontWeight.w600,
    color: FieldColors.text,
    height: 1.45,
  );

  static const TextStyle button = TextStyle(
    fontFamily: fontFamily,
    fontSize: 15,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.2,
    height: 1.25,
  );

  static const TextStyle metadata = TextStyle(
    fontFamily: fontFamily,
    fontSize: 13,
    fontWeight: FontWeight.w400,
    color: FieldColors.textSecondary,
    height: 1.35,
  );

  static const TextStyle metadataMedium = TextStyle(
    fontFamily: fontFamily,
    fontSize: 13,
    fontWeight: FontWeight.w500,
    color: FieldColors.textSecondary,
    height: 1.35,
  );

  static const TextStyle statusText = TextStyle(
    fontFamily: fontFamily,
    fontSize: 11.5,
    fontWeight: FontWeight.w700,
    letterSpacing: 0.3,
    height: 1.2,
  );

  static const TextStyle mono = TextStyle(
    fontFamily: monoFamily,
    fontSize: 12,
    fontWeight: FontWeight.w500,
    color: FieldColors.text,
    letterSpacing: -0.2,
  );

  // Backward-compatible tokens mapped to the canonical scale
  static const TextStyle titleXl = pageTitle;
  static const TextStyle titleLg = sectionTitle;
  static const TextStyle bodyMd = body;
  static const TextStyle bodyMdBold = bodyBold;
  static const TextStyle bodySm = metadata;
  static const TextStyle bodySmBold = TextStyle(
    fontFamily: fontFamily,
    fontSize: 12.5,
    fontWeight: FontWeight.w600,
    color: FieldColors.text,
    height: 1.35,
  );
  static const TextStyle monoSm = mono;
}

/// Backward-compatible alias for FieldTypography
typedef AppTypography = FieldTypography;
