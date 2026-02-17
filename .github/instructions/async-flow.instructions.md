---
applyTo: "**/*.flows.*"
---

Use a hard async-flow review gate for any pull request change in `*.flows.*`:

1. List every created promise and every detached async task (`void`, un-awaited `.then(...)`, fire-and-forget helper).
2. For each detached task, answer: "What keeps this from running past flow Done?"
3. For any API returning lifecycle promises (for example `{ ready, done }`), verify every callsite awaits one before dependent side effects.
4. For each failure branch in the flow, identify a test that drives it (or request one).
5. Explicitly check for post-Done effects: late storage writes, late pendingTx updates, late bridge sends.
