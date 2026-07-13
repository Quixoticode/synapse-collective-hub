---
name: Subagent billing block
description: A subagent/CodeExecution delegation call can be denied mid-task due to missing payment method, not a code or prompt problem.
---

A `subagent(...)` call (via CodeExecution / `sendFollowup`) was denied with
"A payment method is required. Navigate to Account > Billing to resolve."
This happened after an earlier, unrelated subagent call in the same session
had already succeeded — so it is not predictable from prior successes in
the same conversation.

**Why:** subagent usage is billed, and the account can hit a billing gate at
any point, independent of the task's complexity or the prompt quality.

**How to apply:** if a subagent/delegation call errors out with a
billing/payment message, do not retry the same delegation — it will fail
again. Fall back to doing the work directly with your own tools
(Edit/WriteFile/ShellExec/ReadFile) instead of subagent delegation for the
rest of the session, and mention the limitation to the user only if it
changes what you can deliver.
