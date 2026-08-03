#!/bin/bash

PROJECT="/home/dominh/Desktop/Wchem"

cd "$PROJECT" || exit 1

echo "=== LOOP START $(date) ==="

opencode run "
Read AGENTS.md.
Read LOOP.md.
Run loop-budget.
Run loop-constraints.
Read STATE.md.
Run loop-triage.
If implementation is allowed, continue current task.
Update STATE.md and loop-run-log.md.
"

echo "=== LOOP END $(date) ==="
