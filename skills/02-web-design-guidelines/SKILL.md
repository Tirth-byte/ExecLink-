# Web Design Guidelines

## Mission
Produce consistent, accessible, responsive desktop web interfaces.

## Layout
- Optimize primarily for 1440×900, 1512×982, and 1920×1080; remain usable near 1280px.
- Use a stable application shell and consistent page gutters.
- Prefer a 12-column mental/grid model for complex dashboards.
- Keep alignment lines strong across cards, charts, tables, and headers.
- Avoid arbitrary widths and one-off spacing.

## Typography
- Use Inter unless the repository intentionally changes the global typeface.
- Approximate hierarchy: page title 24–28px, section 16–18px, body 14px, dense table 13–14px, metadata 12px.
- Avoid excessive font-size variety and giant dashboard titles.
- Use weight and spacing before adding more colors.

## Components
- Buttons must have clear hierarchy: primary, secondary, ghost/destructive where appropriate.
- Inputs require labels or accessible names.
- Status must never depend on color alone.
- Tables require useful hover/focus states and readable alignment.
- Drawers/modals should preserve context and be keyboard accessible.

## States
Every meaningful data surface must consider loading, empty, error, success, disabled, offline/stale, and permission states when applicable.

## Responsive Behavior
Reflow intentionally. Do not simply shrink desktop UI. The dedicated Flutter app handles field-mobile workflows.
