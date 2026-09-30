import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:execlink_field/core/theme/app_theme.dart';
import 'package:execlink_field/models/common_types.dart';
import 'package:execlink_field/models/execution_event.dart';
import 'package:execlink_field/models/extracted_facts.dart';
import 'package:execlink_field/providers/auth_provider.dart';
import 'package:execlink_field/providers/field_providers.dart';
import 'package:execlink_field/services/api_client.dart';
import 'package:execlink_field/services/offline_sync_service.dart';
import 'package:execlink_field/views/capture/capture_hub_view.dart';
import 'package:execlink_field/views/history/history_view.dart';
import 'package:execlink_field/views/quick_update/quick_update_view.dart';
import 'package:execlink_field/views/time_agent/time_agent_view.dart';
import 'package:execlink_field/views/today/today_view.dart';

void main() {
  const targetWidths = [320.0, 375.0, 390.0, 393.0, 430.0];

  Widget buildTestApp(Widget child, {ProviderContainer? container, double textScale = 1.0}) {
    final app = MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: FieldTheme.lightTheme,
      home: MediaQuery(
        data: MediaQueryData(
          textScaler: TextScaler.linear(textScale),
        ),
        child: child,
      ),
    );

    if (container != null) {
      return UncontrolledProviderScope(container: container, child: app);
    }

    final localApi = ApiClient(useLocalFallback: true);
    final localSync = OfflineSyncService(apiClient: localApi);
    return ProviderScope(
      overrides: [
        apiClientProvider.overrideWithValue(localApi),
        offlineSyncServiceProvider.overrideWith((ref) => localSync),
      ],
      child: app,
    );
  }

  group('Mobile UI Responsive Layout & Overflow Audit', () {
    setUp(() {
      SharedPreferences.setMockInitialValues({});
    });

    for (final width in targetWidths) {
      testWidgets('TimeAgentView has zero overflow at ${width.toInt()}px width', (
        tester,
      ) async {
        tester.view.physicalSize = Size(width, 844);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(() => tester.view.resetPhysicalSize());

        final localApi = ApiClient(useLocalFallback: true);
        final localSync = OfflineSyncService(apiClient: localApi);
        final container = ProviderContainer(
          overrides: [
            apiClientProvider.overrideWithValue(localApi),
            offlineSyncServiceProvider.overrideWith((ref) => localSync),
          ],
        );
        addTearDown(container.dispose);
        container.read(timeAgentProvider).setTranscript(
          'Line 24 P-110 equipment erection completed. Hydrotest delayed due to permit.',
        );

        await tester.pumpWidget(buildTestApp(const TimeAgentView(), container: container));
        await tester.pump();

        // Scroll down to render and test all lazy ListView children for overflow
        await tester.drag(find.byType(ListView), const Offset(0, -400));
        await tester.pump();

        // Verify zero overflow in full structured preview & edit state
        expect(tester.takeException(), isNull);
        expect(find.text('STRUCTURED PREVIEW & EDIT'), findsOneWidget);
        expect(find.text('EVENT STATUS ACTION'), findsOneWidget);
      });

      testWidgets('CaptureHubView has zero overflow at ${width.toInt()}px width', (
        tester,
      ) async {
        tester.view.physicalSize = Size(width, 844);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(() => tester.view.resetPhysicalSize());

        final localApi = ApiClient(useLocalFallback: true);
        final localSync = OfflineSyncService(apiClient: localApi);
        final container = ProviderContainer(
          overrides: [
            apiClientProvider.overrideWithValue(localApi),
            offlineSyncServiceProvider.overrideWith((ref) => localSync),
          ],
        );
        addTearDown(container.dispose);

        await tester.pumpWidget(buildTestApp(const CaptureHubView(), container: container));
        await tester.pump();

        expect(tester.takeException(), isNull);
        expect(find.text('Field Capture'), findsOneWidget);
        expect(find.text('Time Agent'), findsOneWidget);
        expect(find.text('Quick Update'), findsOneWidget);
      });

      testWidgets('QuickUpdateView has zero overflow at ${width.toInt()}px width', (
        tester,
      ) async {
        tester.view.physicalSize = Size(width, 844);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(() => tester.view.resetPhysicalSize());

        final localApi = ApiClient(useLocalFallback: true);
        final localSync = OfflineSyncService(apiClient: localApi);
        final container = ProviderContainer(
          overrides: [
            apiClientProvider.overrideWithValue(localApi),
            offlineSyncServiceProvider.overrideWith((ref) => localSync),
          ],
        );
        addTearDown(container.dispose);

        await tester.pumpWidget(buildTestApp(const QuickUpdateView(), container: container));
        await tester.pump();

        expect(tester.takeException(), isNull);
        expect(find.text('Quick Update'), findsOneWidget);
        expect(find.text('ONE-TOUCH FIELD STATUS'), findsOneWidget);
        expect(find.text('SELECT RELEVANT ACTIVITY'), findsOneWidget);
      });

      testWidgets('TodayView has zero overflow at ${width.toInt()}px width', (
        tester,
      ) async {
        tester.view.physicalSize = Size(width, 844);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(() => tester.view.resetPhysicalSize());

        final localApi = ApiClient(useLocalFallback: true);
        final localSync = OfflineSyncService(apiClient: localApi);
        final container = ProviderContainer(
          overrides: [
            apiClientProvider.overrideWithValue(localApi),
            offlineSyncServiceProvider.overrideWith((ref) => localSync),
          ],
        );
        addTearDown(container.dispose);

        await tester.pumpWidget(buildTestApp(const Scaffold(body: TodayView()), container: container));
        await tester.pump();

        expect(tester.takeException(), isNull);
        expect(find.text("Today's Work"), findsOneWidget);
      });

      testWidgets('HistoryView has zero overflow at ${width.toInt()}px width', (
        tester,
      ) async {
        tester.view.physicalSize = Size(width, 844);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(() => tester.view.resetPhysicalSize());

        final localApi = ApiClient(useLocalFallback: true);
        final localSync = OfflineSyncService(apiClient: localApi);
        final container = ProviderContainer(
          overrides: [
            apiClientProvider.overrideWithValue(localApi),
            offlineSyncServiceProvider.overrideWith((ref) => localSync),
          ],
        );
        addTearDown(container.dispose);

        await tester.pumpWidget(buildTestApp(const HistoryView(), container: container));
        await tester.pump();

        expect(tester.takeException(), isNull);
        expect(find.text('Capture History'), findsOneWidget);
      });
    }

    testWidgets('History detail bottom sheet displays human-readable metadata & zero overflow', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(375, 812);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      final mockEvent = ExecutionEvent(
        id: 'EVT-TEST-001',
        projectId: 'PRJ-DEMO-001',
        reporterId: 'USR-SUP-001',
        observedAt: '2026-09-28T10:35:00Z',
        receivedAt: '2026-09-28T10:35:05Z',
        evidence: const Evidence(
          text: 'Fixed 3 tonnes of rebar at Pier P12, chainage 12+410 to 12+425.',
        ),
        extractedFacts: const ExtractedFacts(
          eventType: 'completed',
          assetId: 'PIER-P12',
          discipline: 'structural',
          workType: 'rebar-fixing',
          quantity: Quantity(value: 3.0, unit: 't'),
          location: LocationInterval(alignment: 'Mainline', start: 12410, end: 12425),
        ),
        status: 'submitted',
        clientEventId: 'EVT-CLIENT-001',
        syncStatus: SyncStatus.synced,
      );

      final localApi = ApiClient(useLocalFallback: true);
      final localSync = OfflineSyncService(apiClient: localApi);
      final container = ProviderContainer(
        overrides: [
          apiClientProvider.overrideWithValue(localApi),
          offlineSyncServiceProvider.overrideWith((ref) => localSync),
          authProvider.overrideWith(() => _MockReadyAuthNotifier()),
        ],
      );
      addTearDown(container.dispose);
      await container.read(eventsProvider).submitEvent(mockEvent);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            theme: FieldTheme.lightTheme,
            home: const HistoryView(),
          ),
        ),
      );
      await tester.pump();

      // Tap card to open modal detail sheet
      expect(find.text('Capture History'), findsOneWidget);
      await tester.tap(find.text('EVT-TEST-001'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      await tester.pump(const Duration(milliseconds: 300));

      expect(tester.takeException(), isNull);
      // Verify human-readable metadata formatting
      expect(find.text('Asha Rao (Field Supervisor)'), findsOneWidget);
      expect(find.text('Observed'), findsOneWidget);
      expect(find.text('EVIDENCE / FIELD NOTE'), findsOneWidget);
      expect(find.text('EXTRACTED FACTS'), findsOneWidget);
    });

    testWidgets('TimeAgentView handles 1.2x text scaling without layout crash', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(375, 812);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      final localApi = ApiClient(useLocalFallback: true);
      final localSync = OfflineSyncService(apiClient: localApi);
      final container = ProviderContainer(
        overrides: [
          apiClientProvider.overrideWithValue(localApi),
          offlineSyncServiceProvider.overrideWith((ref) => localSync),
        ],
      );
      addTearDown(container.dispose);

      await tester.pumpWidget(buildTestApp(const TimeAgentView(), container: container, textScale: 1.2));
      await tester.pump();

      expect(tester.takeException(), isNull);
    });
  });
}

class _MockReadyAuthNotifier extends AuthNotifier {
  @override
  AuthState build() => AuthState(isInitializing: false);
}
