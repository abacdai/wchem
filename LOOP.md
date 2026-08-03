# LOOP.md

# ============================================================================
# LOOP ENGINE CONFIGURATION
# ============================================================================

Loop Name:
Wchem Development Loop

Framework:
Loop Engineering

Runtime:
OpenCode

Execution Mode:
Autonomous (Human Approval for Critical Operations)

Maximum Iterations:
50

Resume Supported:
Yes

# ============================================================================
# LOOP OBJECTIVE
# ============================================================================

The objective of this loop is to continuously improve the existing project.

The AI MUST continue the existing project.

The AI MUST NOT restart the project.

The AI MUST preserve all working functionality.

Every iteration should make measurable progress.

# ============================================================================
# REQUIRED STARTUP SEQUENCE
# ============================================================================

Every new execution MUST perform these steps.

1.

Read AGENTS.md

2.

Read STATE.md

3.

Read loop/PROMPT.md

4.

Read loop-constraints.md

5.

Read loop-budget.md

6.

Read project markdown documentation

7.

Locate Current Task

8.

Determine Current Phase

9.

Resume from checkpoint

Never restart from PLAN if STATE already exists.

# ============================================================================
# LOOP PHASES
# ============================================================================

## Phase 1

PLAN

Objectives

Understand current task.

Read related files.

Read related tests.

Determine architecture impact.

Expected Output

Implementation plan.

Affected modules.

Risk level.

Dependencies.

Stop if architecture is unclear.

--------------------------------------------------------

## Phase 2

CODE

Only modify files directly related to the task.

Maximum

3 files

1 feature

1 bug

No unrelated refactoring.

--------------------------------------------------------

## Phase 3

BUILD

If backend changed

Run backend build.

If frontend changed

Run frontend build.

If shared library changed

Build affected modules only.

Never rebuild unrelated projects.

--------------------------------------------------------

## Phase 4

TEST

Run only relevant tests first.

If successful

Run complete suite.

Collect

PASS

FAIL

Coverage

Execution time

--------------------------------------------------------

## Phase 5

ANALYZE

For every failing test

Determine

Expected

Actual

Root Cause

Affected Modules

Dependency Impact

Never fix symptoms.

Always locate root cause.

--------------------------------------------------------

## Phase 6

FIX

Apply minimal patch.

Do not refactor.

Do not rewrite modules.

Modify only required code.

--------------------------------------------------------

## Phase 7

VERIFY

Build again.

Run tests again.

Compare

Before

After

If regression detected

Rollback iteration.

--------------------------------------------------------

## Phase 8

FINALIZE

Update

STATE.md

loop-run-log.md

Generate summary.

Stop.

# ============================================================================
# SAFE PATCH STRATEGY
# ============================================================================

Each iteration

Maximum

3 files

Maximum

300 lines changed

Maximum

1 feature

Maximum

1 bug

Large changes require human approval.

# ============================================================================
# ROOT CAUSE ANALYSIS
# ============================================================================

Every bug must follow

Observe

↓

Collect Logs

↓

Locate Root Cause

↓

Validate Cause

↓

Minimal Patch

↓

Rebuild

↓

Retest

Never patch blindly.

# ============================================================================
# DEPENDENCY IMPACT ANALYSIS
# ============================================================================

Before modifying any file

Determine

Imports

Exports

Shared State

Public APIs

Side Effects

Abort if impact cannot be determined.

# ============================================================================
# TEST STRATEGY
# ============================================================================

Priority

1.

Changed module tests

2.

Dependency tests

3.

Integration tests

4.

Full project tests

Never skip failing tests.

# ============================================================================
# FAILURE HANDLING
# ============================================================================

If build fails

Return to ANALYZE.

If tests fail

Return to FIX.

If architecture issue found

Return to PLAN.

If same issue occurs

5 consecutive iterations

Flag

Architecture Review Required

Stop.

# ============================================================================
# RESUME RULES
# ============================================================================

If execution stops

Resume using

STATE.md

loop-run-log.md

Current Phase

Current Task

Never restart the project.

Continue only.

# ============================================================================
# COMPLETION CONDITIONS
# ============================================================================

Stop when

Current Task completed

Build successful

Tests passed

STATE updated

Run log updated

No pending regression

# ============================================================================
# SAFETY GATES
# ============================================================================

Binding safety rules live in loop-constraints.md.

Never proceed when

STATE.md contains

Paused

Emergency Stop

Architecture Review Required

Auto-merge is never allowed.

Every commit requires human approval.

No MCP servers are required for this loop pattern.

# ============================================================================
# HUMAN ESCALATION PATH
# ============================================================================

Stop and hand off to a human when

- Same failure repeats 5 consecutive iterations
- Architecture becomes inconsistent
- Required approval is not granted
- Task is out of scope

Update STATE.md with the blocker, update loop-run-log.md, then exit.

# ============================================================================
# HUMAN APPROVAL REQUIRED
# ============================================================================

Require approval before

Deleting files

Database migration

Framework replacement

Dependency replacement

Large refactoring

Breaking API

# ============================================================================
# END LOOP
# ============================================================================
