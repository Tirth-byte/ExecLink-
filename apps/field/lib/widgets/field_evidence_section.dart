import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:open_filex/open_filex.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:photo_view/photo_view.dart';
import 'package:video_player/video_player.dart';

import '../core/theme/app_colors.dart';
import '../core/theme/app_theme.dart';
import '../core/theme/app_typography.dart';
import '../models/common_types.dart';
import '../services/evidence_capture_service.dart';

class FieldEvidenceSection extends StatefulWidget {
  const FieldEvidenceSection({
    super.key,
    required this.attachments,
    required this.onChanged,
    this.factLabels = const [],
  });

  final List<EvidenceAttachment> attachments;
  final ValueChanged<List<EvidenceAttachment>> onChanged;
  final List<String> factLabels;

  @override
  State<FieldEvidenceSection> createState() => _FieldEvidenceSectionState();
}

class _FieldEvidenceSectionState extends State<FieldEvidenceSection> {
  final EvidenceCaptureService _capture = EvidenceCaptureService();
  bool _busy = false;

  Future<void> _captureAction(EvidenceCaptureAction action) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      final additions = await _capture.capture(action);
      if (additions.isNotEmpty) {
        // Default newly added evidence to apply to all facts if multi-facts exist
        final defaultAssigned = widget.factLabels.isNotEmpty
            ? List<int>.generate(widget.factLabels.length, (i) => i)
            : <int>[];
        final formattedAdditions = additions
            .map((att) => att.copyWith(assignedFactIndexes: defaultAssigned))
            .toList();

        widget.onChanged([...widget.attachments, ...formattedAdditions]);
        HapticFeedback.selectionClick();
      }
    } on EvidenceCaptureException catch (error) {
      if (!mounted) return;
      _showError(error.message, canOpenSettings: error.canOpenSettings);
    } catch (e) {
      if (mounted) {
        _showError('Could not attach evidence. Update data remains safe.');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _showError(String message, {bool canOpenSettings = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        action: canOpenSettings
            ? SnackBarAction(
                label: 'Settings',
                onPressed: openAppSettings,
              )
            : null,
      ),
    );
  }

  void _removeAttachment(EvidenceAttachment item) {
    widget.onChanged(widget.attachments.where((e) => e.id != item.id).toList());
    HapticFeedback.lightImpact();
  }

  void _toggleFactAssignment(EvidenceAttachment item, int factIndex) {
    final current = List<int>.from(item.assignedFactIndexes);
    if (current.contains(factIndex)) {
      current.remove(factIndex);
    } else {
      current.add(factIndex);
    }
    final updated = item.copyWith(assignedFactIndexes: current);
    widget.onChanged(
      widget.attachments.map((e) => e.id == item.id ? updated : e).toList(),
    );
  }

  void _openViewer(EvidenceAttachment item) {
    if (item.type == EvidenceType.photo) {
      Navigator.push(
        context,
        MaterialPageRoute<void>(
          builder: (_) => _PhotoViewerScreen(item: item),
        ),
      );
    } else if (item.type == EvidenceType.video) {
      Navigator.push(
        context,
        MaterialPageRoute<void>(
          builder: (_) => _VideoViewerScreen(item: item),
        ),
      );
    } else {
      OpenFilex.open(item.localPath);
    }
  }

  @override
  Widget build(BuildContext context) {
    final count = widget.attachments.length;

    return Container(
      decoration: BoxDecoration(
        color: FieldColors.surface,
        borderRadius: BorderRadius.circular(FieldRadius.card),
        border: Border.all(color: FieldColors.border, width: 1),
      ),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(
                    Icons.camera_alt_outlined,
                    size: 16,
                    color: FieldColors.action,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'FIELD EVIDENCE',
                    style: AppTypography.bodySmBold.copyWith(
                      fontSize: 11,
                      letterSpacing: 0.5,
                      color: AppColors.textMuted,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: count > 0 ? AppColors.actionBg : AppColors.surfaceMuted,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: count > 0
                        ? AppColors.action.withValues(alpha: 0.3)
                        : AppColors.border,
                  ),
                ),
                child: Text(
                  count == 0 ? '0 attached' : '$count attached',
                  style: AppTypography.monoSm.copyWith(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: count > 0 ? AppColors.action : AppColors.textMuted,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Primary Native iOS Action Buttons
          Row(
            children: [
              Expanded(
                child: _buildActionButton(
                  icon: Icons.photo_camera_rounded,
                  label: 'Take Photo',
                  onTap: _busy
                      ? null
                      : () => _captureAction(EvidenceCaptureAction.cameraPhoto),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildActionButton(
                  icon: Icons.photo_library_rounded,
                  label: 'Photos',
                  onTap: _busy
                      ? null
                      : () => _captureAction(EvidenceCaptureAction.mediaLibrary),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildActionButton(
                  icon: Icons.videocam_rounded,
                  label: 'Video',
                  onTap: _busy
                      ? null
                      : () => _captureAction(EvidenceCaptureAction.cameraVideo),
                ),
              ),
            ],
          ),

          if (_busy) ...[
            const SizedBox(height: 10),
            const LinearProgressIndicator(minHeight: 2),
          ],

          // Attached Evidence Cards List
          if (widget.attachments.isNotEmpty) ...[
            const SizedBox(height: 14),
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: widget.attachments.length,
              separatorBuilder: (context, index) => const SizedBox(height: 10),
              itemBuilder: (_, index) {
                final item = widget.attachments[index];
                return _buildEvidenceItemCard(item);
              },
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required VoidCallback? onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        height: 38,
        decoration: BoxDecoration(
          color: AppColors.surfaceMuted,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppColors.border),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 6),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 16, color: AppColors.action),
            const SizedBox(width: 4),
            Flexible(
              child: Text(
                label,
                style: AppTypography.bodySmBold.copyWith(
                  fontSize: 11,
                  color: AppColors.text,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEvidenceItemCard(EvidenceAttachment item) {
    final isVideo = item.type == EvidenceType.video;
    final isPhoto = item.type == EvidenceType.photo;

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.border),
      ),
      padding: const EdgeInsets.all(8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              // Thumbnail
              GestureDetector(
                onTap: () => _openViewer(item),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: Container(
                    width: 52,
                    height: 52,
                    color: AppColors.surfaceMuted,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        if (isPhoto && item.localPath.isNotEmpty)
                          Image.file(
                            File(item.localPath),
                            fit: BoxFit.cover,
                            width: 52,
                            height: 52,
                            errorBuilder: (context, error, stackTrace) =>
                                const Icon(
                              Icons.broken_image,
                              size: 20,
                              color: AppColors.textMuted,
                            ),
                          )
                        else
                          Icon(
                            isVideo
                                ? Icons.movie_outlined
                                : Icons.description_outlined,
                            size: 24,
                            color: AppColors.action,
                          ),
                        if (isVideo)
                          Container(
                            padding: const EdgeInsets.all(4),
                            decoration: const BoxDecoration(
                              color: Colors.black54,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.play_arrow,
                              size: 14,
                              color: Colors.white,
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),

              // Details
              Expanded(
                child: GestureDetector(
                  onTap: () => _openViewer(item),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 4,
                              vertical: 1,
                            ),
                            decoration: BoxDecoration(
                              color: isVideo
                                  ? AppColors.actionBg
                                  : AppColors.surfaceMuted,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              item.type.name.toUpperCase(),
                              style: AppTypography.monoSm.copyWith(
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                color: isVideo
                                    ? AppColors.action
                                    : AppColors.textMuted,
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Flexible(
                            child: Text(
                              item.fileName,
                              style: AppTypography.bodySmBold.copyWith(
                                fontSize: 12,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Text(
                        '${(item.sizeBytes / 1024).toStringAsFixed(1)} KB · ${_formatTimestamp(item.capturedAt)}',
                        style: AppTypography.metadata.copyWith(fontSize: 10),
                      ),
                    ],
                  ),
                ),
              ),

              // Remove button
              IconButton(
                icon: const Icon(Icons.close, size: 16),
                color: AppColors.textMuted,
                visualDensity: VisualDensity.compact,
                onPressed: () => _removeAttachment(item),
                tooltip: 'Remove',
              ),
            ],
          ),

          // Multi-Fact Assignment (if multiple facts present)
          if (widget.factLabels.length > 1) ...[
            const Divider(height: 12, thickness: 0.5),
            Text(
              'Applies to:',
              style: AppTypography.bodySmBold.copyWith(
                fontSize: 10,
                color: AppColors.textMuted,
              ),
            ),
            const SizedBox(height: 4),
            Wrap(
              spacing: 6,
              runSpacing: 4,
              children: widget.factLabels.asMap().entries.map((entry) {
                final idx = entry.key;
                final label = entry.value;
                // If assignedFactIndexes is empty, treat as assigned to all by default
                final isAssigned = item.assignedFactIndexes.isEmpty ||
                    item.assignedFactIndexes.contains(idx);

                return FilterChip(
                  label: Text(
                    label,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight:
                          isAssigned ? FontWeight.bold : FontWeight.normal,
                      color: isAssigned ? AppColors.action : AppColors.text,
                    ),
                  ),
                  selected: isAssigned,
                  selectedColor: AppColors.actionBg,
                  checkmarkColor: AppColors.action,
                  backgroundColor: AppColors.surfaceMuted,
                  visualDensity: VisualDensity.compact,
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  onSelected: (_) => _toggleFactAssignment(item, idx),
                );
              }).toList(),
            ),
          ],
        ],
      ),
    );
  }

  String _formatTimestamp(String isoString) {
    try {
      final dt = DateTime.parse(isoString).toLocal();
      return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return isoString;
    }
  }
}

class _PhotoViewerScreen extends StatelessWidget {
  const _PhotoViewerScreen({required this.item});
  final EvidenceAttachment item;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
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
              child: Column(
                children: [
                  Text(
                    'Captured: ${item.capturedAt} · Size: ${(item.sizeBytes / 1024).toStringAsFixed(1)} KB',
                    style: const TextStyle(color: Colors.white70, fontSize: 11),
                  ),
                  if (item.sha256 != null)
                    Text(
                      'SHA-256: ${item.sha256!.substring(0, 16)}...',
                      style: const TextStyle(
                        color: Colors.white54,
                        fontSize: 10,
                        fontFamily: 'monospace',
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _VideoViewerScreen extends StatefulWidget {
  const _VideoViewerScreen({required this.item});
  final EvidenceAttachment item;

  @override
  State<_VideoViewerScreen> createState() => _VideoViewerScreenState();
}

class _VideoViewerScreenState extends State<_VideoViewerScreen> {
  late final VideoPlayerController _controller;
  late final Future<void> _initFuture;

  @override
  void initState() {
    super.initState();
    _controller = VideoPlayerController.file(File(widget.item.localPath));
    _initFuture = _controller.initialize();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text(widget.item.fileName, overflow: TextOverflow.ellipsis),
      ),
      body: FutureBuilder<void>(
        future: _initFuture,
        builder: (context, snapshot) {
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
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    IconButton(
                      color: Colors.white,
                      iconSize: 42,
                      onPressed: () {
                        setState(() {
                          _controller.value.isPlaying
                              ? _controller.pause()
                              : _controller.play();
                        });
                      },
                      icon: Icon(
                        _controller.value.isPlaying
                            ? Icons.pause_circle_filled
                            : Icons.play_circle_fill,
                      ),
                    ),
                  ],
                ),
                Padding(
                  padding: const EdgeInsets.all(8),
                  child: Text(
                    'Captured: ${widget.item.capturedAt}',
                    style: const TextStyle(color: Colors.white70, fontSize: 11),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
