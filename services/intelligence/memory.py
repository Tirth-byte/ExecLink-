"""Side-effect-free Project Memory and Historical Pattern Intelligence for ExecLink.
Provides similarity indexing and benchmark retrieval across historical infrastructure execution.
All patterns are clearly labeled as synthetic/historical demo knowledge.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

from .config import EXPANDED_DISCIPLINES
from .extractor import tokenize
from .models import ExecutionEvent, MatchCandidate


@dataclass
class TypicalDelay:
    cause: str
    frequency_pct: float
    avg_delay_days: float
    mitigation: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "cause": self.cause,
            "frequency_pct": self.frequency_pct,
            "avg_delay_days": self.avg_delay_days,
            "mitigation": self.mitigation,
        }


@dataclass
class HistoricalActivityPattern:
    pattern_id: str
    discipline: str
    work_type: str
    typical_unit: str
    avg_daily_production_rate: float
    production_range: Tuple[float, float]
    sample_count: int
    confidence: float
    typical_delays: List[TypicalDelay]
    recommendations: List[str]
    source_label: str = "synthetic/historical demo knowledge"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "pattern_id": self.pattern_id,
            "discipline": self.discipline,
            "work_type": self.work_type,
            "typical_unit": self.typical_unit,
            "avg_daily_production_rate": self.avg_daily_production_rate,
            "production_range": list(self.production_range),
            "sample_count": self.sample_count,
            "confidence": round(self.confidence, 4),
            "typical_delays": [d.to_dict() for d in self.typical_delays],
            "recommendations": self.recommendations,
            "source_label": self.source_label,
        }


@dataclass
class MemoryQueryResult:
    query: Dict[str, Any]
    matched_patterns: List[HistoricalActivityPattern]
    top_delay_risks: List[Dict[str, Any]]
    productivity_benchmark: Optional[Dict[str, Any]]
    total_samples: int
    confidence_score: float
    disclaimer: str = "Synthetic historical benchmark reference. For planner estimation guidance only."

    def to_dict(self) -> Dict[str, Any]:
        return {
            "query": self.query,
            "matched_patterns": [p.to_dict() for p in self.matched_patterns],
            "top_delay_risks": self.top_delay_risks,
            "productivity_benchmark": self.productivity_benchmark,
            "total_samples": self.total_samples,
            "confidence_score": round(self.confidence_score, 4),
            "disclaimer": self.disclaimer,
        }


# Curated, realistic historical benchmark database (synthetic demo knowledge)
HISTORICAL_PATTERNS: List[HistoricalActivityPattern] = [
    # 1. Civil
    HistoricalActivityPattern(
        pattern_id="PAT-CIV-001",
        discipline="civil",
        work_type="excavation",
        typical_unit="m3",
        avg_daily_production_rate=220.0,
        production_range=(160.0, 310.0),
        sample_count=48,
        confidence=0.92,
        typical_delays=[
            TypicalDelay("Waterlogging / Monsoon runoff", 35.0, 2.5, "Deploy dewatering pumps and gravel blankets"),
            TypicalDelay("Underground uncharted utility strike", 22.0, 1.8, "Mandatory GPR scanning prior to excavation"),
        ],
        recommendations=["Stage excavation in 100m bays", "Pre-test soil moisture index"],
    ),
    HistoricalActivityPattern(
        pattern_id="PAT-CIV-002",
        discipline="civil",
        work_type="drain-cleaning",
        typical_unit="m",
        avg_daily_production_rate=85.0,
        production_range=(50.0, 120.0),
        sample_count=32,
        confidence=0.88,
        typical_delays=[
            TypicalDelay("Silt accumulation bottleneck", 28.0, 1.0, "Utilize vacuum suction trucks"),
        ],
        recommendations=["Inspect culvert outfalls prior to clearing"],
    ),

    # 2. Structural
    HistoricalActivityPattern(
        pattern_id="PAT-STR-001",
        discipline="structural",
        work_type="rebar-fixing",
        typical_unit="t",
        avg_daily_production_rate=3.5,
        production_range=(2.0, 5.2),
        sample_count=84,
        confidence=0.96,
        typical_delays=[
            TypicalDelay("Crane hook-time bottleneck", 38.0, 1.5, "Pre-bundle rebar kits in ground staging yard"),
            TypicalDelay("Inspection agency clearance turnaround", 25.0, 1.0, "Joint pre-pour audit scheduling"),
        ],
        recommendations=["Verify bar bending schedule against revised drawing Rev-02", "Ensure lap lengths comply with IS 456"],
    ),
    HistoricalActivityPattern(
        pattern_id="PAT-STR-002",
        discipline="structural",
        work_type="formwork",
        typical_unit="m2",
        avg_daily_production_rate=45.0,
        production_range=(30.0, 65.0),
        sample_count=65,
        confidence=0.94,
        typical_delays=[
            TypicalDelay("Tie-rod / staging hardware shortage", 19.0, 0.8, "Maintain 15% buffer staging clamps"),
        ],
        recommendations=["Apply shutter release agent 2 hours before placement"],
    ),
    HistoricalActivityPattern(
        pattern_id="PAT-STR-003",
        discipline="structural",
        work_type="concreting",
        typical_unit="m3",
        avg_daily_production_rate=75.0,
        production_range=(40.0, 120.0),
        sample_count=72,
        confidence=0.95,
        typical_delays=[
            TypicalDelay("RMC transit congestion during rush hours", 42.0, 2.0, "Schedule pours in off-peak night shifts"),
        ],
        recommendations=["Conduct slump flow test for each transit mixer", "Continuous wet curing for 14 days"],
    ),

    # 3. Piping
    HistoricalActivityPattern(
        pattern_id="PAT-PIP-001",
        discipline="piping",
        work_type="spool-erection",
        typical_unit="spools",
        avg_daily_production_rate=6.0,
        production_range=(3.0, 10.0),
        sample_count=56,
        confidence=0.91,
        typical_delays=[
            TypicalDelay("Structural support unreleased", 33.0, 2.2, "Verify pipe rack handover clearance"),
            TypicalDelay("Flange face corrosion / damage", 15.0, 1.0, "Use protective composite end-caps"),
        ],
        recommendations=["Rig from primary structural nodes only", "Torque bolts in star pattern"],
    ),
    HistoricalActivityPattern(
        pattern_id="PAT-PIP-002",
        discipline="piping",
        work_type="hydrotest",
        typical_unit="circuits",
        avg_daily_production_rate=1.0,
        production_range=(0.5, 2.0),
        sample_count=39,
        confidence=0.90,
        typical_delays=[
            TypicalDelay("Punch list A items pending", 45.0, 3.0, "Walk down system 48 hours prior to test package freeze"),
            TypicalDelay("Gauge calibration expiry", 14.0, 0.5, "Maintain twin calibrated master gauges"),
        ],
        recommendations=["Hold test pressure for minimum 4 hours", "Slow de-pressurization to prevent vacuum collapse"],
    ),

    # 4. Static Equipment
    HistoricalActivityPattern(
        pattern_id="PAT-STE-001",
        discipline="static equipment",
        work_type="vessel-erection",
        typical_unit="units",
        avg_daily_production_rate=0.5,
        production_range=(0.2, 1.0),
        sample_count=28,
        confidence=0.93,
        typical_delays=[
            TypicalDelay("Heavy crane rigging wind limit (>10 m/s)", 30.0, 2.0, "Monitor high-altitude anemometer forecasts"),
            TypicalDelay("Foundation anchor bolt pitch mismatch", 18.0, 3.5, "Survey anchor bolts with template before delivery"),
        ],
        recommendations=["Verify nozzle orientation against P&ID", "Confirm tailing crane capacity during lift"],
    ),

    # 5. Rotating Equipment
    HistoricalActivityPattern(
        pattern_id="PAT-ROT-001",
        discipline="rotating equipment",
        work_type="pump-alignment",
        typical_unit="pumps",
        avg_daily_production_rate=2.0,
        production_range=(1.0, 3.5),
        sample_count=35,
        confidence=0.92,
        typical_delays=[
            TypicalDelay("Pipe strain on pump nozzles", 36.0, 1.8, "Disconnect suction/discharge flanges during dial alignment"),
            TypicalDelay("Soft foot condition in baseplate", 24.0, 1.2, "Shim baseplate to tolerance < 0.05 mm"),
        ],
        recommendations=["Record cold and hot alignment runs", "Perform laser alignment check with vibration baseline"],
    ),

    # 6. Electrical
    HistoricalActivityPattern(
        pattern_id="PAT-ELE-001",
        discipline="electrical",
        work_type="cable-laying",
        typical_unit="m",
        avg_daily_production_rate=320.0,
        production_range=(200.0, 480.0),
        sample_count=62,
        confidence=0.94,
        typical_delays=[
            TypicalDelay("Cable tray congestion and missing covers", 29.0, 1.5, "Enforce cable schedule route separation"),
            TypicalDelay("Drum handling damage during pulling", 16.0, 2.0, "Use motorized rollers and pull dynamometer"),
        ],
        recommendations=["Continuity and Megger test before and after pulling", "Tag cable every 10 meters in tray"],
    ),

    # 7. Instrumentation
    HistoricalActivityPattern(
        pattern_id="PAT-INS-001",
        discipline="instrumentation",
        work_type="loop-checking",
        typical_unit="loops",
        avg_daily_production_rate=12.0,
        production_range=(8.0, 18.0),
        sample_count=44,
        confidence=0.91,
        typical_delays=[
            TypicalDelay("DCS I/O card communication timeout", 31.0, 1.5, "Pre-check field junction box marshalling"),
            TypicalDelay("Impulse line leak during bubble test", 20.0, 1.0, "Tighten compression fittings with gauge"),
        ],
        recommendations=["Verify 4-20mA calibration at 0%, 25%, 50%, 75%, 100% span", "Cross-verify safety interlock trip logic"],
    ),

    # 8. HSE
    HistoricalActivityPattern(
        pattern_id="PAT-HSE-001",
        discipline="hse",
        work_type="safety-inspection",
        typical_unit="audits",
        avg_daily_production_rate=8.0,
        production_range=(5.0, 12.0),
        sample_count=52,
        confidence=0.97,
        typical_delays=[
            TypicalDelay("Scaffolding green-tag expiration", 40.0, 0.8, "Institute daily visual supervisor green-tag revalidation"),
            TypicalDelay("Confined space gas test certificate renewal", 25.0, 0.5, "Calibrate 4-gas portable detectors weekly"),
        ],
        recommendations=["Verify 100% tie-off compliance in elevated zones", "Enforce hot work permit fire-watch protocol"],
    ),
]


class ProjectMemory:
    """
    Side-effect-free Project Memory and Historical Pattern Index.
    Zero database footprint, pure read-only reference data.
    """

    def __init__(self, patterns: Optional[List[HistoricalActivityPattern]] = None):
        self.patterns = patterns or list(HISTORICAL_PATTERNS)

    def query_patterns(
        self,
        discipline: Optional[str] = None,
        work_type: Optional[str] = None,
        keywords: Optional[List[str]] = None,
    ) -> List[HistoricalActivityPattern]:
        """Queries historical patterns matching discipline, work type, or tokens."""
        results: List[HistoricalActivityPattern] = []

        norm_d = discipline.strip().lower() if discipline else None
        norm_w = work_type.strip().lower() if work_type else None
        token_set = set(keywords or [])

        for p in self.patterns:
            p_d = p.discipline.lower()
            p_w = p.work_type.lower()

            match = True
            if norm_d and norm_d != p_d:
                # Check interface discipline
                from .config import DISCIPLINE_INTERFACES
                if (norm_d, p_d) not in DISCIPLINE_INTERFACES:
                    match = False

            if match and norm_w and norm_w != p_w:
                # Check substring or keyword overlap
                if norm_w not in p_w and p_w not in norm_w:
                    match = False

            if match:
                results.append(p)
            elif token_set:
                p_tokens = set(tokenize(f"{p.discipline} {p.work_type} {' '.join(p.recommendations)}"))
                if token_set.intersection(p_tokens):
                    results.append(p)

        return results

    def get_productivity_benchmark(self, discipline: str, work_type: str) -> Optional[Dict[str, Any]]:
        """Retrieves typical productivity rates and units for a discipline/work-type."""
        matches = self.query_patterns(discipline=discipline, work_type=work_type)
        if not matches:
            matches = self.query_patterns(discipline=discipline)
        if not matches:
            return None

        best = matches[0]
        return {
            "discipline": best.discipline,
            "work_type": best.work_type,
            "avg_daily_rate": best.avg_daily_production_rate,
            "rate_range": list(best.production_range),
            "unit": best.typical_unit,
            "sample_count": best.sample_count,
            "confidence": best.confidence,
            "source": best.source_label,
        }

    def get_typical_delays(self, discipline: str, work_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieves typical delay causes and mitigations."""
        matches = self.query_patterns(discipline=discipline, work_type=work_type)
        delays: List[Dict[str, Any]] = []
        for p in matches:
            for d in p.typical_delays:
                delays.append({
                    "cause": d.cause,
                    "frequency_pct": d.frequency_pct,
                    "avg_delay_days": d.avg_delay_days,
                    "mitigation": d.mitigation,
                    "discipline": p.discipline,
                    "work_type": p.work_type,
                })
        return delays

    def query_context(
        self,
        discipline: Optional[str] = None,
        work_type: Optional[str] = None,
        keywords: Optional[List[str]] = None,
    ) -> MemoryQueryResult:
        """Structured intelligence query returning benchmarks and delay risks."""
        matched = self.query_patterns(discipline, work_type, keywords)
        benchmark = self.get_productivity_benchmark(discipline or "", work_type or "") if discipline else None

        all_delays: List[Dict[str, Any]] = []
        total_samples = 0
        conf_sum = 0.0

        for p in matched:
            total_samples += p.sample_count
            conf_sum += p.confidence
            for d in p.typical_delays:
                all_delays.append(d.to_dict())

        avg_conf = (conf_sum / len(matched)) if matched else 0.0

        return MemoryQueryResult(
            query={"discipline": discipline, "work_type": work_type, "keywords": keywords},
            matched_patterns=matched,
            top_delay_risks=all_delays[:5],
            productivity_benchmark=benchmark,
            total_samples=total_samples,
            confidence_score=avg_conf,
        )

    def enrich_candidate(self, candidate: MatchCandidate, event: ExecutionEvent) -> Dict[str, Any]:
        """
        Advisory helper: Enriches proposal candidate with historical productivity
        and delay risk context without mutating the candidate itself.
        """
        disc = event.extractedFacts.discipline
        wt = event.extractedFacts.workType

        benchmark = self.get_productivity_benchmark(disc or "", wt or "") if disc else None
        delays = self.get_typical_delays(disc or "", wt or "") if disc else []

        return {
            "activityId": candidate.activityId,
            "activityWbs": candidate.activityWbs,
            "score": candidate.score,
            "band": candidate.band,
            "historical_benchmark": benchmark,
            "common_delay_risks": delays[:3],
            "advisory_note": (
                f"Historical average for {disc} / {wt} is {benchmark['avg_daily_rate']} {benchmark['unit']}/day"
                if benchmark else "No historical benchmark matched"
            ),
            "source": "synthetic/historical demo knowledge",
        }
