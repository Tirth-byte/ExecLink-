import 'common_types.dart';

class ExtractedFacts {
  final String? eventType; // started, progress, completed, delayed, blocked
  final String? assetId;
  final String? discipline;
  final String? workType;
  final LocationInterval? location;
  final Quantity? quantity;
  final String? delayReason;
  final String? contractor;
  final List<String> keywords;

  const ExtractedFacts({
    this.eventType,
    this.assetId,
    this.discipline,
    this.workType,
    this.location,
    this.quantity,
    this.delayReason,
    this.contractor,
    this.keywords = const [],
  });

  factory ExtractedFacts.fromJson(Map<String, dynamic> json) {
    return ExtractedFacts(
      eventType: json['eventType'] as String?,
      assetId: json['assetId'] as String?,
      discipline: json['discipline'] as String?,
      workType: json['workType'] as String?,
      location: json['location'] != null
          ? LocationInterval.fromJson(json['location'] as Map<String, dynamic>)
          : null,
      quantity: json['quantity'] != null
          ? Quantity.fromJson(json['quantity'] as Map<String, dynamic>)
          : null,
      delayReason: json['delayReason'] as String?,
      contractor: json['contractor'] as String?,
      keywords:
          (json['keywords'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
    );
  }

  Map<String, dynamic> toJson() => {
    if (eventType != null) 'eventType': eventType,
    if (assetId != null) 'assetId': assetId,
    if (discipline != null) 'discipline': discipline,
    if (workType != null) 'workType': workType,
    if (location != null) 'location': location!.toJson(),
    if (quantity != null) 'quantity': quantity!.toJson(),
    if (delayReason != null) 'delayReason': delayReason,
    if (contractor != null) 'contractor': contractor,
    'keywords': keywords,
  };

  ExtractedFacts copyWith({
    String? eventType,
    String? assetId,
    String? discipline,
    String? workType,
    LocationInterval? location,
    Quantity? quantity,
    String? delayReason,
    String? contractor,
    List<String>? keywords,
  }) {
    return ExtractedFacts(
      eventType: eventType ?? this.eventType,
      assetId: assetId ?? this.assetId,
      discipline: discipline ?? this.discipline,
      workType: workType ?? this.workType,
      location: location ?? this.location,
      quantity: quantity ?? this.quantity,
      delayReason: delayReason ?? this.delayReason,
      contractor: contractor ?? this.contractor,
      keywords: keywords ?? this.keywords,
    );
  }
}
