import 'package:flutter/material.dart';

import '../core/constants/project_context.dart';
import '../core/theme/app_colors.dart';
import 'field_top_bar.dart';
import 'field_bottom_navigation.dart';

class FieldAppShell extends StatefulWidget {
  final Widget child;
  final int currentIndex;
  final ValueChanged<int> onTabSelected;
  final String title;
  final String projectName;
  final String projectId;
  final String operatorName;
  final String operatorRole;
  final String reportingScope;
  final String shift;
  final VoidCallback? onLogout;

  const FieldAppShell({
    super.key,
    required this.child,
    required this.currentIndex,
    required this.onTabSelected,
    this.title = 'ExecLink Field',
    this.projectName = ProjectContext.defaultProjectName,
    this.projectId = ProjectContext.defaultProjectId,
    this.operatorName = ProjectContext.defaultOperatorName,
    this.operatorRole = ProjectContext.defaultOperatorRole,
    this.reportingScope = ProjectContext.defaultReportingScope,
    this.shift = ProjectContext.defaultShift,
    this.onLogout,
  });

  @override
  State<FieldAppShell> createState() => _FieldAppShellState();
}

class _FieldAppShellState extends State<FieldAppShell>
    with SingleTickerProviderStateMixin {
  late AnimationController _transitionController;

  @override
  void initState() {
    super.initState();
    _transitionController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
      value: 1.0,
    );
  }

  @override
  void didUpdateWidget(FieldAppShell oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.currentIndex != widget.currentIndex) {
      _transitionController.forward(from: 0.0);
    }
  }

  @override
  void dispose() {
    _transitionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.translucent,
      onTap: () {
        FocusManager.instance.primaryFocus?.unfocus();
      },
      child: Scaffold(
        backgroundColor: AppColors.canvas,
        extendBody: true, // Enables true floating nav by injecting bottom padding to body
        appBar: FieldTopBar(
          title: widget.title,
          projectName: widget.projectName,
          projectId: widget.projectId,
          operatorName: widget.operatorName,
          operatorRole: widget.operatorRole,
          reportingScope: widget.reportingScope,
          shift: widget.shift,
          onLogout: widget.onLogout,
        ),
        body: FadeTransition(
          opacity: _transitionController,
          child: AnimatedBuilder(
            animation: _transitionController,
            builder: (context, childWidget) {
              final slide = 6.0 * (1.0 - _transitionController.value);
              return Transform.translate(
                offset: Offset(0.0, slide),
                child: childWidget,
              );
            },
            child: widget.child,
          ),
        ),
        bottomNavigationBar: FieldBottomNavigation(
          currentIndex: widget.currentIndex,
          onTap: widget.onTabSelected,
        ),
      ),
    );
  }
}
