"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  Search,
  ArrowRight,
  ChevronDown,
  X,
  ShieldCheck,
  User,
  Clock,
  ArrowUpDown,
  RotateCcw,
  Check,
  Info,
  Layers,
  AlertCircle,
  Eye,
  SlidersHorizontal,
  MoreHorizontal,
  Square,
  CheckSquare,
  Sparkles,
} from "lucide-react";
import {
  VerificationItem,
  VerificationPriority,
  VerificationCategory,
  VerificationStatus,
  loadVerificationQueue,
  saveVerificationQueue,
  itemMatchesCategory,
  recordAuditEntry,
  updateScheduleActual,
  recordChangeBacklog,
  getAuditLedger,
  INITIAL_VERIFICATION_QUEUE,
} from "@/data/verification-center";
import { MatchCandidate } from "@/data/match-review";
import { useAuth } from "@/lib/auth";

export function VerificationCenterWorkspace() {
  type QueueSort = "priority" | "confidence-desc" | "confidence-asc" | "age" | "id";
  // State
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection & Focus
  const [selectedId, setSelectedId] = useState<string>("VER-003");
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  // Filter & Search Controls
  const [searchQuery, setSearchQuery] = useState("");
  const { hasPermission } = useAuth();
  const canVerify = hasPermission("match.verify");
  const [activeCategory, setActiveCategory] = useState<VerificationCategory>("All");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [disciplineFilter, setDisciplineFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [ageFilter, setAgeFilter] = useState("All");
  const [confidenceFilter, setConfidenceFilter] = useState("All");
  const [reviewerFilter, setReviewerFilter] = useState("All");
  const [sortBy, setSortBy] = useState<QueueSort>("priority");

  // Utilities dropdown
  const [overflowOpen, setOverflowOpen] = useState(false);

  // Modals & Drawers
  const [evidenceItem, setEvidenceItem] = useState<VerificationItem | null>(null);
  const [rejectingItem, setRejectingItem] = useState<VerificationItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("Wrong activity");
  const [rejectionNote, setRejectionNote] = useState("");
  const [flaggingItem, setFlaggingItem] = useState<VerificationItem | null>(null);
  const [flaggingReason, setFlaggingReason] = useState("Unreferenced scope not currently scheduled");
  const [flaggingNote, setFlaggingNote] = useState("");
  const [alternativePickerItem, setAlternativePickerItem] = useState<VerificationItem | null>(null);
  const [batchAssignOpen, setBatchAssignOpen] = useState(false);
  const [batchPriorityOpen, setBatchPriorityOpen] = useState(false);

  // Toast / feedback message
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "info" } | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const decisionLockRef = useRef<string | null>(null);

  const resolveProposal = (queue: VerificationItem[], proposal: string | null) => {
    if (!proposal || !queue || queue.length === 0) return null;
    const clean = proposal.trim();

    // 1. Exact match on proposalId, id, eventId, or candidate activity ID
    const exact = queue.find(
      (item) =>
        item.proposalId.toLowerCase() === clean.toLowerCase() ||
        item.id.toLowerCase() === clean.toLowerCase() ||
        item.eventId.toLowerCase() === clean.toLowerCase() ||
        item.candidate.id.toLowerCase() === clean.toLowerCase()
    );
    if (exact) return exact;

    // 2. Pattern matching for PRP-01, PROP-01, VER-1, etc.
    const numMatch = /(?:prp|prop|ver)[-_]?(\d+)/i.exec(clean);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      const padded3 = String(num).padStart(3, "0");
      const padded2 = String(num).padStart(2, "0");

      const byPropSuffix = queue.find(
        (item) =>
          item.proposalId.toLowerCase().includes(`prop-0926-${padded3}`) ||
          item.proposalId.toLowerCase().includes(`prop-${padded3}`) ||
          item.proposalId.toLowerCase().includes(`prop-${padded2}`)
      );
      if (byPropSuffix) return byPropSuffix;

      const byItemId = queue.find(
        (item) =>
          item.id.toLowerCase() === `ver-${padded3}` ||
          item.id.toLowerCase() === `ver-${padded2}` ||
          item.id.toLowerCase() === `ver-${num}`
      );
      if (byItemId) return byItemId;

      if (num >= 1 && num <= queue.length) {
        return queue[num - 1];
      }
    }

    return null;
  };

  const selectProposal = (item: VerificationItem, updateHistory = true) => {
    setSelectedId(item.id);
    if (updateHistory && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("proposal", item.proposalId);
      window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const loaded = loadVerificationQueue();
        setItems(loaded);
        const requested = resolveProposal(loaded, new URL(window.location.href).searchParams.get("proposal"));
        setSelectedId(requested?.id ?? loaded[0]?.id ?? "");
        setLoading(false);
      } catch {
        setError("Unable to initialize verification queue. Please retry.");
        setLoading(false);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleHistoryNavigation = () => {
      const proposal = new URL(window.location.href).searchParams.get("proposal");
      const requested = resolveProposal(items, proposal);
      if (requested) {
        setSelectedId(requested.id);
      } else if (items.length > 0) {
        setSelectedId(items[0].id);
      }
    };
    window.addEventListener("popstate", handleHistoryNavigation);
    return () => window.removeEventListener("popstate", handleHistoryNavigation);
  }, [items]);

  const showToast = (text: string, type: "success" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ---------------------------------------------------------------------------
  // SEMANTIC OPERATIONAL METRICS (EXACT DEFINITIONS RECONCILING QUEUE COUNTERS)
  // ---------------------------------------------------------------------------
  // 1. Unresolved: all items not yet verified or rejected
  const unresolvedItems = useMemo(
    () => items.filter((i) => i.status !== "Verified" && i.status !== "Rejected"),
    [items]
  );

  // 2. Direct Match Reviews: unresolved items with high/review confidence (>= 70%)
  const matchReviewItems = useMemo(
    () =>
      unresolvedItems.filter(
        (i) =>
          i.category !== "Unmatched" &&
          i.category !== "New Activity" &&
          i.category !== "Low Confidence" &&
          i.status !== "Flagged New Activity" &&
          i.candidate.confidence >= 70
      ),
    [unresolvedItems]
  );

  // 3. Classification Decisions: unmatched field updates or scope triage (< 70% confidence)
  const classificationItems = useMemo(
    () =>
      unresolvedItems.filter(
        (i) =>
          i.category === "Unmatched" ||
          i.category === "New Activity" ||
          i.category === "Low Confidence" ||
          i.status === "Flagged New Activity" ||
          i.candidate.confidence < 70
      ),
    [unresolvedItems]
  );

  // 4. High Priority count
  const highPriorityCount = useMemo(
    () => unresolvedItems.filter((i) => i.priority === "Critical" || i.priority === "High").length,
    [unresolvedItems]
  );

  // 5. Oldest item age among direct match reviews / queue
  const oldestItem = useMemo(() => {
    const pool = matchReviewItems.length > 0 ? matchReviewItems : unresolvedItems;
    if (pool.length === 0) return null;
    const sorted = [...pool].sort((a, b) => b.ageMinutes - a.ageMinutes);
    return sorted[0];
  }, [matchReviewItems, unresolvedItems]);

  const oldestAge = oldestItem ? oldestItem.age : "—";

  // 6. Avg confidence of match reviews
  const avgConfidence = useMemo(() => {
    if (matchReviewItems.length === 0) return "—";
    const sum = matchReviewItems.reduce((acc, curr) => acc + curr.candidate.confidence, 0);
    return `${Math.round(sum / matchReviewItems.length)}%`;
  }, [matchReviewItems]);

  // Active filter count for badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (disciplineFilter !== "All") count++;
    if (sourceFilter !== "All") count++;
    if (ageFilter !== "All") count++;
    if (confidenceFilter !== "All") count++;
    if (reviewerFilter !== "All") count++;
    if (sortBy !== "priority") count++;
    return count;
  }, [disciplineFilter, sourceFilter, ageFilter, confidenceFilter, reviewerFilter, sortBy]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const categories: VerificationCategory[] = [
      "All",
      "Critical",
      "Low Confidence",
      "Ambiguous",
      "Unmatched",
      "New Activity",
    ];
    const counts: Record<VerificationCategory, number> = {
      All: unresolvedItems.length,
      Critical: 0,
      "Low Confidence": 0,
      Ambiguous: 0,
      Unmatched: 0,
      "New Activity": 0,
    };
    categories.forEach((cat) => {
      if (cat !== "All") {
        counts[cat] = items.filter((item) => itemMatchesCategory(item, cat)).length;
      }
    });
    return counts;
  }, [items, unresolvedItems]);

  // Filter & Sort Items for the Review Queue
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        // Category
        if (!itemMatchesCategory(item, activeCategory)) return false;

        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = item.eventTitle.toLowerCase().includes(q);
          const matchActId = item.candidate.id.toLowerCase().includes(q);
          const matchActName = item.candidate.name.toLowerCase().includes(q);
          const matchAsset = item.assetTag.toLowerCase().includes(q);
          const matchReviewer = item.reviewer.toLowerCase().includes(q);
          if (!matchTitle && !matchActId && !matchActName && !matchAsset && !matchReviewer) {
            return false;
          }
        }

        // Discipline
        if (disciplineFilter !== "All" && item.discipline !== disciplineFilter) return false;

        // Source
        if (sourceFilter !== "All" && !item.source.toLowerCase().includes(sourceFilter.toLowerCase())) return false;

        // Age
        if (ageFilter === "< 2h" && item.ageMinutes >= 120) return false;
        if (ageFilter === "< 4h" && item.ageMinutes >= 240) return false;
        if (ageFilter === "< 24h" && item.ageMinutes >= 1440) return false;

        // Confidence
        if (confidenceFilter === "High (>=85%)" && item.candidate.confidence < 85) return false;
        if (
          confidenceFilter === "Medium (70-84%)" &&
          (item.candidate.confidence < 70 || item.candidate.confidence >= 85)
        )
          return false;
        if (confidenceFilter === "Low (<70%)" && item.candidate.confidence >= 70) return false;

        // Reviewer
        if (reviewerFilter !== "All") {
          if (reviewerFilter === "Unassigned" && item.reviewer !== "Unassigned") return false;
          if (reviewerFilter !== "Unassigned" && !item.reviewer.includes(reviewerFilter)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "priority") {
          const rank = { Critical: 3, High: 2, Normal: 1 };
          return rank[b.priority] - rank[a.priority];
        }
        if (sortBy === "confidence-desc") {
          return b.candidate.confidence - a.candidate.confidence;
        }
        if (sortBy === "confidence-asc") {
          return a.candidate.confidence - b.candidate.confidence;
        }
        if (sortBy === "age") {
          return b.ageMinutes - a.ageMinutes;
        }
        if (sortBy === "id") {
          return a.candidate.id.localeCompare(b.candidate.id);
        }
        return 0;
      });
  }, [
    items,
    activeCategory,
    searchQuery,
    disciplineFilter,
    sourceFilter,
    ageFilter,
    confidenceFilter,
    reviewerFilter,
    sortBy,
  ]);

  // Selected item for the center & right panels
  const selectedItem = useMemo(() => {
    return filteredItems.find((i) => i.id === selectedId) || filteredItems[0] || null;
  }, [selectedId, filteredItems]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (filteredItems.length > 0 && !filteredItems.some((item) => item.id === selectedId)) {
        setSelectedId(filteredItems[0].id);
      }
      const visibleIds = new Set(filteredItems.map((item) => item.id));
      setCheckedIds((current) => {
        const next = new Set([...current].filter((id) => visibleIds.has(id)));
        return next.size === current.size ? current : next;
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [filteredItems, selectedId]);

  // Batch Selection
  const toggleCheck = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCheckAll = () => {
    if (checkedIds.size === filteredItems.length && filteredItems.length > 0) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(filteredItems.map((i) => i.id)));
    }
  };

  // Review Next action (selects next highest priority unresolved item)
  const handleReviewNext = () => {
    if (unresolvedItems.length === 0) {
      showToast("All items in queue have been resolved.", "info");
      return;
    }
    const priorityRank = { Critical: 3, High: 2, Normal: 1 };
    const sorted = [...unresolvedItems].sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority]);
    selectProposal(sorted[0]);
    showToast(`Focused on ${sorted[0].id}: ${sorted[0].eventTitle}`);
  };

  // Export queue to CSV
  const handleExportQueue = () => {
    const headers = [
      "ID",
      "Proposal ID",
      "Event Title",
      "Discipline",
      "Candidate Activity ID",
      "Candidate Name",
      "Confidence %",
      "Priority",
      "Status",
      "Reviewer",
      "Age",
      "Source File",
    ];
    const rows = filteredItems.map((i) => [
      i.id,
      i.proposalId,
      `"${i.eventTitle.replace(/"/g, '""')}"`,
      i.discipline,
      i.candidate.id,
      `"${i.candidate.name.replace(/"/g, '""')}"`,
      i.candidate.confidence,
      i.priority,
      i.status,
      i.reviewer,
      i.age,
      i.sourceFile,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `execlink_verification_queue_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filteredItems.length} items to CSV.`);
  };

  // Export audit ledger to JSON
  const handleExportAuditLedger = () => {
    const ledger = getAuditLedger();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(ledger, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `execlink_audit_ledger_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${ledger.length} audit records.`);
  };

  // Export selected items
  const handleExportSelected = () => {
    const selected = items.filter((i) => checkedIds.has(i.id));
    if (selected.length === 0) return;
    const headers = [
      "ID",
      "Proposal ID",
      "Event Title",
      "Discipline",
      "Candidate Activity ID",
      "Candidate Name",
      "Confidence %",
      "Priority",
      "Status",
      "Reviewer",
    ];
    const rows = selected.map((i) => [
      i.id,
      i.proposalId,
      `"${i.eventTitle.replace(/"/g, '""')}"`,
      i.discipline,
      i.candidate.id,
      `"${i.candidate.name.replace(/"/g, '""')}"`,
      i.candidate.confidence,
      i.priority,
      i.status,
      i.reviewer,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `execlink_selected_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${selected.length} selected items to CSV.`);
  };

  // Reset Demo Queue
  const handleResetQueue = () => {
    setItems(INITIAL_VERIFICATION_QUEUE);
    saveVerificationQueue(INITIAL_VERIFICATION_QUEUE);
    setSelectedId(INITIAL_VERIFICATION_QUEUE[0].id);
    setCheckedIds(new Set());
    showToast("Verification queue reset to initial state.");
  };

  // ---------------------------------------------------------------------------
  // DECISION ACTIONS (PRESERVING PHASE 3 INVARIANTS)
  // ---------------------------------------------------------------------------

  // 1. APPROVE MATCH (Primary human verification boundary)
  const handleApproveMatch = async (item: VerificationItem) => {
    if (!canVerify) return;
    if (!canVerify) return;
    if (decisionLockRef.current || item.status === "Verified" || item.status === "Rejected") return;
    decisionLockRef.current = item.id;
    setProcessingId(item.id);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const effectiveReviewer =
      item.reviewer && item.reviewer !== "Unassigned"
        ? item.reviewer
        : "T. Patel";

    const nextItems = items.map((i) => {
      if (i.id === item.id) {
        return {
          ...i,
          status: "Verified" as VerificationStatus,
          verifiedAt: new Date().toISOString(),
          verifiedBy: `${effectiveReviewer} (Lead Planner)`,
          reviewer: effectiveReviewer,
        };
      }
      return i;
    });

    setItems(nextItems);
    saveVerificationQueue(nextItems);

    const eventDate = item.timestamp.includes("·")
      ? item.timestamp.split("·")[0]?.trim()
      : "26 Sep 2026";

    // Update authorized schedule actuals in schedule storage
    updateScheduleActual(
      item.candidate.id,
      item.candidate.proposedProgress,
      item.candidate.proposedProgress === 100 ? "Completed" : "In Progress",
      {
        actualFinish: item.candidate.proposedProgress === 100 ? eventDate : undefined,
        updatedBy: `${effectiveReviewer} (Lead Planner)`,
      }
    );

    // Append tamper-evident audit trail entry
    recordAuditEntry({
      action: "proposal.verified",
      proposalId: item.proposalId,
      eventId: item.eventId,
      activityId: item.candidate.id,
      actor: `${effectiveReviewer} (Lead Planner)`,
      confidence: item.candidate.confidence,
      previousProgress: item.candidate.currentProgress,
      newProgress: item.candidate.proposedProgress,
      reason: `Verified against source evidence (${item.sourceFile} · row ${item.sourceRow})`,
    });

    showToast(`Match verified. Schedule actuals updated: ${item.candidate.id} → ${item.candidate.proposedProgress}%.`);

    // Auto-advance to next unresolved queue item if available
    const remainingUnresolved = nextItems.filter(
      (i) => i.id !== item.id && i.status !== "Verified" && i.status !== "Rejected"
    );
    if (remainingUnresolved.length > 0) {
      const priorityRank = { Critical: 3, High: 2, Normal: 1 };
      const sorted = [...remainingUnresolved].sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority]);
      selectProposal(sorted[0]);
    }
    decisionLockRef.current = null;
    setProcessingId(null);
  };

  // 2. REJECT PROPOSAL (Rejection confirmation modal)
  const handleConfirmReject = async () => {
    if (!rejectingItem || decisionLockRef.current) return;
    const item = rejectingItem;
    if (item.status === "Verified" || item.status === "Rejected") return;
    decisionLockRef.current = item.id;
    setProcessingId(item.id);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const effectiveReviewer =
      item.reviewer && item.reviewer !== "Unassigned"
        ? item.reviewer
        : "T. Patel";

    const nextItems = items.map((i) => {
      if (i.id === item.id) {
        return {
          ...i,
          status: "Rejected" as VerificationStatus,
          rejectionReason,
          plannerNote: rejectionNote,
          reviewer: effectiveReviewer,
        };
      }
      return i;
    });

    setItems(nextItems);
    saveVerificationQueue(nextItems);

    // Append audit trail entry — schedule actuals remain completely unchanged
    recordAuditEntry({
      action: "proposal.rejected",
      proposalId: item.proposalId,
      eventId: item.eventId,
      activityId: item.candidate.id,
      actor: `${effectiveReviewer} (Lead Planner)`,
      confidence: item.candidate.confidence,
      previousProgress: item.candidate.currentProgress,
      newProgress: item.candidate.currentProgress,
      reason: `Rejected: ${rejectionReason}${rejectionNote ? " — " + rejectionNote : ""}`,
    });

    setRejectingItem(null);
    setRejectionNote("");
    showToast(`Rejected proposal for ${item.eventTitle}. Schedule actuals unchanged.`, "info");

    // Auto-advance to next unresolved queue item if available
    const remainingUnresolved = nextItems.filter(
      (i) => i.id !== item.id && i.status !== "Verified" && i.status !== "Rejected"
    );
    if (remainingUnresolved.length > 0) {
      const priorityRank = { Critical: 3, High: 2, Normal: 1 };
      const sorted = [...remainingUnresolved].sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority]);
      selectProposal(sorted[0]);
    }
    decisionLockRef.current = null;
    setProcessingId(null);
  };

  // 3. MARK AS NEW ACTIVITY (Routes to change backlog)
  const handleConfirmFlagNewActivity = async () => {
    if (!flaggingItem || decisionLockRef.current) return;
    const item = flaggingItem;
    if (item.status === "Verified" || item.status === "Rejected") return;
    decisionLockRef.current = item.id;
    setProcessingId(item.id);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const effectiveReviewer =
      item.reviewer && item.reviewer !== "Unassigned"
        ? item.reviewer
        : "T. Patel";

    const nextItems = items.map((i) => {
      if (i.id === item.id) {
        return {
          ...i,
          status: "Flagged New Activity" as VerificationStatus,
          plannerNote: flaggingNote || flaggingReason,
          reviewer: effectiveReviewer,
        };
      }
      return i;
    });

    setItems(nextItems);
    saveVerificationQueue(nextItems);

    // Record change backlog entry — baseline schedule untouched
    recordChangeBacklog(item, `${flaggingReason}: ${flaggingNote || "Field scope requires new WBS activity"}`);

    // Record audit trail entry
    recordAuditEntry({
      action: "proposal.flagged_new",
      proposalId: item.proposalId,
      eventId: item.eventId,
      activityId: item.candidate.id,
      actor: `${effectiveReviewer} (Lead Planner)`,
      confidence: item.candidate.confidence,
      previousProgress: item.candidate.currentProgress,
      newProgress: item.candidate.currentProgress,
      reason: `Routed to change backlog: ${flaggingReason}${flaggingNote ? " — " + flaggingNote : ""}`,
    });

    setFlaggingItem(null);
    setFlaggingNote("");
    showToast(`Routed ${item.id} to Project Change Backlog.`);

    // Auto-advance to next unresolved queue item if available
    const remainingUnresolved = nextItems.filter(
      (i) => i.id !== item.id && i.status !== "Verified" && i.status !== "Rejected"
    );
    if (remainingUnresolved.length > 0) {
      const priorityRank = { Critical: 3, High: 2, Normal: 1 };
      const sorted = [...remainingUnresolved].sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority]);
      selectProposal(sorted[0]);
    }
    decisionLockRef.current = null;
    setProcessingId(null);
  };

  // 4. CHOOSE ALTERNATIVE CANDIDATE (Updates review selection, does NOT modify actuals)
  const handleSelectAlternative = (item: VerificationItem, alt: MatchCandidate) => {
    const oldCandidate = item.candidate;
    const nextAlternatives = item.alternatives.filter((a) => a.id !== alt.id);
    nextAlternatives.push(oldCandidate);

    const proposed = alt.proposedProgress > 0 ? alt.proposedProgress : item.reportedProgress;
    const delta = Math.max(0, proposed - alt.currentProgress);
    const chosenCandidate: MatchCandidate = {
      ...alt,
      proposedProgress: proposed,
      deltaProgress: delta,
    };

    const updatedItem: VerificationItem = {
      ...item,
      candidate: chosenCandidate,
      alternatives: nextAlternatives,
      signals: chosenCandidate.signals,
      reasoning: chosenCandidate.reasoning,
      status: "Review Required",
    };

    const nextItems = items.map((i) => (i.id === item.id ? updatedItem : i));
    setItems(nextItems);
    saveVerificationQueue(nextItems);

    if (alternativePickerItem) {
      setAlternativePickerItem(null);
    }

    showToast(`Candidate changed to ${alt.id}. Click Approve Match to verify.`);
  };

  // Batch actions
  const handleBatchAssign = (reviewerName: string) => {
    const nextItems = items.map((i) => {
      if (checkedIds.has(i.id)) {
        return {
          ...i,
          reviewer: reviewerName,
          status: (i.status === "Review Required" ? "Assigned" : i.status) as VerificationStatus,
        };
      }
      return i;
    });
    setItems(nextItems);
    saveVerificationQueue(nextItems);
    setBatchAssignOpen(false);
    showToast(`Assigned ${checkedIds.size} item(s) to ${reviewerName}.`);
  };

  const handleBatchSetPriority = (priority: VerificationPriority) => {
    const nextItems = items.map((i) => {
      if (checkedIds.has(i.id)) {
        return { ...i, priority };
      }
      return i;
    });
    setItems(nextItems);
    saveVerificationQueue(nextItems);
    setBatchPriorityOpen(false);
    showToast(`Set priority of ${checkedIds.size} item(s) to ${priority}.`);
  };

  if (loading) {
    return (
      <div className="verif-container" aria-busy="true" aria-label="Loading Verification Center">
        <div className="verif-header-skeleton" />
        <div className="verif-strip-skeleton" />
        <div className="verif-workspace">
          <div className="verif-pane verif-pane-skeleton">
            <div className="verif-skeleton-header" />
            <div className="verif-skeleton-cards">
              <div className="verif-skeleton-card" />
              <div className="verif-skeleton-card" />
              <div className="verif-skeleton-card" />
            </div>
          </div>
          <div className="verif-pane verif-pane-skeleton">
            <div className="verif-skeleton-header" />
            <div className="verif-skeleton-content">
              <div className="verif-skeleton-block" style={{ height: 140 }} />
              <div className="verif-skeleton-block" style={{ height: 120 }} />
              <div className="verif-skeleton-block" style={{ height: 100 }} />
            </div>
          </div>
          <div className="verif-pane verif-pane-skeleton">
            <div className="verif-skeleton-header" />
            <div className="verif-skeleton-content">
              <div className="verif-skeleton-block" style={{ height: 160 }} />
              <div className="verif-skeleton-block" style={{ height: 90 }} />
              <div className="verif-skeleton-block" style={{ height: 60 }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="verif-container">
        <div className="verif-error-card">
          <AlertCircle size={28} className="text-rose-500" />
          <h3>Failed to Load Verification Queue</h3>
          <p>{error}</p>
          <button className="button primary" onClick={handleResetQueue}>
            <RotateCcw size={14} /> Retry / Reset Queue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="verif-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`verif-toast verif-toast-${toastMessage.type}`}>
          {toastMessage.type === "success" ? <CheckCircle2 size={16} /> : <Info size={16} />}
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="verif-toast-close" aria-label="Close notification">
            <X size={12} />
          </button>
        </div>
      )}

      {/* 1. Header (Linear-like clean typography, reset moved to overflow) */}
      <header className="verif-header">
        <div className="verif-header-titles">
          <p className="eyebrow">CONTROL · 06</p>
          <h1 className="verif-title">Verification Center</h1>
          <p className="verif-subtitle">
            Resolve uncertain execution updates before they affect trusted project actuals.
          </p>
        </div>
        <div className="verif-header-actions">
          <button className="button secondary verif-action-btn" onClick={handleExportQueue} title="Export current queue to CSV">
            <Download size={14} /> Export Queue
          </button>
          <button className="button primary verif-action-btn" onClick={handleReviewNext} title="Jump to highest priority review item">
            <ArrowRight size={14} /> Review Next
          </button>

          {/* Overflow Menu for Reset & Utilities */}
          <div className="verif-relative">
            <button
              className="button secondary verif-action-btn verif-icon-btn"
              onClick={() => setOverflowOpen(!overflowOpen)}
              title="More options & demo utilities"
              aria-label="More options"
            >
              <MoreHorizontal size={15} />
            </button>
            {overflowOpen && (
              <div className="verif-dropdown-popover verif-header-popover">
                <button
                  className="verif-dropdown-item flex items-center gap-2"
                  onClick={() => {
                    setOverflowOpen(false);
                    handleResetQueue();
                  }}
                >
                  <RotateCcw size={13} /> Reset Demo State
                </button>
                <button
                  className="verif-dropdown-item flex items-center gap-2"
                  onClick={() => {
                    setOverflowOpen(false);
                    handleExportAuditLedger();
                  }}
                >
                  <FileText size={13} /> Export Audit Ledger (JSON)
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. Compact Operational Strip (~42-46px height) */}
      <section className="verif-strip" aria-label="Operational Overview">
        <div className="verif-strip-left">
          <span className="verif-strip-stat">
            <span className="verif-dot-active" />
            <strong>{unresolvedItems.length}</strong> unresolved
          </span>
          <span className="verif-strip-sep">•</span>
          <span className="verif-strip-stat">
            <strong>{matchReviewItems.length}</strong> match reviews
          </span>
          <span className="verif-strip-sep">•</span>
          <span className="verif-strip-stat">
            <strong>{classificationItems.length}</strong> classification decisions
          </span>
        </div>

        <div className="verif-strip-divider" aria-hidden="true" />

        <div className="verif-strip-right">
          <span className="verif-strip-stat">
            <AlertTriangle size={13} className="text-amber-500" />
            <strong className="text-amber-400">{highPriorityCount}</strong> high priority
          </span>
          <span className="verif-strip-sep">•</span>
          <span className="verif-strip-stat">
            <Clock size={13} className="text-muted" />
            Oldest <strong>{oldestAge}</strong>
          </span>
          <span className="verif-strip-sep">•</span>
          <span className="verif-strip-stat">
            <Sparkles size={13} className="text-blue-400" />
            Avg confidence <strong>{avgConfidence}</strong>
          </span>
        </div>
      </section>

      {/* Batch Action Bar (Triggered on Checkbox Select) */}
      {checkedIds.size > 0 && (
        <section className="verif-batch-bar" aria-label="Batch Actions">
          <div className="verif-batch-info">
            <span className="verif-batch-count">{checkedIds.size}</span>
            <span>item{checkedIds.size > 1 ? "s" : ""} selected</span>
          </div>
          <div className="verif-batch-actions">
            <div className="verif-relative">
                <button
                  className="button secondary sm"
                  onClick={() => {
                    setBatchAssignOpen(!batchAssignOpen);
                    setBatchPriorityOpen(false);
                  }}
                  disabled={!canVerify}
                  title={!canVerify ? "You do not have permission to batch assign" : ""}
                >
                <User size={13} /> Assign Reviewer
              </button>
              {batchAssignOpen && (
                <div className="verif-dropdown-popover">
                  <button className="verif-dropdown-item" onClick={() => handleBatchAssign("T. Patel")}>
                    Assign to T. Patel
                  </button>
                  <button className="verif-dropdown-item" onClick={() => handleBatchAssign("M. Vance")}>
                    Assign to M. Vance
                  </button>
                  <button className="verif-dropdown-item" onClick={() => handleBatchAssign("Unassigned")}>
                    Set Unassigned
                  </button>
                </div>
              )}
            </div>

            <div className="verif-relative">
              <button
                className="button secondary sm"
                onClick={() => {
                  setBatchPriorityOpen(!batchPriorityOpen);
                  setBatchAssignOpen(false);
                }}
              >
                <ArrowUpDown size={13} /> Set Priority
              </button>
              {batchPriorityOpen && (
                <div className="verif-dropdown-popover">
                  <button className="verif-dropdown-item" onClick={() => handleBatchSetPriority("Critical")}>
                    Critical (Red)
                  </button>
                  <button className="verif-dropdown-item" onClick={() => handleBatchSetPriority("High")}>
                    High (Amber)
                  </button>
                  <button className="verif-dropdown-item" onClick={() => handleBatchSetPriority("Normal")}>
                    Normal (Neutral)
                  </button>
                </div>
              )}
            </div>

            <button className="button secondary sm" onClick={handleExportSelected}>
              <Download size={13} /> Export Selected
            </button>

            <button className="button tertiary sm" onClick={() => setCheckedIds(new Set())}>
              Deselect All
            </button>
          </div>
        </section>
      )}

      {/* 4. PRIMARY THREE-PANE WORKSPACE (Left: ~32%, Center: ~44%, Right: ~24%) */}
      <main className="verif-workspace">
        {/* PANE 1: LEFT REVIEW QUEUE */}
        <section className="verif-pane verif-pane-queue" aria-label="Review Queue">
          <div className="verif-pane-header">
            <div className="verif-pane-title-group">
              <h2 className="verif-pane-title">REVIEW QUEUE</h2>
              <span className="verif-pane-subtitle">
                {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}
              </span>
            </div>
            {filteredItems.length > 0 && (
              <button
                className="verif-select-all-btn"
                onClick={toggleCheckAll}
                title={checkedIds.size === filteredItems.length ? "Deselect all" : "Select all"}
              >
                {checkedIds.size === filteredItems.length && filteredItems.length > 0 ? (
                  <CheckSquare size={13} className="text-blue-400" />
                ) : (
                  <Square size={13} className="text-muted" />
                )}
                <span>Select all</span>
              </button>
            )}
          </div>

          {/* Search Box & Filter Chips inside Left Pane */}
          <div className="verif-queue-controls">
            <div className="verif-search-box">
              <Search size={13} className="verif-search-icon" />
              <input
                type="text"
                className="verif-search-input"
                aria-label="Search verification queue"
                placeholder="Search queue, ID, tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="verif-search-clear" onClick={() => setSearchQuery("")} aria-label="Clear search">
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Compact Filter Chips */}
            <div className="verif-filter-chips">
              {(["All", "Critical", "Low Confidence", "Ambiguous", "Unmatched"] as VerificationCategory[]).map((cat) => (
                <button
                  key={cat}
                  className={`verif-chip ${activeCategory === cat ? "is-active" : ""}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  <span>{cat === "Low Confidence" ? "Low confidence" : cat}</span>
                  <span className="verif-chip-count">{categoryCounts[cat]}</span>
                </button>
              ))}

              {/* Toggle for Advanced Filters */}
              <button
                className={`verif-filters-toggle-btn ${filtersOpen || activeFilterCount > 0 ? "is-active" : ""}`}
                onClick={() => setFiltersOpen(!filtersOpen)}
                title="Toggle advanced filters"
                aria-expanded={filtersOpen}
                aria-controls="verification-advanced-filters"
              >
                <SlidersHorizontal size={12} />
                <span>Filters</span>
                {activeFilterCount > 0 && <span className="verif-filter-count-badge">{activeFilterCount}</span>}
                <ChevronDown size={11} className={`verif-filter-caret ${filtersOpen ? "is-open" : ""}`} />
              </button>
            </div>

            {/* Collapsible Advanced Filters Drawer */}
            {filtersOpen && (
              <div id="verification-advanced-filters" className="verif-filter-drawer" aria-label="Advanced Filters">
                <div className="verif-filter-drawer-grid">
                  <div className="verif-filter-item">
                    <label htmlFor="verif-filter-discipline">Discipline</label>
                    <select
                      id="verif-filter-discipline"
                      className="verif-select"
                      value={disciplineFilter}
                      onChange={(e) => setDisciplineFilter(e.target.value)}
                    >
                      <option value="All">All Disciplines</option>
                      <option value="Structural">Structural</option>
                      <option value="Electrical">Electrical</option>
                      <option value="Civil">Civil</option>
                      <option value="Instrumentation">Instrumentation</option>
                      <option value="Piping">Piping</option>
                      <option value="Mechanical">Mechanical</option>
                    </select>
                  </div>

                  <div className="verif-filter-item">
                    <label htmlFor="verif-filter-source">Source Evidence</label>
                    <select
                      id="verif-filter-source"
                      className="verif-select"
                      value={sourceFilter}
                      onChange={(e) => setSourceFilter(e.target.value)}
                    >
                      <option value="All">All Sources</option>
                      <option value="Daily Progress Report">DPR (.xlsx)</option>
                      <option value="Site Diary">Site Diary (.pdf)</option>
                      <option value="Field Update">Field Update</option>
                    </select>
                  </div>

                  <div className="verif-filter-item">
                    <label htmlFor="verif-filter-age">Age in Queue</label>
                    <select
                      id="verif-filter-age"
                      className="verif-select"
                      value={ageFilter}
                      onChange={(e) => setAgeFilter(e.target.value)}
                    >
                      <option value="All">Any Age</option>
                      <option value="< 2h">&lt; 2 hours</option>
                      <option value="< 4h">&lt; 4 hours</option>
                      <option value="< 24h">&lt; 24 hours</option>
                    </select>
                  </div>

                  <div className="verif-filter-item">
                    <label htmlFor="verif-filter-confidence">Confidence Tier</label>
                    <select
                      id="verif-filter-confidence"
                      className="verif-select"
                      value={confidenceFilter}
                      onChange={(e) => setConfidenceFilter(e.target.value)}
                    >
                      <option value="All">All Tiers</option>
                      <option value="High (>=85%)">High (&ge; 85%)</option>
                      <option value="Medium (70-84%)">Medium (70–84%)</option>
                      <option value="Low (<70%)">Low (&lt; 70%)</option>
                    </select>
                  </div>

                  <div className="verif-filter-item">
                    <label htmlFor="verif-filter-reviewer">Reviewer</label>
                    <select
                      id="verif-filter-reviewer"
                      className="verif-select"
                      value={reviewerFilter}
                      onChange={(e) => setReviewerFilter(e.target.value)}
                    >
                      <option value="All">All Reviewers</option>
                      <option value="Unassigned">Unassigned</option>
                      <option value="T. Patel">T. Patel</option>
                      <option value="M. Vance">M. Vance</option>
                    </select>
                  </div>

                  <div className="verif-filter-item">
                    <label htmlFor="verif-filter-sort">Sort Order</label>
                    <select
                      id="verif-filter-sort"
                      className="verif-select"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as QueueSort)}
                    >
                      <option value="priority">Priority (Critical First)</option>
                      <option value="confidence-desc">Confidence: High &rarr; Low</option>
                      <option value="confidence-asc">Confidence: Low &rarr; High</option>
                      <option value="age">Age: Oldest First</option>
                      <option value="id">Activity ID: A-Z</option>
                    </select>
                  </div>
                </div>

                {activeFilterCount > 0 && (
                  <div className="verif-filter-drawer-footer">
                    <span className="text-[10px] text-muted">{activeFilterCount} filter(s) active</span>
                    <button
                      className="button tertiary sm text-[10px] py-0.5 px-2"
                      onClick={() => {
                        setDisciplineFilter("All");
                        setSourceFilter("All");
                        setAgeFilter("All");
                        setConfidenceFilter("All");
                        setReviewerFilter("All");
                        setSortBy("priority");
                      }}
                    >
                      Reset Filters
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="verif-queue-scroll">
            {filteredItems.length === 0 ? (
              <div className="verif-queue-empty">
                <CheckCircle2 size={32} className="text-emerald-500" />
                <p className="font-semibold text-[var(--text-primary)] text-xs mt-2">Queue is clear</p>
                <p className="text-[11px] text-muted text-center mt-1">
                  {searchQuery || activeFilterCount > 0
                    ? "No items match current filters."
                    : "All items have been verified or classified."}
                </p>
              </div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                const isChecked = checkedIds.has(item.id);
                const conf = item.candidate.confidence;
                const isUnmatched = item.category === "Unmatched" || item.id === "VER-005";

                return (
                  <article
                    key={item.id}
                    className={`verif-queue-card ${isSelected ? "is-selected" : ""} ${isChecked ? "is-checked" : ""}`}
                    onClick={() => selectProposal(item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectProposal(item);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={`Review ${item.eventTitle}, ${Math.round(conf)} percent confidence`}
                  >
                    {/* Top Row: Priority Badge & Confidence */}
                    <div className="verif-card-top">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          className="verif-card-check"
                          onClick={(e) => toggleCheck(item.id, e)}
                          title="Select for batch action"
                          aria-pressed={isChecked}
                          aria-label={`${isChecked ? "Deselect" : "Select"} ${item.eventTitle} for batch action`}
                        >
                          {isChecked ? (
                            <CheckSquare size={13} className="text-blue-400" />
                          ) : (
                            <Square size={13} className="text-muted" />
                          )}
                        </button>
                        <span className={`verif-card-priority verif-priority-${item.priority.toLowerCase()}`}>
                          <span className="verif-priority-dot" />
                          {item.priority}
                        </span>
                      </div>

                      <div className="verif-card-conf-wrap">
                        <span className="verif-card-conf-val">{Math.round(conf)}%</span>
                        <div className="verif-card-conf-bar-bg">
                          <div
                            className={`verif-card-conf-bar-fill ${
                              conf >= 85 ? "is-high" : conf >= 70 ? "is-med" : "is-low"
                            }`}
                            style={{ width: `${conf}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Event Title */}
                    <h3 className="verif-card-title">{item.eventTitle}</h3>

                    {/* Metadata: Discipline · Location · Asset */}
                    <div className="verif-card-meta">
                      <span>{item.discipline}</span>
                      <span className="verif-bullet">•</span>
                      <span>{item.location}</span>
                      {item.assetTag && (
                        <>
                          <span className="verif-bullet">•</span>
                          <span className="font-mono text-faint">{item.assetTag}</span>
                        </>
                      )}
                    </div>

                    {/* Suggested Activity or Unmatched Notice */}
                    <div className="verif-card-candidate-row">
                      {!isUnmatched ? (
                        <>
                          <span className="verif-arrow-indicator">&rarr;</span>
                          <span className="verif-card-act-id">{item.candidate.id}</span>
                          <span className="verif-card-act-name truncate">{item.candidate.name}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-rose-400 font-bold">&times;</span>
                          <span className="verif-card-unmatched-text">No reliable schedule candidate</span>
                        </>
                      )}
                    </div>

                    {/* Bottom: Source · Age & Status */}
                    <div className="verif-card-bottom">
                      <span className="verif-card-source-age">
                        {item.source === "Daily Progress Report" ? "DPR" : item.source} · {item.age}
                      </span>
                      <span className={`verif-badge-status verif-status-${item.status.toLowerCase().replace(/\s+/g, "-")}`}>
                        {item.status}
                      </span>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        {/* PANE 2: CENTER MATCH DECISION (THE HERO) */}
        <section className="verif-pane verif-pane-decision" aria-label="Match Decision Workspace">
          <div className="verif-pane-header">
            <div className="verif-pane-title-group">
              <h2 className="verif-pane-title">MATCH DECISION</h2>
              {selectedItem && (
                <span className="verif-pane-subtitle font-mono">
                  {selectedItem.id} · {selectedItem.proposalId}
                </span>
              )}
            </div>

            {selectedItem && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted">Reviewer:</span>
                <span className="verif-reviewer-pill">{selectedItem.reviewer}</span>
              </div>
            )}
          </div>

          {selectedItem ? (
            <div className="verif-decision-scroll">
              {/* DIRECT VISUAL COMPARISON FLOW */}
              <div className="verif-comparison-stack">
                {/* 1. FIELD EXECUTION (WHAT HAPPENED) */}
                <div className="verif-field-block">
                  <div className="verif-field-header">
                    <span className="verif-section-eyebrow">FIELD EXECUTION</span>
                    <span className="verif-field-reported-time">
                      Reported {selectedItem.timestamp.includes("·") ? selectedItem.timestamp.split("·")[1]?.trim() : selectedItem.timestamp}
                    </span>
                  </div>

                  <h3 className="verif-field-title">{selectedItem.eventTitle}</h3>

                  <div className="verif-field-tags-row">
                    <span className="verif-tag">{selectedItem.discipline}</span>
                    <span className="verif-tag">{selectedItem.location.replace(" / ", " · ")}</span>
                    <span className="verif-tag font-mono">{selectedItem.assetTag}</span>
                  </div>

                  <div className="verif-field-metrics-grid">
                    <div className="verif-metric-col">
                      <span className="verif-metric-label">Reported Progress</span>
                      <span className="verif-metric-val font-semibold text-emerald-400">
                        {selectedItem.reportedProgress}%
                      </span>
                    </div>
                    <div className="verif-metric-col">
                      <span className="verif-metric-label">Quantity</span>
                      <span className="verif-metric-val font-mono">
                        {selectedItem.reportedQuantity}
                      </span>
                    </div>
                  </div>

                  <div className="verif-field-quote-box">
                    <p>{selectedItem.rawUpdate.replace(/^["“”]|["“”]$/g, "")}</p>
                  </div>
                </div>

                {/* 2. MATCH CONFIDENCE TRANSITION ZONE */}
                <div className="verif-connector-zone">
                  <div className="verif-connector-line" />
                  <div className="verif-connector-content">
                    <span className="verif-connector-arrow">↓</span>
                    <span className="verif-connector-conf">
                      <strong className="text-blue-400">{Math.round(selectedItem.candidate.confidence)}%</strong> match confidence
                    </span>
                    {selectedItem.category === "Unmatched" || selectedItem.id === "VER-005" ? (
                      <span className="verif-connector-badge is-unmatched">Threshold exceeded</span>
                    ) : selectedItem.candidate.confidence < 70 ? (
                      <span className="verif-connector-badge is-low-conf">Uncertain scope</span>
                    ) : (
                      <span className="verif-connector-badge is-review">Review required</span>
                    )}
                  </div>
                  <div className="verif-connector-line" />
                </div>

                {/* 3. SUGGESTED SCHEDULE MATCH */}
                <div className="verif-schedule-block">
                  <div className="verif-schedule-top-row">
                    <span className="verif-section-eyebrow">SUGGESTED SCHEDULE MATCH</span>
                    {selectedItem.candidate.totalFloat === "0d" && (
                      <div className="flex items-center gap-1.5">
                        <span className="verif-semantic-badge is-critical">Critical Path</span>
                        <span className="verif-semantic-badge is-critical">0d float</span>
                      </div>
                    )}
                  </div>

                  {selectedItem.category !== "Unmatched" && selectedItem.id !== "VER-005" ? (
                    <>
                      <div className="verif-candidate-id-row">
                        <span className="verif-candidate-id">{selectedItem.candidate.id}</span>
                        <span className="verif-status-neutral-badge">{selectedItem.candidate.scheduleStatus}</span>
                      </div>

                      <h4 className="verif-candidate-name">{selectedItem.candidate.name}</h4>

                      <div className="verif-wbs-hierarchy">
                        {selectedItem.candidate.wbs.split("→").map((seg, idx, arr) => (
                          <div key={idx} className="verif-wbs-node" style={{ paddingLeft: `${idx * 12}px` }}>
                            {idx > 0 && <span className="text-muted mr-1.5">→</span>}
                            <span className={idx === arr.length - 1 ? "text-primary font-medium" : "text-muted"}>
                              {seg.trim()}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="verif-candidate-dates-grid">
                        <div className="verif-date-stat">
                          <span className="label">Current Progress</span>
                          <span className="val font-semibold text-[var(--text-primary)]">{selectedItem.candidate.currentProgress}%</span>
                        </div>
                        <div className="verif-date-stat">
                          <span className="label">Baseline Finish</span>
                          <span className="val font-mono">{selectedItem.candidate.baselineFinish}</span>
                        </div>
                        <div className="verif-date-stat">
                          <span className="label">Total Float</span>
                          <span className="val font-semibold">{selectedItem.candidate.totalFloat}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="verif-unmatched-explanation">
                      <p className="text-xs text-secondary leading-relaxed">
                        ExecLink could not identify a schedule candidate above the matching threshold. The tag{" "}
                        <strong className="text-[var(--text-primary)] font-mono">{selectedItem.assetTag}</strong> does not match any
                        registered asset identifier in the current L5 baseline.
                      </p>
                      <div className="verif-unmatched-ref-box">
                        <span className="text-[11px] text-faint">Reference only (weak candidate):</span>
                        <div className="font-semibold text-xs text-muted mt-0.5">
                          {selectedItem.candidate.id} · {selectedItem.candidate.name} ({Math.round(selectedItem.candidate.confidence)}%)
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* WHY EXECLINK RECOMMENDS THIS (6-SIGNAL MATRIX) */}
              <div className="verif-section-card">
                <div className="verif-section-card-head">
                  <h4 className="verif-card-subheading">WHY EXECLINK RECOMMENDS THIS</h4>
                  <span className="verif-conf-score-pill">
                    {Math.round(selectedItem.candidate.confidence)}% Confidence
                  </span>
                </div>

                <div className="verif-signals-matrix">
                  <div className="verif-signal-col">
                    <div className="verif-signal-item">
                      <span className="label">Semantic</span>
                      <span className="pct">{selectedItem.signals.semantic}%</span>
                      <div className="verif-track">
                        <div
                          className={`verif-fill ${selectedItem.signals.semantic >= 80 ? "is-strong" : selectedItem.signals.semantic >= 50 ? "is-med" : "is-weak"}`}
                          style={{ width: `${selectedItem.signals.semantic}%` }}
                        />
                      </div>
                    </div>

                    <div className="verif-signal-item">
                      <span className="label">Asset / Tag</span>
                      <span className="pct">{selectedItem.signals.assetTag}%</span>
                      <div className="verif-track">
                        <div
                          className={`verif-fill ${selectedItem.signals.assetTag >= 80 ? "is-strong" : selectedItem.signals.assetTag >= 50 ? "is-med" : "is-weak"}`}
                          style={{ width: `${selectedItem.signals.assetTag}%` }}
                        />
                      </div>
                    </div>

                    <div className="verif-signal-item">
                      <span className="label">WBS Context</span>
                      <span className="pct">{selectedItem.signals.wbsContext}%</span>
                      <div className="verif-track">
                        <div
                          className={`verif-fill ${selectedItem.signals.wbsContext >= 80 ? "is-strong" : selectedItem.signals.wbsContext >= 50 ? "is-med" : "is-weak"}`}
                          style={{ width: `${selectedItem.signals.wbsContext}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="verif-signal-col">
                    <div className="verif-signal-item">
                      <span className="label">Discipline</span>
                      <span className="pct">{selectedItem.signals.discipline}%</span>
                      <div className="verif-track">
                        <div
                          className={`verif-fill ${selectedItem.signals.discipline >= 80 ? "is-strong" : selectedItem.signals.discipline >= 50 ? "is-med" : "is-weak"}`}
                          style={{ width: `${selectedItem.signals.discipline}%` }}
                        />
                      </div>
                    </div>

                    <div className="verif-signal-item">
                      <span className="label">Temporal fit</span>
                      <span className="pct">{selectedItem.signals.temporal}%</span>
                      <div className="verif-track">
                        <div
                          className={`verif-fill ${selectedItem.signals.temporal >= 80 ? "is-strong" : selectedItem.signals.temporal >= 50 ? "is-med" : "is-weak"}`}
                          style={{ width: `${selectedItem.signals.temporal}%` }}
                        />
                      </div>
                    </div>

                    <div className="verif-signal-item">
                      <span className="label">Location</span>
                      <span className={`pct ${selectedItem.signals.location < 50 ? "text-amber-400 font-bold" : ""}`}>
                        {selectedItem.signals.location}%
                      </span>
                      <div className="verif-track">
                        <div
                          className={`verif-fill ${selectedItem.signals.location >= 80 ? "is-strong" : selectedItem.signals.location >= 50 ? "is-med" : "is-weak"}`}
                          style={{ width: `${selectedItem.signals.location}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Evidence Strength Summary (Explicit Strong vs Weak Indicators) */}
                <div className="verif-signals-summary">
                  <div className="verif-signals-summary-row is-strong">
                    <span className="verif-summary-label">Strong:</span>
                    <span className="verif-summary-tags">
                      {[
                        selectedItem.signals.assetTag >= 80 ? "Asset" : null,
                        selectedItem.signals.discipline >= 80 ? "Discipline" : null,
                        selectedItem.signals.temporal >= 80 ? "Temporal fit" : null,
                        selectedItem.signals.semantic >= 80 ? "Semantic similarity" : null,
                        selectedItem.signals.wbsContext >= 80 ? "WBS context" : null,
                        selectedItem.signals.location >= 80 ? "Location" : null,
                      ]
                        .filter(Boolean)
                        .map((s) => `✓ ${s}`)
                        .join("   ")}
                    </span>
                  </div>
                  {([
                    selectedItem.signals.location < 80 ? `Location (${selectedItem.signals.location}%)` : null,
                    selectedItem.signals.semantic < 80 ? `Semantic (${selectedItem.signals.semantic}%)` : null,
                    selectedItem.signals.wbsContext < 80 ? `WBS Context (${selectedItem.signals.wbsContext}%)` : null,
                    selectedItem.signals.assetTag < 80 ? `Asset (${selectedItem.signals.assetTag}%)` : null,
                  ].filter(Boolean).length > 0) && (
                    <div className="verif-signals-summary-row is-weak">
                      <span className="verif-summary-label">Uncertain:</span>
                      <span className="verif-summary-tags">
                        {[
                          selectedItem.signals.location < 80
                            ? selectedItem.signals.location >= 50
                              ? `△ Location (${selectedItem.signals.location}% moderate)`
                              : `✕ Location (${selectedItem.signals.location}% weak)`
                            : null,
                          selectedItem.signals.semantic < 80
                            ? selectedItem.signals.semantic >= 50
                              ? `△ Semantic (${selectedItem.signals.semantic}% moderate)`
                              : `✕ Semantic (${selectedItem.signals.semantic}% weak)`
                            : null,
                          selectedItem.signals.wbsContext < 80
                            ? `△ WBS Context (${selectedItem.signals.wbsContext}%)`
                            : null,
                          selectedItem.signals.assetTag < 80
                            ? `✕ Asset Tag (${selectedItem.signals.assetTag}%)`
                            : null,
                        ]
                          .filter(Boolean)
                          .join("   ")}
                      </span>
                    </div>
                  )}
                </div>

                {/* Plain-language explanation */}
                <div className="verif-rationale-box">
                  <p>{selectedItem.reasoning}</p>
                </div>
              </div>

              {/* EVIDENCE QUALITY (CHECKLIST + VIEW SOURCE EVIDENCE) */}
              <div className="verif-section-card">
                <div className="verif-section-card-head">
                  <h4 className="verif-card-subheading">EVIDENCE QUALITY</h4>
                  <button
                    className="button secondary sm verif-inspect-source-btn"
                    onClick={() => setEvidenceItem(selectedItem)}
                  >
                    <Eye size={12} /> View source evidence
                  </button>
                </div>

                <div className="verif-evidence-checklist">
                  <div className="verif-check-row">
                    <span className="verif-check-icon text-emerald-400">&#10003;</span>
                    <span className="verif-check-label">Description detected in field statement</span>
                  </div>
                  <div className="verif-check-row">
                    <span className="verif-check-icon text-emerald-400">&#10003;</span>
                    <span className="verif-check-label">
                      Discipline confirmed ({selectedItem.discipline})
                    </span>
                  </div>
                  <div className="verif-check-row">
                    {selectedItem.signals.assetTag >= 80 ? (
                      <>
                        <span className="verif-check-icon text-emerald-400">&#10003;</span>
                        <span className="verif-check-label">
                          Asset identifier recognized ({selectedItem.assetTag})
                        </span>
                      </>
                    ) : selectedItem.signals.assetTag > 0 ? (
                      <>
                        <span className="verif-check-icon text-amber-400">&Delta;</span>
                        <span className="verif-check-label text-amber-300">
                          Asset identifier partially matched ({selectedItem.assetTag})
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="verif-check-icon text-rose-400">&times;</span>
                        <span className="verif-check-label text-rose-300">
                          Asset identifier unreferenced ({selectedItem.assetTag})
                        </span>
                      </>
                    )}
                  </div>
                  <div className="verif-check-row">
                    <span className="verif-check-icon text-emerald-400">&#10003;</span>
                    <span className="verif-check-label">Report date valid ({selectedItem.sourceFile})</span>
                  </div>
                  <div className="verif-check-row">
                    {selectedItem.signals.location >= 70 ? (
                      <>
                        <span className="verif-check-icon text-emerald-400">&#10003;</span>
                        <span className="verif-check-label">Location evidence confirmed ({selectedItem.location})</span>
                      </>
                    ) : selectedItem.signals.location >= 40 ? (
                      <>
                        <span className="verif-check-icon text-amber-400">&Delta;</span>
                        <span className="verif-check-label text-amber-300">
                          Location evidence moderate ({selectedItem.location})
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="verif-check-icon text-amber-400">&Delta;</span>
                        <span className="verif-check-label text-amber-300">
                          Location evidence weak / planner confirmation required
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* ALTERNATIVE CANDIDATES */}
              {selectedItem.alternatives && selectedItem.alternatives.length > 0 && (
                <div className="verif-section-card">
                  <div className="verif-section-card-head">
                    <h4 className="verif-card-subheading">ALTERNATIVE CANDIDATES</h4>
                    <button
                      className="button tertiary sm text-xs"
                      onClick={() => setAlternativePickerItem(selectedItem)}
                    >
                      Compare all ({selectedItem.alternatives.length})
                    </button>
                  </div>

                  <div className="verif-alts-grid">
                    {selectedItem.alternatives.slice(0, 2).map((alt) => (
                      <div key={alt.id} className="verif-alt-tile">
                        <div className="verif-alt-tile-head">
                          <span className="verif-alt-id">{alt.id}</span>
                          <span className="verif-alt-conf">{Math.round(alt.confidence)}%</span>
                        </div>
                        <div className="verif-alt-name">{alt.name}</div>
                        {alt.incompatibilityReason && (
                          <div className="verif-alt-incomp-reason">{alt.incompatibilityReason}</div>
                        )}
                        <button
                          className="button secondary sm verif-alt-select-btn"
                          onClick={() => handleSelectAlternative(selectedItem, alt)}
                        >
                          Select as Match
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="verif-decision-empty">
              {filteredItems.length === 0 ? (
                <>
                  <CheckCircle2 size={28} className="text-emerald-500 mb-2" />
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Verification queue is clear</h3>
                  <p className="text-xs text-muted max-w-sm text-center mt-1">
                    {searchQuery || activeFilterCount > 0
                      ? "No proposals match active filters. Adjust your search or clear filters to view items."
                      : "All execution updates have been verified or classified. New field events will appear here automatically."}
                  </p>
                  {(searchQuery || activeFilterCount > 0) && (
                    <button
                      className="button secondary sm mt-3"
                      onClick={() => {
                        setSearchQuery("");
                        setActiveCategory("All");
                        setDisciplineFilter("All");
                        setSourceFilter("All");
                        setAgeFilter("All");
                        setConfidenceFilter("All");
                        setReviewerFilter("All");
                        setSortBy("priority");
                      }}
                    >
                      Reset Filters
                    </button>
                  )}
                </>
              ) : (
                <p>Select an item from the review queue.</p>
              )}
            </div>
          )}
        </section>

        {/* PANE 3: RIGHT SCHEDULE IMPACT & DECISION */}
        <aside className="verif-pane verif-pane-impact" aria-label="Schedule Impact and Decision">
          <div className="verif-pane-header">
            <div className="verif-pane-title-group">
              <h2 className="verif-pane-title">SCHEDULE IMPACT</h2>
              {selectedItem && (
                <span className="verif-pane-subtitle font-mono">
                  {selectedItem.candidate.id}
                </span>
              )}
            </div>
          </div>

          {selectedItem ? (
            <>
              <div className="verif-impact-scroll">
                {/* SCHEDULE IMPACT (Unified grouped card with dividers between rows) */}
                <div className="verif-impact-group">
                  <div className="verif-impact-group-head">
                    <span className="verif-impact-label">SCHEDULE IMPACT</span>
                  </div>

                  {/* Row 1: Progress */}
                  <div className="verif-impact-row">
                    <div className="verif-impact-row-header">
                      <span className="verif-impact-row-title">PROGRESS</span>
                      {selectedItem.candidate.deltaProgress > 0 && (
                        <span className="verif-impact-delta-pill">
                          +{selectedItem.candidate.deltaProgress}%
                        </span>
                      )}
                    </div>

                    <div className="verif-impact-value-row">
                      <span className="verif-impact-prev">{selectedItem.candidate.currentProgress}%</span>
                      <span className="verif-impact-arrow" aria-hidden="true">
                        <svg
                          width="72"
                          height="10"
                          viewBox="0 0 72 10"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="verif-connector-svg"
                        >
                          <line
                            x1="0"
                            y1="5"
                            x2="68"
                            y2="5"
                            stroke="currentColor"
                            strokeWidth="1.25"
                            strokeLinecap="round"
                          />
                          <polyline
                            points="64,2 68,5 64,8"
                            stroke="currentColor"
                            strokeWidth="1.25"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      <span className="verif-impact-next">{selectedItem.candidate.proposedProgress}%</span>
                    </div>

                    {/* Split Visual Progress Bar */}
                    <div className="verif-split-progress-container">
                      <div className="verif-split-bar">
                        <div
                          className="verif-bar-current"
                          style={{ width: `${selectedItem.candidate.currentProgress}%` }}
                        />
                        <div
                          className="verif-bar-delta"
                          style={{
                            left: `${selectedItem.candidate.currentProgress}%`,
                            width: `${selectedItem.candidate.deltaProgress}%`,
                          }}
                        />
                      </div>
                      <div className="verif-bar-labels">
                        <span>Baseline: {selectedItem.candidate.currentProgress}%</span>
                        <span>Target: {selectedItem.candidate.proposedProgress}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="verif-impact-divider" />

                  {/* Row 2: Status */}
                  <div className="verif-impact-row">
                    <span className="verif-impact-row-title">STATUS</span>
                    <div className="verif-impact-value-row text-xs mt-0.5">
                      <span className="text-secondary">{selectedItem.candidate.scheduleStatus}</span>
                      <span className="verif-impact-arrow">→</span>
                      <span className="text-emerald-400 font-semibold">
                        {selectedItem.candidate.proposedProgress === 100 ? "Complete" : selectedItem.candidate.scheduleStatus}
                      </span>
                    </div>
                  </div>

                  <div className="verif-impact-divider" />

                  {/* Row 3: Actual Finish */}
                  <div className="verif-impact-row">
                    <span className="verif-impact-row-title">ACTUAL FINISH</span>
                    <div className="verif-impact-value-row text-xs mt-0.5 font-mono">
                      <span className="text-muted">—</span>
                      <span className="verif-impact-arrow">→</span>
                      <span className="text-primary font-semibold">
                        {selectedItem.candidate.proposedProgress === 100
                          ? (selectedItem.timestamp.includes("·") ? selectedItem.timestamp.split("·")[0]?.trim() : "26 Sep 2026")
                          : "—"}
                      </span>
                    </div>
                  </div>

                  <div className="verif-impact-divider" />

                  {/* Row 4: Total Float */}
                  <div className="verif-impact-row">
                    <span className="verif-impact-row-title">TOTAL FLOAT</span>
                    <div className="verif-impact-value-row mt-0.5">
                      <span className="text-primary font-bold">{selectedItem.candidate.totalFloat}</span>
                      {selectedItem.candidate.totalFloat === "0d" && (
                        <span className="verif-semantic-badge is-critical ml-2">Critical</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* APPROVAL INFORMATION (Simplified safety callout with checkmarks) */}
                <div className="verif-shield-callout">
                  <div className="verif-shield-body">
                    <h4 className="verif-shield-title">Approval will update trusted schedule actuals.</h4>
                    <ul className="verif-shield-list">
                      <li>
                        <span className="text-emerald-400 font-bold mr-1.5">✓</span>
                        Verify execution-to-schedule match
                      </li>
                      <li>
                        <span className="text-emerald-400 font-bold mr-1.5">✓</span>
                        {selectedItem.candidate.id}: {selectedItem.candidate.currentProgress}% → {selectedItem.candidate.proposedProgress}%
                      </li>
                      <li>
                        <span className="text-emerald-400 font-bold mr-1.5">✓</span>
                        Record reviewer {selectedItem.reviewer !== "Unassigned" ? selectedItem.reviewer : "T. Patel (Lead Planner)"}
                      </li>
                      <li>
                        <span className="text-emerald-400 font-bold mr-1.5">✓</span>
                        Append audit record
                      </li>
                    </ul>
                    <p className="verif-shield-footer">No schedule changes occur until approval.</p>
                  </div>
                </div>

                {/* SOURCE PROVENANCE */}
                <div className="verif-provenance-box">
                  <span className="verif-impact-label">SOURCE PROVENANCE</span>
                  <div className="verif-prov-details">
                    <div className="verif-prov-title font-medium text-primary">{selectedItem.source}</div>
                    <div className="verif-prov-file font-mono text-secondary">{selectedItem.sourceFile}</div>
                    <div className="verif-prov-meta text-muted">
                      {selectedItem.timestamp.includes("·") ? selectedItem.timestamp.split("·")[0]?.trim() : "26 Sep 2026"} · Row {selectedItem.sourceRow < 10 ? `0${selectedItem.sourceRow}` : selectedItem.sourceRow}
                    </div>
                  </div>
                  <button
                    className="button secondary sm verif-prov-btn"
                    onClick={() => setEvidenceItem(selectedItem)}
                  >
                    <Eye size={12} /> Inspect Evidence
                  </button>
                </div>
              </div>

              {/* STICKY DECISION BAR AT BOTTOM (ALWAYS VISIBLE PINNED) */}
              <div className="verif-decision-bar">
                {selectedItem.status === "Verified" ? (
                  <div className="verif-decided-card is-verified">
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-emerald-400">Match Verified</div>
                      <div className="text-[11px] text-muted">
                        Verified by {selectedItem.verifiedBy || "Planner"}
                      </div>
                    </div>
                    <button
                      className="button tertiary sm text-xs"
                      onClick={() => {
                        const nextItems = items.map((i) =>
                          i.id === selectedItem.id ? { ...i, status: "Review Required" as VerificationStatus } : i
                        );
                        setItems(nextItems);
                        saveVerificationQueue(nextItems);
                        showToast(`Reopened ${selectedItem.id} for review.`);
                      }}
                    >
                      Reopen
                    </button>
                  </div>
                ) : selectedItem.status === "Rejected" ? (
                  <div className="verif-decided-card is-rejected">
                    <X size={16} className="text-rose-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-rose-400">Proposal Rejected</div>
                      <div className="text-[11px] text-muted truncate">
                        {selectedItem.rejectionReason}
                      </div>
                    </div>
                    <button
                      className="button tertiary sm text-xs"
                      onClick={() => {
                        const nextItems = items.map((i) =>
                          i.id === selectedItem.id ? { ...i, status: "Review Required" as VerificationStatus } : i
                        );
                        setItems(nextItems);
                        saveVerificationQueue(nextItems);
                        showToast(`Reopened ${selectedItem.id} for review.`);
                      }}
                    >
                      Reopen
                    </button>
                  </div>
                ) : selectedItem.status === "Flagged New Activity" ? (
                  <div className="verif-decided-card is-flagged">
                    <Layers size={16} className="text-purple-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-purple-400">Flagged New Activity</div>
                      <div className="text-[11px] text-muted">Routed to Change Backlog</div>
                    </div>
                    <button
                      className="button tertiary sm text-xs"
                      onClick={() => {
                        const nextItems = items.map((i) =>
                          i.id === selectedItem.id ? { ...i, status: "Review Required" as VerificationStatus } : i
                        );
                        setItems(nextItems);
                        saveVerificationQueue(nextItems);
                        showToast(`Reopened ${selectedItem.id} for review.`);
                      }}
                    >
                      Reopen
                    </button>
                  </div>
                ) : selectedItem.category === "Unmatched" || selectedItem.id === "VER-005" ? (
                  /* UNMATCHED DECISION WORKFLOW (No blind Approve) */
                  <div className="verif-decision-actions-unmatched">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1">
                      RESOLUTION
                    </div>
                    <button
                      className="button secondary sm verif-btn-full"
                      onClick={() => setAlternativePickerItem(selectedItem)}
                    >
                      <Search size={13} /> Search Schedule
                    </button>
                    <button
                      className="button secondary sm verif-btn-full"
                      onClick={() => setAlternativePickerItem(selectedItem)}
                    >
                      Choose Candidate
                    </button>
                    <button
                      className="button primary sm verif-btn-new-act"
                      onClick={() => setFlaggingItem(selectedItem)}
                    >
                      <Layers size={13} /> Mark as New Activity
                    </button>
                    <button
                      className="button secondary sm verif-btn-reject"
                      onClick={() => setRejectingItem(selectedItem)}
                    >
                      <X size={13} /> Dismiss / Reject
                    </button>
                  </div>
                ) : (
                  /* NORMAL MATCH DECISION WORKFLOW (Polished Hierarchy) */
                  <div className="verif-decision-actions">
                    {/* Top: Reject | New Activity */}
                    <div className="verif-decision-secondary-row">
                      <button
                        className="button secondary sm verif-btn-reject"
                        onClick={() => setRejectingItem(selectedItem)}
                      >
                        Reject
                      </button>
                      <button
                        className="button secondary sm"
                        onClick={() => setFlaggingItem(selectedItem)}
                      >
                        New Activity
                      </button>
                    </div>

                    {/* Middle: Choose Alternative */}
                    <button
                      className="button secondary sm verif-btn-choose-alt"
                      onClick={() => setAlternativePickerItem(selectedItem)}
                    >
                      Choose Alternative
                    </button>

                    {/* Bottom: Approve Match (Hero) */}
                    <button
                      className="button primary verif-btn-approve-hero"
                      onClick={() => handleApproveMatch(selectedItem)}
                      disabled={processingId === selectedItem.id || !canVerify}
                      title={!canVerify ? "You do not have permission to verify matches" : ""}
                    >
                      <Check size={15} /> {processingId === selectedItem.id ? "Approving…" : "Approve Match"}
                    </button>
                  </div>
                )}
              </div>
          </>
          ) : (
            <div className="verif-impact-empty">
              {filteredItems.length === 0 ? (
                <>
                  <ShieldCheck size={28} className="text-blue-500 mb-2" />
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">All changes recorded</h3>
                  <p className="text-xs text-muted max-w-xs text-center mt-1">
                    Verified schedule actuals are current and immutable audit entries are preserved.
                  </p>
                </>
              ) : (
                <p>No proposal selected.</p>
              )}
            </div>
          )}
        </aside>
      </main>

      {/* ---------------------------------------------------------------------- */}
      {/* MODALS & DRAWERS (Preserving all functional inspection & decisions)    */}
      {/* ---------------------------------------------------------------------- */}

      {/* MODAL 1: VIEW SOURCE EVIDENCE & AUDIT LINEAGE */}
      {evidenceItem && (
        <div className="verif-modal-backdrop" onClick={() => setEvidenceItem(null)}>
          <div className="verif-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="verif-modal-header">
              <div>
                <p className="verif-modal-eyebrow">SOURCE EVIDENCE & LINEAGE</p>
                <h3 className="verif-modal-title">{evidenceItem.eventTitle}</h3>
              </div>
              <button className="verif-modal-close" onClick={() => setEvidenceItem(null)} aria-label="Close evidence viewer">
                <X size={16} />
              </button>
            </div>

            <div className="verif-modal-body">
              {/* Normalized Facts */}
              <div className="verif-modal-block">
                <h4>Normalized Facts Extracted</h4>
                <div className="verif-facts-grid">
                  <div className="verif-fact-item">
                    <span className="verif-fact-label">Proposal ID</span>
                    <span className="verif-fact-val font-mono">{evidenceItem.proposalId}</span>
                  </div>
                  <div className="verif-fact-item">
                    <span className="verif-fact-label">Discipline</span>
                    <span className="verif-fact-val">{evidenceItem.discipline}</span>
                  </div>
                  <div className="verif-fact-item">
                    <span className="verif-fact-label">Asset Tag</span>
                    <span className="verif-fact-val">{evidenceItem.assetTag}</span>
                  </div>
                  <div className="verif-fact-item">
                    <span className="verif-fact-label">Location</span>
                    <span className="verif-fact-val">{evidenceItem.location}</span>
                  </div>
                  <div className="verif-fact-item">
                    <span className="verif-fact-label">Reported Progress</span>
                    <span className="verif-fact-val font-semibold">{evidenceItem.reportedProgress}%</span>
                  </div>
                  <div className="verif-fact-item">
                    <span className="verif-fact-label">Quantity / Unit</span>
                    <span className="verif-fact-val">{evidenceItem.reportedQuantity}</span>
                  </div>
                </div>
              </div>

              {/* Raw Source Data */}
              {evidenceItem.rawSourceData && (
                <div className="verif-modal-block">
                  <h4>Raw Source Row Data ({evidenceItem.sourceFile} · Row {evidenceItem.sourceRow})</h4>
                  <table className="verif-raw-table">
                    <thead>
                      <tr>
                        <th>Field Name</th>
                        <th>Raw Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(evidenceItem.rawSourceData).map(([k, v]) => (
                        <tr key={k}>
                          <td className="verif-raw-key">{k}</td>
                          <td className="verif-raw-val">{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Lineage / Chain of Custody */}
              <div className="verif-modal-block">
                <h4>Chain of Custody & Traceability Lineage</h4>
                <div className="verif-lineage-list">
                  <div className="verif-lineage-item">
                    <span className="verif-lineage-step">1</span>
                    <div>
                      <strong>Ingestion Source:</strong> {evidenceItem.sourceFile} (MD5 checksum verified)
                    </div>
                  </div>
                  <div className="verif-lineage-item">
                    <span className="verif-lineage-step">2</span>
                    <div>
                      <strong>Extracted Event:</strong> {evidenceItem.eventId} at {evidenceItem.timestamp}
                    </div>
                  </div>
                  <div className="verif-lineage-item">
                    <span className="verif-lineage-step">3</span>
                    <div>
                      <strong>AI Match Proposal:</strong> {evidenceItem.proposalId} &rarr; {evidenceItem.candidate.id} ({Math.round(evidenceItem.candidate.confidence)}% confidence)
                    </div>
                  </div>
                  <div className="verif-lineage-item">
                    <span className="verif-lineage-step">4</span>
                    <div>
                      <strong>Verification Boundary:</strong> Human review workstation (Planner verification required before trusted schedule mutation)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="verif-modal-footer">
              <button className="button secondary" onClick={() => setEvidenceItem(null)}>
                Close Evidence Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: REJECT MATCH PROPOSAL */}
      {rejectingItem && (
        <div className="verif-modal-backdrop" onClick={() => setRejectingItem(null)}>
          <div className="verif-modal-dialog sm" onClick={(e) => e.stopPropagation()}>
            <div className="verif-modal-header">
              <div>
                <p className="verif-modal-eyebrow">REJECT MATCH PROPOSAL</p>
                <h3 className="verif-modal-title">{rejectingItem.candidate.id}</h3>
              </div>
              <button className="verif-modal-close" onClick={() => setRejectingItem(null)} aria-label="Close reject proposal dialog">
                <X size={16} />
              </button>
            </div>

            <div className="verif-modal-body">
              <p className="verif-modal-desc">
                Reject match proposal for <strong>{rejectingItem.eventTitle}</strong>.
              </p>

              <div className="verif-radio-group">
                {[
                  "Wrong activity",
                  "Insufficient evidence",
                  "Incorrect asset/tag",
                  "Incorrect location",
                  "Other",
                ].map((reason) => (
                  <label key={reason} className="verif-radio-label">
                    <input
                      type="radio"
                      name="rejectionReason"
                      value={reason}
                      checked={rejectionReason === reason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>

              <div className="verif-field-group">
                <label className="verif-field-label">Planner Note (Optional)</label>
                <textarea
                  className="verif-textarea"
                  rows={3}
                  placeholder="Provide context for schedule audit trail..."
                  value={rejectionNote}
                  onChange={(e) => setRejectionNote(e.target.value)}
                />
              </div>

              <div className="verif-modal-alert">
                <ShieldCheck size={16} className="text-amber-500 shrink-0" />
                <span>
                  Schedule actuals remain unchanged. A tamper-evident rejection audit entry will be recorded.
                </span>
              </div>
            </div>

            <div className="verif-modal-footer">
              <button className="button secondary" onClick={() => setRejectingItem(null)}>
                Cancel
              </button>
              <button className="button destructive" onClick={handleConfirmReject} disabled={processingId === rejectingItem.id}>
                {processingId === rejectingItem.id ? "Rejecting…" : "Reject Proposal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: MARK AS NEW ACTIVITY */}
      {flaggingItem && (
        <div className="verif-modal-backdrop" onClick={() => setFlaggingItem(null)}>
          <div className="verif-modal-dialog sm" onClick={(e) => e.stopPropagation()}>
            <div className="verif-modal-header">
              <div>
                <p className="verif-modal-eyebrow">ROUTE TO CHANGE BACKLOG</p>
                <h3 className="verif-modal-title">Mark as New Activity</h3>
              </div>
              <button className="verif-modal-close" onClick={() => setFlaggingItem(null)} aria-label="Close new activity dialog">
                <X size={16} />
              </button>
            </div>

            <div className="verif-modal-body">
              <p className="verif-modal-desc">
                Classify <strong>{flaggingItem.eventTitle}</strong> as unplanned or out-of-scope field work.
              </p>

              <div className="verif-field-group">
                <label className="verif-field-label">Classification Reason</label>
                <select
                  className="verif-select w-full"
                  value={flaggingReason}
                  onChange={(e) => setFlaggingReason(e.target.value)}
                >
                  <option value="Unreferenced scope not currently scheduled">
                    Unreferenced scope not currently scheduled
                  </option>
                  <option value="Subcontractor additional work order">
                    Subcontractor additional work order
                  </option>
                  <option value="Site variation / Field modification">
                    Site variation / Field modification
                  </option>
                  <option value="Unregistered asset identifier">
                    Unregistered asset identifier
                  </option>
                </select>
              </div>

              <div className="verif-field-group">
                <label className="verif-field-label">Planner Scope Notes</label>
                <textarea
                  className="verif-textarea"
                  rows={3}
                  placeholder="Detail scope requirements for the change board..."
                  value={flaggingNote}
                  onChange={(e) => setFlaggingNote(e.target.value)}
                />
              </div>

              <div className="verif-modal-alert">
                <Layers size={16} className="text-purple-400 shrink-0" />
                <span>
                  This item will be routed to the Project Change Backlog without altering current baseline schedule actuals.
                </span>
              </div>
            </div>

            <div className="verif-modal-footer">
              <button className="button secondary" onClick={() => setFlaggingItem(null)}>
                Cancel
              </button>
              <button className="button primary" onClick={handleConfirmFlagNewActivity} disabled={processingId === flaggingItem.id}>
                {processingId === flaggingItem.id ? "Routing…" : "Confirm Routing"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CHOOSE ALTERNATIVE CANDIDATE */}
      {alternativePickerItem && (
        <div className="verif-modal-backdrop" onClick={() => setAlternativePickerItem(null)}>
          <div className="verif-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="verif-modal-header">
              <div>
                <p className="verif-modal-eyebrow">CHOOSE ALTERNATIVE SCHEDULE MATCH</p>
                <h3 className="verif-modal-title">{alternativePickerItem.eventTitle}</h3>
              </div>
              <button className="verif-modal-close" onClick={() => setAlternativePickerItem(null)} aria-label="Close alternative candidate dialog">
                <X size={16} />
              </button>
            </div>

            <div className="verif-modal-body">
              <div className="verif-modal-alert">
                <ShieldCheck size={16} className="text-cyan-500 shrink-0" />
                <span>
                  Selecting an alternative updates the proposed candidate in the reconciliation workstation.
                  Schedule actuals will <strong>NOT</strong> change until explicit approval.
                </span>
              </div>

              <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Currently Proposed Match</h4>
              <div className="verif-alt-choice-card is-current">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[var(--accent)]">{alternativePickerItem.candidate.id}</span>
                  <span className="verif-conf-tier-badge">{Math.round(alternativePickerItem.candidate.confidence)}% Match</span>
                </div>
                <div className="font-semibold text-sm mt-1 text-[var(--text-primary)]">{alternativePickerItem.candidate.name}</div>
                <div className="text-xs text-muted mt-0.5">{alternativePickerItem.candidate.wbs}</div>
              </div>

              <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mt-4">Available Schedule Candidates</h4>
              <div className="verif-alt-choices-list">
                {alternativePickerItem.alternatives.map((alt) => (
                  <div key={alt.id} className="verif-alt-choice-card">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[var(--text-primary)]">{alt.id}</span>
                      <span className="verif-conf-tier-badge">{Math.round(alt.confidence)}% Match</span>
                    </div>
                    <div className="font-semibold text-sm mt-1 text-[var(--text-primary)]">{alt.name}</div>
                    <div className="text-xs text-muted mt-0.5">{alt.wbs}</div>
                    {alt.incompatibilityReason && (
                      <p className="text-xs text-amber-400/90 mt-1">{alt.incompatibilityReason}</p>
                    )}
                    <button
                      className="button primary sm mt-2"
                      onClick={() => handleSelectAlternative(alternativePickerItem, alt)}
                    >
                      Select this Candidate
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="verif-modal-footer">
              <button className="button secondary" onClick={() => setAlternativePickerItem(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
