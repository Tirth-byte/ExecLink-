import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';

class ExecLinkLogo extends StatelessWidget {
  final double size;
  const ExecLinkLogo({super.key, this.size = 28});

  @override
  Widget build(BuildContext context) {
    return CustomPaint(size: Size(size, size), painter: _LogoPainter());
  }
}

class _LogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.action
      ..style = PaintingStyle.fill;

    final strokePaint = Paint()
      ..color = AppColors.action
      ..style = PaintingStyle.stroke
      ..strokeWidth = size.width * 0.085
      ..strokeCap = StrokeCap.round;

    final double w = size.width;
    final double h = size.height;

    // Nodes
    canvas.drawCircle(Offset(w * 0.2, h * 0.5), w * 0.1, paint);
    canvas.drawCircle(Offset(w * 0.8, h * 0.25), w * 0.1, paint);
    canvas.drawCircle(Offset(w * 0.8, h * 0.75), w * 0.1, paint);

    // Paths
    canvas.drawLine(
      Offset(w * 0.3, h * 0.5),
      Offset(w * 0.46, h * 0.5),
      strokePaint,
    );
    canvas.drawLine(
      Offset(w * 0.5, h * 0.5),
      Offset(w * 0.71, h * 0.3),
      strokePaint,
    );
    canvas.drawLine(
      Offset(w * 0.5, h * 0.5),
      Offset(w * 0.71, h * 0.7),
      strokePaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
