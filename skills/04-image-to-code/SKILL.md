# Image to Code

## Mission
Translate an approved visual reference or screenshot into implementation accurately without loosely improvising.

## Workflow
1. Inspect the reference before coding.
2. Identify global geometry: shell, gutters, columns, vertical rhythm.
3. Identify typography hierarchy.
4. Identify reusable components and repeated spacing.
5. Identify surface/border/radius/shadow treatment.
6. Identify states and controls visible in the reference.
7. Map the reference to existing ExecLink design tokens/components.
8. Implement structural fidelity first, then visual fidelity, then responsive behavior.
9. Compare implementation against the reference and correct the largest perceptual differences first.

## Rules
- Do not copy irrelevant branding/content from references.
- Preserve ExecLink product semantics and accessibility.
- Do not substitute “similar enough” generic cards when the reference has a distinctive composition.
- Avoid absolute positioning unless the layout genuinely requires it.
- Prefer reusable CSS/layout primitives.
- If the reference conflicts with the PRD or protected workflow, the PRD wins.

## Review
Compare: hierarchy, proportions, spacing, typography, alignment, density, borders, radii, control sizing, chart geometry, and empty space.
