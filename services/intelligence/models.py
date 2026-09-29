"""Data models and serialization for the ExecLink intelligence pipeline."""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Literal, Optional

SignalName = Literal["asset", "discipline", "location", "text", "workType", "temporal"]
MatchBand = Literal["auto_suggest", "review", "unmatched"]
MatchingMode = Literal["primary", "deterministic_fallback"]
ProposalStatus = Literal["proposed", "verified", "rejected"]
EventStatus = Literal["submitted", "proposed", "verified", "rejected"]


@dataclass
class LocationInterval:
    kind: str = "chainage"
    alignment: str = "BL"
    start: float = 0.0
    end: float = 0.0
    unit: str = "m"

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "LocationInterval":
        return cls(
            kind=data.get("kind", "chainage"),
            alignment=data.get("alignment", "BL"),
            start=float(data.get("start", 0.0)),
            end=float(data.get("end", data.get("start", 0.0))),
            unit=data.get("unit", "m"),
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "kind": self.kind,
            "alignment": self.alignment,
            "start": int(self.start) if self.start.is_integer() else self.start,
            "end": int(self.end) if self.end.is_integer() else self.end,
            "unit": self.unit,
        }


@dataclass
class Quantity:
    value: float
    unit: str

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Quantity":
        return cls(
            value=float(data.get("value", 0.0)),
            unit=str(data.get("unit", "")),
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "value": int(self.value) if self.value.is_integer() else self.value,
            "unit": self.unit,
        }


@dataclass
class Evidence:
    text: str
    transcript: Optional[str] = None
    attachmentIds: List[str] = field(default_factory=list)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Evidence":
        return cls(
            text=data.get("text", ""),
            transcript=data.get("transcript"),
            attachmentIds=list(data.get("attachmentIds", [])),
        )

    def to_dict(self) -> Dict[str, Any]:
        res: Dict[str, Any] = {
            "text": self.text,
            "attachmentIds": self.attachmentIds,
        }
        if self.transcript is not None:
            res["transcript"] = self.transcript
        return res


@dataclass
class ExtractedFacts:
    keywords: List[str] = field(default_factory=list)
    assetId: Optional[str] = None
    discipline: Optional[str] = None
    workType: Optional[str] = None
    location: Optional[LocationInterval] = None
    quantity: Optional[Quantity] = None
    delayReason: Optional[str] = None
    eventType: str = "progress"

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ExtractedFacts":
        loc = LocationInterval.from_dict(data["location"]) if "location" in data and data["location"] else None
        qty = Quantity.from_dict(data["quantity"]) if "quantity" in data and data["quantity"] else None
        return cls(
            keywords=list(data.get("keywords", [])),
            assetId=data.get("assetId"),
            discipline=data.get("discipline"),
            workType=data.get("workType"),
            location=loc,
            quantity=qty,
            delayReason=data.get("delayReason"),
            eventType=data.get("eventType", "progress"),
        )

    def to_dict(self) -> Dict[str, Any]:
        res: Dict[str, Any] = {
            "keywords": self.keywords,
        }
        if self.assetId is not None:
            res["assetId"] = self.assetId
        if self.discipline is not None:
            res["discipline"] = self.discipline
        if self.workType is not None:
            res["workType"] = self.workType
        if self.location is not None:
            res["location"] = self.location.to_dict()
        if self.quantity is not None:
            res["quantity"] = self.quantity.to_dict()
        return res


@dataclass
class ExecutionEvent:
    id: str
    projectId: str
    reporterId: str
    observedAt: str
    receivedAt: str
    evidence: Evidence
    extractedFacts: ExtractedFacts
    status: EventStatus = "submitted"

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ExecutionEvent":
        return cls(
            id=data["id"],
            projectId=data["projectId"],
            reporterId=data["reporterId"],
            observedAt=data["observedAt"],
            receivedAt=data["receivedAt"],
            evidence=Evidence.from_dict(data["evidence"]),
            extractedFacts=ExtractedFacts.from_dict(data["extractedFacts"]),
            status=data.get("status", "submitted"),
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "projectId": self.projectId,
            "reporterId": self.reporterId,
            "observedAt": self.observedAt,
            "receivedAt": self.receivedAt,
            "evidence": self.evidence.to_dict(),
            "extractedFacts": self.extractedFacts.to_dict(),
            "status": self.status,
        }


@dataclass
class ScheduleActivity:
    id: str
    projectId: str
    snapshotId: str
    wbs: str
    level: int
    name: str
    discipline: str
    workType: str
    assetId: str
    location: LocationInterval
    plannedStart: str
    plannedFinish: str
    plannedQuantity: Optional[Quantity] = None
    baselineProgressPercent: float = 0.0

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ScheduleActivity":
        loc = LocationInterval.from_dict(data["location"]) if "location" in data else LocationInterval()
        qty = Quantity.from_dict(data["plannedQuantity"]) if "plannedQuantity" in data and data["plannedQuantity"] else None
        # Read initial progress percentage safely without mutating anything
        initial_progress = float(data.get("actualProgressPercent", data.get("baselineProgressPercent", 0.0)))
        return cls(
            id=data["id"],
            projectId=data["projectId"],
            snapshotId=data["snapshotId"],
            wbs=data["wbs"],
            level=int(data.get("level", 6)),
            name=data["name"],
            discipline=data["discipline"],
            workType=data["workType"],
            assetId=data["assetId"],
            location=loc,
            plannedStart=data["plannedStart"],
            plannedFinish=data["plannedFinish"],
            plannedQuantity=qty,
            baselineProgressPercent=initial_progress,
        )

    def to_dict(self) -> Dict[str, Any]:
        res: Dict[str, Any] = {
            "id": self.id,
            "projectId": self.projectId,
            "snapshotId": self.snapshotId,
            "wbs": self.wbs,
            "level": self.level,
            "name": self.name,
            "discipline": self.discipline,
            "workType": self.workType,
            "assetId": self.assetId,
            "location": self.location.to_dict(),
            "plannedStart": self.plannedStart,
            "plannedFinish": self.plannedFinish,
            "actualProgressPercent": self.baselineProgressPercent,
        }
        if self.plannedQuantity:
            res["plannedQuantity"] = self.plannedQuantity.to_dict()
        return res


@dataclass
class SignalExplanation:
    signal: SignalName
    score: float
    weight: float
    contribution: float
    input: Dict[str, Any]
    explanation: str
    missing: bool

    def to_dict(self) -> Dict[str, Any]:
        return {
            "signal": self.signal,
            "score": round(self.score, 4),
            "weight": round(self.weight, 4),
            "contribution": round(self.contribution, 4),
            "input": self.input,
            "explanation": self.explanation,
            "missing": self.missing,
        }


@dataclass
class MatchCandidate:
    activityId: str
    activityWbs: str
    score: float
    band: MatchBand
    explanation: List[SignalExplanation]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "activityId": self.activityId,
            "activityWbs": self.activityWbs,
            "score": round(self.score, 4),
            "band": self.band,
            "explanation": [e.to_dict() for e in self.explanation],
        }


@dataclass
class MatchProposal:
    id: str
    projectId: str
    executionEventId: str
    snapshotId: str
    engineVersion: str
    configVersion: str
    mode: MatchingMode
    status: ProposalStatus
    createdAt: str
    candidates: List[MatchCandidate] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "projectId": self.projectId,
            "executionEventId": self.executionEventId,
            "snapshotId": self.snapshotId,
            "engineVersion": self.engineVersion,
            "configVersion": self.configVersion,
            "mode": self.mode,
            "status": self.status,
            "createdAt": self.createdAt,
            "candidates": [c.to_dict() for c in self.candidates],
        }


@dataclass
class ExtractionResult:
    rawTranscript: str
    description: str
    eventType: str
    facts: ExtractedFacts
    suggestedActivityId: Optional[str] = None
    suggestedActivityName: Optional[str] = None
    confidenceScore: float = 0.0
    matchBand: MatchBand = "unmatched"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "rawTranscript": self.rawTranscript,
            "description": self.description,
            "eventType": self.eventType,
            "facts": self.facts.to_dict(),
            "suggestedActivityId": self.suggestedActivityId,
            "suggestedActivityName": self.suggestedActivityName,
            "confidenceScore": self.confidenceScore,
            "matchBand": self.matchBand,
        }
