---
name: Feature
about: A request, idea, or new functionality
title: Add non-precious async-flow option for orchestration flows
type: feature
assignees: ''

---

## What is the Problem Being Solved?

async-flow currently treats all orchestration flows as precious, so a replay mismatch or panic is treated as a critical failure that blocks the flow. In YMax (portfolio-contract), rebalance flows are recoverable: funds remain available and users can retry. We need a way to mark certain flows as non-precious so replay failures are not treated as fatal.

## Description of the Design

- Add `precious?: boolean` to async-flow options (default `true`).
- For non-precious flows, a panic should:
  - finalize and clean up the activation,
  - reject the outcome vow with the fatal problem,
  - avoid storing it in `getFailures()` as a fatal replay failure.
- Extend orchestration facade:
  - `orchestrate(name, ctx, flow, options)`
  - `orchestrateAll(flows, ctx, { flowOptions, defaultFlowOptions })`
- Mark `portfolio-contract` rebalance flow as non-precious via `orchestrateAll({ rebalance }, …, { flowOptions: { rebalance: { precious: false }}})`.

### Security

Non-precious flows still reject with their failure reason and do not mask errors; they just avoid blocking upgrades or subsequent retries. No additional capabilities are exposed.

### Scaling

No material performance change; non-precious flows avoid retry/replay loops after failure, which could reduce overhead.

### Testing

- Unit tests in `@agoric/async-flow` for non-precious panic behavior (outcome rejected, no failure recorded).
- Contract-level test in `portfolio-contract` to ensure rebalance failure does not mark flow as fatal and can be retried.

### Upgrade

Upgrade-safe: default remains precious; only flows explicitly marked non-precious change behavior.
