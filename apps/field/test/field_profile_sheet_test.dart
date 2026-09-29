import 'package:execlink_field/widgets/field_profile_sheet.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _host({
  required String projectId,
  required String projectName,
  required String reportingScope,
  VoidCallback? onSignOut,
}) {
  return MaterialApp(
    debugShowCheckedModeBanner: false,
    home: Scaffold(
      body: Builder(
        builder: (context) => Center(
          child: ElevatedButton(
            onPressed: () => FieldProfileSheet.show(
              context: context,
              operatorName: 'Asha Rao',
              operatorRole: 'Civil Field Supervisor',
              projectName: projectName,
              projectId: projectId,
              reportingScope: reportingScope,
              onSignOut: onSignOut ?? () {},
            ),
            child: const Text('open'),
          ),
        ),
      ),
    ),
  );
}

void main() {
  const longName =
      'North River Inter-Basin Water Diversion Corridor Phase Two Works';
  const longScope =
      'Area B · Civil, Structural, Marine & Offshore Substructure Disciplines';

  for (final size in const [Size(320, 568), Size(393, 852), Size(430, 932)]) {
    final w = size.width.toInt();

    testWidgets('Profile sheet has no overflow at ${w}px', (tester) async {
      tester.view.physicalSize = size;
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(
        _host(
          projectId: 'PRJ-DEMO-001',
          projectName: longName,
          reportingScope: longScope,
        ),
      );

      await tester.tap(find.text('open'));
      await tester.pumpAndSettle();

      expect(find.text('Asha Rao'), findsOneWidget);
      expect(find.text('Civil Field Supervisor'), findsOneWidget);
      expect(find.text('Close'), findsOneWidget);
      expect(find.text('Sign Out'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('Project ID renders the authenticated membership ID', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(393, 852);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      _host(
        projectId: 'PRJ-DEMO-001',
        projectName: 'North River Expansion',
        reportingScope: 'Area B · Civil & Structural',
      ),
    );

    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();

    expect(find.text('Project ID'), findsOneWidget);
    expect(find.text('PRJ-DEMO-001'), findsOneWidget);
    expect(find.text('North River Expansion'), findsOneWidget);
    expect(find.text('Area B · Civil & Structural'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Identity line is shortened to Project · Area', (tester) async {
    tester.view.physicalSize = const Size(393, 852);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      _host(
        projectId: 'PRJ-DEMO-001',
        projectName: 'North River Expansion',
        reportingScope: 'Area B · Civil & Structural',
      ),
    );

    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();

    // Full scope must not be crammed into the identity line.
    expect(find.text('North River Expansion · Area B'), findsOneWidget);
    expect(
      find.text('North River Expansion · Area B · Civil & Structural'),
      findsNothing,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('Assignment labels and values share one left edge', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(393, 852);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      _host(
        projectId: 'PRJ-DEMO-001',
        projectName: 'North River Expansion',
        reportingScope: 'Area B · Civil & Structural',
      ),
    );

    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();

    const pairs = {
      'Project': 'North River Expansion',
      'Project ID': 'PRJ-DEMO-001',
      'Reporting scope': 'Area B · Civil & Structural',
      'Current shift': 'Day Shift',
    };

    for (final entry in pairs.entries) {
      final labelX = tester.getTopLeft(find.text(entry.key)).dx;
      final valueX = tester.getTopLeft(find.text(entry.value)).dx;
      expect(
        valueX,
        closeTo(labelX, 0.5),
        reason: '"${entry.value}" does not share the left edge of its label',
      );
    }

    // Every label sits on the same grid line.
    final labelXs = pairs.keys
        .map((k) => tester.getTopLeft(find.text(k)).dx)
        .toSet();
    expect(labelXs.length, 1, reason: 'labels not on one left edge');

    // Values are explicitly left aligned, never centred.
    for (final value in pairs.values) {
      final text = tester.widget<Text>(find.text(value));
      expect(
        text.textAlign,
        TextAlign.left,
        reason: '"$value" is not left aligned',
      );
    }
  });

  testWidgets('Assignment card, lineage card and actions share one grid', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(393, 852);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      _host(
        projectId: 'PRJ-DEMO-001',
        projectName: 'North River Expansion',
        reportingScope: 'Area B · Civil & Structural',
      ),
    );

    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();

    final buttons = find.byType(OutlinedButton);
    expect(buttons, findsNWidgets(2));

    final close = tester.getSize(buttons.at(0));
    final signOut = tester.getSize(buttons.at(1));

    // Same height, same width, same radius source.
    expect(close.height, signOut.height);
    expect(close.width, closeTo(signOut.width, 0.5));

    // Both cards and the button row start and end on the same content grid.
    final lineageLeft = tester.getTopLeft(find.text('Controls lineage')).dx;
    final valueLeft = tester.getTopLeft(find.text('PRJ-DEMO-001')).dx;
    expect(valueLeft, closeTo(lineageLeft, 22), reason: 'grid drift');

    final lineageRight = tester
        .getBottomRight(find.text('Controls lineage'))
        .dx;
    final sheetRight = tester.getSize(find.byType(FieldProfileSheet)).width;
    expect(lineageRight, lessThan(sheetRight));

    expect(tester.takeException(), isNull);
  });

  testWidgets('Controls lineage is presented as a restrained trust row', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(393, 852);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      _host(
        projectId: 'PRJ-DEMO-001',
        projectName: 'North River Expansion',
        reportingScope: 'Area B · Civil & Structural',
      ),
    );

    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();

    expect(find.text('Controls lineage'), findsOneWidget);
    expect(find.text('Verified by Lead Planner (T. Patel)'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Sign Out requires confirmation and can be cancelled', (
    tester,
  ) async {
    var signedOut = false;
    tester.view.physicalSize = const Size(393, 852);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      _host(
        projectId: 'PRJ-DEMO-001',
        projectName: 'North River Expansion',
        reportingScope: 'Area B · Civil & Structural',
        onSignOut: () => signedOut = true,
      ),
    );

    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Sign Out'));
    await tester.pumpAndSettle();

    expect(find.text('Sign out of ExecLink?'), findsOneWidget);
    expect(
      find.text('Any safely queued field updates remain on this device.'),
      findsOneWidget,
    );
    expect(signedOut, isFalse);

    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();

    expect(find.text('Sign out of ExecLink?'), findsNothing);
    expect(signedOut, isFalse);
  });

  testWidgets('Confirming sign out invokes the supplied logout', (
    tester,
  ) async {
    var signedOut = false;
    tester.view.physicalSize = const Size(393, 852);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      _host(
        projectId: 'PRJ-DEMO-001',
        projectName: 'North River Expansion',
        reportingScope: 'Area B · Civil & Structural',
        onSignOut: () => signedOut = true,
      ),
    );

    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Sign Out'));
    await tester.pumpAndSettle();
    expect(signedOut, isFalse);

    await tester.tap(find.widgetWithText(TextButton, 'Sign Out'));
    await tester.pumpAndSettle();

    expect(signedOut, isTrue);
    expect(find.text('Sign out of ExecLink?'), findsNothing);
    expect(find.text('Assignment'), findsNothing);
  });
}
