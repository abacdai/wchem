# decision-log.md

# ============================================================================
# DECISION LOG
# ============================================================================

Project: Wchem
Purpose: Record architectural and configuration decisions with rationale.
Format: Newest entry first.
Last Updated: 2026-07-31

# ============================================================================
# 2026-07-31 — Loop configuration audit and repair
# ============================================================================

Decision:
Audited and repaired the entire Loop Engineering configuration before running
the autonomous loop.

Reason:
STATE.md was a stale template (iteration 0) while loop-run-log.md showed
iteration 12, blocking resume. Sandboxels rules remained in loop config after
the dependency was removed.

Changes:

- Removed all Sandboxels references from loop configuration.
- Replaced them with generic chemistry simulation engine rules.
- Synced STATE.md with the real run state (T-013, FIX, iteration 12).
- Harmonized token policy tiers across loop-budget.md,
  loop-constraints.md, and skills/loop-budget/SKILL.md (60/80/95).
- Fixed outdated paths (opencode.json docs/safety.md -> loop-constraints.md,
  loop-run-log.md src/* -> js/*).
- Created project-context.md, decision-log.md, loop-ledger.json.

Alternatives considered:
- Leaving STATE.md as a template and re-planning from scratch. Rejected:
  violates the RESUME POLICY (never restart the project).

# ============================================================================
# 2026-07-31 — Hand tracking FPS optimization
# ============================================================================

Decision:
Optimize MediaPipe processing by caching frame transforms and reducing
duplicate landmark calculations.

Reason:
FPS of 18 was below the responsiveness target for gesture-driven UI.

Result:
FPS improved from 18 to 26. No regression detected.
Two follow-up failures tracked: landmark jitter and menu click false negatives
(task T-013).

# ============================================================================
# 2026-07-30 — InsForge backend adoption
# ============================================================================

Decision:
Adopt InsForge (Postgres backend as a service) with RLS-protected schema.

Reason:
Provides hosted database, auth, and storage without managing servers.

Schema:
8 tables (profiles, compounds, experiments, achievements, leaderboard).
Migrations live in migrations/ and are applied via the InsForge CLI.

# ============================================================================
# 2026-07-30 — Sandboxels dependency removal
# ============================================================================

Decision:
Remove the Sandboxels dependency. Wchem now ships its own generic chemistry
simulation engine (Matter.js physics + Canvas 2D rendering).

Reason:
Wchem must be fully standalone and embeddable; the project no longer uses
Sandboxels.

Consequences:
- Loop rules that referenced Sandboxels were replaced with generic
  simulation engine rules.
- js/hand-bridge.js must remain generic and not hard-code any specific
  application integration.

# ============================================================================
# END OF DECISION LOG
# ============================================================================
