---
name: subagent-release-workflow
description: Mandatory Subagent Orchestration, Model Selection Strategy, Semantic Versioning, and Pre-Push Verification Gate for HearthQuest.
---

# HearthQuest Subagent & Release Verification Protocol

## 1. Model Switching Guide (For User & Subagents)
- **Argon / Pro (Deep Reasoning & Architecture)**:
  - Switch to **Argon / Pro** when designing complex multi-file systems: database/SQLite persistence migrations, WebGL/PixiJS canvas lighting engines, Stripe/Lulu Print-on-Demand webhook pipelines, or complex branching campaign state machines.
- **Flash / Fast Model (Rapid Iteration, UI Polish & Content Authoring)**:
  - Switch to **Flash** when adding new story chapters, monsters, CSS/Tailwind UI tweaks, quick bug fixes, or running release verification and branch promotions (`dev` -> `beta`).
- **Subagent Model Routing**:
  - `srd-story-architect`: Use `flash` for authoring new quests/monsters/cards; `pro` for core rules engine math.
  - `vtt-ui-engineer`: Use `inherit` or `pro` for multi-device synchronization and canvas work; `flash` for styling/badges.
  - `ai-bridge-specialist`: Use `inherit` for Ollama/cloud failover logic and Docker/Unraid config updates.
  - `qa-release-gatekeeper`: Use `flash` to rapidly execute `npm.cmd run verify:push` and validate version badges.

## 2. Mandatory Versioning & Pre-Push Gate (`v0.1.1+`)
Every feature or fix pushed to `dev`, `beta`, or `main` **MUST** follow this sequence:
1. **Bump or Sync Build Version**:
   - Run `npm.cmd run bump:patch` (for bug fixes / incremental updates, e.g., `0.1.1` -> `0.1.2`) or `npm.cmd run bump:minor` (for new milestones).
   - This updates `version.json`, root `package.json`, all 5 workspace `package.json` files, and `packages/shared-types/src/version.ts`.
2. **Run the Mandatory Push Gate**:
   - Run `npm.cmd run verify:push` (also enforced automatically by `.githooks/pre-push`).
   - All 3 gates must pass:
     - **Gate 1**: Version & Build Number consistency across all 6 manifests.
     - **Gate 2**: `npm.cmd run typecheck` (`0` TypeScript errors across all workspaces).
     - **Gate 3**: `npm.cmd run verify` (`9/9` functional & UI build-badge test suites passing).
3. **Branch Promotion & Permission Policy**:
   - **`dev` Branch (Autonomous after Verification)**: You do **NOT** need permission to push to `origin/dev`. As soon as `npm.cmd run verify:push` passes 100%, automatically commit and push the new build (`v0.1.2`, `v0.1.3`, etc.) to `origin/dev`.
   - **`beta` and `main` (`prod`) Branches (Permission Required)**: You **MUST** ask the user for explicit verification/permission before merging or pushing any build to `origin/beta` or `origin/main`. Never push to `beta` or `main` autonomously.
