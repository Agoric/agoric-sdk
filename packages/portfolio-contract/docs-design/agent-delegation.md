# Agent Delegation for Ymax

Just like we invite clients to play the role of planner or EVM,
we can invite clients to have attenuated access to a portfolio.

## story: separation of duties

Pete opens portfolio45, with 60% Aave, 40% Compound.

Pete asks an agent, claw1, to generate a key pair and show address: `agoric1claw1...`.

Pete chooses permissions - allocation only -
and submits an EVM `Grant` request to `agoric1claw1...`.

The contract creates a new exo with a reference to portfolio45
and the permissions, and sends an invitation with the portfolio id
and the permissions in the invitation details to `agoric1claw1...`.

claw1 redeems the invitation and then uses a continuing invitation
to update allocations to 50% Aave, 50% Compound.

claw1 tries to allocate 40% to a new, risky instrument, and fails.

claw1 tries to withdraw and fails.

## design notes

### EVM request

Delegation is initiated by a new EIP-712 operation signed by the portfolio
owner's EVM wallet and dispatched through the existing EVM wallet handler
(see [evm-wallet-handler.exo.ts](../src/evm-wallet-handler.exo.ts) operation dispatch).
A sketch of the EIP-712 op is in [PR #12528](https://github.com/Agoric/agoric-sdk/pull/12528).
The message payload includes the grantee's Agoric address and the chosen
permissions; the contract mints the invitation and delivers it to that address
via the postal service, the same way planner invitations are delivered.

In v1, delegation is only available for portfolios opened via EVM. An
Agoric-side delegation path is not in scope.

The new op follows the existing handler's nonce + deadline pattern;
nothing delegation-specific.

### "Allocated instruments"

An instrument is "allocated" iff it is present as a key in the portfolio's
current `targetAllocation` (see [portfolio.exo.ts](../src/portfolio.exo.ts)
state shape). The check applied to a granted rebalance is:

- the proposed allocation's key set must equal the current allocation's
  key set — no added keys (the agent cannot introduce new instruments)
  and no removed keys (the agent cannot un-delete an instrument either,
  since un-deletion is itself a privileged change to the allocated set).

Portion values are otherwise unconstrained: the agent may set an
allocated instrument's portion to 0 (or to 100). The key must still
be present.

A rebalance that violates the permission's key-set rule causes the offer to reject.

### Operations exposed to the grantee

The delegation exo exposes a narrowed subset of the portfolio's
`invitationMakers`. For this story, that means `SimpleRebalance` only,
guarded by the key-set check above. `Deposit` and `Withdraw` are not
exposed. `Rebalance` (which accepts an arbitrary flow) is treated as
if it didn't exist — it is a deprecated design mistake — so there is
nothing to guard there.

The key-set check lives in the delegation wrapper exo, not in the
portfolio. The wrapper holds the portfolio reference internally and
never hands it out; claw1 only ever reaches `SimpleRebalance` through
the wrapper. The wrapper checks the proposed allocation's key set
against the current allocation, then forwards to the portfolio's
existing `SimpleRebalance`. The portfolio code is unchanged.

The agent's `SimpleRebalance` offerArgs include `policyVersion` (and
`rebalanceCount`), matching the existing planner submission pattern
(see [planner.exo.ts](../src/planner.exo.ts) and
[portfolio.exo.ts](../src/portfolio.exo.ts) `submitVersion`). The
portfolio rejects the offer if the version doesn't match. The agent
reads the current `targetAllocation` and `policyVersion` from the
portfolio's vstorage status node, the same way the planner does.

This also resolves the apparent race between Pete and the grantee:
if Pete calls `SetTargetAllocation` between the agent's read and the
agent's submit, `policyVersion` has advanced and the offer rejects.
The agent re-reads and retries.

### Permissions as a parameter

The permissions field in invitation details is an options bag.
v1 has exactly one supported permission:

```ts
type PortfolioPermissions = { allocation: boolean };
```

TODO: more expressive permissions (e.g. min/max portion bands per
instrument, max drift per rebalance, allowlist of instruments narrower
than the allocated set). Supporting **multiple agents per portfolio**
with **different permissions each** falls out of this — each delegation
is its own exo with its own permissions record — but is only motivated
once additional permission fields exist.

### Auditing: durable agent IDs on flows

If we want to answer "which delegate did this?", the current v1 sketch
is not quite enough. Right now a delegation is just a narrowed exo sent
to an address. That is sufficient for authorization, but weak for audit:
once the grantee submits `flow34`, the published flow status can say
"rebalance" but not which delegation facet initiated it.

The simplest extension is to make delegations first-class portfolio
state, not just delivered capabilities. In addition to `flow34.steps`,
publish agent attribution on the flow, e.g.

```js
flow34.agent = { id: 'portfolio17agent4' };
```

The important part is not the exact encoding, but the semantics:

- the published id `portfolio17agent4` is assigned by the portfolio, not
  chosen by the grantee
- the numeric key is stable for the lifetime of that delegation
- every flow started through that delegation publishes a small agent
  record carrying that id as a reference
- owner-initiated flows simply omit `agent`, rather than pretending the
  owner is "agent0"

This suggests a per-portfolio delegation collection with monotonically
assigned ids, analogous to `nextFlowId`:

- `nextAgentId` in the portfolio state
- `delegations` map keyed internally by just `n`
- each record stores at least grantee address, permissions, and lifecycle
  state (`active`, later maybe `revoked`, `expired`)

Externally, the published id should stay portfolio-qualified:
`portfolio17agent4`. That makes the id self-describing in logs, tests,
and off-chain analytics even when the surrounding portfolio path is not
present. So there is a deliberate split:

- durable contract state: key `4`
- published / API-facing handle: `portfolio17agent4`

### Where the agent id lives

There are two closely related places to publish this information:

- in the live delegation registry, so clients can list current and past
  delegations for a portfolio
- alongside each flow record, so historical attribution remains intact
  even if the delegation is later revoked

So the portfolio status might grow something like:

```js
// conceptual published view
portfolio17.agents = {
  portfolio17agent4: {
    grantee: 'agoric1claw1...',
    permissions: { allocation: true },
    state: 'active',
  },
};
```

and the flow attribution would live at a sibling path:

```js
portfolio17.flows.flow34.agent = { id: 'portfolio17agent4' };
```

Do not denormalize permissions, grantee address, or other delegation
metadata onto the flow. The flow only needs a small reference record.
Everything else should be resolved through
`portfolio17.agents.portfolio17agent4`. That keeps vstorage writes
smaller and avoids duplicating mutable metadata onto a record that is
updated many times already. Using a record now leaves room to extend the
shape later without changing the path.

### How attribution is attached

The clean authority boundary is still the delegation wrapper exo.
The wrapper already mediates access to `SimpleRebalance`; it can also
carry its own assigned `agentId` and forward it when starting the flow.

Then:

1. Pete grants delegation.
2. The portfolio allocates numeric id `4`, stores the delegation record,
   and mints the wrapper with that `agentId` in its state.
3. claw1 calls delegated `setTargetAllocation(...)`.
4. The wrapper performs the key-set / version checks and forwards to the
   existing rebalance path with out-of-band attribution
   `portfolio17agent4`.
5. As soon as the delegated call gets back `flow34`, the delegation exo
   can call the portfolio's reporter facet to publish
   `flows.flow34.agent = { id: 'portfolio17agent4' }`; it does not need
   to wait for later updates to the mutable flow status.
6. The portfolio publishes `flows.flow34` as it already does.

This keeps the audit story honest: attribution comes from the only
object that had the authority to start that flow, not from untrusted
offer args supplied by the client. It also avoids bloating the mutable
`flows.flow34` status object with delegation metadata.

### Likely code touch points

Very roughly, implementing this means touching these structures:

- `@agoric/portfolio-api` `StatusFor`: add a published type for
  `flows.flowN.agent` and likely a published `agents` registry shape.
- `packages/portfolio-contract/src/type-guards.ts`: add path helpers and
  pattern shapes for the new `flow.agent` record and published agent ids.
- `packages/portfolio-contract/src/portfolio.exo.ts`: extend the
  reporter facet with a small helper to publish `flows.flowN.agent`, and
  add durable portfolio state for `nextAgentId` plus the delegation
  registry.
- `packages/portfolio-contract/src/delegation.exo.ts`: carry the
  assigned `agentId` in delegation state and, after `setTargetAllocation()`
  receives `flowN`, call the portfolio reporter facet to publish
  `flows.flowN.agent`.
- delegation-grant path in the portfolio contract / EVM handler: assign
  the next agent id, persist the registry entry, and mint the wrapper
  with that id.

### Testing obligations

At minimum, this design implies tests for:

- published type / path coverage: `StatusFor`, published path typings,
  and contract-side type guards accept `flows.flowN.agent` and
  `portfolioN.agents`
- lazy registry behavior: portfolios with no delegations publish no
  `agents` collection, and readers treat absence as equivalent to empty
- grant-time id allocation: the first delegation for `portfolio17`
  becomes `portfolio17agent1`, the next `portfolio17agent2`, and ids are
  stable once assigned
- delegated attribution: a delegated `SimpleRebalance` publishes
  `flows.flowN.agent = { id: 'portfolio17agentM' }` as soon as `flowN`
  is known
- non-delegated flows: owner/planner flows do not publish a spurious
  `agent` record
- registry / flow linkage: every published `flow.agent.id` resolves to a
  corresponding entry in `portfolioN.agents`
- upgrade compatibility: old portfolios with no `agents` collection and
  old flows with no `.agent` remain valid and are interpreted as having
  no delegate attribution
- **agent id is in inviation details**

### Why a registry is worth it

Earlier we treated "listing existing delegations" as out of scope, but
auditability changes the tradeoff. Once we want durable attribution, a
registry is no longer just a convenience; it becomes the source of truth
for what `portfolio17.agents.portfolio17agent4` means.

Without a registry:

- `agentId` would have to be derived from something unstable, like the
  grantee address or invitation history
- revocation would be awkward, because there is no durable object to
  mark inactive
- UIs could show that `flow34` was done by `portfolio17agent4`, but
  would have no canonical place to resolve that id into address,
  permissions, or current status

With a registry:

- revocation and expiration become straightforward state transitions
- audits can distinguish "active at the time" from "still active now"
- future features like labels (`name: 'claw1-prod'`) can hang off the
  same record without changing flow attribution

### Open design choices

- **Id format**: internal key `4`, published id `portfolio17agent4`.
- **When the id is allocated**: on grant creation, not on first use.
  Otherwise the same delegation would lack an identity until its first
  action.
- **What counts as an "agent"**: only delegated wrappers. Direct owner
  calls and planner flows should remain unattributed unless we later add
  a more general "initiator" concept.
- **Historical retention**: the registry should probably retain revoked
  delegations rather than deleting them, because old flows still refer to
  them.
- **Address changes**: if a human rotates to a new agent address, that
  should probably be a new delegation id. Reusing ids across principals
  makes audit trails harder to trust.

## out of scope (test.todo)

- **Revocation**: Pete revokes claw1's delegation. Likely a product
  requirement, not in this story. If we adopt durable `agentId`
  attribution, the portfolio should durably track issued delegations;
  revocation becomes a state change on that registry.
- **Expiration**: Time-bounded delegations.
- **Listing existing delegations**: Once we have an agent registry for
  audit, this becomes much more natural, though still not required for
  the first cut.
- **Cost recovery**: Agents incur gas costs (relayer fees, IBC, etc.);
  some mechanism is needed to charge the delegating portfolio.
