import 'dart:io';

export 'field_evidence_section.dart';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:photo_view/photo_view.dart';
import 'package:record/record.dart';
import 'package:video_player/video_player.dart';

import '../core/theme/app_colors.dart';
import '../core/theme/app_theme.dart';
import '../core/theme/app_typography.dart';
import '../models/common_types.dart';
import '../services/evidence_capture_service.dart';

class EvidenceAttachmentField extends StatefulWidget {
  const EvidenceAttachmentField({
    super.key,
    required this.attachments,
    required this.onChanged,
    this.compact = false,
  });

  final List<EvidenceAttachment> attachments;
  final ValueChanged<List<EvidenceAttachment>> onChanged;
  final bool compact;

  @override
  State<EvidenceAttachmentField> createState() =>
      _EvidenceAttachmentFieldState();
}

class _EvidenceAttachmentFieldState extends State<EvidenceAttachmentField> {
  final _capture = EvidenceCaptureService();
  final _recorder = AudioRecorder();
  bool _busy = false;
  bool _recording = false;
  DateTime? _recordingStarted;

  @override
  void dispose() {
    _recorder.dispose();
    super.dispose();
  }

  Future<void> _showPicker() async {
    if (_busy) return;
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (sheetContext) => SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(8, 0, 8, 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const ListTile(
                title: Text('Add evidence', style: AppTypography.sectionTitle),
                subtitle: Text('Evidence stays with this field update.'),
              ),
              _sourceTile(
                sheetContext,
                Icons.photo_camera_outlined,
                'Camera',
                'Take a site photo',
                EvidenceCaptureAction.cameraPhoto,
              ),
              _sourceTile(
                sheetContext,
                Icons.videocam_outlined,
                'Video',
                'Record site progress',
                EvidenceCaptureAction.cameraVideo,
              ),
              _sourceTile(
                sheetContext,
                Icons.photo_library_outlined,
                'Photo Library',
                'Choose existing photos or videos',
                EvidenceCaptureAction.mediaLibrary,
              ),
              _sourceTile(
                sheetContext,
                Icons.insert_drive_file_outlined,
                'File',
                'Attach a document',
                EvidenceCaptureAction.document,
              ),
              ListTile(
                minVerticalPadding: 8,
                leading: const Icon(Icons.mic_none_rounded),
                title: const Text('Voice Note'),
                subtitle: Text(
                  _recording
                      ? 'Recording — tap to stop'
                      : 'Record an audio note',
                ),
                onTap: () {
                  Navigator.pop(sheetContext);
                  _toggleRecording();
                },
              ),
              TextButton(
                onPressed: () => Navigator.pop(sheetContext),
                child: const Text('Cancel'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _sourceTile(
    BuildContext sheetContext,
    IconData icon,
    String title,
    String subtitle,
    EvidenceCaptureAction action,
  ) => ListTile(
    minVerticalPadding: 8,
    leading: Icon(icon),
    title: Text(title),
    subtitle: Text(subtitle),
    onTap: () {
      Navigator.pop(sheetContext);
      _captureEvidence(action);
    },
  );

  Future<void> _captureEvidence(EvidenceCaptureAction action) async {
    setState(() => _busy = true);
    try {
      final additions = await _capture.capture(action);
      if (additions.isNotEmpty) {
        widget.onChanged([...widget.attachments, ...additions]);
        HapticFeedback.selectionClick();
      }
    } on EvidenceCaptureException catch (error) {
      if (!mounted) return;
      _showError(error.message, settings: error.canOpenSettings);
    } catch (_) {
      if (mounted) {
        _showError('Evidence could not be added. Your update is still safe.');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _toggleRecording() async {
    if (_recording) {
      final path = await _recorder.stop();
      final started = _recordingStarted;
      setState(() => _recording = false);
      if (path != null && started != null) {
        final attachment = await _capture.persistAudio(
          path,
          DateTime.now().difference(started),
        );
        widget.onChanged([...widget.attachments, attachment]);
        HapticFeedback.mediumImpact();
      }
      return;
    }

    final allowed = await _recorder.hasPermission();
    if (!allowed) {
      if (mounted) {
        _showError(
          'Microphone access is unavailable. You can continue with text or other evidence.',
          settings: await Permission.microphone.isPermanentlyDenied,
        );
      }
      return;
    }
    final directory = await getTemporaryDirectory();
    final path = p.join(
      directory.path,
      'voice_${DateTime.now().millisecondsSinceEpoch}.m4a',
    );
    await _recorder.start(
      const RecordConfig(encoder: AudioEncoder.aacLc),
      path: path,
    );
    setState(() {
      _recording = true;
      _recordingStarted = DateTime.now();
    });
    HapticFeedback.mediumImpact();
  }

  void _showError(String message, {bool settings = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        action: settings
            ? SnackBarAction(label: 'Settings', onPressed: openAppSettings)
            : null,
      ),
    );
  }

  void _remove(EvidenceAttachment item) {
    widget.onChanged(widget.attachments.where((e) => e.id != item.id).toList());
  }

  Future<void> _open(EvidenceAttachment item) async {
    if (item.type == EvidenceType.photo) {
      await Navigator.of(
        context,
      ).push(MaterialPageRoute<void>(builder: (_) => _PhotoViewer(item: item)));
    } else if (item.type == EvidenceType.video) {
      await Navigator.of(
        context,
      ).push(MaterialPageRoute<void>(builder: (_) => _VideoViewer(item: item)));
    } else {
      final result = await OpenFilex.open(item.localPath);
      if (result.type != ResultType.done && mounted) {
        _showError('No installed app can open this evidence file.');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bool isEmpty = widget.attachments.isEmpty;
    return Container(
      decoration: BoxDecoration(
        color: FieldColors.surface,
        borderRadius: BorderRadius.circular(FieldRadius.card),
        border: Border.all(color: FieldColors.border, width: 1),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.attach_file_rounded,
                size: 16,
                color: FieldColors.textMuted,
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  isEmpty
                      ? 'No evidence attached'
                      : 'Evidence (${widget.attachments.length})',
                  style: FieldTypography.cardTitle.copyWith(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              if (_recording)
                TextButton.icon(
                  onPressed: _toggleRecording,
                  icon: const Icon(Icons.stop_circle_outlined, size: 16),
                  label: const Text('Stop recording'),
                  style: TextButton.styleFrom(
                    foregroundColor: FieldColors.danger,
                    visualDensity: VisualDensity.compact,
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                  ),
                )
              else
                TextButton.icon(
                  onPressed: _busy ? null : _showPicker,
                  icon: _busy
                      ? const SizedBox.square(
                          dimension: 14,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.add_rounded, size: 16),
                  label: const Text('Add evidence'),
                  style: TextButton.styleFrom(
                    foregroundColor: FieldColors.action,
                    visualDensity: VisualDensity.compact,
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                  ),
                ),
            ],
          ),
          if (widget.attachments.isNotEmpty) ...[
            const SizedBox(height: 10),
            SizedBox(
              height: widget.compact ? 84 : 100,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: widget.attachments.length,
                separatorBuilder: (_, _) => const SizedBox(width: 8),
                itemBuilder: (_, index) {
                  final item = widget.attachments[index];
                  return _EvidenceTile(
                    item: item,
                    compact: widget.compact,
                    onOpen: () => _open(item),
                    onRemove: () => _remove(item),
                  );
                },
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class EvidencePreviewStrip extends StatelessWidget {
  const EvidencePreviewStrip({super.key, required this.attachments});
  final List<EvidenceAttachment> attachments;

  @override
  Widget build(BuildContext context) {
    if (attachments.isEmpty) {
      return Text('No evidence attached', style: AppTypography.metadata);
    }
    return SizedBox(
      height: 92,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: attachments.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (_, index) {
          final item = attachments[index];
          return _EvidenceTile(
            item: item,
            compact: true,
            onOpen: () {
              if (item.type == EvidenceType.photo) {
                Navigator.push(
                  context,
                  MaterialPageRoute<void>(
                    builder: (_) => _PhotoViewer(item: item),
                  ),
                );
              } else if (item.type == EvidenceType.video) {
                Navigator.push(
                  context,
                  MaterialPageRoute<void>(
                    builder: (_) => _VideoViewer(item: item),
                  ),
                );
              } else {
                OpenFilex.open(item.localPath);
              }
            },
          );
        },
      ),
    );
  }
}

class _EvidenceTile extends StatelessWidget {
  const _EvidenceTile({
    required this.item,
    required this.compact,
    required this.onOpen,
    this.onRemove,
  });
  final EvidenceAttachment item;
  final bool compact;
  final VoidCallback onOpen;
  final VoidCallback? onRemove;

  @override
  Widget build(BuildContext context) {
    final size = compact ? 82.0 : 102.0;
    return SizedBox(
      width: size,
      child: Stack(
        children: [
          Positioned.fill(
            child: Material(
              color: AppColors.surfaceMuted,
              borderRadius: BorderRadius.circular(10),
              clipBehavior: Clip.antiAlias,
              child: InkWell(
                onTap: onOpen,
                child: item.type == EvidenceType.photo
                    ? Image.file(
                        File(item.localPath),
                        fit: BoxFit.cover,
                        cacheWidth: 320,
                        errorBuilder: (_, _, _) => _fallback(),
                      )
                    : _fallback(),
              ),
            ),
          ),
          if (onRemove != null)
            Positioned(
              right: 2,
              top: 2,
              child: IconButton.filled(
                constraints: const BoxConstraints.tightFor(
                  width: 30,
                  height: 30,
                ),
                padding: EdgeInsets.zero,
                tooltip: 'Remove ${item.fileName}',
                onPressed: onRemove,
                icon: const Icon(Icons.close_rounded, size: 17),
              ),
            ),
        ],
      ),
    );
  }

  Widget _fallback() => Column(
    mainAxisAlignment: MainAxisAlignment.center,
    children: [
      Icon(switch (item.type) {
        EvidenceType.video => Icons.play_circle_outline_rounded,
        EvidenceType.document => Icons.description_outlined,
        EvidenceType.audio => Icons.graphic_eq_rounded,
        EvidenceType.photo => Icons.broken_image_outlined,
      }, color: AppColors.action),
      const SizedBox(height: 4),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 5),
        child: Text(
          item.type.name.toUpperCase(),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: AppTypography.metadataMedium.copyWith(fontSize: 10),
        ),
      ),
    ],
  );
}

class _PhotoViewer extends StatelessWidget {
  const _PhotoViewer({required this.item});
  final EvidenceAttachment item;

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: Colors.black,
    appBar: AppBar(
      backgroundColor: Colors.black,
      foregroundColor: Colors.white,
      title: Text(item.fileName, overflow: TextOverflow.ellipsis),
    ),
    body: Column(
      children: [
        Expanded(
          child: PhotoView(
            imageProvider: FileImage(File(item.localPath)),
            backgroundDecoration: const BoxDecoration(color: Colors.black),
          ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Text(
              _metadata(item),
              style: const TextStyle(color: Colors.white70, fontSize: 12),
              textAlign: TextAlign.center,
            ),
          ),
        ),
      ],
    ),
  );
}

class _VideoViewer extends StatefulWidget {
  const _VideoViewer({required this.item});
  final EvidenceAttachment item;

  @override
  State<_VideoViewer> createState() => _VideoViewerState();
}

class _VideoViewerState extends State<_VideoViewer> {
  late final VideoPlayerController _controller;
  late final Future<void> _ready;

  @override
  void initState() {
    super.initState();
    _controller = VideoPlayerController.file(File(widget.item.localPath));
    _ready = _controller.initialize();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: Colors.black,
    appBar: AppBar(
      backgroundColor: Colors.black,
      foregroundColor: Colors.white,
      title: Text(widget.item.fileName, overflow: TextOverflow.ellipsis),
    ),
    body: FutureBuilder<void>(
      future: _ready,
      builder: (_, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }
        return SafeArea(
          child: Column(
            children: [
              Expanded(
                child: Center(
                  child: AspectRatio(
                    aspectRatio: _controller.value.aspectRatio,
                    child: VideoPlayer(_controller),
                  ),
                ),
              ),
              VideoProgressIndicator(
                _controller,
                allowScrubbing: true,
                padding: const EdgeInsets.symmetric(horizontal: 16),
              ),
              IconButton(
                color: Colors.white,
                iconSize: 48,
                onPressed: () => setState(() {
                  _controller.value.isPlaying
                      ? _controller.pause()
                      : _controller.play();
                }),
                icon: Icon(
                  _controller.value.isPlaying
                      ? Icons.pause_circle_filled_rounded
                      : Icons.play_circle_fill_rounded,
                ),
              ),
              Text(
                _metadata(widget.item),
                style: const TextStyle(color: Colors.white70, fontSize: 12),
              ),
              const SizedBox(height: 12),
            ],
          ),
        );
      },
    ),
  );
}

String _metadata(EvidenceAttachment item) {
  final location = item.latitude == null
      ? 'Location unavailable'
      : '${item.latitude!.toStringAsFixed(5)}, ${item.longitude!.toStringAsFixed(5)}'
            '${item.accuracyMetres == null ? '' : ' · ±${item.accuracyMetres!.round()}m'}';
  return '${item.source} · ${item.capturedAt} · $location';
}
