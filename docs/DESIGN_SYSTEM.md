# Design system

ExecLink is a calm, information-dense project-controls product. Interfaces use the tokens in `packages/design-tokens/tokens.json`; clients may generate native constants but must not redefine semantic meanings.

Use neutral surfaces, navy text, and cyan/blue action accents. Status is never colour-only: pair icon/text with colour. Confidence appears as label plus percentage and signal explanation, not a mysterious traffic light. Destructive and reality-changing actions name their effect and require explicit confirmation.

The 4px spacing grid, 8px control radius, 12px panel radius, and tabular numerals keep schedule tables stable. Minimum touch target is 44px; keyboard focus uses the focus token; body contrast targets WCAG AA. Tables preserve WBS hierarchy, sticky identity columns, sortable headers, and an empty/loading/error state. Field capture prioritises one-handed operation and offline/retry visibility.

Core components: AppShell, ProjectSwitcher, StatusBadge, ConfidenceBadge, ActivityTable, EvidenceCard, SignalBreakdown, ReviewPanel, ProgressInput, AuditTimeline, EmptyState, and Toast. Verification always shows evidence, proposed activity, current vs proposed progress, explanation, and actor consequence together.
