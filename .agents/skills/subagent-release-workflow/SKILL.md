---
name: subagent-release-workflow
description: Mandatory Subagent Orchestration, Model Selection Strategy, Semantic Versioning, Automated Skill Currency Stamping, and Pre-Push Verification Gate for HearthQuest.
---

# HearthQuest Subagent & Release Verification Protocol

## 1. Automated Skill Updates on Every New Build (Mandatory)
- Every new build **MUST** keep all 9 HearthQuest skills (`.agents/skills/*/SKILL.md` and `.gemini/skills/*/SKILL.md`) accurate and current with newly learned patterns, endpoints, schemas, and architectural decisions.
- Running `npm.cmd run bump:patch` / `npm.cmd run bump:minor` executes `scripts/release-verify.ts`, which **automatically stamps** every skill's `<!-- HEARTHQUEST_SKILL_BUILD_STAMP:START -->
- **Last Verified Build**: `v0.1.28` (Build `#29`)
- **Updated At**: `2026-11-16T01:53:16.530Z`
<!-- HEARTHQUEST_SKILL_BUILD_STAMP:END -->` block with the new version & build number, AND **Gate 1/3 enforces** that zero skill files lag behind the release manifest before any push succeeds.

## 2. Mandatory Versioning & Pre-Push Gate
1. Update any skill bodies that gained new architecture, endpoints, or bug-fix lessons during the milestone.
2. Run `npm.cmd run build && npm.cmd run typecheck && npm.cmd run bump:patch` (updates `version.json`, root & 5 workspace `package.json`, `packages/shared-types/src/version.ts`, and stamps all 9 `SKILL.md` files).
3. All 3 gates must pass (`verify-all.ts` running **24+ suites**, 0 TypeScript errors across all workspaces, and skill/manifest parity).
4. **Branch Policy**:
   - **`dev` Branch**: Autonomous commit & push once gates pass.
   - **`beta` / `main`**: Require explicit user confirmation before pushing.

## 3. Build Currency Stamp
<!-- HEARTHQUEST_SKILL_BUILD_STAMP:START -->
- **Last Verified Build**: `v0.1.14` (Build `#15`)
- **Updated At**: `2026-11-15T03:15:00Z`
<!-- HEARTHQUEST_SKILL_BUILD_STAMP:END -->
