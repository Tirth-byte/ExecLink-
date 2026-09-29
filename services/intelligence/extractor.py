"""Deterministic structured entity and fact extraction for ExecLink."""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple

from .models import Evidence, ExtractedFacts, ExtractionResult, LocationInterval, Quantity

# Versioned token normalization
STOP_WORDS: Set[str] = {
    "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "with",
    "by", "of", "from", "is", "was", "are", "were", "been", "be", "near",
    "at", "our", "all", "its", "into", "through", "over", "under", "per",
}


def tokenize(text: str) -> List[str]:
    """Deterministic versioned tokenizer."""
    if not text:
        return []
    cleaned = re.sub(r"[^a-zA-Z0-9\s\-\+]", " ", text.lower())
    tokens = [t.strip() for t in cleaned.split() if len(t.strip()) > 1]
    return [t for t in tokens if t not in STOP_WORDS]


class FactExtractor:
    """Side-effect-free structured fact extractor."""

    @classmethod
    def extract_event_type(cls, text: str) -> str:
        lower = text.lower()
        if any(w in lower for w in ["erection completed", "completed", "finished", "installed", "done"]):
            return "completed"
        if any(w in lower for w in ["blocked", "stoppage", "halted"]):
            return "blocked"
        if any(w in lower for w in ["delayed", "delay", "waiting for"]):
            return "delayed"
        if any(w in lower for w in ["started", "commenced", "began"]):
            return "started"
        return "progress"

    @classmethod
    def extract_asset_id(cls, text: str) -> Optional[str]:
        # 1. P-xxx assets e.g. P-110, P-204
        p_tag_match = re.search(r"\b(P-\d{2,4})\b", text, re.IGNORECASE)
        if p_tag_match:
            return p_tag_match.group(1).upper()

        # 2. Pier assets: Pier P12, Pier 12, P12 (in bridge/metro context)
        pier_match = re.search(r"\b(?:pier[-\s]?(?:p)?)(\d+)\b", text, re.IGNORECASE)
        if pier_match:
            return f"PIER-P{pier_match.group(1)}"

        # P12, P13 etc. (1-2 digits with P prefix)
        short_p = re.search(r"\bP(\d{1,2})\b", text)
        if short_p:
            return f"PIER-P{short_p.group(1)}"

        # Station assets e.g. STN-03
        stn_match = re.search(r"\b(STN[-\s]?\d+)\b", text, re.IGNORECASE)
        if stn_match:
            return stn_match.group(1).upper().replace(" ", "-")

        # Line assets e.g. Line 24, LINE-24
        line_match = re.search(r"\b(?:line[-\s]?)(\d+)\b", text, re.IGNORECASE)
        if line_match and "p-" not in text.lower():
            return f"LINE-{line_match.group(1)}"

        # Standalone 3-4 digit tag like P204
        p_num = re.search(r"\bP(\d{3,4})\b", text)
        if p_num:
            return f"P{p_num.group(1)}"

        return None

    @classmethod
    def extract_discipline(cls, text: str) -> Optional[str]:
        lower = text.lower()
        if any(w in lower for w in ["static equipment", "vessel", "column", "drum", "heat exchanger", "exchanger", "reboiler", "reactor", "storage tank"]):
            return "static equipment"
        if any(w in lower for w in ["rotating equipment", "pump", "compressor", "turbine", "motor", "blower", "generator"]):
            return "rotating equipment"
        if any(w in lower for w in ["hse", "safety barrier", "scaffolding inspection", "gas test", "permit to work", "housekeeping", "safety audit"]):
            return "hse"
        if any(w in lower for w in ["spool", "hydrotest", "piping", "flange", "process line", "weld", "pipe", "tie-in"]):
            return "piping"
        if any(w in lower for w in ["rebar", "reinforcement", "formwork", "concrete", "pier", "beam", "slab", "shuttering", "structural"]):
            return "structural"
        if any(w in lower for w in ["erection", "erected", "equipment erection", "mechanical"]):
            return "mechanical"
        if any(w in lower for w in ["cable", "cable-laying", "wiring", "electrical", "substation", "switchgear", "transformer"]):
            return "electrical"
        if any(w in lower for w in ["drain", "drainage", "excavation", "earthwork", "grading", "depot", "culvert", "civil", "earthworks"]):
            return "civil"
        if any(w in lower for w in ["instrumentation", "transmitter", "sensor", "loop", "impulse tubing", "calibration"]):
            return "instrumentation"
        return None

    @classmethod
    def extract_work_type(cls, text: str) -> Optional[str]:
        lower = text.lower()
        if any(w in lower for w in ["rebar", "reinforcement", "fixed ... rebar", "bar bending"]):
            return "rebar-fixing"
        if any(w in lower for w in ["formwork", "shuttering"]):
            return "formwork"
        if any(w in lower for w in ["vessel", "column", "drum", "heat exchanger", "exchanger erection"]):
            return "vessel-erection"
        if any(w in lower for w in ["alignment", "coupling", "grouting", "leveling"]):
            return "pump-alignment"
        if any(w in lower for w in ["loop check", "loop-checking", "calibration"]):
            return "loop-checking"
        if any(w in lower for w in ["safety inspection", "scaffolding inspection", "gas testing", "safety audit", "safety barrier"]):
            return "safety-inspection"
        if any(w in lower for w in ["erection", "erected"]):
            return "erection"
        if any(w in lower for w in ["cable", "pulling cable", "cable-installation", "cable laying"]):
            return "cable-laying"
        if any(w in lower for w in ["drain cleaning", "cleaning drain", "drain"]):
            return "drain-cleaning"
        if any(w in lower for w in ["pour", "concreting", "casting", "curing"]):
            return "concreting"
        if any(w in lower for w in ["weld", "welding", "joint"]):
            return "welding"
        if any(w in lower for w in ["excavat", "trenching", "earthwork"]):
            return "excavation"
        if any(w in lower for w in ["hydrotest", "pressure test"]):
            return "hydrotest"
        return None

    @classmethod
    def extract_chainage(cls, text: str) -> Optional[LocationInterval]:
        # Examples: "chainage 12+410 to 12+425", "ch. 18+200 - 18+250", "chainage 12+410"
        pattern = re.compile(
            r"(?:chainage|ch\.?)\s*(\d+)\+(\d+)(?:\s*(?:to|-)\s*(\d+)\+(\d+))?",
            re.IGNORECASE,
        )
        match = pattern.search(text)
        if not match:
            return None
        km1, m1 = int(match.group(1)), int(match.group(2))
        start = float(km1 * 1000 + m1)
        if match.group(3) is not None and match.group(4) is not None:
            km2, m2 = int(match.group(3)), int(match.group(4))
            end = float(km2 * 1000 + m2)
        else:
            end = start

        alignment = "BL"
        align_match = re.search(r"\b(BL|UP|DN|ML)\b", text)
        if align_match:
            alignment = align_match.group(1).upper()

        return LocationInterval(
            kind="chainage",
            alignment=alignment,
            start=start,
            end=end,
            unit="m",
        )

    @classmethod
    def extract_quantity(cls, text: str) -> Optional[Quantity]:
        # Examples: "3 tonnes", "3 t", "50 m3", "80 cum", "25 m", "100%"
        pattern = re.compile(
            r"\b(\d+(?:\.\d+)?)\s*(tonnes?|t|m3|cum|m|meters?|%)\b",
            re.IGNORECASE,
        )
        match = pattern.search(text)
        if not match:
            return None
        val = float(match.group(1))
        unit = match.group(2).lower()
        if unit.startswith("tonne") or unit == "t":
            unit = "t"
        elif unit in ("m3", "cum"):
            unit = "m3"
        elif unit in ("m", "meters", "meter"):
            unit = "m"
        return Quantity(value=val, unit=unit)

    @classmethod
    def extract_delay_reason(cls, text: str) -> Optional[str]:
        lower = text.lower()
        blocked_match = re.search(r"(?:blocked|delayed)\s+due\s+to\s+([^.,;\n]+)", text, re.IGNORECASE)
        if blocked_match:
            return f"Blocked due to {blocked_match.group(1).strip()}"
        if "permit" in lower:
            return "Permit delay"
        if "weather" in lower or "rain" in lower:
            return "Weather delay"
        return None

    @classmethod
    def extract_keywords(cls, text: str) -> List[str]:
        tokens = tokenize(text)
        # Deduplicate while preserving stable order
        seen: Set[str] = set()
        result: List[str] = []
        for t in tokens:
            if t not in seen and len(t) > 1:
                seen.add(t)
                result.append(t)
        return result

    @classmethod
    def extract(cls, evidence: Evidence | str | Dict[str, Any], reference_date: Optional[datetime] = None) -> ExtractionResult:
        if isinstance(evidence, str):
            text = evidence
            raw_transcript = evidence
        elif isinstance(evidence, dict):
            text = evidence.get("text", "")
            raw_transcript = evidence.get("transcript", text) or text
        else:
            text = evidence.text
            raw_transcript = evidence.transcript or evidence.text

        clean = text.strip()
        event_type = cls.extract_event_type(clean)
        asset_id = cls.extract_asset_id(clean)
        discipline = cls.extract_discipline(clean)
        work_type = cls.extract_work_type(clean)
        location = cls.extract_chainage(clean)
        quantity = cls.extract_quantity(clean)
        delay_reason = cls.extract_delay_reason(clean)
        keywords = cls.extract_keywords(clean)

        facts = ExtractedFacts(
            assetId=asset_id,
            discipline=discipline,
            workType=work_type,
            location=location,
            quantity=quantity,
            delayReason=delay_reason,
            keywords=keywords,
            eventType=event_type,
        )

        first_sentence = clean.split(". ")[0].strip() if clean else ""

        return ExtractionResult(
            rawTranscript=raw_transcript,
            description=first_sentence,
            eventType=event_type,
            facts=facts,
            suggestedActivityId=None,
            confidenceScore=0.0,
            matchBand="unmatched",
        )
