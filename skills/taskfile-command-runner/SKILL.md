---
name: taskfile-command-runner
description: Inspect and run repository Taskfile targets safely, escalating only validated local checks and never deploy targets.
---
# Taskfile command runner

1. Read the target body before execution and prefer the narrowest target.
2. Validation, dev server, and local smoke targets need no confirmation unless sandbox escalation is required.
3. Ask before deletion, cleanup, migration, external mutation, or any escalation retry.
4. This repository deliberately defines no deploy target. Do not invent or execute one.
5. Record the target, resolved commands, result, and any permission delegation in the work report.
