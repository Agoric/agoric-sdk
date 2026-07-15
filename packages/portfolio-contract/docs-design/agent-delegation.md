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

If we want to answer "which delegate did this?", the current v1 sketch
is not quite enough. Right now a delegation is just a narrowed exo sent
to an address. That is sufficient for authorization, but weak for audit:
once the grantee submits `flow34`, the published flow status can say
"rebalance" but not which delegation facet initiated it.

The simplest extension is to make delegations first-class portfolio
state, not just delivered capabilities. In addition to `flow34.steps`,
publish agent attribution on the flow, e.g.

```js
flow34.agent = { id: 'agent4' };
```

The important part is not the exact encoding, but the semantics:

- the published id `agent4` is assigned by the portfolio, not
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

and the flow attribution would live at a sibling path:

```js
portfolio17.flows.flow34.agent = { id: 'agent4' };
```

Do not denormalize permissions, grantee address, or other delegation
metadata onto the flow. The flow only needs a small reference record.
Everything else should be resolved through
`portfolio17.agents.agent4`. That keeps vstorage writes
smaller and avoids duplicating mutable metadata onto a record that is
updated many times already. Using a record now leaves room to extend the
shape later without changing the path.

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
   validates the active client, permission, and version, then starts the flow
   with out-of-band attribution `agent4`.
5. As soon as the delegated call gets back `flow34`, the delegation exo
   can call the portfolio's reporter facet to publish
   `flows.flow34.agent = { id: 'agent4' }`; it does not need
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
  becomes `agent1`, the next `agent2`, and ids are
  stable once assigned
- delegated attribution: a delegated `setTargetAllocation` publishes
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
