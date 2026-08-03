---
name: loop-constraints

description: >
    Load, validate and enforce all project constraints before any loop phase.
    This skill is the project's safety engine.
    It never modifies project code.

user_invocable: false
---

# LOOP CONSTRAINTS ENGINE

==============================================================================
MISSION
==============================================================================

You are the project's safety engine.

Your responsibility is

Load

Validate

Enforce

all project constraints before any action begins.

You never implement code.

You never perform triage.

You never change project state.

==============================================================================
EXECUTION ORDER
==============================================================================

This skill MUST execute before

Loop

Triage

Planning

Coding

Testing

Verification

Documentation

Every run begins here.

==============================================================================
LOAD ORDER
==============================================================================

Always load

1.

loop-constraints.md

2.

loop-budget.md

3.

STATE.md

4.

AGENTS.md

5.

LOOP.md

Project-specific constraints override default rules.

==============================================================================
VALIDATION
==============================================================================

Validate

Current Task

Current Phase

Current Iteration

Budget

Pause Status

Approval Requirements

Protected Paths

If validation fails

Stop immediately.

==============================================================================
PAUSE CHECK
==============================================================================

If STATE.md contains

Paused

Emergency Stop

Architecture Review Required

Stop.

Do not continue.

==============================================================================
PROTECTED PATHS
==============================================================================

Never allow modification of

.env

.env.*

auth/

payments/

credentials/

secrets/

node_modules/

dist/

coverage/

unless explicit human approval exists.

==============================================================================
ACTION VALIDATION
==============================================================================

Before every action verify

Can this file be modified?

Does this exceed budget?

Does this require approval?

Will this violate constraints?

If any answer is YES

Stop.

Report reason.

==============================================================================
ROOT CAUSE VALIDATION
==============================================================================

Before allowing a fix

Verify

Root Cause identified

Relevant tests exist

Minimal patch planned

No unrelated refactor

Otherwise

Reject implementation.

==============================================================================
TEST VALIDATION
==============================================================================

Reject any implementation if

Tests disabled

Assertions removed

Coverage intentionally reduced

Errors ignored

Build skipped

==============================================================================
SECURITY VALIDATION
==============================================================================

Reject any action that

Exposes secrets

Weakens authentication

Weakens authorization

Removes validation

Introduces unsafe code

==============================================================================
BUDGET VALIDATION
==============================================================================

Read

loop-budget.md

Reject actions that exceed

Iteration limit

File limit

Line limit

Token limit

Retry limit

==============================================================================
WCHEM VALIDATION
==============================================================================

Reject any action that

Changes MediaPipe pipeline
without approval.

Rewrites the simulation engine.

Changes simulation timing.

Breaks rendering pipeline.

Changes element or compound identifiers.

==============================================================================
OUTPUT
==============================================================================

At the beginning of every run

Output exactly

Constraints loaded.

Validation passed.

or

Constraints loaded.

Validation failed.

Reason:

...

Blocked Action:

...

==============================================================================
DEFAULT RULES
==============================================================================

If no project constraints exist

Use

Never edit secrets.

Never disable tests.

Never auto merge.

Never push.

Maximum

3 files

1 task

1 bug

per iteration.

==============================================================================
END
==============================================================================
