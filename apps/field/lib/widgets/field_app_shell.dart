import 'package:flutter/material.dart';

import '../core/constants/project_context.dart';
import '../core/theme/app_colors.dart';
import 'field_top_bar.dart';
import 'field_bottom_navigation.dart';

class FieldAppShell extends StatelessWidget {
  final Widget child;
  final int currentIndex;
  final ValueChanged<int> onTabSelected;
  final String title;
  final String projectName;
  final String projectId;
  final String operatorName;

  const FieldAppShell({
    super.key,
    required this.child,
    required this.currentIndex,
    required this.onTabSelected,
    this.title = 'ExecLink Field',
    this.projectName = ProjectContext.defaultProjectName,
    this.projectId = ProjectContext.defaultProjectId,
    this.operatorName = ProjectContext.defaultOperatorName,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      // Global tap-outside dismisses keyboard cleanly
      behavior: HitTestBehavior.translucent,
      onTap: () {
        FocusManager.instance.primaryFocus?.unfocus();
      },
      child: Scaffold(
        backgroundColor: AppColors.canvas,
        appBar: FieldTopBar(
          title: title,
          projectName: projectName,
          projectId: projectId,
          operatorName: operatorName,
        ),
        body: child,
        bottomNavigationBar: FieldBottomNavigation(
          currentIndex: currentIndex,
          onTap: onTabSelected,
        ),
      ),
    );
  }
}
