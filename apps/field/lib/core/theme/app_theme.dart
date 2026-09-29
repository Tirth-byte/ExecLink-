import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'app_colors.dart';
import 'app_typography.dart';

/// Normalized Corner Radii for ExecLink Mobile
abstract class FieldRadius {
  FieldRadius._();

  static const double card = 12.0;
  static const double input = 10.0;
  static const double control = 8.0;
  static const double small = 6.0;
  static const double badge = 4.0;
  static const double sheet = 16.0;
  static const double pill = 999.0;
}

typedef AppRadius = FieldRadius;

/// 4/8 Spacing Philosophy Constants
abstract class FieldSpacing {
  FieldSpacing._();

  static const double xs = 4.0;
  static const double sm = 8.0;
  static const double md = 12.0;
  static const double lg = 16.0;
  static const double xl = 20.0;
  static const double xxl = 24.0;
  static const double section = 28.0;
  static const double screen = 16.0;
}

typedef AppSpacing = FieldSpacing;

/// Subtle, Restrained Microinteraction Timings
abstract class FieldMotion {
  FieldMotion._();

  static const Duration instant = Duration(milliseconds: 100);
  static const Duration quick = Duration(milliseconds: 120);
  static const Duration standard = Duration(milliseconds: 160);
}

typedef AppMotion = FieldMotion;

class FieldTheme {
  FieldTheme._();

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: FieldColors.canvas,
      colorScheme: const ColorScheme(
        brightness: Brightness.light,
        primary: FieldColors.action,
        onPrimary: FieldColors.surface,
        secondary: FieldColors.actionHover,
        onSecondary: FieldColors.surface,
        surface: FieldColors.surface,
        onSurface: FieldColors.text,
        error: FieldColors.danger,
        onError: FieldColors.surface,
      ),
      fontFamily: FieldTypography.fontFamily,
      appBarTheme: const AppBarTheme(
        backgroundColor: FieldColors.surface,
        foregroundColor: FieldColors.text,
        elevation: 0,
        centerTitle: false,
        scrolledUnderElevation: 0.5,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: FieldTypography.cardTitle,
        systemOverlayStyle: SystemUiOverlayStyle.dark,
      ),
      cardTheme: CardThemeData(
        color: FieldColors.surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(FieldRadius.card),
          side: const BorderSide(color: FieldColors.border, width: 1),
        ),
        margin: EdgeInsets.zero,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: FieldColors.action,
          foregroundColor: FieldColors.surface,
          minimumSize: const Size(88, 48),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(FieldRadius.input),
          ),
          textStyle: FieldTypography.button,
          elevation: 0,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: FieldColors.text,
          side: const BorderSide(color: FieldColors.border, width: 1),
          minimumSize: const Size(88, 48),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(FieldRadius.input),
          ),
          textStyle: FieldTypography.button,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: FieldColors.surface,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 14,
          vertical: 13,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(FieldRadius.input),
          borderSide: const BorderSide(color: FieldColors.border, width: 1),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(FieldRadius.input),
          borderSide: const BorderSide(color: FieldColors.border, width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(FieldRadius.input),
          borderSide: const BorderSide(color: FieldColors.focus, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(FieldRadius.input),
          borderSide: const BorderSide(color: FieldColors.danger, width: 1),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(FieldRadius.input),
          borderSide: const BorderSide(color: FieldColors.danger, width: 1.5),
        ),
        labelStyle: FieldTypography.metadata,
        hintStyle: FieldTypography.metadata.copyWith(
          color: FieldColors.textMuted,
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: FieldColors.borderSubtle,
        thickness: 1,
        space: 1,
      ),
      chipTheme: ChipThemeData(
        backgroundColor: FieldColors.surface,
        selectedColor: FieldColors.brand50,
        disabledColor: FieldColors.surfaceMuted,
        side: const BorderSide(color: FieldColors.border),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(FieldRadius.control),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        labelStyle: FieldTypography.bodySmBold,
        secondaryLabelStyle: FieldTypography.bodySmBold.copyWith(
          color: FieldColors.action,
        ),
        showCheckmark: false,
      ),
    );
  }
}

typedef AppTheme = FieldTheme;
