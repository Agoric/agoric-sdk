# Agent Delegation for Ymax

Just like we invite clients to play the role of planner or EVM,
we can invite clients to have attenuated access to a portfolio.

## Stack-ranked demo items

1. Create mandate through chat for a new portfolio

2. Add agent through chat for an existing portfolio

3. Agent proposes a mandate change; user reviews and signs it

4. Agent takes live action within mandate

5. Show out-of-mandate enforcement and rejection

6. Show async agent action within mandate

7. Show activity screen agent/user attribution

## story: separation of duties (items 2, 4, 5)

Pete opens portfolio45, with 60% Aave, 40% Compound.

Pete asks an agent, claw1, to generate a key pair and show address: `agoric1claw1...`.

Pete chooses permissions - allocation only -
and submits an EVM `Grant` request to `agoric1claw1...`.

The contract creates a new exo with a reference to portfolio45
and the permissions, and sends an invitation with the portfolio id
and the permissions in the invitation details to `agoric1claw1...`.

claw1 redeems the invitation and uses the returned exo
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

### "Allowed" / "allocated" instruments

An instrument is "allocated" iff it is present as a key in the portfolio's
current `targetAllocation` (see [portfolio.exo.ts](../src/portfolio.exo.ts)
state shape).

For delegation purposes, this key set is also the complete set of **allowed
instruments**. There is no separate instrument allowlist in the grant. A key
whose portion is `0` remains allowed; an instrument stops being allowed only
when an owner-signed portfolio edit removes its key from `targetAllocation`.

The check applied to a granted rebalance is:

- the proposed allocation's key set must equal the current allocation's
  key set — no added keys (the agent cannot introduce new instruments)
  and no removed keys (the agent cannot un-delete an instrument either,
  since un-deletion is itself a privileged change to the allocated set).

Portion values are otherwise unconstrained: the agent may set an
allocated instrument's portion to 0 (or to 100). The key must still
be present.

A rebalance that violates the permission's key-set rule causes the offer to reject.

### Changing the mandate

The delegation does not give the agent authority to change its own mandate.
To add or remove instruments, the agent proposes a normal portfolio edit by
generating a link to the Ymax edit-portfolio page. The link encodes the proposed
target allocation, including its complete instrument key set.

The user opens the link, reviews the proposed allocation in Ymax, and signs the
existing EVM `SetTargetAllocation` operation. That owner-authorized operation
updates both the allocation portions and the set of instruments available to
the delegate. No delegation credential or agent signature can substitute for
the user's signature on this operation.

After the signed edit is accepted, `policyVersion` advances. Any agent action
prepared against the old mandate fails its version check; the agent must read
the new `targetAllocation` and `policyVersion` before acting again.

The proposal link is not authorization. Query parameters are untrusted input
used only to pre-populate the review screen; the signed EIP-712 message is the
authoritative request.

### Operations exposed to the grantee

The delegation client facet exposes two fund-management methods, each guarded
by a distinct permission:

- `setTargetAllocation({ targetAllocation, syncState, agentMemo? })` requires
  `allocation`. The wrapper enforces the exact-key-set mandate described above;
  the portfolio delegation helper then validates the active delegation,
  permission, and sync state before updating the target allocation and starting
  an attributed rebalance flow.
- `rebalance({ syncState, agentMemo? })` requires `rebalance`. It starts a
  rebalance flow under the current policy without changing the target
  allocation. This is currently used by the Ymax planner delegation for the
  auto-rebalance feature, not by the external EVM `Grant` operation.

Neither method accepts an arbitrary flow plan from the delegation client.
`Deposit` and `Withdraw` are not exposed. The wrapper holds only the narrowed
portfolio delegation-helper facet and never exposes the portfolio's manager or
other fund-moving facets.

`syncState` contains `policyVersion` and `rebalanceCount`, matching the planner
submission protocol (see [planner.exo.ts](../src/planner.exo.ts) and
[portfolio.exo.ts](../src/portfolio.exo.ts)). The portfolio rejects the call if
either value does not match. The agent reads the current `targetAllocation`,
`policyVersion`, and `rebalanceCount` from portfolio status.

This also resolves the apparent race between Pete and the grantee:
if Pete calls `SetTargetAllocation` between the agent's read and the
agent's submit, `policyVersion` has advanced and the offer rejects.
The agent re-reads and retries.

### Permissions as a parameter

The app-level permissions field in invitation details and the delegation
registry is an extensible options bag. The currently implemented shape is:

```ts
type PortfolioPermissions = {
  allocation?: boolean;
  rebalance?: boolean;
};
```

The external EIP-712 `Grant` wire format intentionally contains only the
required `allocation: boolean` field, and the external grant path requires it
to be `true`. The `rebalance` permission is currently assigned internally to
the planner delegation when auto-rebalance is enabled. This wire/app
difference is explicit: clients must not infer that every app-level permission
can be granted by the current EIP-712 message.

TODO: more expressive permissions (e.g. min/max portion bands per
instrument, max drift per rebalance, allowlist of instruments narrower
than the allocated set). Supporting **multiple agents per portfolio**
with **different permissions each** falls out of this — each delegation
is its own exo with its own permissions record — but is only motivated
once additional permission fields exist.

### Auditing: durable agent IDs on flows

Delegations are first-class portfolio state, not just delivered
capabilities. This lets clients answer "which delegate did this?" by
resolving the agent reference embedded in a delegated flow:

```js
const flow34 = {
  type: 'rebalance',
  agent: 'agent4',
  // ...mutable flow status
};
```

The attribution semantics are:

- the published id `agent4` is assigned by the portfolio, not
  chosen by the grantee
- the numeric key is stable for the lifetime of that delegation
- every flow started through that delegation embeds the assigned
  `agentN` string reference in its flow record
- owner-initiated flows simply omit `agent`, rather than pretending the
  owner is "agent0"
- an optional client-supplied `agentMemo` is correlation metadata, not
  an identity or authority claim

Each portfolio has a delegation collection with monotonically assigned
ids:

- `delegations` map keyed internally by just `n`
- the next id is derived from the size of this append-only map
- each record stores at least grantee address, permissions, and lifecycle
  state (`active`, later maybe `revoked`, `expired`)

Externally, the published id can stay simple: `agent4`. Since the
portfolio path already scopes the registry and flow attribution, the
extra portfolio prefix does not add much value. So there is still a
split:

- durable contract state: key `4`
- published / API-facing handle: `agent4`

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
  agent4: {
    grantee: 'agoric1claw1...',
    permissions: { allocation: true },
    state: 'active',
  },
};
```

The flow record at `portfolio17.flows.flow34` embeds the reference:

```js
portfolio17.flows.flow34 = {
  state: 'run',
  type: 'rebalance',
  agent: 'agent4',
  // ...other flow status
};
```

Do not denormalize permissions, grantee address, or other delegation
metadata onto the flow. The flow only needs the small string reference.
Everything else should be resolved through
`portfolio17.agents.agent4`. That keeps vstorage writes
smaller and avoids duplicating mutable metadata onto a record that is
updated many times already. There is no separate
`portfolio17.flows.flow34.agent` vstorage path.

### How attribution is attached

The clean authority boundary is the delegation wrapper together with the
portfolio's narrowed delegation-helper facet. The wrapper mediates
`setTargetAllocation` and `rebalance`, carries its assigned `agentId`, and
cannot reach the portfolio manager directly.

Then:

1. Pete grants delegation.
2. The portfolio allocates numeric id `4`, stores the delegation record,
   and mints the wrapper with that `agentId` in its state.
3. claw1 calls delegated `setTargetAllocation(...)`.
4. The wrapper performs the key-set check. The portfolio delegation helper
   validates the active client, permission, and version.
5. The helper constructs the `FlowDetail` from trusted delegation state,
   including `agent: 'agent4'` and any client-supplied `agentMemo`, and starts
   the flow.
6. The portfolio's normal flow publication retains that embedded reference
   through subsequent status updates.

This keeps the audit story honest: attribution comes from the only
object that had the authority to start that flow, not from untrusted
offer args supplied by the client. `agentMemo`, when present, remains
untrusted metadata. This also avoids bloating the mutable
`flows.flow34` status object with delegation metadata.

### Implemented code touch points

The implementation divides responsibility across these structures:

- `@agoric/portfolio-api` defines `FlowDetail.agent` as a
  `PortfolioAgentKey` string and defines the published `portfolioAgents`
  registry shape.
- `packages/portfolio-contract/src/type-guards.ts` accepts the embedded
  agent key and the published agent registry.
- `packages/portfolio-contract/src/portfolio.exo.ts` stores and publishes
  the registry; its narrowed delegation helper attaches the trusted agent
  key to `FlowDetail` before starting a delegated flow.
- `packages/portfolio-contract/src/delegation.exo.ts` carries the assigned
  numeric `agentId` and invokes only that narrowed helper.
- the delegation-grant path assigns the id, persists the registry entry,
  and delivers the wrapper and grant details.

### Testing obligations

At minimum, this design implies tests for:

- published type / path coverage: `StatusFor`, published path typings,
  and contract-side type guards accept the embedded `flow.agent` key and
  `portfolioN.agents`
- lazy registry behavior: portfolios with no delegations publish no
  `agents` collection, and readers treat absence as equivalent to empty
- grant-time id allocation: the first delegation for `portfolio17`
  becomes `agent1`, the next `agent2`, and ids are
  stable once assigned
- delegated attribution: a delegated `setTargetAllocation` publishes a flow
  containing `agent: 'agentM'` as soon as the flow is known
- non-delegated flows: owner-initiated flows do not publish a spurious
  `agent` reference
- registry / flow linkage: every published `flow.agent` resolves to a
  corresponding entry in `portfolioN.agents`
- upgrade compatibility: old portfolios with no `agents` collection and
  old flows with no `agent` field remain valid and are interpreted as having
  no delegate attribution
- agent id is in invitation details

### Why a registry is worth it

Earlier we treated "listing existing delegations" as out of scope, but
auditability changes the tradeoff. Once we want durable attribution, a
registry is no longer just a convenience; it becomes the source of truth
for what `portfolio17.agents.agent4` means.

Without a registry:

- `agentId` would have to be derived from something unstable, like the
  grantee address or invitation history
- revocation would be awkward, because there is no durable object to
  mark inactive
- UIs could show that `flow34` was done by `agent4`, but
  would have no canonical place to resolve that id into address,
  permissions, or current status

With a registry:

- revocation and expiration become straightforward state transitions
- audits can distinguish "active at the time" from "still active now"
- future features like labels (`name: 'claw1-prod'`) can hang off the
  same record without changing flow attribution

### Open design choices

- **Id format**: internal key `4`, published id `agent4`.
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
