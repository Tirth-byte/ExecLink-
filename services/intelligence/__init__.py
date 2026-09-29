"""ExecLink Intelligence Service and Matching Engine."""
from __future__ import annotations

from .config import (
    CONFIG_VERSION,
    DEFAULT_THRESHOLDS,
    DEFAULT_TIE_BREAKER,
    DEFAULT_WEIGHTS,
    DEFAULT_WORK_TYPE_SYNONYMS,
    DISCIPLINE_INTERFACES,
    ENGINE_VERSION,
    EXPANDED_DISCIPLINES,
    MatchingConfig,
)
from .eval import EvaluationReport, evaluate_dataset
from .extractor import FactExtractor, tokenize
from .matcher import MatchingEngine, SignalScorer
from .memory import (
    HISTORICAL_PATTERNS,
    HistoricalActivityPattern,
    MemoryQueryResult,
    ProjectMemory,
    TypicalDelay,
)
from .models import (
    Evidence,
    ExecutionEvent,
    ExtractedFacts,
    ExtractionResult,
    LocationInterval,
    MatchBand,
    MatchCandidate,
    MatchingMode,
    MatchProposal,
    ProposalStatus,
    Quantity,
    ScheduleActivity,
    SignalExplanation,
    SignalName,
)
from .pipeline import CandidateRetriever, IntelligencePipeline

__all__ = [
    "CONFIG_VERSION",
    "CandidateRetriever",
    "DEFAULT_THRESHOLDS",
    "DEFAULT_TIE_BREAKER",
    "DEFAULT_WEIGHTS",
    "DEFAULT_WORK_TYPE_SYNONYMS",
    "DISCIPLINE_INTERFACES",
    "ENGINE_VERSION",
    "EXPANDED_DISCIPLINES",
    "EvaluationReport",
    "Evidence",
    "ExecutionEvent",
    "ExtractedFacts",
    "ExtractionResult",
    "FactExtractor",
    "HISTORICAL_PATTERNS",
    "HistoricalActivityPattern",
    "IntelligencePipeline",
    "LocationInterval",
    "MatchBand",
    "MatchCandidate",
    "MatchingConfig",
    "MatchingEngine",
    "MatchingMode",
    "MatchProposal",
    "MemoryQueryResult",
    "ProjectMemory",
    "ProposalStatus",
    "Quantity",
    "ScheduleActivity",
    "SignalExplanation",
    "SignalName",
    "SignalScorer",
    "TypicalDelay",
    "evaluate_dataset",
    "tokenize",
]
