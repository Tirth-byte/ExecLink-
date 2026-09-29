import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/execution_event.dart';
import '../models/schedule_activity.dart';
import 'demo_fixtures.dart';

class ApiClient {
  final String baseUrl;
  final http.Client? client;
  bool useLocalFallback;

  ApiClient({
    this.baseUrl = 'http://127.0.0.1:8000/api/v1',
    this.client,
    this.useLocalFallback = true,
  });

  http.Client get httpClient => client ?? http.Client();

  /// Fetch baseline schedule snapshot activities (read-only)
  Future<List<ScheduleActivity>> getActivities(String projectId) async {
    if (useLocalFallback) {
      return DemoFixtures.initialActivities;
    }
    try {
      final response = await httpClient
          .get(Uri.parse('$baseUrl/projects/$projectId/activities'))
          .timeout(const Duration(seconds: 3));

      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        final list = (decoded['items'] as List<dynamic>?) ?? [];
        return list
            .map((e) => ScheduleActivity.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (_) {
      // Fallback seamlessly on connection failure
    }
    return DemoFixtures.initialActivities;
  }

  /// Submit an ExecutionEvent proposal to the API
  /// Uses clientEventId as Idempotency-Key
  Future<Map<String, dynamic>> submitEvent({
    required String projectId,
    required ExecutionEvent event,
  }) async {
    if (useLocalFallback) {
      // Simulate deterministic server ingestion
      final proposal = DemoFixtures.createDeterministicProposal(event);
      return {
        'status': 201,
        'event': event
            .copyWith(status: 'submitted', syncStatus: SyncStatus.synced)
            .toJson(),
        'proposal': proposal.toJson(),
      };
    }

    try {
      final response = await httpClient
          .post(
            Uri.parse('$baseUrl/projects/$projectId/events'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer USR-SUP-001',
              'Idempotency-Key': event.clientEventId,
            },
            body: jsonEncode(event.toJson()),
          )
          .timeout(const Duration(seconds: 3));

      if (response.statusCode == 201 || response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        return {'status': response.statusCode, 'event': data};
      } else {
        throw Exception(
          'Server responded with ${response.statusCode}: ${response.body}',
        );
      }
    } catch (e) {
      if (useLocalFallback) {
        final proposal = DemoFixtures.createDeterministicProposal(event);
        return {
          'status': 201,
          'event': event
              .copyWith(status: 'submitted', syncStatus: SyncStatus.synced)
              .toJson(),
          'proposal': proposal.toJson(),
        };
      }
      rethrow;
    }
  }
}
