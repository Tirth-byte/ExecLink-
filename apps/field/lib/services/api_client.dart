import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../models/execution_event.dart';
import '../models/schedule_activity.dart';
import '../core/config/api_config.dart';
import 'demo_fixtures.dart';

class ApiClient {
  final http.Client? client;
  bool useLocalFallback;

  ApiClient({this.client, this.useLocalFallback = true});

  http.Client get httpClient => client ?? http.Client();

  /// Fetch baseline schedule snapshot activities (read-only)
  Future<List<ScheduleActivity>> getActivities(String projectId) async {
    if (useLocalFallback) {
      return DemoFixtures.initialActivities;
    }
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('execlink_token');
      final headers = {if (token != null) 'Authorization': 'Bearer $token'};

      final response = await httpClient
          .get(
            Uri.parse('${ApiConfig.baseUrl}/projects/$projectId/activities'),
            headers: headers,
          )
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
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('execlink_token');

      final response = await httpClient
          .post(
            Uri.parse('${ApiConfig.baseUrl}/projects/$projectId/events'),
            headers: {
              'Content-Type': 'application/json',
              if (token != null) 'Authorization': 'Bearer $token',
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
