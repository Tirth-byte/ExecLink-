import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:uuid/uuid.dart';

import '../models/common_types.dart';

enum EvidenceCaptureAction { cameraPhoto, cameraVideo, mediaLibrary, document }

class EvidenceCaptureException implements Exception {
  const EvidenceCaptureException(this.message, {this.canOpenSettings = false});
  final String message;
  final bool canOpenSettings;

  @override
  String toString() => message;
}

class EvidenceCaptureService {
  EvidenceCaptureService({ImagePicker? imagePicker})
    : _imagePicker = imagePicker ?? ImagePicker();

  final ImagePicker _imagePicker;
  static const _uuid = Uuid();

  Future<List<EvidenceAttachment>> capture(EvidenceCaptureAction action) async {
    switch (action) {
      case EvidenceCaptureAction.cameraPhoto:
        await _ensurePermission(Permission.camera, 'Camera');
        final file = await _imagePicker.pickImage(
          source: ImageSource.camera,
          imageQuality: 82,
          maxWidth: 2200,
        );
        return file == null
            ? const []
            : [await _persist(file, EvidenceType.photo, 'camera')];
      case EvidenceCaptureAction.cameraVideo:
        await _ensurePermission(Permission.camera, 'Camera');
        await _ensurePermission(Permission.microphone, 'Microphone');
        final file = await _imagePicker.pickVideo(
          source: ImageSource.camera,
          maxDuration: const Duration(minutes: 3),
        );
        return file == null
            ? const []
            : [await _persist(file, EvidenceType.video, 'camera')];
      case EvidenceCaptureAction.mediaLibrary:
        final files = await _imagePicker.pickMultipleMedia(
          imageQuality: 82,
          limit: 10,
        );
        return Future.wait(
          files.map(
            (file) => _persist(
              file,
              _isVideo(file.path) ? EvidenceType.video : EvidenceType.photo,
              'library',
            ),
          ),
        );
      case EvidenceCaptureAction.document:
        final result = await FilePicker.pickFiles();
        if (result.isEmpty) return const [];
        return Future.wait(
          result
              .where((file) => file.path != null)
              .map(
                (file) => _persist(
                  XFile(file.path!, name: file.name),
                  EvidenceType.document,
                  'file_picker',
                ),
              ),
        );
    }
  }

  Future<EvidenceAttachment> persistAudio(
    String sourcePath,
    Duration duration,
  ) => _persist(
    XFile(sourcePath),
    EvidenceType.audio,
    'microphone',
    duration: duration,
  );

  Future<void> _ensurePermission(Permission permission, String label) async {
    final status = await permission.request();
    if (status.isGranted || status.isLimited) return;
    throw EvidenceCaptureException(
      '$label access is unavailable. You can continue without this evidence.',
      canOpenSettings: status.isPermanentlyDenied || status.isRestricted,
    );
  }

  Future<EvidenceAttachment> _persist(
    XFile picked,
    EvidenceType type,
    String source, {
    Duration? duration,
  }) async {
    final id = 'EVD-${_uuid.v4()}';
    final root = await getApplicationDocumentsDirectory();
    final directory = Directory(p.join(root.path, 'field_evidence'));
    await directory.create(recursive: true);
    final extension = p.extension(picked.path);
    final safeName =
        '${id}_${p.basenameWithoutExtension(picked.name)}$extension';
    final destination = p.join(directory.path, safeName);
    await File(picked.path).copy(destination);
    final stored = File(destination);
    final location = await _optionalLocation();
    return EvidenceAttachment(
      id: id,
      type: type,
      localPath: destination,
      fileName: picked.name,
      sizeBytes: await stored.length(),
      capturedAt: DateTime.now().toUtc().toIso8601String(),
      source: source,
      latitude: location?.latitude,
      longitude: location?.longitude,
      accuracyMetres: location?.accuracy,
      durationMilliseconds: duration?.inMilliseconds,
    );
  }

  Future<Position?> _optionalLocation() async {
    try {
      if (!await Geolocator.isLocationServiceEnabled()) return null;
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        return null;
      }
      return await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 8),
        ),
      );
    } catch (_) {
      return null;
    }
  }

  static bool _isVideo(String path) {
    const videoExtensions = {'.mp4', '.mov', '.m4v', '.avi', '.webm'};
    return videoExtensions.contains(p.extension(path).toLowerCase());
  }
}
