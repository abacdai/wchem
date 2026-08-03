# loop-budget.md
# ============================================================================
# LOOP EXECUTION BUDGET
# ============================================================================

Project:
Wchem

Framework:
Loop Engineering

Runtime:
OpenCode

Purpose:
Control execution cost, context usage, and implementation scope.

==============================================================================
ITERATION BUDGET
==============================================================================

Maximum iterations per execution

10

Maximum iterations per task

50

Maximum retries for identical failure

5

After 5 identical failures

Stop.

Flag

Architecture Review Required.

==============================================================================
TOKEN BUDGET
==============================================================================

Maximum context usage

80%

Execution mode by context usage

0%–60%

FULL

60%–80%

REDUCED

Load only required files.

80%–95%

REPORT_ONLY

No implementation.

At 95%

Save STATE.md

Save loop-run-log.md

Stop safely.

==============================================================================
FILE MODIFICATION BUDGET
==============================================================================

Maximum files changed

3

Preferred

1

Maximum new files

2

Maximum deleted files

0

Deleting files requires human approval.

==============================================================================
LINE CHANGE BUDGET
==============================================================================

Maximum changed lines

300

Preferred

150

Large modifications require approval.

==============================================================================
TEST BUDGET
==============================================================================

Order

1.

Run tests for modified modules.

2.

Run dependency tests.

3.

Run integration tests.

4.

Run complete suite only if previous tests pass.

Never execute the full suite first unless explicitly requested.

==============================================================================
BUILD BUDGET
==============================================================================

Only build affected targets.

Frontend

Build frontend only.

Backend

Build backend only.

Shared modules

Build dependent modules only.

Avoid rebuilding the entire project unnecessarily.

==============================================================================
SUB-AGENT BUDGET
==============================================================================

L1

No sub-agents.

L2

Maximum

2

L3

Maximum

4

Verifier always has priority.

==============================================================================
ROOT CAUSE ANALYSIS BUDGET
==============================================================================

Maximum analysis depth

5 dependency levels

If deeper analysis is required

Request human approval.

==============================================================================
DOCUMENT LOADING BUDGET
==============================================================================

Always load

AGENTS.md

LOOP.md

STATE.md

loop-constraints.md

Only load additional markdown files when directly relevant to the Current Task.

Do not scan

node_modules/

dist/

coverage/

vendor/

generated documentation/

==============================================================================
LOGGING BUDGET
==============================================================================

Update after every successful iteration

STATE.md

loop-run-log.md

Do not log duplicate information.

==============================================================================
PAUSE CONDITIONS
==============================================================================

Immediately stop when

Context exceeds 95%

Architecture becomes inconsistent

Build repeatedly fails

Same failure repeats 5 times

Security issue detected

Human approval required

==============================================================================
KILL SWITCH
==============================================================================

Stop immediately if

STATE.md contains

Paused

Emergency Stop

Architecture Review Required

Do not resume until the state is cleared.

==============================================================================
OPTIMIZATION POLICY
==============================================================================

Prefer

Minimal patches

Incremental improvements

Targeted testing

Localized builds

Avoid

Large refactoring

Project-wide formatting

Mass renaming

Unnecessary dependency updates

==============================================================================
END OF BUDGET
==============================================================================
