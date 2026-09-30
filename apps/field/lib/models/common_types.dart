class LocationInterval {
  final String kind;
  final String alignment;
  final double start;
  final double end;
  final String unit;

  const LocationInterval({
    this.kind = 'chainage',
    this.alignment = 'BL',
    required this.start,
    required this.end,
    this.unit = 'm',
  });

  factory LocationInterval.fromJson(Map<String, dynamic> json) {
    return LocationInterval(
      kind: json['kind'] as String? ?? 'chainage',
      alignment: json['alignment'] as String? ?? 'BL',
      start: (json['start'] as num?)?.toDouble() ?? 0.0,
      end: (json['end'] as num?)?.toDouble() ?? 0.0,
      unit: json['unit'] as String? ?? 'm',
    );
  }

  Map<String, dynamic> toJson() => {
    'kind': kind,
    'alignment': alignment,
    'start': start,
    'end': end,
    'unit': unit,
  };

  String get display => '$alignment $start to $end $unit';
}

class Quantity {
  final double value;
  final String unit;

  const Quantity({required this.value, required this.unit});

  factory Quantity.fromJson(Map<String, dynamic> json) {
    return Quantity(
      value: (json['value'] as num?)?.toDouble() ?? 0.0,
      unit: json['unit'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {'value': value, 'unit': unit};

  String get display => '$value $unit';
}

class Evidence {
  final String text;
  final String? transcript;
  final List<String> attachmentIds;
  final List<EvidenceAttachment> attachments;

  const Evidence({
    required this.text,
    this.transcript,
    this.attachmentIds = const [],
    this.attachments = const [],
  });

  factory Evidence.fromJson(Map<String, dynamic> json) {
    return Evidence(
      text: json['text'] as String? ?? '',
      transcript: json['transcript'] as String?,
      attachmentIds:
          (json['attachmentIds'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
      attachments:
          (json['attachments'] as List<dynamic>?)
              ?.whereType<Map<String, dynamic>>()
              .map(EvidenceAttachment.fromJson)
              .toList() ??
          const [],
    );
  }

  Map<String, dynamic> toJson() => {
    'text': text,
    if (transcript != null) 'transcript': transcript,
    'attachmentIds': attachmentIds,
    'attachments': attachments.map((item) => item.toJson()).toList(),
  };
}

enum EvidenceType { photo, video, document, audio }

class EvidenceAttachment {
  final String id;
  final EvidenceType type;
  final String localPath;
  final String fileName;
  final int sizeBytes;
  final String capturedAt;
  final String? uploadedAt;
  final String source;
  final String? mediaUrl;
  final String? sha256;
  final String syncStatus;
  final List<int> assignedFactIndexes;
  final double? latitude;
  final double? longitude;
  final double? accuracyMetres;
  final int? durationMilliseconds;

  const EvidenceAttachment({
    required this.id,
    required this.type,
    required this.localPath,
    required this.fileName,
    required this.sizeBytes,
    required this.capturedAt,
    this.uploadedAt,
    required this.source,
    this.mediaUrl,
    this.sha256,
    this.syncStatus = 'synced',
    this.assignedFactIndexes = const [],
    this.latitude,
    this.longitude,
    this.accuracyMetres,
    this.durationMilliseconds,
  });

  factory EvidenceAttachment.fromJson(Map<String, dynamic> json) =>
      EvidenceAttachment(
        id: json['id'] as String? ?? '',
        type: EvidenceType.values.firstWhere(
          (value) => value.name == json['type'],
          orElse: () => EvidenceType.document,
        ),
        localPath: json['localPath'] as String? ?? '',
        fileName: json['fileName'] as String? ?? 'Evidence',
        sizeBytes: (json['sizeBytes'] as num?)?.toInt() ?? 0,
        capturedAt:
            json['capturedAt'] as String? ??
            DateTime.now().toUtc().toIso8601String(),
        uploadedAt: json['uploadedAt'] as String?,
        source: json['source'] as String? ?? 'field_device',
        mediaUrl: json['mediaUrl'] as String?,
        sha256: json['sha256'] as String?,
        syncStatus: json['syncStatus'] as String? ?? 'synced',
        assignedFactIndexes: (json['assignedFactIndexes'] as List<dynamic>?)
                ?.map((e) => (e as num).toInt())
                .toList() ??
            const [],
        latitude: (json['latitude'] as num?)?.toDouble(),
        longitude: (json['longitude'] as num?)?.toDouble(),
        accuracyMetres: (json['accuracyMetres'] as num?)?.toDouble(),
        durationMilliseconds: (json['durationMilliseconds'] as num?)?.toInt(),
      );

  Map<String, dynamic> toJson() => {
    'id': id,
    'type': type.name,
    'localPath': localPath,
    'fileName': fileName,
    'sizeBytes': sizeBytes,
    'capturedAt': capturedAt,
    if (uploadedAt != null) 'uploadedAt': uploadedAt,
    'source': source,
    if (mediaUrl != null) 'mediaUrl': mediaUrl,
    if (sha256 != null) 'sha256': sha256,
    'syncStatus': syncStatus,
    'assignedFactIndexes': assignedFactIndexes,
    if (latitude != null) 'latitude': latitude,
    if (longitude != null) 'longitude': longitude,
    if (accuracyMetres != null) 'accuracyMetres': accuracyMetres,
    if (durationMilliseconds != null)
      'durationMilliseconds': durationMilliseconds,
  };

  EvidenceAttachment copyWith({
    String? id,
    EvidenceType? type,
    String? localPath,
    String? fileName,
    int? sizeBytes,
    String? capturedAt,
    String? uploadedAt,
    String? source,
    String? mediaUrl,
    String? sha256,
    String? syncStatus,
    List<int>? assignedFactIndexes,
    double? latitude,
    double? longitude,
    double? accuracyMetres,
    int? durationMilliseconds,
  }) {
    return EvidenceAttachment(
      id: id ?? this.id,
      type: type ?? this.type,
      localPath: localPath ?? this.localPath,
      fileName: fileName ?? this.fileName,
      sizeBytes: sizeBytes ?? this.sizeBytes,
      capturedAt: capturedAt ?? this.capturedAt,
      uploadedAt: uploadedAt ?? this.uploadedAt,
      source: source ?? this.source,
      mediaUrl: mediaUrl ?? this.mediaUrl,
      sha256: sha256 ?? this.sha256,
      syncStatus: syncStatus ?? this.syncStatus,
      assignedFactIndexes: assignedFactIndexes ?? this.assignedFactIndexes,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      accuracyMetres: accuracyMetres ?? this.accuracyMetres,
      durationMilliseconds: durationMilliseconds ?? this.durationMilliseconds,
    );
  }
}
