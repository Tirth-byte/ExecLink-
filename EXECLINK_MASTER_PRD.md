# EXECLINK — MASTER PRODUCT REQUIREMENTS DOCUMENT

## Planning-to-Execution Intelligence Layer for Infrastructure Projects

**Document role:** Master source of truth for product, UX, architecture, demo, and implementation.

**Product objective:** ExecLink closes the gap between what planners schedule in L1–L6 project plans and what actually happens at site.

ExecLink receives messy real-world execution information—DPR rows, field updates, site diaries, spreadsheets, and conversational updates—converts it into structured execution events, intelligently links those events to schedule activities, asks humans to verify uncertain matches, and only then updates trusted actual progress.

The product should feel like **serious enterprise project-controls software enhanced by AI**, not an “AI dashboard” or a college hackathon prototype.

---

# 1. PRODUCT PHILOSOPHY

The central product loop is:

```text
PLAN
  ↓
CAPTURE
  ↓
UNDERSTAND
  ↓
MATCH
  ↓
VERIFY
  ↓
UPDATE
  ↓
LEARN
```

AI is not allowed to silently change the project schedule.

```text
AI recommendation
      ↓
Human verification
      ↓
Verified actual progress changes
      ↓
Audit record created
      ↓
Analytics update
      ↓
Project Memory learns
```

**Core invariant:** Auto-suggest does not mean auto-update. Matching proposes; authorized verification mutates actual progress.

---

# 2. PRIMARY USERS

## 2.1 Project Controls / Planner
Primary desktop user. Needs to understand actual execution, map it to the schedule, resolve ambiguous matches, inspect evidence, and control verified progress.

## 2.2 Project Manager
Primarily consumes Overview and Analytics. Needs rapid visibility into progress, variance, critical exposure, delays, verification health, and execution trends.

## 2.3 Field Supervisor / Engineer
Primary mobile user. Needs to report work in seconds without operating a miniature planning system.

## 2.4 Planning Manager / Approver
Handles ambiguous matches, exceptions, new activities, and auditability.

## 2.5 Admin / Demo Operator
Imports project data, manages project context, and resets deterministic demo state.

---

# 3. DESKTOP INFORMATION ARCHITECTURE

ExecLink has eight primary desktop destinations:

```text
EXECLINK

PROJECT
01  Overview

EXECUTION
02  Live Execution
03  Match Review
04  Schedule Explorer

DATA
05  Data Ingestion

CONTROL
06  Verification Center

INTELLIGENCE
07  Analytics
08  Project Memory
```

Secondary navigation:

```text
Help
Settings

User Profile
Role
```

---

# 4. GLOBAL DESKTOP SHELL

## 4.1 Sidebar
Approx. 224–240 px expanded width. Contains ExecLink identity, project selector, grouped navigation, Help/Settings, and current user. Active destination uses a restrained filled state. Sidebar may collapse.

## 4.2 Top Bar
Contains breadcrumb/current page, global search, Data Date, sync/system state, notifications, and user menu.

Optional global shortcut: **⌘ K Command Palette**.

Global search covers activities, asset/tags, execution events, DPRs, WBS, evidence, and Project Memory.

## 4.3 Main Canvas
Calm, dense operational workspace. Avoid giant marketing headings. This is enterprise project-controls software.

---

# 5. VIEW 01 — OVERVIEW / EXECUTION COMMAND CENTER

## Purpose
Answer: **What is happening on my project right now, and where should I look?**

Avoid KPI soup.

## Header
- Execution Command Center
- Project name and ID
- Data Date / last refresh
- Export
- Share
- Import Update

## Primary Progress Strip
Four carefully selected measures:
- Planned Progress
- Verified Actual Progress
- Variance
- Data Freshness

## S-Curve
Primary visual with:
- Baseline Planned
- Current Planned
- Verified Actual
- Data Date marker
- hover values
- schedule variance summary
- trend context

## Attention Required
Ranked operational exceptions such as:
- blocked critical activity
- ambiguous match
- delayed activity
- stale data
- unmatched event

Each item deep-links to its owning object.

## Execution by Discipline
Planned vs verified actual progress for:
- Civil
- Structural
- Piping
- Static Equipment
- Rotating Equipment
- Electrical
- Instrumentation
- HSE

## Matching Health
Show counts/distribution for:
- high-confidence proposals
- review-required proposals
- unmatched/new activity candidates

Do not label this as generic “AI accuracy.”

## Verification Backlog
Show waiting count, high-priority count, and oldest unresolved item.

## Critical Execution Watch
Table columns:
- Activity
- Discipline
- Float
- Progress
- Issue
- Impact

## Recent Verified Events
Compact timeline/feed showing time, event, matched activity, and verifier. Clicking opens evidence/audit details.

---

# 6. VIEW 02 — LIVE EXECUTION

## Purpose
Operational heartbeat for all incoming execution events from Field App, DPR, spreadsheets, diaries, and other sources.

## Header
- event count
- latest received timestamp
- Search
- Filters
- Export

## Filters
- date/time
- discipline
- contractor
- source
- location
- status
- confidence
- verification state
- asset/tag

Saved views:
- All Events
- Needs Review
- Blocked
- Unmatched
- My Discipline
- Critical Activities

## Main Table
Columns:
- Time
- Execution Event
- Discipline
- Asset / Tag
- Location
- Source
- Matched Activity
- Confidence
- Status

Statuses include:
- Verified
- Auto-suggest
- Review
- Unmatched
- Rejected
- Blocked

## Event Detail Drawer
Contains:
- raw source update
- structured extracted fields
- AI match recommendation
- confidence
- evidence
- source metadata
- complete audit/history timeline

---

# 7. VIEW 03 — MATCH REVIEW ★ FLAGSHIP DESKTOP SCREEN

## Purpose
Make AI matching transparent, reviewable, and trustworthy.

## Core Layout
Three-zone workspace:

```text
FIELD EVENT | SCHEDULE CANDIDATES | EXPLANATION / IMPACT
```

## Field Event Panel
Display:
- raw execution statement
- event type
- timestamp
- discipline
- asset/tag
- location
- source
- reporter
- contractor when available
- evidence

## Recommended Schedule Match
Display:
- overall confidence
- activity ID
- activity name
- WBS path
- baseline dates
- current progress
- proposed result
- proposed actual date/time

## Six-Signal Explainability
Visualize:
1. Semantic
2. Asset / Tag
3. WBS / Context
4. Discipline
5. Temporal
6. Location

Include a concise natural-language explanation of why the candidate ranks first.

## Alternative Candidates
Ranked alternatives with activity ID, title, confidence, and relevant contextual differences.

## Schedule Impact Preview
Before approval, show exactly what would change:
- progress before → after
- status before → after
- actual start/finish before → after
- schedule variance impact

## Actions
- Approve Match
- Choose Alternative
- Reject
- Mark as New Activity

Approval must remain explicit human action.

---

# 8. VIEW 04 — SCHEDULE EXPLORER

## Purpose
Professional project-controls workspace combining WBS, activity table, timeline, actuals, evidence, and execution confidence.

## Layout
Resizable panes:

```text
WBS TREE | ACTIVITY TABLE | TIMELINE / GANTT
```

## WBS Tree
Support L1 through L6 hierarchy.

## Activity Table
Columns:
- ID
- Activity
- Discipline
- Baseline Start
- Baseline Finish
- Actual Start
- Actual Finish
- Progress
- Variance
- Confidence
- Status

## Timeline / Gantt
Show:
- baseline bars
- current schedule
- actual progress
- milestones
- Data Date
- critical path
- delayed activities

## Activity Detail Drawer
Tabs:
- Overview
- Execution Events
- Evidence
- Dependencies
- History

Include WBS, baseline/actual dates, duration, float, progress, contractor, discipline, location, verified source, and confidence.

---

# 9. VIEW 05 — DATA INGESTION

## Purpose
Allow organizations to keep existing reporting workflows while ExecLink converts their data into structured execution events.

## Supported Prototype Inputs
- CSV
- XLSX / spreadsheet
- DPR
- Site Diary
- Primavera export where supported
- MS Project export where supported
- Field App
- Time Agent

## Upload Landing Area
Polished drag/drop workflow with source status indicators.

## Import Wizard

### Step 1 — Upload
Show file name, size, type, source.

### Step 2 — Detect
Show detected document type, sheet/table, row count, and inferred structure.

### Step 3 — Map Fields
Map source columns to ExecLink canonical fields.

### Step 4 — Extraction
Show extraction progress, successful rows, and rows requiring attention.

### Step 5 — Matching Results
Summarize:
- high confidence
- review required
- unmatched

Provide row-level results.

### Step 6 — Complete
Show number of execution events created, proposed matches, review items, and unresolved items.

Primary next actions:
- View Live Execution
- Open Verification Queue

---

# 10. VIEW 06 — VERIFICATION CENTER

## Purpose
Manage the entire human approval workload.

Match Review is deep inspection of one case. Verification Center is the operational queue.

## Header
Show:
- awaiting review
- high priority
- oldest item

## Queue Filters
- All
- Critical
- Low Confidence
- Ambiguous
- Unmatched
- New Activity
- Discipline
- Source
- Age
- Reviewer

## Queue Table
Columns:
- Priority
- Event
- Suggested Activity
- Confidence
- Discipline
- Source
- Age
- Reviewer

## Batch Actions
Only safe administrative actions such as:
- Assign Reviewer
- Mark Priority
- Export

Do not support blind bulk approval of ambiguous matches.

## Ageing / SLA
Show unresolved work by age bucket.

---

# 11. VIEW 07 — ANALYTICS

Every visualization must answer a real project-controls question.

## Progress
S-curve with Baseline, Current Plan, and Verified Actual.

## Schedule Variance
Variance trend over time.

## Discipline Performance
Planned vs actual by discipline.

## Delay Causes
Examples:
- Permit
- Material
- Access
- Weather
- Design
- Inspection
- Equipment
- Manpower

Prefer readable horizontal bars.

## Planned vs Actual Duration
Scatter plot; outliers indicate execution anomalies.

## Matching Confidence Distribution
Buckets such as:
- 0–50
- 50–70
- 70–90
- 90–100

## Verification Throughput
Show:
- events received
- proposals created
- verified
- rejected
- unmatched
- median review time

## Contractor / Workfront Performance
Show only when data is sufficiently meaningful.

## Drill-Down
Charts should filter/navigate to underlying activities/events.

---

# 12. VIEW 08 — PROJECT MEMORY

## Purpose
Turn verified execution history into reusable institutional knowledge.

## Search
Search similar activities, assets, delays, disciplines, locations, and historical execution patterns.

## Similar Historical Activities
Display:
- activity
- planned duration
- actual duration
- delay cause
- discipline/location/context

## Pattern Summary
Examples:
- historical median duration
- planned median duration
- typical overrun
- common delay causes
- productivity patterns

## Evidence / Trust
Always expose sample size and confidence/context.

Synthetic prototype history must be clearly labelled **Synthetic Demo History**.

Do not present historical patterns as certain future predictions.

---

# 13. GLOBAL SEARCH / COMMAND PALETTE

Shortcut: **⌘ K**

Search across:
- activities
- execution events
- evidence
- assets/tags
- WBS
- Project Memory

Commands may include:
- Import DPR
- Open Verification Queue
- Go to Schedule Explorer
- Reset Demo

---

# 14. NOTIFICATION CENTER

Operational notifications only:
- Critical activity blocked
- Low-confidence match requires review
- DPR import completed
- New unmatched activity detected
- Verification assigned to user

Avoid social-app-style notification noise.

---

# 15. SETTINGS

Keep focused for prototype/hackathon:
- Project
- Matching
- Data Sources
- Users & Roles
- Demo

Matching settings can expose thresholds but should not casually allow destructive model changes during the demo.

Prototype confidence routing concept:
- ≥ 90%: high confidence / auto-suggest
- 70–89%: human review
- < 70%: unmatched / possible new activity

---

# 16. MOBILE FIELD APP — PRODUCT PRINCIPLE

The mobile app is **not** the desktop application compressed to a phone.

Its job is to capture accurate field execution with minimum friction.

Primary navigation:

```text
TODAY
CAPTURE
HISTORY
```

Profile/settings are secondary.

---

# 17. MOBILE — TODAY'S WORK

Header includes user, work area/discipline, and date.

Summary can show:
- assigned
- completed
- need update
- blocked

Activity cards show:
- asset/tag
- activity name
- location
- planned state
- Update action

Fast status choices:
- Started
- Progress
- Completed
- Delayed
- Blocked

---

# 18. MOBILE — QUICK UPDATE

Large thumb-friendly status choices.

Depending on event type, capture:
- progress %
- quantity
- unit
- time
- note
- delay/block reason
- photo/evidence

Primary action: Submit Update.

---

# 19. MOBILE — TIME AGENT ★ FLAGSHIP MOBILE EXPERIENCE

Large microphone/input area with prompt such as:

> Tell ExecLink what happened.

Example input:

> “Line 24 P-110 erection completed at 10:35. Hydrotest blocked due to permit.”

The Time Agent should produce multiple structured events when multiple facts are present.

Example Event 1:
- Completed
- P-110
- Erection
- 10:35

Example Event 2:
- Blocked
- P-110
- Hydrotest
- Reason: Permit

User must see a structured preview before submission and be able to correct extracted fields.

Phone submission proposes execution events only; it does not directly mutate schedule actuals.

---

# 20. MOBILE — HISTORY & OFFLINE SYNC

History is a chronological timeline of submitted events with sync/verification state.

Offline states:
- Pending Sync
- Syncing
- Synced
- Failed / Retry

When offline, user can continue recording updates. Existing SQLite offline queue must remain protected.

---

# 21. MATCHING ENGINE

## Canonical Execution Event

```text
event_type
description
discipline
asset_tag
location
timestamp
contractor
quantity
unit
delay_reason
source
evidence_id
```

## Six Matching Signals
1. Semantic similarity
2. Asset / tag match
3. WBS / contextual proximity
4. Discipline compatibility
5. Temporal compatibility
6. Location compatibility

## Conceptual Prototype Weighting

```text
Semantic       40%
Asset          20%
WBS            15%
Discipline     10%
Temporal       10%
Location        5%
```

## Confidence Routing

```text
≥ 0.90      High confidence / Auto-suggest
0.70–0.89  Human review
< 0.70      Unmatched / possible new activity
```

These thresholds are prototype values and may be tuned through validation.

**Auto-suggest never means automatic verified progress mutation.**

---

# 22. AUDITABILITY

Every verified actual should answer:
- What changed?
- When?
- Who reported it?
- What source produced it?
- What evidence supported it?
- What did intelligence extract?
- Which candidates were considered?
- Why was this candidate recommended?
- What confidence did it have?
- Who approved/rejected it?
- What was the previous schedule value?

Typical audit timeline:

```text
Field event captured
      ↓
Structured extraction
      ↓
Match proposed
      ↓
Planner verification
      ↓
Actual progress mutation
      ↓
Audit record appended
```

Verification mutation and audit write must remain atomic. Audit history must remain tamper-evident.

---

# 23. CORE DATA MODEL

Preserve the existing core entities:

```text
PROJECT
WBS_NODE
SCHEDULE_ACTIVITY
SOURCE_DOCUMENT
RAW_REPORT
EXECUTION_EVENT
MATCH_CANDIDATE
VERIFIED_MATCH
ACTUAL_PROGRESS
DELAY_EVENT
EVIDENCE
AUDIT_LOG
HISTORICAL_ACTIVITY_PATTERN
```

Do not casually redesign the core model during UI implementation.

---

# 24. DEMO DATA REQUIREMENTS

Use believable infrastructure data across:
- Civil
- Structural
- Piping
- Static Equipment
- Rotating Equipment
- Electrical
- Instrumentation
- HSE

Dataset should contain:
- completed activity
- partial progress
- started activity
- delayed activity
- blocked activity
- near-perfect match
- strong match
- ambiguous match
- wrong candidate possibility
- unmatched event
- potential new activity
- critical-path activity
- evidence-backed event
- voice-created event
- DPR-created event

Preserve the deterministic minimal golden fixture while richer data is layered around it.

---

# 25. GOLDEN DEMO STORY

## Scene 1 — Planning Reality
Open Schedule Explorer and show structured L5/L6 schedule.

Message: Planning knows what should happen, but actual site execution arrives through disconnected reports and conversations.

## Scene 2 — Field Reality
Use Time Agent:

> “Line 24 P-110 erection completed at 10:35. Hydrotest blocked due to permit.”

Show structured preview and submit.

## Scene 3 — Intelligence
Desktop receives the event. Open Match Review and show the recommended L6 activity and six matching signals.

## Scene 4 — Human Trust
Planner inspects source/evidence and schedule impact, then approves.

## Scene 5 — Schedule Update
Schedule Explorer reflects verified actual progress/date.

## Scene 6 — Analytics
Overview/S-curve and related analytics refresh.

## Scene 7 — Legacy Data
Upload a DPR/spreadsheet and demonstrate high-confidence, review-required, and unmatched rows.

## Scene 8 — Institutional Memory
Project Memory surfaces comparable historical activities, actual durations, and recurring delay causes.

The demo must clearly communicate:

```text
CAPTURE → UNDERSTAND → MATCH → VERIFY → UPDATE → LEARN
```

---

# 26. DESIGN LANGUAGE

## Desired Feeling
- Precision
- Calm
- Density
- Trust
- Engineering
- Enterprise-grade

Avoid:
- excessive AI branding
- neon/glowing effects
- giant gradients
- rainbow KPI cards
- excessive glassmorphism
- huge marketing typography
- childish illustrations
- decorative charts without operational meaning

## Colors
Use restrained neutral backgrounds and white/elevated surfaces.

Primary accent: deep restrained green.

Secondary information accent: blue.

Semantic use:
- Green = verified / healthy
- Amber = review / warning
- Red = blocked / critical
- Blue = information / planned
- Gray = neutral

## Typography
Use Inter.

Approximate hierarchy:
- Page title: 24–28 px
- Section heading: 16–18 px
- Body: 14 px
- Table: 13–14 px
- Metadata: 12 px

Avoid giant dashboard headings.

## Radius
- Cards: ~10–14 px
- Inputs: ~8–10 px
- Pills: full radius

Avoid bubbly oversized cards.

## Shadows
Subtle. Prefer borders, spacing, and hierarchy.

## Spacing
Consistent 4/8-based system. Desktop page gutters approximately 24–32 px.

## Charts
- no fake 3D
- no decorative gradients everywhere
- thin axes
- clear labels
- useful hover states
- every chart must answer a real question

## Tables
Tables are first-class product surfaces. Dense but breathable.

---

# 27. MOTION

Motion communicates state rather than decoration.

Suggested timings:
- 120 ms: micro feedback
- 180–220 ms: drawer/popover
- ~240 ms: large transitions

Useful motion:
- drawer entry
- filter updates
- verification success
- newly received event
- chart data transition

Do not animate everything simply because animation tooling exists.

---

# 28. EMPTY, LOADING, AND ERROR STATES

## Empty States
Clear, restrained, operational. Example:

> No matches require review. All current execution events have been resolved.

## Loading
Use geometry-matched skeletons rather than blocking full-screen spinners.

## Errors
Explain what failed and provide recovery. Example:

> DPR import failed: “Activity Description” could not be identified.
> [Map Columns Manually]

Avoid generic “Something went wrong” where a useful explanation is available.

---

# 29. ACCESSIBILITY

Minimum requirements:
- keyboard navigation
- visible focus states
- meaningful labels
- sufficient contrast
- status not communicated by color alone
- keyboard-usable tables
- tooltips/text for ambiguous icon actions

---

# 30. RESPONSIVENESS

Desktop Control Center optimized primarily for:
- 1440×900
- 1512×982
- 1920×1080

Must remain usable around 1280 px.

Do not force the desktop control center into a phone UI. Mobile is a dedicated Flutter surface.

---

# 31. TECHNICAL ARCHITECTURE

Preserve current repository shape:

```text
ExecLink/

apps/
  web/
  field/

services/
  api/
  intelligence/

packages/
  contracts/
  design-tokens/

data/
  schedules/
  dpr/
  demo/

docs/
qa/
```

## Web
- Next.js
- TypeScript
- Tailwind
- shadcn/ui
- Recharts
- Framer Motion

## Field
- Flutter
- Riverpod
- GoRouter
- SQLite offline queue

## Backend
- FastAPI
- SQLite for deterministic demo/prototype

## Intelligence
- structured extraction
- candidate retrieval
- deterministic/context filters
- hybrid scoring
- confidence routing
- historical pattern retrieval

---

# 32. REQUIRED WEB COMPONENT SYSTEM

Create/reuse consistent primitives before page-specific styling:

```text
AppShell
Sidebar
TopBar
ProjectSwitcher
PageHeader
SectionHeader
Metric
DeltaIndicator
StatusBadge
ConfidenceBadge
DisciplineBadge
DataTable
FilterBar
SearchInput
Drawer
Modal
Popover
Tooltip
EmptyState
ErrorState
Skeleton
Timeline
EvidenceViewer
ActivityRow
EventRow
MatchCandidateCard
SignalBreakdown
ConfidenceMeter
SCurveChart
VarianceChart
DisciplineProgress
DelayCauseChart
WBSTree
GanttTimeline
```

This component system is the visual consistency contract across different AI coding providers.

---

# 33. NON-NEGOTIABLE PRODUCT RULES

1. Preserve the accepted Phase 3 golden path.
2. Never allow AI matching alone to mutate verified actual progress.
3. Never replace working production logic with mock UI logic.
4. Synthetic demo data must be clearly identifiable where relevant.
5. Every important number must have operational meaning.
6. Every chart must answer a real project-controls question.
7. Every AI recommendation must expose evidence/reasoning.
8. Every verified schedule mutation must remain auditable.
9. Mobile optimizes field capture; it does not duplicate desktop.
10. Do not introduce architecture changes merely to make UI implementation easier.
11. Do not redesign unrelated pages while implementing the current page.
12. Do not create fake primary buttons/actions.
13. Every visible primary action must work.
14. Every page needs loading, empty, and error states.
15. Reuse design-system components rather than inventing styling per page.
16. No excessive gradients, glassmorphism, glowing AI effects, giant typography, or decorative dashboards.
17. The interface must plausibly belong in a serious EPC/infrastructure organization.
18. Do not declare a page complete solely because it builds successfully.
19. Visual acceptance requires browser inspection.
20. Protect data integrity and auditability above visual convenience.

---

# 34. DEVELOPMENT WORKFLOW — ONE BUILDER AT A TIME

The master PRD remains constant even when the coding provider changes.

```text
Tirth + ChatGPT
      ↓
Define ONE implementation task
      ↓
Codex / current builder
      ↓
Run locally
      ↓
Browser screenshot
      ↓
Tirth + ChatGPT visual/product review
      ↓
Fix until accepted
      ↓
Next task
```

Provider fallback strategy:

```text
Codex
  ↓ allowance exhausted
Clean checkpoint
  ↓
Antigravity
  ↓ allowance exhausted
Clean checkpoint
  ↓
OpenCode / available builder
```

The provider changes. **The PRD, component system, acceptance criteria, and visual direction do not.**

Do not send this PRD with “build everything.” Implement one controlled slice at a time.

---

# 35. EXACT BUILD ORDER

```text
00  Design System + Application Shell
01  Overview
02  Live Execution
03  Match Review ★
04  Schedule Explorer
05  Data Ingestion
06  Verification Center
07  Analytics
08  Project Memory
09  Global Search / Command Palette
10  Notifications
11  Settings / Demo Reset
12  Field — Shell
13  Field — Today's Work
14  Field — Quick Update
15  Field — Time Agent ★
16  Field — History / Offline Sync
17  Full Integration Pass
18  Loading / Empty / Error States
19  Responsive / Accessibility Pass
20  Motion / Microinteraction Pass
21  Synthetic Data Quality Pass
22  Golden Demo Rehearsal
23  Bug Bash
24  Final Judge Build
```

---

# 36. TASK 00 ACCEPTANCE GATE — DESIGN SYSTEM + APP SHELL

Before building individual pages, establish the global quality bar.

Task 00 includes:
- global typography
- colors/tokens
- spacing system
- borders/radii
- AppShell
- sidebar
- top bar
- project selector
- active navigation state
- buttons
- inputs
- status/confidence/discipline badges
- base cards
- table styling
- drawers
- popovers/tooltips
- skeletons
- empty/error primitives
- chart defaults

Task 00 is accepted only after:
1. app builds cleanly;
2. existing golden-path behavior remains intact;
3. shell is inspected in browser at desktop size;
4. visual hierarchy feels enterprise-grade;
5. sidebar/topbar density is appropriate;
6. typography, spacing, radius, border, and semantic colors are consistent;
7. no page-specific redesign has been performed prematurely.

Only after Task 00 is visually accepted should Task 01 — Overview begin.

---

# 37. PAGE ACCEPTANCE PROCESS

Every page follows the same gate:

1. Builder reads this PRD and current repository state.
2. Builder implements only the assigned page/slice.
3. Builder preserves existing contracts and integration.
4. Build/tests run.
5. Page is opened in browser.
6. Screenshot is reviewed by Tirth + ChatGPT.
7. Review covers hierarchy, spacing, density, typography, information architecture, charts/tables, interactions, empty/loading/error states, and enterprise credibility.
8. Builder fixes identified issues.
9. Repeat screenshot review until accepted.
10. Commit/checkpoint before proceeding.

**Definition of Done is not “it compiles.” Definition of Done is “it works, preserves integrity, and passes visual/product acceptance.”**

---

# 38. PROTECTED EXISTING BASELINE

The existing integrated Phase 3 baseline must remain protected while the UI/product is rebuilt and polished.

Known baseline capabilities include:
- deterministic synthetic L5/L6 project schedule
- execution event ingestion
- structured intelligence extraction
- candidate retrieval
- explainable six-signal hybrid scoring
- persisted match proposal
- desktop Match Review
- authorized planner verification
- atomic actual-progress mutation
- tamper-evident audit append
- dashboard/report refresh
- Field → API → Intelligence → Web flow
- offline Field SQLite queue
- bulk ingestion scenarios for strong, review-required, and unmatched cases

Do not regress these capabilities while pursuing visual quality.

---

# 39. FINAL PRODUCT QUALITY BAR

Before calling ExecLink finished, ask:

> If the hackathon context and logos were removed, would this interface plausibly look like software used by a serious infrastructure/EPC project-controls team?

If the answer is no, the relevant screen is not finished.

The final product must simultaneously demonstrate:
- serious project-controls understanding
- trustworthy AI assistance
- human verification
- traceable evidence
- robust schedule integration
- field usability
- polished enterprise UX
- deterministic demo reliability

---

# 40. FINAL SUCCESS CONDITION

ExecLink is complete when a judge can watch this sequence without explanation gaps:

```text
Structured Plan
      ↓
Messy Real-World Execution Update
      ↓
Structured Event Extraction
      ↓
Explainable Schedule Matching
      ↓
Human Verification
      ↓
Trusted Actual Progress Update
      ↓
Audit Trail
      ↓
Live Analytics
      ↓
Reusable Project Memory
```

The product should make the planning-to-execution bridge immediately understandable, technically credible, and visually professional.

---

**END OF MASTER PRD**
