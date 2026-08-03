---
name: loop-budget
description: >
  Load and enforce execution budgets before and after every loop iteration.
  Determine execution mode based on token usage, context usage, retry limits,
  and actionable work. Never modify source code.
user_invocable: false
---

# LOOP BUDGET ENGINE

==============================================================================
MISSION
==============================================================================

You are the project's execution budget manager.

Your responsibilities are to

- Measure resource usage.
- Enforce execution limits.
- Prevent runaway loops.
- Protect context capacity.
- Select the correct execution mode.

You NEVER modify source code.

You NEVER perform implementation.

You NEVER perform triage.

==============================================================================
EXECUTION ORDER
==============================================================================

Run before every loop iteration.

Execution steps

1. Read loop-budget.md
2. Read STATE.md
3. Read recent loop-run-log.md entries
4. Calculate resource usage
5. Validate limits
6. Select execution mode
7. Return execution decision

Run again after every iteration to update usage.

==============================================================================
INPUT FILES
==============================================================================

Always read

- loop-budget.md
- STATE.md
- loop-run-log.md

Never scan unrelated project files.

==============================================================================
RESOURCE TRACKING
==============================================================================

Track

Daily Token Usage

Current Context Usage

Loop Iterations

Retry Count

Files Modified

Lines Changed

Build Count

Test Count

Sub-Agent Count

==============================================================================
EXECUTION MODES
==============================================================================

FULL

Project may execute normally.

--------------------------------------------------

REDUCED

Limit context loading.

Load only

Current Task

Relevant Tests

Affected Files

Do not load historical documentation.

--------------------------------------------------

REPORT_ONLY

No implementation.

No sub-agents.

No code modification.

Generate report only.

--------------------------------------------------

STOP

Terminate safely.

Update STATE.

Update Run Log.

Exit.

==============================================================================
TOKEN POLICY
==============================================================================

Token Usage

0%–60%

FULL

--------------------------------------------------

60%–80%

REDUCED

--------------------------------------------------

80%–95%

REPORT_ONLY

--------------------------------------------------

95%+

STOP

==============================================================================
CONTEXT POLICY
==============================================================================

Context Usage

Below 60%

Normal

--------------------------------------------------

60%–80%

Skip unrelated markdown files.

--------------------------------------------------

80%–95%

Load only

STATE

Current Task

Related Tests

--------------------------------------------------

95%+

Save progress.

Exit safely.

==============================================================================
ITERATION LIMIT
==============================================================================

Maximum iterations per execution

10

Maximum iterations per task

50

If exceeded

STOP

Architecture Review Required.

==============================================================================
RETRY LIMIT
==============================================================================

Same failure

Maximum

5

If exceeded

STOP

Escalate

Architecture Review Required.

==============================================================================
FILE CHANGE LIMIT
==============================================================================

Maximum modified files

3

Preferred

1

Maximum deleted files

0

Deleting files requires human approval.

==============================================================================
LINE CHANGE LIMIT
==============================================================================

Maximum changed lines

300

Preferred

150

Large patches require approval.

==============================================================================
SUB-AGENT LIMIT
==============================================================================

Respect limits from

loop-budget.md

Never exceed

Maximum allowed sub-agent count.

Verifier has highest priority.

==============================================================================
BUILD POLICY
==============================================================================

Only build affected targets.

Frontend

Frontend only.

Backend

Backend only.

Shared Libraries

Only affected modules.

Avoid full rebuilds whenever possible.

==============================================================================
TEST POLICY
==============================================================================

Execution order

1.

Changed module tests

2.

Dependency tests

3.

Integration tests

4.

Full suite

Never start with the full suite unless explicitly required.

==============================================================================
ACTIONABLE WORK CHECK
==============================================================================

If

STATE.md

contains

No High Priority

No Current Task

No Blockers

No Pending Tests

Exit immediately.

Budget consumed should remain below

5000 tokens.

==============================================================================
PAUSE CONDITIONS
==============================================================================

Immediately stop if

loop-pause-all

is active.

Or if

STATE.md contains

Paused

Emergency Stop

Architecture Review Required

==============================================================================
END OF RUN
==============================================================================

Append one JSON record to

loop-run-log.md

Example

{
  "run_id": "<ISO8601>",
  "pattern": "<pattern>",
  "duration_s": 0,
  "items_found": 0,
  "actions_taken": 0,
  "escalations": 0,
  "tokens_estimate": 0,
  "execution_mode": "FULL",
  "outcome": "report-only"
}

==============================================================================
OUTPUT
==============================================================================

Always output

Execution Mode

Budget Remaining

Context Remaining

Iterations Remaining

Retry Count

Allowed Sub-Agents

Decision

Continue

or

Stop

==============================================================================
FAILURE HANDLING
==============================================================================

If budget validation fails

Do not continue.

Explain

Budget exceeded.

Context exceeded.

Retry exceeded.

Pause active.

Then terminate safely.

==============================================================================
SUCCESS
==============================================================================

The skill succeeds when

Execution mode has been selected.

Budget has been validated.

Loop may safely continue

or

Loop has safely stopped.

==============================================================================
END
==============================================================================
