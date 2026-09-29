"""Configuration and defaults for ExecLink deterministic intelligence pipeline."""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Tuple

ENGINE_VERSION: str = "matcher-v1"
CONFIG_VERSION: str = "match-config-v1"

DEFAULT_WEIGHTS: Dict[str, float] = {
    "asset": 0.40,
    "discipline": 0.20,
    "location": 0.15,
    "text": 0.10,
    "workType": 0.10,
    "temporal": 0.05,
}

DEFAULT_THRESHOLDS: Dict[str, float] = {
    "autoSuggest": 0.90,
    "review": 0.70,
}

DEFAULT_TIE_BREAKER: List[str] = [
    "score:desc",
    "activityWbs:asc",
    "activityId:asc",
]

DEFAULT_WORK_TYPE_SYNONYMS: Dict[str, List[str]] = {
    "rebar-fixing": [
        "reinforcement",
        "reinforcement-fixing",
        "rebar",
        "rebar-fixing",
        "steel-fixing",
        "bar-bending",
    ],
    "cable-laying": [
        "cable-installation",
        "cable laying",
        "cable-laying",
        "cable-pulling",
        "stringing",
        "conduit",
    ],
    "erection": [
        "erect",
        "erection",
        "install",
        "installation",
        "fit-up",
        "mounting",
        "placement",
    ],
    "formwork": [
        "formwork",
        "shuttering",
        "formwork installation",
        "staging",
    ],
    "drain-cleaning": [
        "drain",
        "drain-cleaning",
        "drain cleaning",
        "culvert-cleaning",
    ],
    "concreting": [
        "pour",
        "concreting",
        "casting",
        "pour completed",
        "raft",
        "slab",
        "curing",
    ],
    "welding": [
        "weld",
        "welding",
        "joint",
        "root pass",
        "capping",
        "ndt",
        "radiography",
    ],
    "excavation": [
        "excavate",
        "excavation",
        "trenching",
        "digging",
        "earthwork",
        "grading",
    ],
    "hydrotest": [
        "hydrotest",
        "pressure test",
        "pneumatic test",
        "leak test",
        "testing",
    ],
    "alignment": [
        "align",
        "alignment",
        "grouting",
        "leveling",
        "coupling",
    ],
}

EXPANDED_DISCIPLINES: List[str] = [
    "civil",
    "structural",
    "piping",
    "static equipment",
    "rotating equipment",
    "electrical",
    "instrumentation",
    "hse",
]

DISCIPLINE_INTERFACES: List[Tuple[str, str]] = [
    ("civil", "structural"),
    ("electrical", "instrumentation"),
    ("mechanical", "piping"),
    ("piping", "mechanical"),
    ("structural", "civil"),
    ("instrumentation", "electrical"),
    ("piping", "static equipment"),
    ("static equipment", "piping"),
    ("static equipment", "rotating equipment"),
    ("rotating equipment", "static equipment"),
    ("rotating equipment", "piping"),
    ("piping", "rotating equipment"),
    ("electrical", "rotating equipment"),
    ("rotating equipment", "electrical"),
    ("instrumentation", "piping"),
    ("piping", "instrumentation"),
    ("hse", "civil"),
    ("hse", "structural"),
    ("hse", "piping"),
]

INTERFACE_DISCIPLINE_SCORE: float = 0.60


@dataclass
class MatchingConfig:
    engine_version: str = ENGINE_VERSION
    config_version: str = CONFIG_VERSION
    weights: Dict[str, float] = field(default_factory=lambda: dict(DEFAULT_WEIGHTS))
    thresholds: Dict[str, float] = field(default_factory=lambda: dict(DEFAULT_THRESHOLDS))
    tie_breaker: List[str] = field(default_factory=lambda: list(DEFAULT_TIE_BREAKER))
    work_type_synonyms: Dict[str, List[str]] = field(
        default_factory=lambda: {k: list(v) for k, v in DEFAULT_WORK_TYPE_SYNONYMS.items()}
    )

    def validate(self) -> None:
        total_weight = sum(self.weights.values())
        if abs(total_weight - 1.0) > 1e-4 and abs(total_weight - 100.0) > 1e-2:
            raise ValueError(f"Matching weights must sum to 1.0 or 100, got {total_weight}")
        required_keys = {"asset", "discipline", "location", "text", "workType", "temporal"}
        if not required_keys.issubset(self.weights.keys()):
            missing = required_keys - set(self.weights.keys())
            raise ValueError(f"Missing required weights: {missing}")
        if "autoSuggest" not in self.thresholds or "review" not in self.thresholds:
            raise ValueError("Thresholds must contain 'autoSuggest' and 'review'")
        if self.thresholds["autoSuggest"] <= self.thresholds["review"]:
            raise ValueError("autoSuggest threshold must be strictly greater than review threshold")

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MatchingConfig":
        engine_v = data.get("engineVersion", ENGINE_VERSION)
        config_v = data.get("configVersion", CONFIG_VERSION)
        raw_weights = data.get("weights", DEFAULT_WEIGHTS)
        weights: Dict[str, float] = {}
        for k, v in raw_weights.items():
            # normalize weights to fraction if given in percentages
            val = float(v)
            weights[k] = val / 100.0 if val > 1.0 else val

        thresholds = {k: float(v) for k, v in data.get("thresholds", DEFAULT_THRESHOLDS).items()}
        tie_breaker = list(data.get("tieBreaker", DEFAULT_TIE_BREAKER))

        synonyms = {k: list(v) for k, v in DEFAULT_WORK_TYPE_SYNONYMS.items()}
        if "workTypeSynonyms" in data:
            for k, syn_list in data["workTypeSynonyms"].items():
                synonyms[k] = list(set(synonyms.get(k, []) + list(syn_list)))

        cfg = cls(
            engine_version=engine_v,
            config_version=config_v,
            weights=weights,
            thresholds=thresholds,
            tie_breaker=tie_breaker,
            work_type_synonyms=synonyms,
        )
        cfg.validate()
        return cfg

    @classmethod
    def from_file(cls, path: str | Path) -> "MatchingConfig":
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return cls.from_dict(data)
