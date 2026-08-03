# docs/safety.md

# ============================================================================
# SAFETY GATES — WCHEM LOOP
# ============================================================================

Project: Wchem
Framework: Loop Engineering
Runtime: OpenCode
Last Updated: 2026-07-31

PURPOSE:
Document the human gates, denylists, and tool scopes for the Wchem loop.

Binding rules live in loop-constraints.md and AGENTS.md.
This file is the human-readable safety reference.

# ============================================================================
# AUTOMATION GATES
# ============================================================================

Approval is ALWAYS required before

- Deleting files
- Database migrations
- Breaking API changes
- Framework replacement
- Dependency replacement
- Large refactoring (over 300 changed lines)
- Security changes
- Authentication changes
- Payment changes

Never allowed without explicit human instruction

- Push
- Merge
- Auto-merge (never, under any condition)
- Delete branches or tags
- Deploying to production

# ============================================================================
# PROTECTED PATHS (DENYLIST)
# ============================================================================

Never modify without explicit human approval

- .env
- .env.*
- .env.local
- .insforge/ (project credentials)
- backend/*.env
- auth/
- payments/
- secrets/
- credentials/
- node_modules/
- dist/
- coverage/

# ============================================================================
# PAUSE / STOP CONDITIONS
# ============================================================================

Stop immediately when

- STATE.md contains: Paused, Emergency Stop, or Architecture Review Required
- Same failure repeats 5 consecutive iterations
- Context usage reaches 95%
- Architecture becomes inconsistent
- Security issue detected

Update STATE.md and loop-run-log.md before stopping.

# ============================================================================
# TOOL / MCP SCOPE
# ============================================================================

No MCP servers are required for this loop pattern.

Tools are scoped per role

- loop-triage: read-only (STATE.md, logs, docs) + STATE.md updates
- loop-budget: read-only + run-log append
- loop-constraints: read-only validation
- implementer: minimal edits inside the scoped worktree only
- verifier: review only, edit denied

Source code modifications happen only in L2+ with explicit human enablement.

# ============================================================================
# END OF SAFETY DOC
# ============================================================================
