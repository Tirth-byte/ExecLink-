import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:path/path.dart' as p;
import 'package:shared_preferences/shared_preferences.dart';

import '../models/common_types.dart';
import '../models/execution_event.dart';
import '../models/schedule_activity.dart';
import '../core/config/api_config.dart';
import 'demo_fixtures.dart';

class ApiClient {
  final http.Client? client;
  bool useLocalFallback;

  ApiClient({this.client, this.useLocalFallback = false});

  http.Client get httpClient => client ?? http.Client();

  /// Upload a field evidence file to the API via multipart upload
  Future<EvidenceAttachment> uploadEvidence({
    required String projectId,
    required EvidenceAttachment attachment,
  }) async {
    if (useLocalFallback) {
      return attachment.copyWith(
        syncStatus: 'synced',
        uploadedAt: DateTime.now().toUtc().toIso8601String(),
        mediaUrl: '/api/v1/projects/$projectId/evidence/${attachment.id}/media',
      );
    }

    try {
      final file = File(attachment.localPath);
      if (!await file.exists()) {
        throw Exception('Evidence file not found at ${attachment.localPath}');
      }

      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('execlink_token');

      final request = http.MultipartRequest(
        'POST',
        Uri.parse('${ApiConfig.baseUrl}/projects/$projectId/evidence/upload'),
      );

      if (token != null) {
        request.headers['Authorization'] = 'Bearer $token';
      }

      request.fields['type'] = attachment.type.name;
      request.fields['captured_at'] = attachment.capturedAt;
      request.fields['source_capture_id'] = attachment.id;
      if (attachment.durationMilliseconds != null) {
        request.fields['duration_ms'] =
            attachment.durationMilliseconds.toString();
      }

      final ext = p.extension(attachment.localPath).toLowerCase();
      final mimeType = switch (ext) {
        '.jpg' || '.jpeg' => MediaType('image', 'jpeg'),
        '.png' => MediaType('image', 'png'),
        '.heic' => MediaType('image', 'heic'),
        '.heif' => MediaType('image', 'heif'),
        '.mp4' => MediaType('video', 'mp4'),
        '.mov' => MediaType('video', 'quicktime'),
        '.m4a' => MediaType('audio', 'm4a'),
        '.aac' => MediaType('audio', 'aac'),
        '.pdf' => MediaType('application', 'pdf'),
        _ => MediaType('application', 'octet-stream'),
      };

      request.files.add(
        await http.MultipartFile.fromPath(
          'file',
          attachment.localPath,
          filename: attachment.fileName,
          contentType: mimeType,
        ),
      );

      final streamed = await httpClient
          .send(request)
          .timeout(ApiConfig.requestTimeout);
      final response = await http.Response.fromStream(streamed);

      if (response.statusCode == 201 || response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        return attachment.copyWith(
          id: data['id'] as String? ?? attachment.id,
          uploadedAt: data['uploadedAt'] as String?,
          mediaUrl: data['mediaUrl'] as String?,
          sha256: data['sha256'] as String? ?? attachment.sha256,
          syncStatus: 'synced',
        );
      } else {
        throw Exception(
          'Server returned ${response.statusCode} on evidence upload: ${response.body}',
        );
      }
    } catch (e) {
      if (useLocalFallback) {
        return attachment.copyWith(
          syncStatus: 'synced',
          uploadedAt: DateTime.now().toUtc().toIso8601String(),
          mediaUrl: '/api/v1/projects/$projectId/evidence/${attachment.id}/media',
        );
      }
      rethrow;
    }
  }


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
          .timeout(ApiConfig.requestTimeout);

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
          .timeout(ApiConfig.requestTimeout);

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
