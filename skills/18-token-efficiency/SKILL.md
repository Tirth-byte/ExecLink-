# Context and Token Efficiency

## Mission
Use model context and coding credits efficiently while preserving quality.

## Before Coding
1. Read the task.
2. Read only the relevant PRD section(s).
3. Load only task-relevant skills plus always-active skills.
4. Search the repository before opening large files.
5. Inspect affected files and direct dependencies.
6. Check existing components/contracts before inventing replacements.

## During Coding
- Make the smallest coherent patch.
- Avoid rereading unchanged large files.
- Use diffs/searches/targeted ranges.
- Do not dump generated files, lockfiles, build output, or entire databases into context.
- Prefer targeted tests while iterating.
- Avoid speculative architecture exploration unrelated to the task.

## Handoff
When provider/model allowance is ending, leave a concise checkpoint:
- current task
- completed behavior
- files changed
- tests run
- unresolved issue
- exact next action

The next model should inspect the diff/checkpoint instead of relearning the entire repository.
