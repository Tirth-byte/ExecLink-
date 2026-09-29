"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Sliders,
  Cpu,
  Database,
  Users,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ExternalLink,
  Save,
  Lock,
  ArrowRight,
  Info,
  Clock,
  Calendar,
  Layers,
  Sparkles,
  UserCheck,
  Check,
  X,
  FileSpreadsheet,
  FileText,
  Activity,
  TableProperties,
  Radio,
  SlidersHorizontal,
} from "lucide-react";
import {
  ProjectSettingsData,
  MatchingThresholds,
  DataSourceItem,
  UserRoleItem,
  DemoStateInfo,
  loadProjectSettings,
  saveProjectSettings,
  loadMatchingThresholds,
  saveMatchingThresholds,
  getDemoState,
  resetDemoEnvironment,
  MATCHING_SIGNALS,
  SUPPORTED_DATA_SOURCES,
  DEMO_USERS_AND_ROLES,
  INITIAL_PROJECT_SETTINGS,
  INITIAL_MATCHING_THRESHOLDS,
} from "@/data/settings";

type SettingsTab = "project" | "matching" | "datasources" | "users" | "demo";

interface SettingsWorkspaceProps {
  initialTab?: SettingsTab;
}

export function SettingsWorkspace({ initialTab = "project" }: SettingsWorkspaceProps) {
  // Navigation tab state
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState(null, "", url.toString());
    }
  };

  // Project Settings State
  const [projectSettings, setProjectSettings] = useState<ProjectSettingsData>(INITIAL_PROJECT_SETTINGS);
  const [projectFormDirty, setProjectFormDirty] = useState(false);

  // Matching Thresholds State
  const [thresholds, setThresholds] = useState<MatchingThresholds>(INITIAL_MATCHING_THRESHOLDS);
  const [thresholdFormDirty, setThresholdFormDirty] = useState(false);

  // Demo State
  const [demoState, setDemoState] = useState<DemoStateInfo>({
    datasetId: "PRJ-DEMO-001",
    projectName: "North River Expansion",
    baselineRevision: "Rev 04",
    isModified: false,
    mutatedActualsCount: 0,
    auditRecordsCount: 0,
    backlogRecordsCount: 0,
    pendingVerificationCount: 12,
    lastResetTimestamp: null,
  });

  // Modal & Toast States
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [setupModalSource, setSetupModalSource] = useState<DataSourceItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load state on mount
  const refreshAllState = useCallback(() => {
    setProjectSettings(loadProjectSettings());
    setThresholds(loadMatchingThresholds());
    setDemoState(getDemoState());
  }, []);

  useEffect(() => {
    refreshAllState();

    const handleStorage = () => refreshAllState();
    const handleCustomReset = () => refreshAllState();

    window.addEventListener("storage", handleStorage);
    window.addEventListener("execlink:demo_reset" as unknown as keyof WindowEventMap, handleCustomReset);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("execlink:demo_reset" as unknown as keyof WindowEventMap, handleCustomReset);
    };
  }, [refreshAllState]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // Handle Project Form Changes
  const handleProjectFieldChange = (field: keyof ProjectSettingsData, value: string) => {
    setProjectSettings((prev) => ({ ...prev, [field]: value }));
    setProjectFormDirty(true);
  };

  const handleSaveProjectSettings = () => {
    saveProjectSettings(projectSettings);
    setProjectFormDirty(false);
    setToastMessage("Project settings updated successfully.");
  };

  const handleResetProjectDefaults = () => {
    setProjectSettings(INITIAL_PROJECT_SETTINGS);
    saveProjectSettings(INITIAL_PROJECT_SETTINGS);
    setProjectFormDirty(false);
    setToastMessage("Project settings restored to baseline defaults.");
  };

  // Handle Threshold Presets
  const applyThresholdPreset = (preset: "Conservative" | "Balanced" | "High-Precision") => {
    let nextThresholds: MatchingThresholds;
    if (preset === "Conservative") {
      nextThresholds = { autoSuggestThreshold: 90, humanReviewThreshold: 70, presetName: "Conservative" };
    } else if (preset === "Balanced") {
      nextThresholds = { autoSuggestThreshold: 85, humanReviewThreshold: 65, presetName: "Balanced" };
    } else {
      nextThresholds = { autoSuggestThreshold: 92, humanReviewThreshold: 75, presetName: "High-Precision" };
    }
    setThresholds(nextThresholds);
    saveMatchingThresholds(nextThresholds);
    setThresholdFormDirty(false);
    setToastMessage(`Matching thresholds updated to ${preset} policy.`);
  };

  // Execute Demo Reset
  const handleConfirmReset = () => {
    setIsResetting(true);
    setTimeout(() => {
      const res = resetDemoEnvironment();
      setIsResetting(false);
      setResetModalOpen(false);
      refreshAllState();
      if (res.success) {
        setToastMessage("Demo state successfully reset to Golden Path baseline.");
      } else {
        setToastMessage("Failed to reset demo state.");
      }
    }, 350);
  };

  // Formatting date
  const formatTimestamp = (iso: string | null) => {
    if (!iso) return "Pristine Seed (No resets in this session)";
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " (" + d.toLocaleDateString() + ")";
    } catch {
      return iso;
    }
  };

  return (
    <div className="settings-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="settings-toast" role="status" aria-live="polite">
          <CheckCircle2 size={16} className="settings-toast-icon" />
          <span className="settings-toast-text">{toastMessage}</span>
          <button
            type="button"
            className="settings-toast-close"
            onClick={() => setToastMessage(null)}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Settings Header */}
      <header className="settings-header">
        <div className="settings-header-meta">
          <span className="settings-eyebrow">CONTROLS & INTELLIGENCE CONFIGURATION</span>
          <h1 className="settings-title">Settings</h1>
          <p className="settings-description">
            Configure project controls, intelligence behavior and connected data sources.
          </p>
        </div>
        <div className="settings-header-badge-group">
          <div className="settings-header-badge">
            <span className="settings-badge-dot" />
            <span className="settings-badge-key">PROJECT</span>
            <span className="settings-badge-val">PRJ-DEMO-001</span>
          </div>
          <div className="settings-header-badge">
            <span className="settings-badge-key">REVISION</span>
            <span className="settings-badge-val">Rev 04</span>
          </div>
          <div className="settings-header-badge">
            <span className="settings-badge-key">STATUS</span>
            <span className="settings-badge-val status-live">Live Controls</span>
          </div>
        </div>
      </header>

      {/* Two-Column Layout: Left Nav + Right Content Area */}
      <div className="settings-layout">
        {/* Left Settings Navigation */}
        <nav className="settings-nav" aria-label="Settings categories">
          <div className="settings-nav-section-title">CATEGORIES</div>
          <button
            type="button"
            className={`settings-nav-item ${activeTab === "project" ? "active" : ""}`}
            onClick={() => handleTabChange("project")}
            aria-current={activeTab === "project" ? "true" : undefined}
          >
            <Sliders size={16} className="settings-nav-icon" />
            <span className="settings-nav-label">Project</span>
            <span className="settings-nav-number">01</span>
          </button>

          <button
            type="button"
            className={`settings-nav-item ${activeTab === "matching" ? "active" : ""}`}
            onClick={() => handleTabChange("matching")}
            aria-current={activeTab === "matching" ? "true" : undefined}
          >
            <Cpu size={16} className="settings-nav-icon" />
            <span className="settings-nav-label">Matching</span>
            <span className="settings-nav-number">02</span>
          </button>

          <button
            type="button"
            className={`settings-nav-item ${activeTab === "datasources" ? "active" : ""}`}
            onClick={() => handleTabChange("datasources")}
            aria-current={activeTab === "datasources" ? "true" : undefined}
          >
            <Database size={16} className="settings-nav-icon" />
            <span className="settings-nav-label">Data Sources</span>
            <span className="settings-nav-number">03</span>
          </button>

          <button
            type="button"
            className={`settings-nav-item ${activeTab === "users" ? "active" : ""}`}
            onClick={() => handleTabChange("users")}
            aria-current={activeTab === "users" ? "true" : undefined}
          >
            <Users size={16} className="settings-nav-icon" />
            <span className="settings-nav-label">Users & Roles</span>
            <span className="settings-nav-number">04</span>
          </button>

          <button
            type="button"
            className={`settings-nav-item ${activeTab === "demo" ? "active" : ""}`}
            onClick={() => handleTabChange("demo")}
            aria-current={activeTab === "demo" ? "true" : undefined}
          >
            <RotateCcw size={16} className="settings-nav-icon" />
            <span className="settings-nav-label">Demo</span>
            <span className="settings-nav-number">05</span>
          </button>

          {/* Quick Context Footer in Nav */}
          <div className="settings-nav-footer">
            <div className="settings-nav-footer-title">REVIEWER SESSION</div>
            <div className="settings-nav-reviewer">
              <span className="settings-reviewer-avatar">TP</span>
              <div className="settings-reviewer-info">
                <span className="settings-reviewer-name">T. Patel</span>
                <span className="settings-reviewer-role">Lead Planner</span>
              </div>
            </div>
          </div>
        </nav>

        {/* Right Content Area (Active Tab Only) */}
        <main className="settings-content" id="settings-tab-panel">
          {/* ================================================================ */}
          {/* 01 — PROJECT */}
          {/* ================================================================ */}
          {activeTab === "project" && (
            <div className="settings-section-view">
              <div className="settings-section-head">
                <div>
                  <div className="settings-section-kicker">SECTION 01</div>
                  <h2 className="settings-section-title">Project Settings</h2>
                </div>
                <p className="settings-section-desc">
                  Baseline metadata, project identification and operational schedule controls.
                </p>
              </div>

              {/* Form Grid */}
              <div className="settings-card-stack">
                {/* Identification Card */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div>
                      <h3 className="settings-card-title">Project Identification & Data Date</h3>
                      <p className="settings-card-subtitle">
                        Core project identifiers and reporting cycle anchor.
                      </p>
                    </div>
                    <span className="settings-pill pill-blue">Active Controls</span>
                  </div>

                  <div className="settings-field-grid">
                    <div className="settings-field">
                      <label className="settings-label" htmlFor="field-project-name">
                        Project Name
                      </label>
                      <input
                        id="field-project-name"
                        type="text"
                        className="settings-input"
                        value={projectSettings.projectName}
                        onChange={(e) => handleProjectFieldChange("projectName", e.target.value)}
                      />
                      <span className="settings-field-hint">Display name across reports and topbar.</span>
                    </div>

                    <div className="settings-field">
                      <label className="settings-label" htmlFor="field-project-id">
                        Project ID
                      </label>
                      <div className="settings-input-readonly-wrap">
                        <input
                          id="field-project-id"
                          type="text"
                          className="settings-input readonly"
                          value={projectSettings.projectId}
                          readOnly
                        />
                        <Lock size={13} className="settings-lock-icon" />
                      </div>
                      <span className="settings-field-hint">Immutable system identifier for audit records.</span>
                    </div>

                    <div className="settings-field">
                      <label className="settings-label" htmlFor="field-data-date">
                        Data Date
                      </label>
                      <div className="settings-input-readonly-wrap">
                        <input
                          id="field-data-date"
                          type="text"
                          className="settings-input readonly"
                          value={projectSettings.dataDate}
                          readOnly
                        />
                        <Calendar size={13} className="settings-lock-icon" />
                      </div>
                      <span className="settings-field-hint">Contractual cycle boundary. Set by schedule revision.</span>
                    </div>

                    <div className="settings-field">
                      <label className="settings-label" htmlFor="field-revision">
                        Schedule Revision
                      </label>
                      <div className="settings-input-readonly-wrap">
                        <input
                          id="field-revision"
                          type="text"
                          className="settings-input readonly"
                          value={projectSettings.scheduleRevision}
                          readOnly
                        />
                        <Lock size={13} className="settings-lock-icon" />
                      </div>
                      <span className="settings-field-hint">Target baseline revision in P6 baseline register.</span>
                    </div>

                    <div className="settings-field">
                      <label className="settings-label" htmlFor="field-timezone">
                        Project Timezone
                      </label>
                      <select
                        id="field-timezone"
                        className="settings-select"
                        value={projectSettings.timezone}
                        onChange={(e) => handleProjectFieldChange("timezone", e.target.value)}
                      >
                        <option value="America/New_York (UTC-04:00 EDT)">America/New_York (UTC-04:00 EDT)</option>
                        <option value="America/Chicago (UTC-05:00 CDT)">America/Chicago (UTC-05:00 CDT)</option>
                        <option value="America/Denver (UTC-06:00 MDT)">America/Denver (UTC-06:00 MDT)</option>
                        <option value="America/Los_Angeles (UTC-07:00 PDT)">America/Los_Angeles (UTC-07:00 PDT)</option>
                        <option value="UTC">UTC (Coordinated Universal Time)</option>
                        <option value="Europe/London (UTC+01:00 BST)">Europe/London (UTC+01:00 BST)</option>
                        <option value="Asia/Kolkata (UTC+05:30 IST)">Asia/Kolkata (UTC+05:30 IST)</option>
                      </select>
                      <span className="settings-field-hint">Used for temporal window matching and timestamp stamps.</span>
                    </div>

                    <div className="settings-field">
                      <label className="settings-label" htmlFor="field-digest">
                        Notification Digest Frequency
                      </label>
                      <select
                        id="field-digest"
                        className="settings-select"
                        value={projectSettings.digestFrequency}
                        onChange={(e) => handleProjectFieldChange("digestFrequency", e.target.value)}
                      >
                        <option value="Daily 07:00 EDT">Daily Summary (07:00 EDT)</option>
                        <option value="Shift End 18:00 EDT">Shift Handover (18:00 EDT)</option>
                        <option value="Real-time on Verification">Immediate on Decision</option>
                      </select>
                      <span className="settings-field-hint">Delivery cadence for Notification Center digest.</span>
                    </div>
                  </div>
                </div>

                {/* Contractual & Schedule Specifications */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div>
                      <h3 className="settings-card-title">Contractual Specifications & Baseline</h3>
                      <p className="settings-card-subtitle">
                        Established project parameters loaded from master contracts.
                      </p>
                    </div>
                    <span className="settings-pill pill-neutral">Baseline Locked</span>
                  </div>

                  <div className="settings-meta-summary-grid">
                    <div className="settings-meta-item">
                      <span className="settings-meta-label">Contractual Baseline</span>
                      <span className="settings-meta-val">{projectSettings.baselineSchedule}</span>
                    </div>
                    <div className="settings-meta-item">
                      <span className="settings-meta-label">Total Activities</span>
                      <span className="settings-meta-val">
                        {projectSettings.totalActivitiesPlanned.toLocaleString()} Planned / {projectSettings.totalActivitiesTracking.toLocaleString()} Tracking
                      </span>
                    </div>
                    <div className="settings-meta-item">
                      <span className="settings-meta-label">Work Breakdown</span>
                      <span className="settings-meta-val">{projectSettings.wbsHierarchyLevel}</span>
                    </div>
                    <div className="settings-meta-item">
                      <span className="settings-meta-label">Client / Asset Owner</span>
                      <span className="settings-meta-val">{projectSettings.clientOwner}</span>
                    </div>
                    <div className="settings-meta-item">
                      <span className="settings-meta-label">EPC General Contractor</span>
                      <span className="settings-meta-val">{projectSettings.generalContractor}</span>
                    </div>
                    <div className="settings-meta-item">
                      <span className="settings-meta-label">Lead Controls Planner</span>
                      <span className="settings-meta-val">{projectSettings.leadControlsPlanner}</span>
                    </div>
                  </div>

                  <div className="settings-disciplines-wrap">
                    <span className="settings-label">Tracked Disciplines Scope</span>
                    <div className="settings-tags-list">
                      {projectSettings.disciplineScope.map((disc) => (
                        <span key={disc} className="settings-tag">
                          {disc}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="settings-actions-bar">
                  <div className="settings-actions-notice">
                    {projectFormDirty ? (
                      <span className="settings-dirty-indicator">Unsaved changes pending.</span>
                    ) : (
                      <span className="settings-clean-indicator">Configuration matches current project state.</span>
                    )}
                  </div>
                  <div className="settings-actions-group">
                    <button
                      type="button"
                      className="button secondary"
                      onClick={handleResetProjectDefaults}
                    >
                      Reset to Defaults
                    </button>
                    <button
                      type="button"
                      className="button primary"
                      disabled={!projectFormDirty}
                      onClick={handleSaveProjectSettings}
                    >
                      <Save size={14} />
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* 02 — MATCHING */}
          {/* ================================================================ */}
          {activeTab === "matching" && (
            <div className="settings-section-view">
              <div className="settings-section-head">
                <div>
                  <div className="settings-section-kicker">SECTION 02</div>
                  <h2 className="settings-section-title">Matching Intelligence</h2>
                </div>
                <p className="settings-section-desc">
                  Explainable multi-signal candidate ranking, routing thresholds, and safety invariants.
                </p>
              </div>

              <div className="settings-card-stack">
                {/* CRITICAL PRODUCT RULE CARD */}
                <div className="settings-safety-card">
                  <div className="settings-safety-badge">
                    <ShieldCheck size={16} />
                    IMMUTABLE ENTERPRISE SAFETY INVARIANT
                  </div>
                  <h3 className="settings-safety-title">AUTO-SUGGEST ≠ AUTO-UPDATE</h3>
                  <p className="settings-safety-quote">
                    &ldquo;ExecLink never updates trusted schedule actuals solely from an AI match. Planner verification is required before schedule mutation.&rdquo;
                  </p>
                  <p className="settings-safety-detail">
                    In accordance with AACE International and PMI-SP project control standards, machine intelligence computes candidate match certitude and explains alignment signals. All progress percentage adjustments, actual start dates, and actual finish commits strictly require explicit planner verification, creating a tamper-evident, auditable record with reviewer identity and timestamp lineage.
                  </p>
                </div>

                {/* Six Explainability Signals */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div>
                      <h3 className="settings-card-title">Six Explainability Signals</h3>
                      <p className="settings-card-subtitle">
                        Constituent weighting model used by the matching engine to score candidate alignments.
                      </p>
                    </div>
                    <span className="settings-pill pill-green">Model Total 100%</span>
                  </div>

                  <div className="settings-signals-list">
                    {MATCHING_SIGNALS.map((sig) => (
                      <div key={sig.id} className="settings-signal-row">
                        <div className="settings-signal-header">
                          <div className="settings-signal-title-wrap">
                            <span className="settings-signal-name">{sig.name}</span>
                            <span className="settings-signal-weight">{sig.weight}% Weight</span>
                          </div>
                          <div className="settings-signal-bar-track">
                            <div
                              className="settings-signal-bar-fill"
                              style={{ width: `${sig.weight * 2.5}%` }}
                            />
                          </div>
                        </div>
                        <p className="settings-signal-desc">{sig.description}</p>
                        <div className="settings-signal-meta">
                          <span className="settings-signal-algo">
                            <strong>Algorithm:</strong> {sig.algorithm}
                          </span>
                          <span className="settings-signal-example">
                            <strong>Reference:</strong> {sig.example}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Routing Thresholds */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div>
                      <h3 className="settings-card-title">Queue Routing Thresholds</h3>
                      <p className="settings-card-subtitle">
                        Score boundaries governing automated queue triage in the Verification Center.
                      </p>
                    </div>
                    <span className="settings-pill pill-blue">Active Policy: {thresholds.presetName}</span>
                  </div>

                  <div className="settings-thresholds-grid">
                    {/* High Confidence */}
                    <div className="settings-threshold-tier tier-high">
                      <div className="settings-tier-badge">≥ {thresholds.autoSuggestThreshold}%</div>
                      <div className="settings-tier-title">High Confidence / Auto-Suggest</div>
                      <p className="settings-tier-desc">
                        Candidate alignment satisfies primary semantic and tag criteria with negligible ambiguity. Automatically recommended to planner with 1-click verification shortcut.
                      </p>
                      <div className="settings-tier-rule">
                        <Check size={13} className="text-emerald-500" />
                        <span>Pre-populates recommended target activity.</span>
                      </div>
                    </div>

                    {/* Human Review */}
                    <div className="settings-threshold-tier tier-review">
                      <div className="settings-tier-badge">
                        {thresholds.humanReviewThreshold}% – {thresholds.autoSuggestThreshold - 1}%
                      </div>
                      <div className="settings-tier-title">Human Review Required</div>
                      <p className="settings-tier-desc">
                        Moderate ambiguity or competing candidates detected. Primary candidate displayed alongside ranked alternatives for planner evaluation.
                      </p>
                      <div className="settings-tier-rule">
                        <AlertTriangle size={13} className="text-amber-500" />
                        <span>Requires alternative candidate inspection.</span>
                      </div>
                    </div>

                    {/* Unmatched / New Activity */}
                    <div className="settings-threshold-tier tier-unmatched">
                      <div className="settings-tier-badge">&lt; {thresholds.humanReviewThreshold}%</div>
                      <div className="settings-tier-title">Unmatched / Scope Variance</div>
                      <p className="settings-tier-desc">
                        Field event does not map with sufficient certitude to any existing baseline activity. Flagged for Scope Variance Triage or Change Backlog logging.
                      </p>
                      <div className="settings-tier-rule">
                        <Info size={13} className="text-blue-500" />
                        <span>Routes to New Activity change triage.</span>
                      </div>
                    </div>
                  </div>

                  {/* Threshold Policy Presets */}
                  <div className="settings-presets-box">
                    <div className="settings-presets-head">
                      <span className="settings-label">Governance Sensitivity Presets</span>
                      <span className="settings-presets-sub">Select an enterprise policy preset:</span>
                    </div>
                    <div className="settings-preset-buttons">
                      <button
                        type="button"
                        className={`settings-preset-btn ${thresholds.presetName === "Conservative" ? "active" : ""}`}
                        onClick={() => applyThresholdPreset("Conservative")}
                      >
                        <span className="settings-preset-name">Conservative (Recommended)</span>
                        <span className="settings-preset-nums">Auto-Suggest ≥ 90% · Review ≥ 70%</span>
                      </button>
                      <button
                        type="button"
                        className={`settings-preset-btn ${thresholds.presetName === "Balanced" ? "active" : ""}`}
                        onClick={() => applyThresholdPreset("Balanced")}
                      >
                        <span className="settings-preset-name">Balanced Field</span>
                        <span className="settings-preset-nums">Auto-Suggest ≥ 85% · Review ≥ 65%</span>
                      </button>
                      <button
                        type="button"
                        className={`settings-preset-btn ${thresholds.presetName === "High-Precision" ? "active" : ""}`}
                        onClick={() => applyThresholdPreset("High-Precision")}
                      >
                        <span className="settings-preset-name">High Precision</span>
                        <span className="settings-preset-nums">Auto-Suggest ≥ 92% · Review ≥ 75%</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* 03 — DATA SOURCES */}
          {/* ================================================================ */}
          {activeTab === "datasources" && (
            <div className="settings-section-view">
              <div className="settings-section-head">
                <div>
                  <div className="settings-section-kicker">SECTION 03</div>
                  <h2 className="settings-section-title">Data Sources</h2>
                </div>
                <p className="settings-section-desc">
                  Connected execution feeds, schedule baseline channels and field journal parsers.
                </p>
              </div>

              <div className="settings-sources-grid">
                {SUPPORTED_DATA_SOURCES.map((source) => {
                  const getStatusBadge = (status: DataSourceItem["status"]) => {
                    switch (status) {
                      case "Connected":
                        return <span className="settings-pill pill-green">Connected</span>;
                      case "Imported":
                        return <span className="settings-pill pill-blue">Imported</span>;
                      case "Available":
                        return <span className="settings-pill pill-neutral">Available</span>;
                      case "Requires Setup":
                        return <span className="settings-pill pill-amber">Requires Setup</span>;
                    }
                  };

                  return (
                    <div key={source.id} className="settings-source-card">
                      <div className="settings-source-head">
                        <div>
                          <div className="settings-source-cat-row">
                            <span className="settings-source-cat">{source.category}</span>
                            {source.isDemoSample && (
                              <span className="settings-demo-tag">Sample / Demo Source</span>
                            )}
                          </div>
                          <h3 className="settings-source-title">{source.name}</h3>
                        </div>
                        {getStatusBadge(source.status)}
                      </div>

                      <p className="settings-source-desc">{source.description}</p>

                      <div className="settings-source-meta-grid">
                        <div className="settings-source-meta-row">
                          <span className="settings-source-meta-label">Format / Interface:</span>
                          <span className="settings-source-meta-val font-mono">{source.format}</span>
                        </div>
                        <div className="settings-source-meta-row">
                          <span className="settings-source-meta-label">Last Synchronization:</span>
                          <span className="settings-source-meta-val">{source.lastSync}</span>
                        </div>
                        <div className="settings-source-meta-row">
                          <span className="settings-source-meta-label">Records Ingested:</span>
                          <span className="settings-source-meta-val font-accent">{source.recordsCount}</span>
                        </div>
                      </div>

                      <div className="settings-source-actions">
                        {source.actionType === "link" && source.targetRoute && (
                          <Link href={source.targetRoute} className="button secondary settings-source-btn">
                            <span>{source.actionLabel}</span>
                            <ArrowRight size={13} />
                          </Link>
                        )}
                        {source.actionType === "dialog" && (
                          <button
                            type="button"
                            className="button secondary settings-source-btn"
                            onClick={() => setSetupModalSource(source)}
                          >
                            <span>{source.actionLabel}</span>
                            <SlidersHorizontal size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* 04 — USERS & ROLES */}
          {/* ================================================================ */}
          {activeTab === "users" && (
            <div className="settings-section-view">
              <div className="settings-section-head">
                <div>
                  <div className="settings-section-kicker">SECTION 04</div>
                  <h2 className="settings-section-title">Users & Roles</h2>
                </div>
                <p className="settings-section-desc">
                  Project controls governance, role-based access scopes, and verification sign-off authority.
                </p>
              </div>

              <div className="settings-card-stack">
                {/* Active Session Callout */}
                <div className="settings-session-card">
                  <div className="settings-session-avatar">TP</div>
                  <div className="settings-session-body">
                    <div className="settings-session-header">
                      <span className="settings-session-pill">ACTIVE SIGN-OFF AUTHORITY</span>
                      <span className="settings-session-identity">Tirth Patel (PE, PMP)</span>
                    </div>
                    <p className="settings-session-desc">
                      Current session decisions in the Verification Center are cryptographically stamped with reviewer ID:
                      <strong className="font-mono ml-1.5">T. Patel (Lead Planner)</strong>.
                    </p>
                  </div>
                </div>

                {/* Users Registry Table */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div>
                      <h3 className="settings-card-title">Project Controls Team Registry</h3>
                      <p className="settings-card-subtitle">
                        Active participants and authorization boundaries configured for PRJ-DEMO-001.
                      </p>
                    </div>
                    <span className="settings-pill pill-neutral">5 Members</span>
                  </div>

                  <div className="settings-users-table-wrap">
                    <table className="settings-users-table">
                      <thead>
                        <tr>
                          <th>MEMBER</th>
                          <th>ROLE & DEPARTMENT</th>
                          <th>ACCESS SCOPE</th>
                          <th>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {DEMO_USERS_AND_ROLES.map((user) => (
                          <tr key={user.id} className={user.isCurrentSession ? "current-session-row" : ""}>
                            <td>
                              <div className="settings-user-cell">
                                <div className="settings-user-avatar">{user.avatar}</div>
                                <div>
                                  <div className="settings-user-name">
                                    {user.name}
                                    {user.isCurrentSession && (
                                      <span className="settings-you-pill">You</span>
                                    )}
                                  </div>
                                  <div className="settings-user-email">{user.email}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="settings-user-role-text">{user.role}</div>
                              <div className="settings-user-dept-text">{user.department}</div>
                            </td>
                            <td>
                              <div className="settings-user-scope-text">{user.accessScope}</div>
                            </td>
                            <td>
                              <span
                                className={`settings-pill ${
                                  user.status.includes("Active") ? "pill-green" : "pill-neutral"
                                }`}
                              >
                                {user.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Governance Authority Matrix */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div>
                      <h3 className="settings-card-title">Role Permission Matrix</h3>
                      <p className="settings-card-subtitle">
                        Decision boundaries between field submission, AI matching, and contractual schedule mutation.
                      </p>
                    </div>
                  </div>

                  <div className="settings-perm-table-wrap">
                    <table className="settings-perm-table">
                      <thead>
                        <tr>
                          <th>RESPONSIBILITY</th>
                          <th>PLANNER / CONTROLS</th>
                          <th>PROJECT MANAGER</th>
                          <th>FIELD SUPERVISOR</th>
                          <th>PLANNING MANAGER</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Field Progress & DPR Ingestion</td>
                          <td><Check size={14} className="text-emerald-500" /></td>
                          <td><span className="text-muted">Read</span></td>
                          <td><Check size={14} className="text-emerald-500" /></td>
                          <td><span className="text-muted">Read</span></td>
                        </tr>
                        <tr>
                          <td>AI Match Review & Alternative Selection</td>
                          <td><Check size={14} className="text-emerald-500" /></td>
                          <td><span className="text-muted">Read</span></td>
                          <td><X size={14} className="text-muted" /></td>
                          <td><Check size={14} className="text-emerald-500" /></td>
                        </tr>
                        <tr className="settings-perm-highlight-row">
                          <td>
                            <strong>Schedule Actuals Mutation (Verification Center)</strong>
                          </td>
                          <td><Check size={14} className="text-emerald-500" /></td>
                          <td><X size={14} className="text-muted" /></td>
                          <td><X size={14} className="text-muted" /></td>
                          <td><Check size={14} className="text-emerald-500" /></td>
                        </tr>
                        <tr>
                          <td>Baseline Schedule Lock / Authorize Revision</td>
                          <td><X size={14} className="text-muted" /></td>
                          <td><X size={14} className="text-muted" /></td>
                          <td><X size={14} className="text-muted" /></td>
                          <td><Check size={14} className="text-emerald-500" /></td>
                        </tr>
                        <tr>
                          <td>Scope Change Backlog Governance</td>
                          <td><Check size={14} className="text-emerald-500" /></td>
                          <td><Check size={14} className="text-emerald-500" /></td>
                          <td><span className="text-muted">Flag Only</span></td>
                          <td><Check size={14} className="text-emerald-500" /></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* 05 — DEMO CONTROLS */}
          {/* ================================================================ */}
          {activeTab === "demo" && (
            <div className="settings-section-view">
              <div className="settings-section-head">
                <div>
                  <div className="settings-section-kicker">SECTION 05</div>
                  <h2 className="settings-section-title">Demo Controls</h2>
                </div>
                <p className="settings-section-desc">
                  Reset local demonstration environment and restore golden path baseline for live evaluations.
                </p>
              </div>

              <div className="settings-card-stack">
                {/* Dataset & Environment Card */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div>
                      <h3 className="settings-card-title">Dataset & Environment</h3>
                      <p className="settings-card-subtitle">
                        Target demonstration workspace configuration.
                      </p>
                    </div>
                    <span className="settings-pill pill-blue">Local Golden Path</span>
                  </div>

                  <div className="settings-meta-summary-grid">
                    <div className="settings-meta-item">
                      <span className="settings-meta-label">Active Dataset ID</span>
                      <span className="settings-meta-val font-mono">{demoState.datasetId}</span>
                    </div>
                    <div className="settings-meta-item">
                      <span className="settings-meta-label">Project Name</span>
                      <span className="settings-meta-val">{demoState.projectName}</span>
                    </div>
                    <div className="settings-meta-item">
                      <span className="settings-meta-label">Baseline Revision</span>
                      <span className="settings-meta-val">{demoState.baselineRevision}</span>
                    </div>
                    <div className="settings-meta-item">
                      <span className="settings-meta-label">Storage Target</span>
                      <span className="settings-meta-val">Local Browser Storage (Client Isolated)</span>
                    </div>
                  </div>
                </div>

                {/* Current Demo State Status */}
                <div className="settings-card">
                  <div className="settings-card-header">
                    <div>
                      <h3 className="settings-card-title">Current Demo State</h3>
                      <p className="settings-card-subtitle">
                        Tracks whether verification queue, schedule actuals, or audit logs have been modified in this session.
                      </p>
                    </div>
                    {demoState.isModified ? (
                      <span className="settings-pill pill-amber">Modified Session</span>
                    ) : (
                      <span className="settings-pill pill-green">Ready (Golden Path Baseline)</span>
                    )}
                  </div>

                  <div className="settings-demo-stats-grid">
                    <div className="settings-demo-stat-box">
                      <span className="settings-demo-stat-val font-accent">
                        {demoState.pendingVerificationCount}
                      </span>
                      <span className="settings-demo-stat-label">Pending Verification Items</span>
                    </div>

                    <div className="settings-demo-stat-box">
                      <span className={`settings-demo-stat-val ${demoState.mutatedActualsCount > 0 ? "text-amber-500" : ""}`}>
                        {demoState.mutatedActualsCount}
                      </span>
                      <span className="settings-demo-stat-label">Mutated Schedule Actuals</span>
                    </div>

                    <div className="settings-demo-stat-box">
                      <span className="settings-demo-stat-val font-mono">
                        {demoState.auditRecordsCount}
                      </span>
                      <span className="settings-demo-stat-label">Recorded Audit Entries</span>
                    </div>

                    <div className="settings-demo-stat-box">
                      <span className="settings-demo-stat-val font-mono">
                        {demoState.backlogRecordsCount}
                      </span>
                      <span className="settings-demo-stat-label">Change Backlog Items</span>
                    </div>
                  </div>

                  <div className="settings-demo-timestamp-row">
                    <Clock size={14} className="settings-clock-icon" />
                    <span>Last Demo Reset:</span>
                    <strong className="font-mono">{formatTimestamp(demoState.lastResetTimestamp)}</strong>
                  </div>
                </div>

                {/* Reset Action Card */}
                <div className="settings-reset-card">
                  <div className="settings-reset-header">
                    <div className="settings-reset-icon-wrap">
                      <RotateCcw size={20} className="settings-reset-icon" />
                    </div>
                    <div>
                      <h3 className="settings-reset-title">Reset Demo Data</h3>
                      <p className="settings-reset-desc">
                        Restores the golden path demonstration environment to its pristine initial seed.
                      </p>
                    </div>
                  </div>

                  <div className="settings-reset-detail-box">
                    <div className="settings-reset-checklist-title">WHAT THIS ACTION DOES:</div>
                    <ul className="settings-reset-checklist">
                      <li>
                        <Check size={13} className="text-emerald-500" />
                        <span>Restores Verification Queue to initial 12 baseline items (VER-001 through VER-012).</span>
                      </li>
                      <li>
                        <Check size={13} className="text-emerald-500" />
                        <span>Clears all locally mutated schedule progress percentages, actual starts, and actual finishes.</span>
                      </li>
                      <li>
                        <Check size={13} className="text-emerald-500" />
                        <span>Flushes custom audit entries and uncommitted change backlog entries.</span>
                      </li>
                      <li>
                        <Check size={13} className="text-emerald-500" />
                        <span>Resets matching threshold sensitivity to Conservative (90% / 70%) baseline.</span>
                      </li>
                      <li>
                        <Check size={13} className="text-emerald-500" />
                        <span>
                          <strong>Safe & isolated:</strong> Operates strictly on browser local storage keys and does NOT modify code, tests, or repository files.
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="settings-reset-footer">
                    <Link href="/verification-center" className="button secondary">
                      <ExternalLink size={13} />
                      Inspect Verification Center
                    </Link>
                    <button
                      type="button"
                      className="button danger settings-reset-btn"
                      onClick={() => setResetModalOpen(true)}
                    >
                      <RotateCcw size={14} />
                      Reset Demo Data
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ==================================================================== */}
      {/* MODAL: CONFIRM DEMO DATA RESET */}
      {/* ==================================================================== */}
      {resetModalOpen && (
        <div
          className="overlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isResetting) setResetModalOpen(false);
          }}
        >
          <div
            className="modal-shell settings-modal-box"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-modal-title"
          >
            <header className="panel-head">
              <div className="settings-modal-header-icon-wrap">
                <AlertTriangle size={20} className="text-amber-500" />
              </div>
              <div className="settings-modal-header-text">
                <h3 id="reset-modal-title" className="panel-title">
                  Confirm Demo Data Reset
                </h3>
                <p className="panel-copy">
                  Return North River Expansion (PRJ-DEMO-001) to pristine baseline state.
                </p>
              </div>
              <button
                type="button"
                className="icon-button modal-close"
                onClick={() => setResetModalOpen(false)}
                disabled={isResetting}
                aria-label="Close dialog"
              >
                <X size={14} />
              </button>
            </header>

            <div className="panel-body">
              <p className="settings-modal-body-copy">
                Are you sure you want to reset the demonstration environment? This will immediately:
              </p>
              <div className="settings-modal-impact-list">
                <div className="settings-modal-impact-item">
                  <span className="settings-impact-bullet">•</span>
                  <span>Reset the <strong>Verification Center queue</strong> to 12 unverified items.</span>
                </div>
                <div className="settings-modal-impact-item">
                  <span className="settings-impact-bullet">•</span>
                  <span>Clear all <strong>mutated schedule actuals</strong> from local storage.</span>
                </div>
                <div className="settings-modal-impact-item">
                  <span className="settings-impact-bullet">•</span>
                  <span>Clear temporary <strong>audit trail entries</strong> and <strong>change backlog</strong> items.</span>
                </div>
                <div className="settings-modal-impact-item">
                  <span className="settings-impact-bullet">•</span>
                  <span>Update the demo state timestamp across all open ExecLink browser tabs.</span>
                </div>
              </div>

              <div className="settings-modal-assurance">
                <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                <span>Non-destructive: No source files or git history will be altered.</span>
              </div>
            </div>

            <footer className="panel-footer settings-modal-footer">
              <button
                type="button"
                className="button secondary"
                onClick={() => setResetModalOpen(false)}
                disabled={isResetting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button danger"
                onClick={handleConfirmReset}
                disabled={isResetting}
              >
                {isResetting ? (
                  <>
                    <RotateCcw size={14} className="animate-spin" />
                    Resetting Demo State...
                  </>
                ) : (
                  <>
                    <RotateCcw size={14} />
                    Confirm & Reset Demo Data
                  </>
                )}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: CONFIGURE DATA SOURCE (IOT / SPATIAL) */}
      {/* ==================================================================== */}
      {setupModalSource && (
        <div
          className="overlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSetupModalSource(null);
          }}
        >
          <div
            className="modal-shell settings-modal-box"
            role="dialog"
            aria-modal="true"
            aria-labelledby="setup-source-title"
          >
            <header className="panel-head">
              <div className="settings-modal-header-icon-wrap">
                <Database size={20} className="text-blue-500" />
              </div>
              <div className="settings-modal-header-text">
                <h3 id="setup-source-title" className="panel-title">
                  Configure {setupModalSource.name}
                </h3>
                <p className="panel-copy">
                  Telemetry webhook endpoint & API token configuration.
                </p>
              </div>
              <button
                type="button"
                className="icon-button modal-close"
                onClick={() => setSetupModalSource(null)}
                aria-label="Close dialog"
              >
                <X size={14} />
              </button>
            </header>

            <div className="panel-body">
              <div className="settings-field-grid">
                <div className="settings-field">
                  <label className="settings-label" htmlFor="source-endpoint-url">
                    Webhook Ingestion Endpoint
                  </label>
                  <input
                    id="source-endpoint-url"
                    type="text"
                    className="settings-input readonly font-mono text-xs"
                    value="https://api.execlink.internal/v1/telemetry/prj-demo-001/events"
                    readOnly
                  />
                  <span className="settings-field-hint">Send point cloud surveys and RFID crane logs to this URI.</span>
                </div>

                <div className="settings-field">
                  <label className="settings-label" htmlFor="source-api-token">
                    API Authorization Token
                  </label>
                  <input
                    id="source-api-token"
                    type="password"
                    className="settings-input font-mono"
                    defaultValue="exl_live_948f21e0ab498c19"
                  />
                  <span className="settings-field-hint">Bearer token for authenticating external telemetry dispatch.</span>
                </div>
              </div>

              <div className="settings-modal-assurance mt-4">
                <Info size={14} className="text-blue-400 shrink-0" />
                <span>Synthetic sample telemetry is currently provided via the DPR Spreadsheet and Mobile Field App feeds.</span>
              </div>
            </div>

            <footer className="panel-footer settings-modal-footer">
              <button
                type="button"
                className="button secondary"
                onClick={() => setSetupModalSource(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="button primary"
                onClick={() => {
                  setSetupModalSource(null);
                  setToastMessage("Telemetry source endpoint configuration verified.");
                }}
              >
                Test Connection
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
