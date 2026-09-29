# Visual QA

## Mission
Judge implemented screens by what users actually see, not by JSX quality.

## Review Order
1. Overall hierarchy and composition
2. Alignment and proportions
3. Information density
4. Typography
5. Spacing
6. Component consistency
7. Color/semantic states
8. Tables/charts
9. Interaction states
10. Fine polish

## Compare Against
- approved screenshot/reference when provided
- PRD requirements
- existing ExecLink design system

## Red Flags
- generic dashboard-card grid
- huge empty hero areas
- inconsistent radii/padding
- excessive colored cards
- weak table hierarchy
- tiny unreadable labels
- chart decoration without insight
- misaligned baselines
- dead-looking controls
- inconsistent sidebar/header between routes

Fix the largest perceptual problem first. Do not spend time on 1px details while composition is wrong.
