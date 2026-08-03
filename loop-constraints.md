# loop-constraints.md
# ============================================================================
# BINDING CONSTRAINTS
# Every rule in this file is mandatory.
# The AI MUST obey these rules before any action.
# ============================================================================

##############################################################################
## PROJECT SAFETY
##############################################################################

- Never restart the project.
- Always continue from STATE.md.
- Preserve all working functionality.
- Never intentionally introduce breaking changes.
- Never modify unrelated modules.

##############################################################################
## STARTUP
##############################################################################

Before every iteration the AI MUST read

- AGENTS.md
- LOOP.md
- loop/PROMPT.md
- STATE.md
- loop-budget.md
- loop-constraints.md

Determine

- Current Task
- Current Phase
- Current Iteration

Resume from checkpoint.

##############################################################################
## IMPLEMENTATION
##############################################################################

- Modify at most 3 files per iteration.
- Solve only one task per iteration.
- Implement the smallest safe change.
- Never rewrite working modules.
- Never perform project-wide refactoring.
- Never replace frameworks without approval.
- Never introduce unnecessary dependencies.

##############################################################################
## ROOT CAUSE POLICY
##############################################################################

Every bug MUST follow

Observe

↓

Reproduce

↓

Collect Logs

↓

Find Root Cause

↓

Validate Root Cause

↓

Minimal Patch

↓

Rebuild

↓

Retest

Never patch symptoms.

##############################################################################
## TEST POLICY
##############################################################################

The AI MUST

- Build affected modules.
- Run relevant tests.
- Run `npm test` only for the smallest affected area first (specific file,
  module, package, or workspace). Do not run project-wide `npm test` unless
  the user explicitly asks or the smaller affected tests have passed and the
  machine has enough memory.
- Run integration tests when required.
- Run full test suite before closing Current Task.

The AI MUST NEVER

- Disable tests.
- Ignore failing tests.
- Ignore build errors.
- Fake successful results.

##############################################################################
## DOCUMENTATION
##############################################################################

After every successful iteration

Update

- STATE.md
- loop-run-log.md

Keep documentation synchronized.

##############################################################################
## SECURITY
##############################################################################

Never modify

- .env
- .env.*
- auth/
- payments/
- secrets/
- credentials/

Never expose

- API Keys
- Tokens
- Passwords
- Secrets

Never weaken

- Authentication
- Authorization
- Validation

##############################################################################
## PERFORMANCE
##############################################################################

Never intentionally reduce

- FPS
- Responsiveness
- Memory efficiency

Avoid

- Duplicate rendering
- Unnecessary calculations
- Blocking operations

##############################################################################
## WCHEM RULES
##############################################################################

Hand Tracking

- Never change coordinate systems unless required.
- Never reduce tracking stability.
- Never reduce gesture accuracy.
- Never replace MediaPipe pipeline without approval.

Simulation Engine

- Never modify the simulation engine unless Current Task requires it.
- Never modify the reaction engine unnecessarily.
- Never change element or compound identifiers.
- Never rewrite the simulation loop.

UI

- Preserve responsive layout.
- Preserve accessibility.
- Avoid visual regressions.

##############################################################################
## GIT POLICY
##############################################################################

Never

- Push
- Merge
- Delete branches
- Delete tags

without human approval.

Always

Create commits with descriptive messages.

##############################################################################
## FAILURE POLICY
##############################################################################

If the same issue appears

5 consecutive iterations

Stop.

Update

STATE.md

Flag

Architecture Review Required.

##############################################################################
## HUMAN APPROVAL REQUIRED
##############################################################################

Approval is required before

- Deleting files
- Database migrations
- Breaking API changes
- Framework replacement
- Large refactoring
- Dependency replacement
- Security changes
- Authentication changes

##############################################################################
## TOKEN POLICY
##############################################################################

At 60% context usage

Enter REDUCED mode.

Load only required files.

At 80% context usage

Enter REPORT_ONLY mode.

No implementation.

At 95%

Save STATE.md

Save loop-run-log.md

Stop safely.

##############################################################################
## COMPLETION
##############################################################################

Current Task is complete only if

- Build successful
- Tests successful
- No regression detected
- Documentation updated
- STATE.md updated
- loop-run-log.md updated

##############################################################################
## END
##############################################################################
