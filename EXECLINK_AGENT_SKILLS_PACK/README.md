# ExecLink Agent Skills Pack 

Repository-local instructions for maintaining a consistent product and engineering quality bar across Codex, Antigravity, OpenCode, or another coding agent.

## Install

Copy `AGENTS.md` and the `skills/` directory into the ExecLink repository root, alongside `EXECLINK_MASTER_PRD.md`.

Expected layout:

    ExecLink/
      AGENTS.md
      EXECLINK_MASTER_PRD.md
      skills/
        01-product-taste/SKILL.md
        ...
        21-execlink-product-guardian/SKILL.md

## Important

These files are deliberately repository-local and tool-agnostic. A coding tool does not need native “skills” support: `AGENTS.md` tells the active agent which files to read for each task.

Do not ask the model to load all 21 skills on every turn. The selective loading rules in `AGENTS.md` are specifically designed to reduce context/token usage.

## First Build Task

Start with Task 00 — Design System + Application Shell. Do not proceed to Overview until the shell has been run locally and visually approved.
