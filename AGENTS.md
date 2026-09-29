# ExecLink Agent Instructions

## Source of Truth

Before substantial work, read `EXECLINK_MASTER_PRD.md`.

The PRD defines product behavior, information architecture, visual direction, workflow, and protected invariants. Do not contradict it.

## Working Model

ExecLink is built one approved task/page at a time.

Do not implement later pages merely because their requirements are visible. After a major UI page is implemented and runnable, stop for human visual review unless explicitly instructed to continue.

## Skill Loading

Do NOT read every skill for every task. Load only the relevant skills.

### Always Active
- `skills/01-product-taste/SKILL.md`
- `skills/18-token-efficiency/SKILL.md`
- `skills/21-execlink-product-guardian/SKILL.md`

### Web / Frontend
- `skills/02-web-design-guidelines/SKILL.md`
- `skills/03-premium-enterprise-ui/SKILL.md`
- `skills/05-frontend-architecture/SKILL.md`
- `skills/06-design-system-guardian/SKILL.md`
- `skills/09-ux-information-architecture/SKILL.md`

### Screenshot / Reference Implementation
- `skills/04-image-to-code/SKILL.md`
- `skills/19-visual-qa/SKILL.md`

### Charts / Analytics / Schedule Visualization
- `skills/07-data-visualization/SKILL.md`

### Interaction / Motion
- `skills/08-interaction-motion/SKILL.md`

### Backend / API
- `skills/10-backend-api/SKILL.md`
- `skills/12-database/SKILL.md`
- `skills/16-security-reliability/SKILL.md`

### Intelligence
- `skills/11-ai-matching/SKILL.md`

### Testing / Hardening
- `skills/13-testing-qa/SKILL.md`
- `skills/14-performance/SKILL.md`
- `skills/15-accessibility/SKILL.md`
- `skills/17-code-review-refactoring/SKILL.md`

### Demo / Release
- `skills/20-demo-engineering/SKILL.md`

## Protected Baseline

- Preserve the working Phase 3 golden path.
- Matching/proposal creation must not directly mutate verified actual progress.
- Human verification remains the trust boundary for schedule mutation.
- Preserve auditability and evidence lineage.
- Preserve working API ↔ intelligence ↔ web ↔ field contracts unless fixing a verified defect.
- Never replace working production logic with frontend-only mocks.
- Explicit offline/demo fallbacks may remain when clearly isolated.

## Implementation Discipline

1. Inspect existing implementation before editing.
2. Search before opening large files.
3. Reuse existing components and contracts.
4. Make the smallest coherent patch that completes the approved task.
5. Do not redesign unrelated pages.
6. Do not add fake controls or dead primary actions.
7. Run targeted checks first.
8. Run broader regression at integration milestones.
9. For UI tasks, provide the local route/URL for visual inspection.
10. Stop after the requested scope is complete.

## Completion Report

Keep it concise:
- What changed
- Files changed
- Tests/builds run and results
- Local route/URL when applicable
- Remaining known issue(s)
- Explicitly state that later pages were not started
