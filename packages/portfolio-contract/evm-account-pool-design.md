# EVM Account Pool Design

This document describes the current design of the EVM account pool used by the Portfolio contract. The pool is implemented inside the contract (durable state), supplies pre-made EVM accounts to flows, and is populated opportunistically from inbound GMP events and optionally via a creator prefill method.

An appendix documents the earlier vat-orchestration-based approach and build notes; that path is deprecated in favor of the in-contract design.

## Goals

- Reduce latency when opening EVM positions by reusing pre-made accounts.
- Keep account state colocated with the contract instance for simpler reasoning, durability, and testing.
- Avoid coupling to orchestration vats for basic account provisioning.
- Allow proactive prefill to warm the pool without affecting resolver tx numbering used by tests.

## Non-goals

- Managing “assigned/lease” state across flows (pool provides best-effort ready accounts only).
- Global pool across instances or multi-contract sharing (each instance holds its own pool).
- Exposing the pool as a public API; any observability is creator-facet only.

## Current design (in-contract pool)

### Data model

- Durable exo stored in contract baggage under the instance state.
- Per-chain FIFO queues of “ready” accounts: a Map chainName -> array of GMPAccountInfo.
- Simple handedOut counter per chain for metrics/summary.
- No “checked-out” tracking; once acquired, an entry is removed from the queue.

Types of interest (illustrative):
- GMPAccountInfo: { chainName, remoteAddress, txType: 'GMP', ... } as produced by inbound GMP decode.
- AxelarChain: chain name key (e.g., 'Arbitrum', 'Base').

### Interfaces

- acquire(chainName: AxelarChain): GMPAccountInfo | undefined
	- Pops the next ready account for the chain if available.
- addReady(info: GMPAccountInfo): void
	- Appends a ready account to the per-chain FIFO.
- summary(): { readyByChain: Record<string, number>, handedOutByChain: Record<string, number> }
	- Optional creator-only use for observability.

### Lifecycle and integration points

1) Pool creation and wiring
- Constructed durably during contract start and placed on instance state.
- Passed into the portfolio flows context as ctx.evmAccountPool.

2) Providing accounts to flows
- provideEVMAccount(chainName):
	- First tries ctx.evmAccountPool.acquire(chainName).
	- If found, resolves the pending “reserveAccount” request immediately using the pool entry.
	- Otherwise, falls back to issuing a GMP “make-account” call to Axelar; the remote address will arrive later via inbound GMP and complete the reservation.

3) Populating the pool from inbound events
- In parseInboundTransfer (GMP upcall handler):
	- Decode the memo and create a GMPAccountInfo.
	- If there is a pending reservation for this chain, resolve that reservation (normal path when an account was requested and not pooled).
	- Else, add the account to the pool via addReady(info).

4) Prefill for warming the pool (creatorFacet)
- prefillEvmAccounts(chainName, count, evmGas, feeValue): sends Axelar GMP “make-account” memos so future inbound results populate the pool.
- The prefill does not register resolver transactions (i.e., it doesn’t consume txIds in the contract’s transaction registry), avoiding interference with tests that rely on tx settlement.

### Durability and concurrency

- The pool uses durable collections (MapStores/Array-like state) under the contract zone; state survives restarts and upgrades in accordance with contract upgrade policy.
- FIFO per chain provides simple, fair ordering. If multiple flows need the same chain concurrently and the pool depletes, subsequent flows fall back to issuing “make-account.”
- No locking is required beyond the contract’s sequential execution model; acquisitions occur within flow steps.

### Error handling

- acquire() returns undefined when empty; callers must handle the fallback path to initiate a creation via GMP.
- addReady() ignores unknown chains only if the contract supports them; typically chain names are validated by upstream logic.
- Inbound GMP decode failures are logged and ignored; no pool mutation occurs.

### Observability

- Optionally expose a creatorFacet method to read summary() for debugging/telemetry.
- Pending transaction publications remain under `${ROOT_STORAGE_PATH}.pendingTxs` for actual money-movement operations; prefill avoids publishing there.

### Testing notes

- Avoid assuming txIds start at tx0/tx1 in tests. Other flows may register transactions first.
- Prefer test helpers that discover actual pending txIds from vstorage before settling.
- Prefill calls shouldn’t affect tx numbering, by design.

## Rationale for in-contract placement

- Simpler wiring: no cross-vat plumbing, no extra export/import maintenance in orchestration vats.
- Better encapsulation with portfolio state and flows, easier to reason about instance-local behavior.
- Durability “for free” with contract baggage and Zone utilities; no external service lifecycle.
- Tests are faster and less brittle: fewer moving parts and mocks.

## Future work (optional)

- Add max pool size limits per chain and pruning rules.
- Add metrics publication for pool depth by chain.
- Consider a “recently used” quarantine window to reduce immediate reuse if needed.

---

## Appendix A: Previous vat-orchestration-based pool (deprecated)

This section summarizes the earlier design that placed the pool in the orchestration vat and exposed it via orchestration exports.

### Overview

- A separate orchestration module implemented the pool and was imported/exported by the orchestration vat root.
- Portfolio flows would call into that service to reserve and return accounts.

### Build and wiring notes

- Orchestration index.js exported the pool service; vat-orchestration imported and attached it to the root object.
- Contract tests required additional mocking for the orchestration service and its storage to validate behavior.

### Issues that led to deprecation

- Cross-package coupling created module-not-found and build fragility when the service moved or was optional.
- Complexity: more moving parts for a simple FIFO, and extra mocks in tests.
- Encapsulation mismatch: account lifecycle is tightly bound to the portfolio instance, favoring co-location.

### Migration notes

- Remove pool exports/imports from orchestration code.
- Instantiate the pool in the portfolio contract; pass it in the context used by flows.
- Update inbound GMP handling to populate pool-or-resolve.

## Appendix B: Glossary

- GMP: Axelar General Message Passing — used here to “make-account” remotely and receive the EVM address back.
- LCA: Local Contract Account used to send fees and originate cross-chain messages.
- Resolver txIds: Contract-published pending transactions under vstorage that tests settle; unrelated to prefill operations.

