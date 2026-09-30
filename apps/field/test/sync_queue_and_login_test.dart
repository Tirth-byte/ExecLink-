import 'dart:convert';
import 'dart:io';

import 'package:execlink_field/core/config/api_config.dart';
import 'package:execlink_field/models/common_types.dart';
import 'package:execlink_field/models/execution_event.dart';
import 'package:execlink_field/models/extracted_facts.dart';
import 'package:execlink_field/providers/auth_provider.dart';
import 'package:execlink_field/providers/field_providers.dart';
import 'package:execlink_field/services/api_client.dart';
import 'package:execlink_field/services/auth_service.dart';
import 'package:execlink_field/services/offline_sync_service.dart';
import 'package:execlink_field/views/login/login_view.dart';
import 'package:execlink_field/widgets/connectivity_indicator.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

Widget _hostSyncSheet(ProviderContainer container) {
  return UncontrolledProviderScope(
    container: container,
    child: MaterialApp(
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        body: Builder(
          builder: (context) => Center(
            child: ElevatedButton(
              onPressed: () {
                showModalBottomSheet(
                  context: context,
                  isScrollControlled: true,
                  builder: (_) => const FieldSyncQueueSheet(),
                );
              },
              child: const Text('Open Sync Queue'),
            ),
          ),
        ),
      ),
    ),
  );
}

void main() {
  group('A — Sync Queue & Offline Simulation Tests', () {
    late ApiClient mockApiClient;
    late OfflineSyncService syncService;

    setUp(() {
      SharedPreferences.setMockInitialValues({});
      mockApiClient = ApiClient(useLocalFallback: true);
      syncService = OfflineSyncService(apiClient: mockApiClient);
    });

    test('1. Online -> simulated offline immediate state transition', () {
      expect(syncService.isOffline, isFalse);
      expect(syncService.connectionState, FieldConnectionState.online);

      syncService.setSimulatedOffline(true);
      expect(syncService.isOffline, isTrue);
      expect(syncService.simulateOffline, isTrue);
      expect(syncService.connectionState, FieldConnectionState.offline);
    });

    test('2. Offline submission is safely queued locally in SQLite queue', () async {
      syncService.setSimulatedOffline(true);
      final initialPending = syncService.pendingCount;

      final event = ExecutionEvent(
        id: 'EVT-OFF-101',
        projectId: 'PRJ-DEMO-001',
        reporterId: 'USR-SUP-001',
        observedAt: DateTime.now().toUtc().toIso8601String(),
        receivedAt: DateTime.now().toUtc().toIso8601String(),
        evidence: const Evidence(text: 'Pier 12 rebar inspection offline'),
        extractedFacts: const ExtractedFacts(eventType: 'progress', assetId: 'PIER-P12'),
        status: 'submitted',
        clientEventId: 'CLI-EVT-101',
      );

      final submitted = await syncService.submitEvent(event);

      expect(submitted.syncStatus, SyncStatus.pending);
      expect(syncService.pendingCount, initialPending + 1);

      final sqliteItem = syncService.sqliteQueue.getAll().firstWhere(
        (i) => i.clientEventId == 'CLI-EVT-101',
      );
      expect(sqliteItem.syncStatus, SyncStatus.pending);
    });

    test('3. Simulated offline -> online automatically triggers queue flush', () async {
      syncService.setSimulatedOffline(true);

      final event = ExecutionEvent(
        id: 'EVT-OFF-102',
        projectId: 'PRJ-DEMO-001',
        reporterId: 'USR-SUP-001',
        observedAt: DateTime.now().toUtc().toIso8601String(),
        receivedAt: DateTime.now().toUtc().toIso8601String(),
        evidence: const Evidence(text: 'Pier 14 concrete pour'),
        extractedFacts: const ExtractedFacts(eventType: 'progress', assetId: 'PIER-P14'),
        status: 'submitted',
        clientEventId: 'CLI-EVT-102',
      );

      await syncService.submitEvent(event);
      expect(syncService.pendingCount, greaterThan(0));

      // Disable offline simulation
      syncService.simulateOffline = false;
      final syncedCount = await syncService.syncPending();

      expect(syncedCount, greaterThan(0));
      expect(syncService.pendingCount, 0);
      expect(syncService.syncState, FieldSyncState.idle);
      expect(syncService.lastSuccessfulSync, isNotNull);
    });

    test('4. Failed flush preserves item in queue as failed/pending for retry', () async {
      final failingClient = ApiClient(
        client: MockClient((req) async {
          throw const SocketException('Connection refused');
        }),
      );

      final failSyncService = OfflineSyncService(apiClient: failingClient);
      failSyncService.setSimulatedOffline(true);

      final event = ExecutionEvent(
        id: 'EVT-OFF-FAIL-1',
        projectId: 'PRJ-DEMO-001',
        reporterId: 'USR-SUP-001',
        observedAt: DateTime.now().toUtc().toIso8601String(),
        receivedAt: DateTime.now().toUtc().toIso8601String(),
        evidence: const Evidence(text: 'Critical pump test'),
        extractedFacts: const ExtractedFacts(eventType: 'progress', assetId: 'PUMP-01'),
        status: 'submitted',
        clientEventId: 'CLI-EVT-FAIL-1',
      );

      await failSyncService.submitEvent(event);
      expect(failSyncService.pendingCount, greaterThan(0));

      // Disable simulation -> try sync -> fail
      failSyncService.simulateOffline = false;
      final synced = await failSyncService.syncPending();

      expect(synced, 0);
      expect(failSyncService.pendingCount, greaterThan(0));
      expect(failSyncService.lastSyncError, isNotNull);
      expect(failSyncService.syncState, FieldSyncState.failed);

      final preservedItem = failSyncService.sqliteQueue.getAll().firstWhere(
        (i) => i.clientEventId == 'CLI-EVT-FAIL-1',
      );
      expect(preservedItem.syncStatus, SyncStatus.failed);
      expect(preservedItem.retryCount, greaterThanOrEqualTo(1));
    });

    test('5. Duplicate sync invocation does not execute concurrent syncs or duplicate events', () async {
      int submissions = 0;
      final delayClient = ApiClient(
        client: MockClient((req) async {
          submissions++;
          await Future.delayed(const Duration(milliseconds: 50));
          return http.Response(
            jsonEncode({'id': 'EVT-CONCUR-1', 'status': 'submitted'}),
            201,
          );
        }),
      );

      final testSync = OfflineSyncService(apiClient: delayClient);
      testSync.setSimulatedOffline(true);

      await testSync.submitEvent(
        ExecutionEvent(
          id: 'EVT-CONCUR-1',
          projectId: 'PRJ-DEMO-001',
          reporterId: 'USR-SUP-001',
          observedAt: DateTime.now().toUtc().toIso8601String(),
          receivedAt: DateTime.now().toUtc().toIso8601String(),
          evidence: const Evidence(text: 'Concurrent test'),
          extractedFacts: const ExtractedFacts(eventType: 'progress'),
          status: 'submitted',
          clientEventId: 'CLI-CONCUR-1',
        ),
      );

      testSync.simulateOffline = false;

      // Fire multiple sync calls simultaneously
      final future1 = testSync.syncPending();
      final future2 = testSync.syncPending();
      final future3 = testSync.syncPending();

      final results = await Future.wait([future1, future2, future3]);

      // Only one operation ran, others returned 0 due to isSyncing mutex
      expect(results.reduce((a, b) => a + b), 1);
      expect(submissions, 1);
    });
  });

  group('B — Cold Start & Login Reliability Tests', () {
    setUp(() {
      SharedPreferences.setMockInitialValues({});
    });

    test('1. First-attempt login success returns token and fetches user', () async {
      final mockHttp = MockClient((request) async {
        if (request.url.path.endsWith('/auth/login')) {
          return http.Response(
            jsonEncode({'token': 'jwt-token-123', 'user': {'id': 'U1', 'name': 'Asha Rao'}}),
            200,
          );
        }
        if (request.url.path.endsWith('/auth/me')) {
          return http.Response(
            jsonEncode({
              'id': 'U1',
              'name': 'Asha Rao',
              'email': 'asha@execlink.demo',
              'memberships': [
                {
                  'project_id': 'PRJ-DEMO-001',
                  'project_name': 'North River Expansion',
                  'role': 'FIELD_SUPERVISOR',
                  'reporting_scope': 'Area B · Civil',
                }
              ]
            }),
            200,
          );
        }
        return http.Response('Not found', 404);
      });

      final auth = AuthService(client: mockHttp, baseUrl: 'https://execlink-api.onrender.com/api/v1');
      final token = await auth.login('asha@execlink.demo', 'Demo123!');
      expect(token, 'jwt-token-123');

      final user = await auth.fetchMe();
      expect(user.name, 'Asha Rao');
      expect(user.role, 'Field Supervisor');
      expect(user.projectId, 'PRJ-DEMO-001');
    });

    test('2. Transient initial 503/timeout retries automatically and succeeds', () async {
      int attempts = 0;
      final mockHttp = MockClient((request) async {
        if (request.url.path.endsWith('/auth/login')) {
          attempts++;
          if (attempts == 1) {
            // Render cold-start 503 waking up
            return http.Response('Service Unavailable (Waking up)', 503);
          }
          return http.Response(
            jsonEncode({'token': 'jwt-token-recovered', 'user': {'id': 'U1'}}),
            200,
          );
        }
        return http.Response('Not found', 404);
      });

      final auth = AuthService(client: mockHttp, baseUrl: 'https://execlink-api.onrender.com/api/v1');
      final token = await auth.login('asha@execlink.demo', 'Demo123!');

      expect(attempts, 2);
      expect(token, 'jwt-token-recovered');
    });

    test('3. Invalid 401 credentials strictly does NOT retry', () async {
      int attempts = 0;
      final mockHttp = MockClient((request) async {
        attempts++;
        return http.Response(
          jsonEncode({'error': {'message': 'Invalid email or password'}}),
          401,
        );
      });

      final auth = AuthService(client: mockHttp, baseUrl: 'https://execlink-api.onrender.com/api/v1');

      await expectLater(
        auth.login('asha@execlink.demo', 'WrongPass!'),
        throwsA(
          isA<AuthFailure>().having(
            (f) => f.code,
            'code',
            AuthFailureCode.invalidCredentials,
          ),
        ),
      );

      // Must NOT retry 401
      expect(attempts, 1);
    });

    test('4. Session restoration: valid stored token restores profile seamlessly', () async {
      SharedPreferences.setMockInitialValues({'execlink_token': 'valid-saved-token'});

      final mockHttp = MockClient((request) async {
        if (request.url.path.endsWith('/auth/me')) {
          return http.Response(
            jsonEncode({
              'id': 'U-DEMO',
              'name': 'Asha Rao',
              'email': 'asha@execlink.demo',
              'memberships': [
                {
                  'project_id': 'PRJ-DEMO-001',
                  'project_name': 'North River Expansion',
                  'role': 'FIELD_SUPERVISOR',
                  'reporting_scope': 'Area B · Civil',
                }
              ]
            }),
            200,
          );
        }
        return http.Response('Not found', 404);
      });

      final auth = AuthService(client: mockHttp, baseUrl: 'https://execlink-api.onrender.com/api/v1');
      final user = await auth.fetchMe();

      expect(user.id, 'U-DEMO');
      expect(user.name, 'Asha Rao');
    });

    test('5. Production default configuration uses Render API URL and no localhost dependency', () {
      expect(ApiConfig.baseUrl, 'https://execlink-api.onrender.com/api/v1');
      expect(ApiConfig.environment, 'production');
    });
  });

  group('C — UI Responsive Layout & Bottom Sheet Tests', () {
    setUp(() {
      SharedPreferences.setMockInitialValues({});
    });

    for (final width in [320.0, 375.0, 390.0, 393.0, 430.0]) {
      testWidgets('Field Sync Queue bottom sheet renders with zero overflow at ${width.toInt()}px width', (
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

        await tester.pumpWidget(_hostSyncSheet(container));
        await tester.pump(const Duration(milliseconds: 100));
        await tester.tap(find.text('Open Sync Queue'));
        await tester.pump(const Duration(milliseconds: 300));

        expect(find.text('Field Sync Queue'), findsOneWidget);
        expect(find.text('Simulate Offline Mode'), findsOneWidget);
        expect(find.text('Close'), findsOneWidget);
        expect(tester.takeException(), isNull);
      });

      testWidgets('LoginView renders with zero overflow at ${width.toInt()}px width', (
        tester,
      ) async {
        SharedPreferences.setMockInitialValues({});
        tester.view.physicalSize = Size(width, 844);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(() => tester.view.resetPhysicalSize());

        final mockHttp = MockClient((request) async => http.Response('Unauthorized', 401));
        final mockAuth = AuthService(client: mockHttp, baseUrl: 'https://execlink-api.onrender.com/api/v1');

        final container = ProviderContainer(
          overrides: [
            authServiceProvider.overrideWithValue(mockAuth),
            authProvider.overrideWith(() => _MockReadyAuthNotifier()),
          ],
        );
        addTearDown(container.dispose);

        await tester.pumpWidget(
          UncontrolledProviderScope(
            container: container,
            child: const MaterialApp(
              home: LoginView(),
            ),
          ),
        );
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 200));

        expect(find.text('ExecLink'), findsOneWidget);
        expect(find.text('Sign In'), findsOneWidget);
        expect(tester.takeException(), isNull);
      });
    }
  });
}

class _MockReadyAuthNotifier extends AuthNotifier {
  @override
  AuthState build() {
    return AuthState(isInitializing: false);
  }
}
