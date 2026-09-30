import 'dart:convert';

import 'package:execlink_field/core/config/api_config.dart';
import 'package:execlink_field/core/constants/project_context.dart';
import 'package:execlink_field/models/common_types.dart';
import 'package:execlink_field/models/execution_event.dart';
import 'package:execlink_field/models/extracted_facts.dart';
import 'package:execlink_field/services/api_client.dart';
import 'package:execlink_field/services/auth_service.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

const runLiveTests = bool.fromEnvironment('RUN_LIVE_API_TESTS');

void main() {
  test(
    'Flutter services authenticate, read work, and submit to Render',
    () async {
      SharedPreferences.setMockInitialValues({});
      final auth = AuthService();
      final token = await auth.login('asha@execlink.demo', 'Demo123!');
      final user = await auth.fetchMe();

      expect(user.name, 'Asha Rao');
      expect(user.role, 'Field Supervisor');
      expect(user.projectId, ProjectContext.defaultProjectId);

      final health = await http
          .get(Uri.parse('${ApiConfig.baseUrl}/health'))
          .timeout(ApiConfig.requestTimeout);
      expect(health.statusCode, 200);
      expect(jsonDecode(health.body)['database'], 'ok');

      final api = ApiClient();
      final before = await api.getActivities(user.projectId);
      expect(before, isNotEmpty);
      expect(before.every((activity) => activity.wbs.isNotEmpty), isTrue);

      final suffix = DateTime.now().microsecondsSinceEpoch.toString();
      final eventId = 'EVT-FLUTTER-CLOUD-$suffix';
      final event = ExecutionEvent(
        id: eventId,
        projectId: user.projectId,
        reporterId: 'USR-DEMO-001',
        observedAt: DateTime.now().toUtc().toIso8601String(),
        receivedAt: DateTime.now().toUtc().toIso8601String(),
        evidence: Evidence(text: 'Flutter cloud connectivity check $suffix'),
        extractedFacts: const ExtractedFacts(
          eventType: 'progress',
          assetId: 'PIER-P12',
          discipline: 'structural',
          workType: 'rebar-fixing',
          keywords: ['pier', 'rebar', 'flutter-cloud-check'],
        ),
        status: 'submitted',
        clientEventId: eventId,
      );

      final submitted = await api.submitEvent(
        projectId: user.projectId,
        event: event,
      );
      expect(submitted['status'], 201);
      final serverEvent = submitted['event'] as Map<String, dynamic>;
      expect(serverEvent['reporterId'], 'USR-DEMO-005');

      final persisted = await http
          .get(
            Uri.parse(
              '${ApiConfig.baseUrl}/projects/${user.projectId}/events/$eventId',
            ),
            headers: {'Authorization': 'Bearer $token'},
          )
          .timeout(ApiConfig.requestTimeout);
      expect(persisted.statusCode, 200);
      expect(jsonDecode(persisted.body)['id'], eventId);

      final after = await api.getActivities(user.projectId);
      expect(
        after.map((activity) => activity.toJson()).toList(),
        before.map((activity) => activity.toJson()).toList(),
        reason: 'Field submission must not mutate verified schedule actuals.',
      );
    },
    skip: !runLiveTests,
  );
}
