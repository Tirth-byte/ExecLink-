"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  FileSpreadsheet,
  FileText,
  History,
  Search,
  AlertTriangle,
  Clock,
  LoaderCircle,
  X,
  ChevronDown,
  RefreshCw,
  ShieldCheck,
  Table2,
  UploadCloud,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";
import type { ExecutionEvent } from "@/data/live-execution";
import {
  SCHEDULE_ACTIVITIES,
  type ScheduleActivity,
} from "@/data/schedule-explorer";
import type { MatchCandidate } from "@/data/match-review";

type SelectedSource = {
  name: string;
  size: string;
  extension: string;
  description: string;
  synthetic?: boolean;
  rows?: number;
  columns?: number;
  sheet?: string;
};

const ACCEPTED_EXTENSIONS = new Set(["csv", "xlsx", "xls", "pdf"]);
const MAX_FILE_SIZE = 25 * 1024 * 1024;

const SAMPLE_DPR: SelectedSource = {
  name: "DPR_26_Sep_2026.xlsx",
  size: "2.4 MB",
  extension: "XLSX",
  description: "Daily Progress Report",
  synthetic: true,
  rows: 24,
  columns: 8,
  sheet: "Daily Progress Report",
};

const PIPELINE = [
  "Upload",
  "Structure",
  "Map Fields",
  "Extract",
  "Match",
  "Review",
];
const DEMO_COLUMNS = [
  ["Activity Description", "P-110 Erection & Alignment", "Text"],
  ["Discipline", "Piping", "Text"],
  ["Asset Tag", "P-110", "Identifier"],
  ["Location", "Process Area / B", "Text"],
  ["Quantity", "180", "Number"],
  ["Unit", "m³", "Text"],
  ["Progress", "64", "Percentage"],
  ["Report Date", "26 Sep 2026", "Date"],
] as const;

const CANONICAL_FIELDS = [
  "Description",
  "Discipline",
  "Asset / Tag",
  "Location",
  "Timestamp / Report Date",
  "Contractor",
  "Quantity",
  "Unit",
  "Progress",
  "Delay Reason",
  "Event Type",
  "Source Reference",
  "Ignore Column",
] as const;
type CanonicalField = (typeof CANONICAL_FIELDS)[number];
type MappingRow = {
  source: string;
  sample: string;
  detectedType: string;
  target: CanonicalField;
  confidence: number;
};

const AUTO_MAPPINGS: MappingRow[] = [
  {
    source: "Activity Description",
    sample: "P-110 Erection & Alignment",
    detectedType: "Text",
    target: "Description",
    confidence: 98,
  },
  {
    source: "Discipline",
    sample: "Piping",
    detectedType: "Text",
    target: "Discipline",
    confidence: 99,
  },
  {
    source: "Asset Tag",
    sample: "P-110",
    detectedType: "Identifier",
    target: "Asset / Tag",
    confidence: 100,
  },
  {
    source: "Location",
    sample: "Process Area / B",
    detectedType: "Text",
    target: "Location",
    confidence: 96,
  },
  {
    source: "Quantity",
    sample: "180",
    detectedType: "Number",
    target: "Quantity",
    confidence: 98,
  },
  {
    source: "Unit",
    sample: "m³",
    detectedType: "Text",
    target: "Unit",
    confidence: 97,
  },
  {
    source: "Progress",
    sample: "64",
    detectedType: "Percentage",
    target: "Progress",
    confidence: 99,
  },
  {
    source: "Report Date",
    sample: "26 Sep 2026",
    detectedType: "Date",
    target: "Timestamp / Report Date",
    confidence: 86,
  },
];
const REQUIRED_FIELDS: CanonicalField[] = [
  "Description",
  "Discipline",
  "Timestamp / Report Date",
];

type ExtractionQuality = "Ready" | "Review";
type ExtractedEvent = Pick<
  ExecutionEvent,
  "id" | "event" | "discipline" | "assetTag" | "location"
> & {
  row: number;
  progress: number;
  quantity: string;
  timestamp: string;
  eventType: string;
  quality: ExtractionQuality;
  issue?: string;
  sourceValues: Record<string, string>;
};

const EVENT_NAMES = [
  "P-110 Erection & Alignment",
  "P-110 Hydrotest",
  "Foundation Concrete Pour — Area B",
  "Structural Steel Erection — Rack 2",
  "V-204 Vessel Setting",
  "Cable Tray Installation — North Rack",
  "MCC-02 Cable Termination",
  "Loop Check — Compressor Train 1",
  "Pipe Rack Grouting",
  "Underground Drainage Installation",
  "E-401 Exchanger Alignment",
  "Firewater Header Welding",
  "Control Room Flooring",
  "Instrument Air Header Installation",
  "Transformer T-02 Pre-commissioning",
  "Cooling Water Pump Alignment",
  "Tank TK-301 Shell Course 4",
  "Process Area Lighting",
  "Flare Header NDT",
  "Compressor Foundation Backfill",
  "Substation Earthing",
  "P-220 Suction Spool Installation",
  "Access Platform Handrail",
  "Area B Safety Walkdown",
] as const;
const DISCIPLINES: ExecutionEvent["discipline"][] = [
  "Piping",
  "Piping",
  "Civil",
  "Structural",
  "Static Equipment",
  "Electrical",
  "Electrical",
  "Instrumentation",
];

function buildExtractedEvents(sourceName: string): ExtractedEvent[] {
  return EVENT_NAMES.map((event, index) => {
    const row = index + 2;
    const discipline = DISCIPLINES[index % DISCIPLINES.length];
    const review = index === 2 || index === 18;
    const knownTags = [
      "P-110",
      "P-110",
      "FND-02",
      "STR-02",
      "V-204",
      "SS-02",
      "MCC-02",
      "CMP-01",
    ];
    const assetTag =
      knownTags[index] ??
      `${discipline.slice(0, 3).toUpperCase()}-${String(index + 101)}`;
    const location =
      index === 2
        ? "Area B"
        : index < 2
          ? "Process Area / B"
          : index % 3 === 0
            ? "Utility Area"
            : "Process Area / A";
    const progress =
      index === 0 ? 64 : index === 1 ? 0 : (index * 11 + 23) % 101;
    const quantity =
      index === 0 ? "180 m³" : `${20 + index * 5} ${index % 2 ? "m" : "units"}`;
    return {
      id: `DPR-0926-${String(index + 1).padStart(3, "0")}`,
      row,
      event,
      discipline,
      assetTag,
      location,
      progress,
      quantity,
      timestamp: "26 Sep 2026",
      eventType: progress ? "Progress Update" : "Work Readiness",
      quality: review ? "Review" : "Ready",
      issue:
        index === 2
          ? "Location requires confirmation"
          : index === 18
            ? "Report date mapping reviewed"
            : undefined,
      sourceValues: {
        "Activity Description": event,
        Discipline: discipline,
        "Asset Tag": assetTag,
        Location: location,
        Quantity: quantity.split(" ")[0],
        Unit: quantity.split(" ").slice(1).join(" "),
        Progress: String(progress),
        "Report Date": "26 Sep 2026",
        Source: sourceName,
      },
    };
  });
}

type MatchRoute = "High confidence" | "Review" | "Unmatched";
type MatchProposal = {
  event: ExtractedEvent;
  candidate: MatchCandidate | null;
  alternatives: MatchCandidate[];
  confidence: number;
  route: MatchRoute;
};
const routeFor = (confidence: number): MatchRoute =>
  confidence >= 90
    ? "High confidence"
    : confidence >= 70
      ? "Review"
      : "Unmatched";
const WORK_TERMS = new Set([
  "preparation",
  "erection",
  "alignment",
  "installation",
  "hydrotest",
  "testing",
  "commissioning",
  "termination",
  "concrete",
  "pour",
  "backfill",
  "inspection",
  "excavation",
  "setting",
  "grouting",
  "welding",
  "flooring",
  "lighting",
  "ndt",
  "earthing",
  "walkdown",
  "loop",
  "check",
]);
const STOP_TERMS = new Set([
  "the",
  "and",
  "area",
  "process",
  "works",
  "work",
  "north",
  "south",
  "a",
  "b",
]);
function words(value: string) {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter(
        (word) => word && !STOP_TERMS.has(word) && !/^[a-z]+-?\d+$/.test(word),
      ),
  );
}
function locationWords(value: string) {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean),
  );
}
function dice(left: Set<string>, right: Set<string>) {
  const overlap = [...left].filter((word) => right.has(word)).length;
  return left.size + right.size ? (2 * overlap) / (left.size + right.size) : 0;
}
function scoreCandidate(
  event: ExtractedEvent,
  activity: ScheduleActivity,
): MatchCandidate {
  const eventWords = words(event.event);
  const activityWords = words(activity.name);
  const eventActions = new Set(
    [...eventWords].filter((word) => WORK_TERMS.has(word)),
  );
  const activityActions = new Set(
    [...activityWords].filter((word) => WORK_TERMS.has(word)),
  );
  const exactTitle =
    event.event
      .toLowerCase()
      .replace(/\s+—.*$/, "")
      .trim() ===
    activity.name
      .toLowerCase()
      .replace(/\s+—.*$/, "")
      .trim();
  const actionSimilarity = dice(eventActions, activityActions);
  const lexicalSimilarity = dice(eventWords, activityWords);
  const semantic = exactTitle
    ? 100
    : Math.round(Math.min(100, lexicalSimilarity * 65 + actionSimilarity * 35));
  const assetTag =
    event.assetTag === activity.assetTag
      ? 100
      : event.assetTag.split("-")[0] === activity.assetTag.split("-")[0]
        ? 35
        : 0;
  const wbsContext = Math.round(
    Math.min(
      100,
      dice(eventWords, words(`${activity.wbsPath} ${activity.name}`)) * 85 +
        (activity.discipline === event.discipline ? 15 : 0),
    ),
  );
  const discipline = activity.discipline === event.discipline ? 100 : 0;
  const temporal =
    activity.currentStart <= "2026-09-26" &&
    activity.currentFinish >= "2026-09-26"
      ? 100
      : activity.baselineStart <= "2026-10-10" &&
          activity.baselineFinish >= "2026-09-12"
        ? 72
        : 35;
  const location = Math.round(
    dice(locationWords(event.location), locationWords(activity.location)) * 100,
  );
  const signals = {
    semantic,
    assetTag,
    wbsContext,
    discipline,
    temporal,
    location,
  };
  const confidence =
    Math.round(
      (semantic * 0.4 +
        assetTag * 0.2 +
        wbsContext * 0.15 +
        discipline * 0.1 +
        temporal * 0.1 +
        location * 0.05) *
        10,
    ) / 10;
  const sharedActions = [...eventActions].filter((term) =>
    activityActions.has(term),
  );
  const evidence = [
    assetTag === 100 && `asset ${event.assetTag}`,
    sharedActions.length && `${sharedActions.join(" and ")} work`,
    discipline === 100 && `${event.discipline.toLowerCase()} discipline`,
    temporal >= 72 && "the current execution window",
  ].filter(Boolean);
  return {
    id: activity.id,
    name: activity.name,
    discipline: activity.discipline,
    wbs: activity.wbsPath,
    confidence,
    confidenceTier:
      confidence >= 90 ? "High" : confidence >= 70 ? "Review" : "Weak",
    baselineStart: activity.baselineStart,
    baselineFinish: activity.baselineFinish,
    currentProgress: activity.currentProgress,
    proposedProgress: activity.currentProgress,
    deltaProgress: 0,
    totalFloat: activity.totalFloat,
    scheduleStatus: activity.status,
    isProgressCompatible: true,
    signals,
    reasoning: evidence.length
      ? `The event matches ${evidence.join(", ")}.`
      : "The candidate has limited contextual overlap and requires planner review.",
  };
}
function buildMatchProposals(events: ExtractedEvent[]): MatchProposal[] {
  return events.map((event) => {
    const ranked = SCHEDULE_ACTIVITIES.map((activity) =>
      scoreCandidate(event, activity),
    ).sort((a, b) => b.confidence - a.confidence);
    const [best, ...rest] = ranked;
    const route = routeFor(best.confidence);
    return {
      event,
      candidate: route === "Unmatched" ? null : best,
      alternatives: (route === "Unmatched" ? ranked : rest).slice(0, 2),
      confidence: best.confidence,
      route,
    };
  });
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sourceFromFile(file: File): SelectedSource {
  const extension = file.name.split(".").pop()?.toUpperCase() || "FILE";
  return {
    name: file.name,
    size: formatBytes(file.size),
    extension,
    description: extension === "PDF" ? "Site report" : "Execution data source",
  };
}

export function DataIngestionWorkspace() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [source, setSource] = useState<SelectedSource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [mappings, setMappings] = useState<MappingRow[]>(AUTO_MAPPINGS);
  const [eventQuery, setEventQuery] = useState("");
  const [qualityFilter, setQualityFilter] = useState<"All" | ExtractionQuality>(
    "All",
  );
  const [disciplineFilter, setDisciplineFilter] = useState("All");
  const [selectedEventId, setSelectedEventId] = useState("DPR-0926-001");
  const [showSourceRow, setShowSourceRow] = useState(false);
  const [matchQuery, setMatchQuery] = useState("");
  const [matchRoute, setMatchRoute] = useState<"All" | MatchRoute>("All");
  const [matchDiscipline, setMatchDiscipline] = useState("All");
  const [selectedMatchId, setSelectedMatchId] = useState("DPR-0926-001");
  const [reviewExpanded, setReviewExpanded] = useState<MatchRoute | null>(
    "High confidence",
  );
  const [reviewDetailId, setReviewDetailId] = useState<string | null>(null);
  const [confirmImport, setConfirmImport] = useState(false);
  const [importStatus, setImportStatus] = useState<
    "review" | "loading" | "error" | "complete"
  >("review");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reviewShowAll, setReviewShowAll] = useState<
    Partial<Record<MatchRoute, boolean>>
  >({});

  const mappingHealth = useMemo(() => {
    const active = mappings.filter(
      (mapping) => mapping.target !== "Ignore Column",
    );
    const counts = active.reduce<Record<string, number>>((acc, mapping) => {
      acc[mapping.target] = (acc[mapping.target] ?? 0) + 1;
      return acc;
    }, {});
    const duplicates = new Set(
      Object.entries(counts)
        .filter(([, count]) => count > 1)
        .map(([field]) => field),
    );
    const missingRequired = REQUIRED_FIELDS.filter(
      (field) => !active.some((mapping) => mapping.target === field),
    );
    return {
      mapped: active.length,
      ignored: mappings.length - active.length,
      needsReview: mappings.filter(
        (mapping) =>
          mapping.confidence < 90 && mapping.target !== "Ignore Column",
      ).length,
      duplicates,
      missingRequired,
      valid: duplicates.size === 0 && missingRequired.length === 0,
    };
  }, [mappings]);
  const extractedEvents = useMemo(
    () => buildExtractedEvents(source?.name ?? SAMPLE_DPR.name),
    [source?.name],
  );
  const readyCount = extractedEvents.filter(
    (event) => event.quality === "Ready",
  ).length;
  const reviewCount = extractedEvents.length - readyCount;
  const filteredEvents = extractedEvents.filter(
    (event) =>
      (qualityFilter === "All" || event.quality === qualityFilter) &&
      (disciplineFilter === "All" || event.discipline === disciplineFilter) &&
      `${event.event} ${event.assetTag} ${event.location}`
        .toLowerCase()
        .includes(eventQuery.toLowerCase()),
  );
  const selectedEvent =
    extractedEvents.find((event) => event.id === selectedEventId) ??
    extractedEvents[0];
  const matchProposals = useMemo(
    () => buildMatchProposals(extractedEvents),
    [extractedEvents],
  );
  const matchCounts = {
    high: matchProposals.filter((p) => p.route === "High confidence").length,
    review: matchProposals.filter((p) => p.route === "Review").length,
    unmatched: matchProposals.filter((p) => p.route === "Unmatched").length,
  };
  const filteredMatches = matchProposals.filter(
    (p) =>
      (matchRoute === "All" || p.route === matchRoute) &&
      (matchDiscipline === "All" || p.event.discipline === matchDiscipline) &&
      `${p.event.event} ${p.candidate?.name ?? ""} ${p.event.assetTag}`
        .toLowerCase()
        .includes(matchQuery.toLowerCase()),
  );
  const selectedMatch =
    matchProposals.find((p) => p.event.id === selectedMatchId) ??
    matchProposals[0];
  const reviewDetail = matchProposals.find(
    (p) => p.event.id === reviewDetailId,
  );
  const proposalCount = matchCounts.high + matchCounts.review;

  async function completeImport() {
    if (importStatus === "loading") return;
    setImportStatus("loading");
    try {
      const receipt = {
        importRunId: "PRJ-DEMO-001:DPR_26_Sep_2026.xlsx:2026-09-26",
        file: source?.name,
        reportDate: "26 Sep 2026",
        rows: extractedEvents.length,
        events: extractedEvents,
        proposals: matchProposals
          .filter((proposal) => proposal.candidate)
          .map((proposal) => ({
            eventId: proposal.event.id,
            candidateId: proposal.candidate!.id,
            confidence: proposal.confidence,
            route: proposal.route,
          })),
        review: matchCounts.review,
        unmatched: matchCounts.unmatched,
        status: "Complete",
        completedAt: new Date().toISOString(),
      };
      localStorage.setItem(
        `execlink:import:${receipt.importRunId}`,
        JSON.stringify(receipt),
      );
      await Promise.resolve();
      setConfirmImport(false);
      setImportStatus("complete");
    } catch {
      setConfirmImport(false);
      setImportStatus("error");
    }
  }

  function resetImport() {
    setSource(null);
    setStep(1);
    setMappings(AUTO_MAPPINGS);
    setEventQuery("");
    setMatchQuery("");
    setImportStatus("review");
    setReviewDetailId(null);
    setConfirmImport(false);
  }

  function focusReviewRoute(route: MatchRoute | null) {
    setReviewExpanded(route);
    if (route)
      requestAnimationFrame(() =>
        document
          .getElementById(
            `review-route-${route.toLowerCase().replace(" ", "-")}`,
          )
          ?.scrollIntoView({ block: "nearest", behavior: "smooth" }),
      );
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (confirmImport) {
          setConfirmImport(false);
        } else if (reviewDetailId) {
          setReviewDetailId(null);
        } else if (historyOpen) {
          setHistoryOpen(false);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirmImport, reviewDetailId, historyOpen]);

  function validateAndSelect(file?: File) {
    setStep(1);
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ACCEPTED_EXTENSIONS.has(extension)) {
      setError("Unsupported file type. Choose a CSV, XLSX, XLS or PDF file.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("This file exceeds the 25 MB upload limit.");
      return;
    }
    setError(null);
    setSource(sourceFromFile(file));
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    validateAndSelect(event.target.files?.[0]);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    validateAndSelect(event.dataTransfer.files?.[0]);
  }

  function chooseSample() {
    setError(null);
    setStep(1);
    setSource(SAMPLE_DPR);
  }

  function continueToStructure() {
    if (!source) return;
    setStep(2);
  }

  function updateMapping(sourceField: string, target: CanonicalField) {
    setMappings((current) =>
      current.map((mapping) =>
        mapping.source === sourceField
          ? {
              ...mapping,
              target,
              confidence: target === mapping.target ? mapping.confidence : 100,
            }
          : mapping,
      ),
    );
  }

  return (
    <div className="ingest-root">
      <header className="ingest-page-head">
        <div>
          <p className="ingest-eyebrow">DATA · 05</p>
          <h1>Data Ingestion</h1>
          <p className="ingest-subtitle">
            Turn field reports into schedule-linked execution events.
          </p>
        </div>
        <button
          className="button secondary"
          type="button"
          disabled={!source}
          onClick={() => setHistoryOpen(true)}
          title={
            source
              ? "View current import run"
              : "Available after selecting a source"
          }
        >
          <History size={14} aria-hidden /> Import History
        </button>
      </header>

      <nav className="ingest-stepper" aria-label="Data ingestion pipeline">
        {PIPELINE.map((label, index) => (
          <div
            className={`ingest-step${index + 1 === step ? " is-active" : ""}${index + 1 < step ? " is-complete" : ""}`}
            key={label}
            aria-current={index + 1 === step ? "step" : undefined}
          >
            <span className="ingest-step-index">
              {index + 1 < step ? (
                <Check size={11} aria-hidden />
              ) : (
                String(index + 1).padStart(2, "0")
              )}
            </span>
            <span className="ingest-step-label">{label}</span>
            {index < PIPELINE.length - 1 && (
              <span className="ingest-step-line" aria-hidden />
            )}
          </div>
        ))}
      </nav>

      {step === 1 ? (
        <main className="ingest-workspace">
          <section
            className={`ingest-source${source ? " has-source" : ""}`}
            aria-labelledby="import-source-title"
          >
            <div className="ingest-section-head">
              <div>
                <h2 id="import-source-title">
                  {source ? "Source ready" : "Import execution data"}
                </h2>
                <p>
                  {source
                    ? "Review the selected source before structure detection."
                    : "Upload a DPR, spreadsheet, site diary or schedule export."}
                </p>
              </div>
            </div>

            <input
              ref={inputRef}
              className="sr-only"
              type="file"
              accept=".csv,.xlsx,.xls,.pdf"
              onChange={onInputChange}
              aria-describedby={error ? "ingest-file-error" : undefined}
            />

            {source ? (
              <>
                <div className="ingest-selected" aria-live="polite">
                  <div className="ingest-file-icon">
                    <FileSpreadsheet size={24} aria-hidden />
                  </div>
                  <div className="ingest-selected-copy">
                    <div className="ingest-selected-name-row">
                      <strong title={source.name}>{source.name}</strong>
                      {source.synthetic && (
                        <span className="ingest-demo-badge">DEMO</span>
                      )}
                    </div>
                    <span>{source.description}</span>
                    <small>
                      {source.size} · {source.extension}
                      {source.synthetic ? " · Synthetic source" : ""}
                    </small>
                  </div>
                  <span className="ingest-ready">
                    <Check size={13} aria-hidden /> Ready
                  </span>
                  <button
                    className="button secondary ingest-replace"
                    type="button"
                    onClick={() => inputRef.current?.click()}
                  >
                    <RefreshCw size={13} aria-hidden /> Replace
                  </button>
                </div>

                <section
                  className="ingest-inspection"
                  aria-labelledby="source-inspection-title"
                >
                  <h3 id="source-inspection-title">SOURCE INSPECTION</h3>
                  <div className="ingest-inspection-metrics">
                    <div>
                      <strong>{source.rows ?? "—"}</strong>
                      <span>Data rows</span>
                    </div>
                    <div>
                      <strong>{source.columns ?? "—"}</strong>
                      <span>Columns</span>
                    </div>
                    <div>
                      <strong>{source.extension}</strong>
                      <span>File type</span>
                    </div>
                  </div>
                  <dl className="ingest-detection-strip">
                    <div>
                      <dt>Detected workbook</dt>
                      <dd>{source.sheet ?? source.description}</dd>
                    </div>
                    <div>
                      <dt>Header row</dt>
                      <dd>Row 1</dd>
                    </div>
                    <div>
                      <dt>Data rows</dt>
                      <dd>{source.rows ?? "Pending scan"}</dd>
                    </div>
                    <div>
                      <dt>Detection</dt>
                      <dd className="is-ready">Ready for structure analysis</dd>
                    </div>
                  </dl>
                </section>
              </>
            ) : (
              <div
                className={`ingest-dropzone${dragActive ? " is-dragging" : ""}`}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={(event) => {
                  if (
                    !event.currentTarget.contains(event.relatedTarget as Node)
                  )
                    setDragActive(false);
                }}
                onDrop={onDrop}
              >
                <span className="ingest-upload-icon">
                  <UploadCloud size={25} aria-hidden />
                </span>
                <strong>Drop execution report here</strong>
                <span>CSV, XLSX, XLS or PDF · Max 25 MB</span>
                <button
                  className="button primary"
                  type="button"
                  onClick={() => inputRef.current?.click()}
                >
                  Choose File
                </button>
                <small>or drag and drop</small>
              </div>
            )}

            {error && (
              <p
                className="ingest-file-error"
                id="ingest-file-error"
                role="alert"
              >
                {error}
              </p>
            )}

            {!source && (
              <div className="ingest-demo-source">
                <div className="ingest-demo-label">DEMO SOURCE</div>
                <div className="ingest-demo-card">
                  <span className="ingest-demo-icon">
                    <FileSpreadsheet size={20} aria-hidden />
                  </span>
                  <div className="ingest-demo-copy">
                    <div>
                      <strong>DPR_26_Sep_2026.xlsx</strong>
                      <span className="ingest-demo-badge">DEMO</span>
                    </div>
                    <span>Daily Progress Report</span>
                    <small>24 rows · 8 columns · 2.4 MB · Synthetic</small>
                  </div>
                  <button
                    className="ingest-sample-action"
                    type="button"
                    onClick={chooseSample}
                  >
                    Use Sample DPR <ArrowRight size={13} aria-hidden />
                  </button>
                </div>
              </div>
            )}

            <div className="ingest-source-footer">
              <span className={source ? "is-visible" : ""} aria-live="polite">
                {source ? (
                  <>
                    <Check size={13} aria-hidden /> Source ready for structure
                    detection
                  </>
                ) : (
                  "Select one source to continue."
                )}
              </span>
              <button
                className="button primary ingest-continue"
                type="button"
                disabled={!source}
                onClick={continueToStructure}
              >
                Continue to Structure <ArrowRight size={14} aria-hidden />
              </button>
            </div>
          </section>

          <aside className="ingest-context" aria-label="Ingestion context">
            <section className="ingest-context-section">
              <h2>Accepted sources</h2>
              <div className="ingest-context-list">
                <div>
                  <Table2 size={15} aria-hidden />
                  <span>
                    <strong>Spreadsheet</strong>
                    <small>CSV · XLSX · XLS</small>
                  </span>
                </div>
                <div>
                  <FileSpreadsheet size={15} aria-hidden />
                  <span>
                    <strong>Daily Progress Report</strong>
                    <small>Structured / semi-structured</small>
                  </span>
                </div>
                <div>
                  <FileText size={15} aria-hidden />
                  <span>
                    <strong>Site Diary</strong>
                    <small>PDF report</small>
                  </span>
                </div>
                <div>
                  <CalendarClock size={15} aria-hidden />
                  <span>
                    <strong>Schedule Export</strong>
                    <small>Primavera / MS Project</small>
                  </span>
                </div>
              </div>
            </section>

            <section className="ingest-context-section">
              <h2>Live inputs</h2>
              <div className="ingest-live-list">
                <div>
                  <span>Field App</span>
                  <strong>
                    <i />
                    Live
                  </strong>
                </div>
                <div>
                  <span>Time Agent</span>
                  <strong>
                    <i />
                    Live
                  </strong>
                </div>
                <div>
                  <span>Schedule Baseline</span>
                  <strong>
                    <i />
                    Connected
                  </strong>
                </div>
              </div>
            </section>

            <section className="ingest-context-section ingest-next">
              <h2>What happens next</h2>
              <div
                className="ingest-mini-flow"
                aria-label="File, structure, extract, match, verify"
              >
                {[
                  ["File", source ? "complete" : "current"],
                  ["Structure", source ? "next" : "future"],
                  ["Extract", "future"],
                  ["Match", "future"],
                  ["Verify", "future"],
                ].map(([label, state], index) => (
                  <div className={`ingest-flow-node is-${state}`} key={label}>
                    <span>
                      {state === "complete" ? (
                        <Check size={11} aria-hidden />
                      ) : (
                        <FileText size={11} aria-hidden />
                      )}
                    </span>
                    <strong>{label}</strong>
                    {state === "next" && <em>NEXT</em>}
                    {index < 4 && (
                      <ArrowDown
                        className="ingest-flow-arrow"
                        size={11}
                        aria-hidden
                      />
                    )}
                  </div>
                ))}
              </div>
              <p>
                <ShieldCheck size={15} aria-hidden /> Schedule actuals are never
                changed during ingestion.
              </p>
            </section>
          </aside>
        </main>
      ) : step === 2 && source ? (
        <main className="ingest-workspace ingest-structure-workspace">
          <section
            className="ingest-structure-main"
            aria-labelledby="structure-title"
          >
            <div className="ingest-structure-head">
              <div>
                <h2 id="structure-title">Structure detected</h2>
                <p>
                  ExecLink inspected the source and identified the report
                  structure before field mapping.
                </p>
              </div>
              <div className="ingest-structure-source">
                <FileSpreadsheet size={18} aria-hidden />
                <span>
                  <strong>{source.name}</strong>
                  <small>
                    {source.description} · {source.rows ?? "—"} rows ·{" "}
                    {source.columns ?? "—"} columns
                  </small>
                </span>
              </div>
            </div>

            <section className="ingest-detected-sheet">
              <div>
                <span>Detected sheet</span>
                <h3>{source.sheet ?? source.description}</h3>
              </div>
              <span className="ingest-detected-status">
                <Check size={12} aria-hidden /> Detected
              </span>
              <dl>
                <div>
                  <dt>Data rows</dt>
                  <dd>{source.rows ?? "—"}</dd>
                </div>
                <div>
                  <dt>Columns</dt>
                  <dd>{source.columns ?? "—"}</dd>
                </div>
                <div>
                  <dt>Header row</dt>
                  <dd>1</dd>
                </div>
              </dl>
            </section>

            <section
              className="ingest-column-preview"
              aria-labelledby="column-preview-title"
            >
              <h3 id="column-preview-title">COLUMN PREVIEW</h3>
              <div
                className="ingest-column-table"
                role="table"
                aria-label="Detected source columns"
              >
                <div className="ingest-column-row is-header" role="row">
                  <span role="columnheader">Source column</span>
                  <span role="columnheader">Sample value</span>
                  <span role="columnheader">Detected type</span>
                </div>
                {(source.synthetic
                  ? DEMO_COLUMNS
                  : ([
                      [
                        "Source columns",
                        "Preview available after workbook scan",
                        "Pending",
                      ],
                    ] as const)
                ).map(([column, sample, type]) => (
                  <div className="ingest-column-row" role="row" key={column}>
                    <strong role="cell">{column}</strong>
                    <span role="cell" title={sample}>
                      {sample}
                    </span>
                    <em role="cell">{type}</em>
                  </div>
                ))}
              </div>
            </section>

            <footer className="ingest-structure-footer">
              <button
                className="button secondary"
                type="button"
                onClick={() => setStep(1)}
              >
                <ArrowLeft size={14} aria-hidden /> Back
              </button>
              <button
                className="button primary"
                type="button"
                onClick={() => setStep(3)}
              >
                Continue to Map Fields <ArrowRight size={14} aria-hidden />
              </button>
            </footer>
          </section>

          <aside
            className="ingest-structure-check"
            aria-label="Structure check"
          >
            <h2>STRUCTURE CHECK</h2>
            <div>
              {[
                "Sheet detected",
                "Header detected",
                "Rows readable",
                "Columns identified",
                "Required parsing possible",
              ].map((label) => (
                <p key={label}>
                  <span>{label}</span>
                  <Check size={14} aria-hidden />
                </p>
              ))}
            </div>
            <strong>
              <Check size={14} aria-hidden /> Ready for field mapping
            </strong>
            <p className="ingest-trust-note">
              <ShieldCheck size={15} aria-hidden /> Schedule actuals are never
              changed during ingestion.
            </p>
          </aside>
        </main>
      ) : step === 3 && source ? (
        <main className="ingest-map-workspace">
          <section className="ingest-map-main" aria-labelledby="mapping-title">
            <header className="ingest-map-head">
              <div>
                <h2 id="mapping-title">Field mapping</h2>
                <p>
                  Review how source columns map to ExecLink&apos;s execution
                  schema.
                </p>
              </div>
              <div className="ingest-map-summary">
                <strong>
                  {mappingHealth.mapped} of {mappings.length} mapped
                </strong>
                <span>Auto-mapped</span>
              </div>
            </header>

            <div className="ingest-map-source-strip">
              <FileSpreadsheet size={19} aria-hidden />
              <span>
                <strong>{source.name}</strong>
                <small>{source.description}</small>
              </span>
              <em>
                {source.rows ?? "—"} rows&nbsp; • &nbsp;{source.columns ?? "—"}{" "}
                columns
              </em>
              <b>
                <Check size={12} aria-hidden /> Structure verified
              </b>
            </div>

            <section
              className="ingest-mapping-panel"
              aria-label="Source to execution schema mapping"
            >
              <div className="ingest-mapping-toolbar">
                <span>
                  SOURCE DATA <ArrowRight size={12} aria-hidden /> EXECUTION
                  SCHEMA
                </span>
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => setMappings(AUTO_MAPPINGS)}
                >
                  Re-run Auto Map
                </button>
              </div>
              <div className="ingest-mapping-table" role="table">
                <div className="ingest-mapping-row is-header" role="row">
                  <span role="columnheader">Source field</span>
                  <span role="columnheader">Sample value</span>
                  <span aria-hidden>→</span>
                  <span role="columnheader">ExecLink field</span>
                  <span role="columnheader">Type</span>
                  <span role="columnheader">Status</span>
                </div>
                {mappings.map((mapping) => {
                  const duplicate = mappingHealth.duplicates.has(
                    mapping.target,
                  );
                  const ignored = mapping.target === "Ignore Column";
                  const review = mapping.confidence < 90 && !ignored;
                  return (
                    <div
                      className={`ingest-mapping-row${duplicate ? " has-error" : ""}`}
                      role="row"
                      key={mapping.source}
                    >
                      <strong role="cell">{mapping.source}</strong>
                      <span
                        className="ingest-map-sample"
                        role="cell"
                        title={mapping.sample}
                      >
                        {mapping.sample}
                      </span>
                      <span className="ingest-map-arrow" aria-hidden>
                        →
                      </span>
                      <label className="ingest-map-select">
                        <span className="sr-only">
                          Map {mapping.source} to ExecLink field
                        </span>
                        <select
                          value={mapping.target}
                          onChange={(event) =>
                            updateMapping(
                              mapping.source,
                              event.target.value as CanonicalField,
                            )
                          }
                        >
                          {CANONICAL_FIELDS.map((field) => (
                            <option key={field}>{field}</option>
                          ))}
                        </select>
                      </label>
                      <span className="ingest-map-type" role="cell">
                        {mapping.detectedType}
                      </span>
                      <span
                        className={`ingest-map-status${duplicate ? " is-error" : review ? " is-review" : ignored ? " is-neutral" : " is-mapped"}`}
                        role="cell"
                      >
                        {duplicate ? (
                          "Duplicate mapping"
                        ) : ignored ? (
                          "Ignored"
                        ) : review ? (
                          `${mapping.confidence}% · Review`
                        ) : (
                          <>
                            <Check size={11} aria-hidden /> {mapping.confidence}
                            %
                          </>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            <footer className="ingest-map-footer">
              <button
                className="button secondary"
                type="button"
                onClick={() => setStep(2)}
              >
                <ArrowLeft size={14} aria-hidden /> Back
              </button>
              <span className={mappingHealth.valid ? "is-valid" : "is-invalid"}>
                {mappingHealth.valid ? (
                  <>
                    <Check size={13} aria-hidden /> All required fields mapped
                  </>
                ) : (
                  `Required field missing: ${mappingHealth.missingRequired[0] ?? "Resolve duplicate mapping"}`
                )}
              </span>
              <button
                className="button primary"
                type="button"
                disabled={!mappingHealth.valid}
                onClick={() => setStep(4)}
              >
                Continue to Extract <ArrowRight size={14} aria-hidden />
              </button>
            </footer>
          </section>

          <aside className="ingest-map-health" aria-label="Mapping health">
            <h2>MAPPING HEALTH</h2>
            <div className="ingest-map-health-total">
              <strong>
                {mappingHealth.mapped} / {mappings.length}
              </strong>
              <span>Fields mapped</span>
            </div>
            <dl>
              <div>
                <dt>Required fields</dt>
                <dd
                  className={
                    mappingHealth.missingRequired.length ? "is-error" : "is-ok"
                  }
                >
                  {mappingHealth.missingRequired.length
                    ? "Incomplete"
                    : "✓ Complete"}
                </dd>
              </div>
              <div>
                <dt>Unmapped</dt>
                <dd>
                  {mappings.length -
                    mappingHealth.mapped -
                    mappingHealth.ignored}
                </dd>
              </div>
              <div>
                <dt>Needs review</dt>
                <dd>{mappingHealth.needsReview}</dd>
              </div>
              <div>
                <dt>Ignored</dt>
                <dd>{mappingHealth.ignored}</dd>
              </div>
            </dl>
            <section>
              <h3>REQUIRED EXECUTION FIELDS</h3>
              {REQUIRED_FIELDS.map((field) => {
                const isMapped = mappings.some(
                  (mapping) => mapping.target === field,
                );
                return (
                  <p className={isMapped ? "" : "is-missing"} key={field}>
                    {isMapped ? (
                      <Check size={12} aria-hidden />
                    ) : (
                      <span aria-hidden>!</span>
                    )}
                    <span>{field}</span>
                  </p>
                );
              })}
            </section>
            <section>
              <h3>NORMALIZATION</h3>
              <p>
                <span>Source format</span>
                <strong>{source.description}</strong>
              </p>
              <p>
                <span>Output</span>
                <strong>Execution Event Schema</strong>
              </p>
              <p>
                <span>Rows ready</span>
                <strong>{source.rows ?? "—"}</strong>
              </p>
            </section>
            <p className="ingest-trust-note">
              <ShieldCheck size={15} aria-hidden /> Field mapping normalizes
              source data. It does not update schedule actuals.
            </p>
          </aside>
        </main>
      ) : step === 4 && source ? (
        <main className="ingest-extract-workspace">
          <section className="ingest-extract-main">
            <header className="ingest-extract-head">
              <div>
                <h2>Execution events extracted</h2>
                <p>
                  {extractedEvents.length} report rows normalized into
                  structured field events.
                </p>
              </div>
              <div>
                <span>{source.name}</span>
                <strong>
                  <Check size={12} aria-hidden /> Extraction complete
                </strong>
              </div>
            </header>
            <div className="ingest-extract-metrics">
              {[
                [extractedEvents.length, "Events extracted", ""],
                [
                  mappings.filter((m) => m.target !== "Ignore Column").length,
                  "Fields normalized",
                  "",
                ],
                [readyCount, "Ready", "is-ready"],
                [reviewCount, "Need review", "is-review"],
              ].map(([value, label, tone]) => (
                <div className={String(tone)} key={String(label)}>
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <section className="ingest-events">
              <div className="ingest-events-toolbar">
                <h3>EXTRACTED EVENTS</h3>
                <label>
                  <Search size={13} aria-hidden />
                  <input
                    value={eventQuery}
                    onChange={(e) => setEventQuery(e.target.value)}
                    placeholder="Search events..."
                    aria-label="Search extracted events"
                  />
                </label>
                <div>
                  {(["All", "Ready", "Review"] as const).map((filter) => (
                    <button
                      className={qualityFilter === filter ? "is-active" : ""}
                      onClick={() => setQualityFilter(filter)}
                      type="button"
                      key={filter}
                    >
                      {filter === "Review" ? "Needs review" : filter}
                    </button>
                  ))}
                </div>
                <select
                  aria-label="Filter by discipline"
                  value={disciplineFilter}
                  onChange={(e) => setDisciplineFilter(e.target.value)}
                >
                  <option>All</option>
                  {[...new Set(extractedEvents.map((e) => e.discipline))].map(
                    (d) => (
                      <option key={d}>{d}</option>
                    ),
                  )}
                </select>
              </div>
              <div className="ingest-event-table" role="table">
                <div className="ingest-event-row is-header" role="row">
                  <span>Event</span>
                  <span>Discipline</span>
                  <span>Asset / Tag</span>
                  <span>Location</span>
                  <span>Progress</span>
                  <span>Time</span>
                  <span>Quality</span>
                </div>
                {filteredEvents.map((event) => (
                  <button
                    className={`ingest-event-row${event.id === selectedEvent.id ? " is-selected" : ""}`}
                    type="button"
                    role="row"
                    onClick={() => {
                      setSelectedEventId(event.id);
                      setShowSourceRow(false);
                    }}
                    key={event.id}
                  >
                    <strong>{event.event}</strong>
                    <span>{event.discipline}</span>
                    <span>{event.assetTag}</span>
                    <span>{event.location}</span>
                    <span>{event.progress}%</span>
                    <span>{event.timestamp}</span>
                    <em
                      className={
                        event.quality === "Ready" ? "is-ready" : "is-review"
                      }
                    >
                      {event.quality === "Ready" ? (
                        <Check size={11} aria-hidden />
                      ) : (
                        <AlertTriangle size={11} aria-hidden />
                      )}
                      {event.quality}
                    </em>
                  </button>
                ))}
              </div>
            </section>
            <footer className="ingest-extract-footer">
              <button
                className="button secondary"
                type="button"
                onClick={() => setStep(3)}
              >
                <ArrowLeft size={14} /> Back
              </button>
              <span>
                <strong>
                  ✓ {readyCount} events ready for schedule matching
                </strong>
                <small>{reviewCount} require review</small>
              </span>
              <button
                className="button primary"
                type="button"
                onClick={() => setStep(5)}
              >
                Continue to Match <ArrowRight size={14} />
              </button>
            </footer>
          </section>
          <aside className="ingest-event-inspector">
            <header>
              <span>STRUCTURED EVENT</span>
              <h2>{selectedEvent.event}</h2>
              <p>
                Row {String(selectedEvent.row).padStart(2, "0")} · {source.name}
              </p>
            </header>
            <section>
              <h3>EXECUTION</h3>
              <dl>
                {[
                  ["Event type", selectedEvent.eventType],
                  ["Discipline", selectedEvent.discipline],
                  ["Asset / Tag", selectedEvent.assetTag],
                  ["Location", selectedEvent.location],
                  ["Progress", `${selectedEvent.progress}%`],
                  ["Quantity", selectedEvent.quantity],
                  ["Timestamp", selectedEvent.timestamp],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section>
              <h3>SOURCE</h3>
              <dl>
                <div>
                  <dt>Source</dt>
                  <dd>{source.description}</dd>
                </div>
                <div>
                  <dt>Source row</dt>
                  <dd>{String(selectedEvent.row).padStart(2, "0")}</dd>
                </div>
                <div>
                  <dt>Extraction</dt>
                  <dd>Structured</dd>
                </div>
              </dl>
            </section>
            <section>
              <h3>SOURCE → NORMALIZED</h3>
              {[
                ["Activity Description", "description", selectedEvent.event],
                ["Progress", "progress", `${selectedEvent.progress}%`],
              ].map(([raw, field, value]) => (
                <div className="ingest-transform" key={raw}>
                  <span>
                    {raw}
                    <b>“{selectedEvent.sourceValues[raw]}”</b>
                  </span>
                  <ArrowDown size={12} />
                  <span>
                    {field}
                    <b>{value}</b>
                  </span>
                </div>
              ))}
            </section>
            <section>
              <h3>DATA QUALITY</h3>
              <ul>
                <li>
                  <Check size={11} /> Required fields present
                </li>
                <li>
                  <Check size={11} /> Discipline normalized
                </li>
                <li>
                  <Check size={11} /> Asset identifier recognized
                </li>
                <li className={selectedEvent.issue ? "is-review" : ""}>
                  {selectedEvent.issue ? (
                    <AlertTriangle size={11} />
                  ) : (
                    <Check size={11} />
                  )}{" "}
                  {selectedEvent.issue ?? "Progress value valid"}
                </li>
              </ul>
            </section>
            <button
              className="ingest-source-toggle"
              type="button"
              onClick={() => setShowSourceRow((v) => !v)}
            >
              View source row {showSourceRow ? "−" : "+"}
            </button>
            {showSourceRow && (
              <div className="ingest-source-row">
                {Object.entries(selectedEvent.sourceValues)
                  .filter(([k]) => k !== "Source")
                  .map(([k, v]) => (
                    <p key={k}>
                      <span>{k}</span>
                      <strong>{v}</strong>
                    </p>
                  ))}
              </div>
            )}
            <p className="ingest-trust-note">
              <ShieldCheck size={15} /> Extraction creates normalized events
              only. Schedule actuals are unchanged.
            </p>
          </aside>
        </main>
      ) : step === 5 && source ? (
        <main className="ingest-match-workspace">
          <section className="ingest-match-main">
            <header className="ingest-extract-head">
              <div>
                <h2>Schedule matching</h2>
                <p>
                  ExecLink compared {matchProposals.length} execution events
                  against the current L6 schedule.
                </p>
              </div>
              <div>
                <span>PRJ-DEMO-001 · L6 Schedule</span>
                <strong>
                  <Check size={12} /> Candidate generation complete
                </strong>
              </div>
            </header>
            <div className="ingest-extract-metrics">
              {[
                [matchProposals.length, "Events evaluated", ""],
                [matchCounts.high, "High confidence", "is-ready"],
                [matchCounts.review, "Needs review", "is-review"],
                [matchCounts.unmatched, "Unmatched", "is-unmatched"],
              ].map(([v, l, t]) => (
                <div className={String(t)} key={String(l)}>
                  <strong>{v}</strong>
                  <span>{l}</span>
                </div>
              ))}
            </div>
            <section className="ingest-events ingest-match-results">
              <div className="ingest-events-toolbar">
                <h3>MATCH RESULTS</h3>
                <label>
                  <Search size={13} />
                  <input
                    value={matchQuery}
                    onChange={(e) => setMatchQuery(e.target.value)}
                    placeholder="Search events..."
                    aria-label="Search match results"
                  />
                </label>
                <div>
                  {(
                    ["All", "High confidence", "Review", "Unmatched"] as const
                  ).map((f) => (
                    <button
                      className={matchRoute === f ? "is-active" : ""}
                      onClick={() => setMatchRoute(f)}
                      type="button"
                      key={f}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <select
                  aria-label="Filter match results by discipline"
                  value={matchDiscipline}
                  onChange={(e) => setMatchDiscipline(e.target.value)}
                >
                  <option>All</option>
                  {[...new Set(extractedEvents.map((e) => e.discipline))].map(
                    (d) => (
                      <option key={d}>{d}</option>
                    ),
                  )}
                </select>
              </div>
              <div className="ingest-match-table" role="table">
                <div className="ingest-match-row is-header">
                  <span>Execution event</span>
                  <span>Best schedule match</span>
                  <span>Discipline</span>
                  <span>Confidence</span>
                  <span>Route</span>
                </div>
                {filteredMatches.map((p) => (
                  <button
                    className={`ingest-match-row${p.event.id === selectedMatch.event.id ? " is-selected" : ""}`}
                    type="button"
                    onClick={() => setSelectedMatchId(p.event.id)}
                    key={p.event.id}
                  >
                    <strong>{p.event.event}</strong>
                    <span>
                      {p.candidate
                        ? `${p.candidate.id} · ${p.candidate.name}`
                        : "No reliable schedule activity"}
                    </span>
                    <span>{p.event.discipline}</span>
                    <span className="ingest-confidence">
                      <b>{p.confidence.toFixed(1)}%</b>
                      <i>
                        <i style={{ width: `${p.confidence}%` }} />
                      </i>
                    </span>
                    <em
                      className={`is-${p.route.toLowerCase().replace(" ", "-")}`}
                    >
                      {p.route}
                    </em>
                  </button>
                ))}
              </div>
            </section>
            <footer className="ingest-extract-footer">
              <button
                className="button secondary"
                type="button"
                onClick={() => setStep(4)}
              >
                <ArrowLeft size={14} /> Back
              </button>
              <span>
                <strong>
                  ✓ {matchCounts.high} high-confidence suggestions
                </strong>
                <small>
                  {matchCounts.review} review · {matchCounts.unmatched}{" "}
                  unmatched
                </small>
              </span>
              <button
                className="button primary"
                type="button"
                onClick={() => setStep(6)}
              >
                Continue to Review <ArrowRight size={14} />
              </button>
            </footer>
          </section>
          <aside className="ingest-match-inspector">
            <header>
              <span>MATCH EXPLANATION</span>
              <h2>{selectedMatch.event.event}</h2>
              <p>
                {selectedMatch.event.discipline} ·{" "}
                {selectedMatch.event.assetTag} · {selectedMatch.event.location}
              </p>
            </header>
            {selectedMatch.candidate ? (
              <>
                <section>
                  <h3>BEST CANDIDATE</h3>
                  <strong className="ingest-candidate-id">
                    {selectedMatch.candidate.id}
                  </strong>
                  <h4>{selectedMatch.candidate.name}</h4>
                  <p className="ingest-wbs">
                    {selectedMatch.candidate.wbs.replaceAll(" / ", " → ")}
                  </p>
                  <div className="ingest-match-score">
                    <strong>{selectedMatch.confidence.toFixed(1)}%</strong>
                    <span
                      className={
                        selectedMatch.route === "Review"
                          ? "is-review"
                          : "is-ready"
                      }
                    >
                      {selectedMatch.route === "Review"
                        ? "REVIEW REQUIRED"
                        : "HIGH CONFIDENCE"}
                    </span>
                  </div>
                </section>
                <section>
                  <h3>MATCH SIGNALS</h3>
                  {Object.entries(selectedMatch.candidate.signals).map(
                    ([k, v]) => (
                      <div className="ingest-signal" key={k}>
                        <span>
                          {
                            (
                              {
                                semantic: "Semantic similarity",
                                assetTag: "Asset / Tag",
                                wbsContext: "WBS Context",
                                discipline: "Discipline",
                                temporal: "Temporal fit",
                                location: "Location",
                              } as Record<string, string>
                            )[k]
                          }
                        </span>
                        <i>
                          <i style={{ width: `${v}%` }} />
                        </i>
                        <b>{v}%</b>
                      </div>
                    ),
                  )}
                </section>
                <section>
                  <h3>WHY EXECLINK RECOMMENDS THIS</h3>
                  <p className="ingest-reason">
                    {selectedMatch.route === "Review"
                      ? "Two schedule activities are similarly compatible with this field event. Planner verification is required."
                      : selectedMatch.candidate.reasoning}
                  </p>
                </section>
              </>
            ) : (
              <section className="ingest-no-match">
                <h3>NO RELIABLE MATCH</h3>
                <p>
                  No schedule activity exceeded the minimum matching threshold.
                </p>
                <ul>
                  <li>Activity not present in baseline</li>
                  <li>Different field terminology</li>
                  <li>Work outside current schedule scope</li>
                </ul>
                <strong>
                  Flag for planner review · Potential new activity
                </strong>
              </section>
            )}
            <section>
              <h3>ALTERNATIVE CANDIDATES</h3>
              {selectedMatch.alternatives.map((c) => (
                <div className="ingest-alternative" key={c.id}>
                  <span>
                    <strong>{c.id}</strong>
                    {c.name}
                  </span>
                  <b>{c.confidence.toFixed(1)}%</b>
                </div>
              ))}
              {selectedMatch.candidate &&
                selectedMatch.alternatives.length > 0 && (
                  <p className="ingest-margin">
                    Best {selectedMatch.confidence.toFixed(1)}% · Next{" "}
                    {selectedMatch.alternatives[0].confidence.toFixed(1)}% ·
                    Margin +
                    {(
                      selectedMatch.confidence -
                      selectedMatch.alternatives[0].confidence
                    ).toFixed(1)}{" "}
                    pts
                  </p>
                )}
            </section>
            <p className="ingest-trust-note">
              <ShieldCheck size={15} /> Candidate generation creates proposals
              only. Schedule actuals remain unchanged until human verification.
            </p>
          </aside>
        </main>
      ) : step === 6 && source ? (
        importStatus === "complete" ? (
          <main className="ingest-complete">
            <div>
              <span className="ingest-complete-mark">
                <Check size={22} />
              </span>
              <h2>Import complete</h2>
              <p>{source.name} has been processed successfully.</p>
              <div className="ingest-complete-metrics">
                {[
                  [extractedEvents.length, "Execution Events Created"],
                  [proposalCount, "Match Proposals"],
                  [matchCounts.review, "Awaiting Verification"],
                  [matchCounts.unmatched, "Unmatched"],
                ].map(([v, l]) => (
                  <div key={String(l)}>
                    <strong>{v}</strong>
                    <span>{l}</span>
                  </div>
                ))}
              </div>
              <div className="ingest-complete-flow">
                <span>DPR</span>
                <ArrowRight size={12} />
                <span>{extractedEvents.length} Execution Events</span>
                <ArrowRight size={12} />
                <span>{proposalCount} Match Proposals</span>
                <ArrowRight size={12} />
                <span>{matchCounts.review} Require Review</span>
                <ArrowRight size={12} />
                <span>Planner Verification</span>
              </div>
              <div className="ingest-complete-actions">
                <button
                  className="button primary"
                  onClick={() => router.push("/verification-center")}
                  type="button"
                >
                  Open Verification Center <ArrowRight size={14} />
                </button>
                <button
                  className="button secondary"
                  onClick={() => router.push("/live-execution")}
                  type="button"
                >
                  View Live Execution
                </button>
                <button
                  className="ingest-text-action"
                  onClick={resetImport}
                  type="button"
                >
                  Import Another Report
                </button>
              </div>
              <p className="ingest-trust-note">
                <ShieldCheck size={15} /> Import completed without changing
                schedule actuals.
              </p>
            </div>
          </main>
        ) : (
          <main className="ingest-review-workspace">
            <section className="ingest-review-main">
              <header className="ingest-extract-head">
                <div>
                  <h2>Review import</h2>
                  <p>
                    Review how {extractedEvents.length} execution events will
                    enter ExecLink before completing this ingestion run.
                  </p>
                </div>
              </header>
              <div className="ingest-review-source">
                <FileSpreadsheet size={20} />
                <span>
                  <strong>{source.name}</strong>
                  <small>{source.description}</small>
                </span>
                <em>
                  {source.rows} rows ·{" "}
                  {mappings.filter((m) => m.target !== "Ignore Column").length}{" "}
                  normalized fields · 26 Sep 2026
                </em>
                <b>
                  <Check size={12} /> Ready to import
                </b>
              </div>
              <div className="ingest-extract-metrics">
                {[
                  {
                    value: extractedEvents.length,
                    label: "Execution Events",
                    type: "",
                    route: "High confidence" as MatchRoute,
                    ariaLabel: "Execution Events: 24 total. Focus routing groups.",
                    active: false,
                  },
                  {
                    value: matchCounts.high,
                    label: "High Confidence",
                    type: "is-ready",
                    route: "High confidence" as MatchRoute,
                    ariaLabel: "High Confidence: 5 proposals. Expand high confidence group.",
                    active: reviewExpanded === "High confidence",
                  },
                  {
                    value: matchCounts.review,
                    label: "Needs Verification",
                    type: "is-review",
                    route: "Review" as MatchRoute,
                    ariaLabel: "Needs Verification: 2 proposals. Expand needs verification group.",
                    active: reviewExpanded === "Review",
                  },
                  {
                    value: matchCounts.unmatched,
                    label: "Unmatched",
                    type: "is-unmatched",
                    route: "Unmatched" as MatchRoute,
                    ariaLabel: "Unmatched: 17 events. Expand unmatched group.",
                    active: reviewExpanded === "Unmatched",
                  },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className={`ingest-metric-btn ${item.type}${item.active ? " is-active" : ""}`}
                    aria-label={item.ariaLabel}
                    onClick={() => focusReviewRoute(item.route)}
                  >
                    <strong>{item.value}</strong>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
              <section className="ingest-routing">
                <h3>HOW THESE EVENTS WILL BE ROUTED</h3>
                {(
                  ["High confidence", "Review", "Unmatched"] as MatchRoute[]
                ).map((route) => {
                  const items = matchProposals.filter((p) => p.route === route);
                  const open = reviewExpanded === route;
                  const isExpanded = Boolean(reviewShowAll[route]);
                  const visibleItems =
                    items.length <= 3 || isExpanded ? items : items.slice(0, 3);
                  const panelId = `review-route-${route.toLowerCase().replace(" ", "-")}`;
                  return (
                    <div
                      className={`ingest-route-group is-${route.toLowerCase().replace(" ", "-")}${open ? " is-open" : ""}`}
                      key={route}
                    >
                      <button
                        type="button"
                        aria-expanded={open}
                        aria-controls={panelId}
                        onClick={() => setReviewExpanded(open ? null : route)}
                      >
                        <i aria-hidden />
                        <span>
                          <strong>
                            {route === "Review" ? "Needs verification" : route}
                          </strong>
                          <small>
                            {route === "High confidence"
                              ? "Match proposals ready"
                              : route === "Review"
                                ? "Planner review required"
                                : "No reliable schedule activity"}
                          </small>
                        </span>
                        <b>{items.length} events</b>
                        <ChevronDown
                          className="ingest-route-chevron"
                          size={15}
                          aria-hidden
                        />
                      </button>
                      <div
                        className="ingest-route-collapse"
                        id={panelId}
                        hidden={!open}
                      >
                        <div className="ingest-route-items">
                          {visibleItems.map((p) => (
                            <button
                              type="button"
                              className={reviewDetailId === p.event.id ? "is-selected" : ""}
                              onClick={() => setReviewDetailId(p.event.id)}
                              key={p.event.id}
                              aria-label={`View routing detail for ${p.event.event}`}
                            >
                              <span>
                                <strong>{p.event.event}</strong>
                                <small>
                                  {p.candidate
                                    ? `${p.candidate.id} · ${p.candidate.name}`
                                    : p.alternatives[0]
                                      ? `Closest: ${p.alternatives[0].id} · ${p.alternatives[0].name}`
                                      : "No reliable schedule activity"}
                                </small>
                              </span>
                              <b>{p.confidence.toFixed(1)}%</b>
                            </button>
                          ))}
                          <p>
                            {route === "High confidence"
                              ? "Strong candidates remain proposals until planner verification."
                              : route === "Review"
                                ? "Plausible candidates will enter the Verification Center."
                                : "Preserved for manual linking or classification as unplanned work."}
                          </p>
                          {items.length > 3 && (
                            <button
                              type="button"
                              className="ingest-view-all"
                              onClick={() =>
                                setReviewShowAll((prev) => ({
                                  ...prev,
                                  [route]: !prev[route],
                                }))
                              }
                            >
                              {isExpanded
                                ? "Show less ↑"
                                : `View all ${items.length} →`}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </section>
              <footer className="ingest-extract-footer">
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => setStep(5)}
                >
                  <ArrowLeft size={14} /> Back to Match
                </button>
                <span>
                  <ShieldCheck size={13} />
                  <strong>No schedule actuals will be changed.</strong>
                  {importStatus === "error" && (
                    <small>
                      Import could not be completed. Your review is preserved.
                    </small>
                  )}
                </span>
                <button
                  className="button primary"
                  type="button"
                  disabled={importStatus === "loading"}
                  onClick={() => setConfirmImport(true)}
                >
                  {importStatus === "error" ? (
                    "Retry Import"
                  ) : importStatus === "loading" ? (
                    <>
                      <LoaderCircle className="ingest-spin" size={14} />{" "}
                      Completing Import…
                    </>
                  ) : (
                    <>
                      Complete Import <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </footer>
            </section>
            <aside className="ingest-review-rail">
              <section>
                <h3>IMPORT SUMMARY</h3>
                <dl>
                  {[
                    ["Source", source?.description ?? "Daily progress report"],
                    ["File", source?.name ?? "DPR_26_Sep_2026.xlsx"],
                    ["Report date", "26 Sep 2026"],
                    ["Rows", extractedEvents.length],
                    [
                      "Fields",
                      mappings.filter((m) => m.target !== "Ignore Column")
                        .length,
                    ],
                    ["Project", "PRJ-DEMO-001"],
                  ].map(([k, v]) => (
                    <div key={String(k)}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              </section>
              <section>
                <h3>DESTINATIONS</h3>
                <dl>
                  {[
                    ["Execution Events", extractedEvents.length],
                    ["Match Proposals", proposalCount],
                    ["Verification Queue", matchCounts.review],
                    ["Unmatched Events", matchCounts.unmatched],
                  ].map(([k, v]) => (
                    <div key={String(k)}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
                <p>High-confidence matches remain proposals until verified.</p>
              </section>
              <section>
                <h3>SAFETY CHECKS</h3>
                <ul>
                  {[
                    "Source structure validated",
                    "Required fields normalized",
                    "Matching completed",
                    "Ambiguous matches routed for review",
                    "Unmatched events preserved",
                    "Schedule actuals remain unchanged",
                  ].map((x) => (
                    <li key={x}>
                      <Check size={11} />
                      {x}
                    </li>
                  ))}
                </ul>
              </section>
              <p className="ingest-trust-note">
                <ShieldCheck size={15} />
                <span>
                  <strong>
                    Schedule actuals are never changed during ingestion.
                  </strong>{" "}
                  Only explicit planner verification can update trusted actual
                  progress.
                </span>
              </p>
            </aside>
            {reviewDetail && (
              <div
                className="context-drawer-layer"
                role="presentation"
                onClick={() => setReviewDetailId(null)}
              >
                <aside
                  className="context-drawer ingest-event-drawer"
                  onClick={(e) => e.stopPropagation()}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="ingest-drawer-event-title"
                >
                  <header className="context-drawer-head">
                    <div>
                      <span className="drawer-eyebrow">
                        {reviewDetail.route === "High confidence"
                          ? "MATCH PROPOSAL"
                          : reviewDetail.route === "Review"
                            ? "NEEDS VERIFICATION"
                            : "UNMATCHED EVENT"}
                      </span>
                      <h2 id="ingest-drawer-event-title">
                        {reviewDetail.event.event}
                      </h2>
                      <div className="drawer-subhead">
                        <span className="drawer-id">{reviewDetail.event.id}</span>
                        <span
                          className={`ingest-badge is-${reviewDetail.route.toLowerCase().replace(" ", "-")}`}
                        >
                          {reviewDetail.route === "Review"
                            ? "Needs Verification"
                            : reviewDetail.route}
                        </span>
                      </div>
                    </div>
                    <button
                      className="button icon-only close-button"
                      type="button"
                      onClick={() => setReviewDetailId(null)}
                      aria-label="Close event detail"
                    >
                      <X size={16} />
                    </button>
                  </header>

                  <div className="context-drawer-scroll">
                    <section className="drawer-section">
                      <h3>Execution Event</h3>
                      <dl>
                        <div>
                          <dt>Discipline</dt>
                          <dd>{reviewDetail.event.discipline}</dd>
                        </div>
                        <div>
                          <dt>Asset / Tag</dt>
                          <dd>{reviewDetail.event.assetTag}</dd>
                        </div>
                        <div>
                          <dt>Location</dt>
                          <dd>{reviewDetail.event.location}</dd>
                        </div>
                        <div>
                          <dt>Progress</dt>
                          <dd>{reviewDetail.event.progress}%</dd>
                        </div>
                        <div>
                          <dt>Quantity</dt>
                          <dd>{reviewDetail.event.quantity}</dd>
                        </div>
                        <div>
                          <dt>Timestamp</dt>
                          <dd>{reviewDetail.event.timestamp}</dd>
                        </div>
                        <div>
                          <dt>Source</dt>
                          <dd>{source?.name ?? "DPR_26_Sep_2026.xlsx"}</dd>
                        </div>
                      </dl>
                    </section>

                    {reviewDetail.route === "High confidence" &&
                      reviewDetail.candidate && (
                        <>
                          <section className="drawer-section">
                            <h3>Best Schedule Candidate</h3>
                            <dl>
                              <div>
                                <dt>Activity ID</dt>
                                <dd className="font-mono">
                                  {reviewDetail.candidate.id}
                                </dd>
                              </div>
                              <div>
                                <dt>Activity Name</dt>
                                <dd>{reviewDetail.candidate.name}</dd>
                              </div>
                              <div>
                                <dt>Confidence</dt>
                                <dd className="text-green font-bold">
                                  {reviewDetail.confidence.toFixed(1)}%
                                </dd>
                              </div>
                              <div>
                                <dt>Route</dt>
                                <dd>High confidence</dd>
                              </div>
                              <div>
                                <dt>WBS Path</dt>
                                <dd>{reviewDetail.candidate.wbs}</dd>
                              </div>
                              <div>
                                <dt>Execution Window</dt>
                                <dd>
                                  {reviewDetail.candidate.baselineStart} →{" "}
                                  {reviewDetail.candidate.baselineFinish}
                                </dd>
                              </div>
                            </dl>
                          </section>

                          <section className="drawer-section">
                            <h3>Why This Match</h3>
                            <p className="ingest-drawer-reasoning">
                              {reviewDetail.candidate.reasoning}
                            </p>
                            <div className="ingest-drawer-signals">
                              {[
                                [
                                  "Semantic",
                                  reviewDetail.candidate.signals.semantic,
                                ],
                                [
                                  "Asset / Tag",
                                  reviewDetail.candidate.signals.assetTag,
                                ],
                                [
                                  "WBS Context",
                                  reviewDetail.candidate.signals.wbsContext,
                                ],
                                [
                                  "Discipline",
                                  reviewDetail.candidate.signals.discipline,
                                ],
                                [
                                  "Temporal",
                                  reviewDetail.candidate.signals.temporal,
                                ],
                                [
                                  "Location",
                                  reviewDetail.candidate.signals.location,
                                ],
                              ].map(([name, score]) => (
                                <div
                                  key={String(name)}
                                  className="ingest-signal-row"
                                >
                                  <span>{name}</span>
                                  <div className="ingest-signal-track">
                                    <div
                                      className="ingest-signal-fill"
                                      style={{ width: `${score}%` }}
                                    />
                                  </div>
                                  <b>{score}%</b>
                                </div>
                              ))}
                            </div>
                          </section>
                        </>
                      )}

                    {reviewDetail.route === "Review" && (
                      <section className="drawer-section">
                        <h3>Best Schedule Candidate</h3>
                        <dl>
                          <div>
                            <dt>Candidate</dt>
                            <dd>
                              {reviewDetail.candidate
                                ? `${reviewDetail.candidate.id} · ${reviewDetail.candidate.name}`
                                : reviewDetail.alternatives[0]
                                  ? `${reviewDetail.alternatives[0].id} · ${reviewDetail.alternatives[0].name}`
                                  : "None"}
                            </dd>
                          </div>
                          <div>
                            <dt>Confidence</dt>
                            <dd className="text-amber font-bold">
                              {reviewDetail.confidence.toFixed(1)}%
                            </dd>
                          </div>
                          <div>
                            <dt>Route</dt>
                            <dd>Needs Verification</dd>
                          </div>
                        </dl>

                        <div className="ingest-review-notice">
                          <h4>Why planner review is required</h4>
                          <p>
                            Match confidence (
                            {reviewDetail.confidence.toFixed(1)}%) is below the
                            90.0% automated routing threshold but meets the
                            review criteria. Contextual ambiguity requires
                            human planner review to prevent unverified schedule
                            updates.
                          </p>
                          {reviewDetail.candidate && (
                            <p className="ingest-drawer-reasoning mt-2">
                              {reviewDetail.candidate.reasoning}
                            </p>
                          )}
                        </div>

                        <div className="ingest-review-routing-info">
                          <ShieldCheck size={14} />
                          <span>
                            This proposal will enter the Verification Queue upon
                            completing import. Schedule actuals remain unchanged
                            until planner verification.
                          </span>
                        </div>
                      </section>
                    )}

                    {reviewDetail.route === "Unmatched" && (
                      <section className="drawer-section">
                        <h3>Unmatched Event Analysis</h3>
                        <dl>
                          <div>
                            <dt>Status</dt>
                            <dd className="text-red font-bold">Unmatched</dd>
                          </div>
                          <div>
                            <dt>Best Available Candidate</dt>
                            <dd>
                              {reviewDetail.alternatives[0]
                                ? `${reviewDetail.alternatives[0].id} · ${reviewDetail.alternatives[0].name}`
                                : "None identified"}
                            </dd>
                          </div>
                          <div>
                            <dt>Highest Confidence</dt>
                            <dd>{reviewDetail.confidence.toFixed(1)}%</dd>
                          </div>
                        </dl>

                        <div className="ingest-unmatched-notice">
                          <h4>Reason threshold was not satisfied</h4>
                          <p>
                            No schedule activity matched above the minimum 70.0%
                            confidence threshold. The highest candidate scored{" "}
                            {reviewDetail.confidence.toFixed(1)}%, indicating
                            insufficient lexical and contextual alignment with
                            baseline Level 6 schedule activities.
                          </p>
                          <p className="mt-2 text-muted">
                            Preserved for manual linking or classification as
                            unplanned work. No schedule match was invented.
                          </p>
                        </div>
                      </section>
                    )}
                  </div>

                  <footer className="context-drawer-footer">
                    <span className="ingest-drawer-trust">
                      <ShieldCheck size={13} /> Proposal only · Schedule
                      actuals unchanged
                    </span>
                    <button
                      className="button secondary"
                      type="button"
                      onClick={() => setReviewDetailId(null)}
                    >
                      Close
                    </button>
                  </footer>
                </aside>
              </div>
            )}
            {confirmImport && (
              <div
                className="ingest-confirm-backdrop"
                role="presentation"
                onClick={() => setConfirmImport(false)}
              >
                <div
                  className="ingest-confirm"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="complete-import-title"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h2 id="complete-import-title">Complete this import?</h2>
                  <p>
                    {extractedEvents.length} execution events will be added to
                    ExecLink.
                  </p>
                  <ul>
                    <li>
                      {matchCounts.high} high-confidence proposals available for
                      verification
                    </li>
                    <li>
                      {matchCounts.review} ambiguous proposals routed to the
                      verification queue
                    </li>
                    <li>
                      {matchCounts.unmatched} unmatched events preserved for
                      manual resolution
                    </li>
                  </ul>
                  <strong>
                    <ShieldCheck size={14} /> No schedule actuals will be
                    changed.
                  </strong>
                  <div>
                    <button
                      className="button secondary"
                      type="button"
                      disabled={importStatus === "loading"}
                      onClick={() => setConfirmImport(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="button primary"
                      type="button"
                      disabled={importStatus === "loading"}
                      onClick={completeImport}
                    >
                      {importStatus === "loading" ? (
                        <>
                          <LoaderCircle className="ingest-spin" size={14} />{" "}
                          Completing Import…
                        </>
                      ) : (
                        "Complete Import"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>
        )
      ) : null}
      {historyOpen && (
        <div
          className="context-drawer-layer"
          role="presentation"
          onClick={() => setHistoryOpen(false)}
        >
          <aside
            className="context-drawer ingest-history-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-drawer-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="context-drawer-head">
              <div>
                <span className="drawer-eyebrow">INGESTION AUDIT</span>
                <h2 id="history-drawer-title">Import History</h2>
                <div className="drawer-subhead">
                  <span className="drawer-id">
                    PRJ-DEMO-001 · Daily Progress Reports
                  </span>
                </div>
              </div>
              <button
                className="button icon-only close-button"
                type="button"
                onClick={() => setHistoryOpen(false)}
                aria-label="Close import history"
              >
                <X size={16} />
              </button>
            </header>

            <div className="context-drawer-scroll">
              <section className="drawer-section">
                <h3>Active Ingestion Run</h3>
                <div className="ingest-history-card">
                  <div className="ingest-history-card-head">
                    <div>
                      <strong>{source?.name ?? "DPR_26_Sep_2026.xlsx"}</strong>
                      <small>Report Date: 26 Sep 2026</small>
                    </div>
                    <span
                      className={`ingest-badge ${importStatus === "complete" ? "is-high-confidence" : "is-review"}`}
                    >
                      {importStatus === "complete"
                        ? "Completed"
                        : "Ready to complete"}
                    </span>
                  </div>
                  <div className="ingest-history-stats">
                    <div>
                      <span>Total Events</span>
                      <strong>{extractedEvents.length}</strong>
                    </div>
                    <div>
                      <span>High Conf</span>
                      <strong className="text-green">{matchCounts.high}</strong>
                    </div>
                    <div>
                      <span>Needs Review</span>
                      <strong className="text-amber">
                        {matchCounts.review}
                      </strong>
                    </div>
                    <div>
                      <span>Unmatched</span>
                      <strong className="text-red">
                        {matchCounts.unmatched}
                      </strong>
                    </div>
                  </div>
                  <div className="ingest-history-meta">
                    <span>
                      Run ID:{" "}
                      <code>PRJ-DEMO-001:DPR_26_Sep_2026.xlsx:2026-09-26</code>
                    </span>
                  </div>
                </div>
              </section>

              <section className="drawer-section">
                <h3>Previous Ingestion Runs</h3>
                <div className="ingest-history-empty">
                  <Clock size={22} />
                  <p>No previous import runs recorded.</p>
                  <small>
                    Historical completed runs for PRJ-DEMO-001 will be stored
                    here with immutable audit timestamps.
                  </small>
                </div>
              </section>
            </div>

            <footer className="context-drawer-footer">
              <span className="ingest-drawer-trust">
                <ShieldCheck size={13} /> Complete audit lineage preserved
              </span>
              <button
                className="button secondary"
                type="button"
                onClick={() => setHistoryOpen(false)}
              >
                Close
              </button>
            </footer>
          </aside>
        </div>
      )}
    </div>
  );
}
