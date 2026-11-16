# Observation-bound plan handoff (AGO-1708)

`stepsP` carries a contract-internal `ResolvedFlowPlan`: the original plan and
its contract-derived bindings. Both immediate delegated plans and plans resolved
after flow creation use this handoff. Bindings remain indexed by the original
`flow` array; an execution `order` does not renumber them.

The privileged planner service can call
`resolveObservedPlan(portfolioId, flowId, plan, signedObservations,
policyVersion, rebalanceCount = 0)`. It returns a vow. The portfolio verifies the
attestor signature and freshness, rechecks portfolio and sync state after the
prompt verification wait, and derives bindings using contract configuration.
Delegated and rebalance plans are vetted against the flow's mandate and
allocation.
Owner deposit/withdraw plans retain the privileged planner's existing flow-place
and allowed-position checks; their funding and payout endpoints are not passed
through allocation-only accounting. Observation-bound withdrawals within those
plans are decoded and bound at their original indices. Only then does the contract
commit policy and resolve the plan vow. The existing unsigned planner methods
remain available for ordinary operations pending AGO-1664's service migration.
They cannot produce observation-bound execution instructions.

`manager.resolveExecutionPlan` accepts the internal envelope. The manager facet
is trusted contract authority; neither the planner service nor a delegated
client receives that facet. Public plan shapes do not admit an envelope or
top-level `boundSteps`. Future owner-flow agent authorization is not added here.

## Upgrade compatibility audit

- The durable flow record and vow/resolver capabilities retain their layout.
  Existing vow results can be `MovementDesc[]` or `FundsFlowPlan`; the new guest
  normalizes those locally without changing their plan representation.
- `executePlan` retains its argument positions, initial `getPortfolioId` call,
  optional `startFlow` call, `await null`, and plan-vow wait. No host lookup,
  additional await, or async helper is introduced by normalization.
- Permit2 setup retains its original host calls and awaits. Binding checks now
  precede setup so an invalid observation-bound movement cannot cause setup
  transactions. Positive minima also recheck the required adapter/router
  configuration. For historical ordinary movements those checks perform no host
  calls. The later ordinary dispatch, reporting and cleanup paths are unchanged.
- Legacy movements with withdrawal options requiring bindings fail closed.
  Empty withdrawal options and `max: false` remain ordinary exact-amount
  operations.
  Creation-time `options.boundSteps` is no longer read. As recorded in AGO-1708,
  bound-step support has not deployed; this is not a migration of deployed
  observation-bound activations.
- The durable upgrade test starts the pre-envelope executor prefix suspended on
  its plan vow, reincarnates the vat, and completes with legacy array, legacy
  plan and envelope results. Flow tests also execute ordinary movements from
  legacy results and reject binding-dependent movements in those shapes.
- This focused upgrade test does not simulate an activation already suspended
  inside Permit2 or a remote protocol call. Their ordinary guest call sequence
  is unchanged by this patch. Deployment review must still compare against the
  actual deployed guest implementation and confirm the undeployed bound-step
  assumption; extending checks to new historical operation kinds needs a fresh
  replay audit.
