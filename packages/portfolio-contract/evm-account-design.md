## Remote EVM Account Pre‑Creation Design

### Overview
`provideEVMAccount` currently waits for an Axelar upcall to learn the deployed remote account address before resolving the vow it returns. We will change this so the account address is **deterministically precomputed locally** (using the same CREATE2 formula Solidity will use) and the vow is resolved immediately. This reduces latency, simplifies orchestration, and removes the dependency on a callback channel for the address.

### Current Behavior (Summary)
1. Request to create remote account is sent.
2. Axelar (or gateway) eventually reports back the deployed address.
3. The pending vow for the EVM account address is resolved when the upcall arrives.

### Problems With Current Approach
* Extra round trip / latency before users can reference the remote address.
* Requires maintaining callback/upcall plumbing.
* Harder to compose with flows that want the address synchronously (e.g., preparing subsequent transactions referencing the account).

### Goals
* Deterministically compute the remote account address locally.
* Resolve the vow immediately after submitting the deployment transaction.
* Remove Axelar address upcall handling for this path.
* Preserve correctness: ensure the computed address matches the actual deployed address or detect mismatch early.

### Deterministic Address Derivation (CREATE2)
The Solidity deployment uses CREATE2 via:
```solidity
new Wallet{salt: keccak256(abi.encodePacked(owner))}(_gateway, address(gasService), owner);
```
Where:
* `owner` = the portfolio's LCA (local cosmic account) EVM address (or mapped cross-chain address) serving as the logical owner of the Wallet.
* `salt` = `keccak256(abi.encodePacked(owner))`.

Given a contract creation via CREATE2, the resulting address is:
```
address = keccak256(0xff ++ deployingContractAddress ++ salt ++ keccak256(init_code))[12:]
```
Where:
* `deployingContractAddress` is the address of the contract executing the `new Wallet{salt: ...}` statement (could be a factory or gateway contract; clarify this address in configuration).
* `salt` is as above.
* `init_code` is the creation bytecode of `Wallet` (constructor args encoded and appended as usual). Its hash must be stable and known locally.

### Required Local Inputs
To precompute we need:
1. `deployingContractAddress` (factory / gateway) – configured or retrieved from chain parameters.
2. `owner` – the portfolio LCA mapped/known EVM-compatible address.
3. `walletInitCodeHash` – `keccak256` of the full creation bytecode for `Wallet` including encoded constructor args `(_gateway, address(gasService), owner)`.
4. `salt` – `keccak256(abi.encodePacked(owner))`.

### Repository Input Sources & Plumbing (live notes)
* `deployingContractAddress` is already available via `contracts[chain].factory` in `@agoric/portfolio-deploy/src/axelar-configs.js`; no structural change needed beyond type widening.
* `gatewayAddress` and `gasServiceAddress` **are not provided yet**. Plan:
   * Extend `EVMContractAddresses` to include `axelarGateway` (or `gateway`) and `axelarGasService` fields.
   * Update `packages/portfolio-deploy/src/axelar-configs.js` to populate these values for each supported chain; coordinate sourcing the authoritative address list.
   * Thread the new fields through `portfolio-start.core.js → makePrivateArgs` so they reach the contract.
   * ✅ Types updated in code with placeholder `0x000…` values; replace with chain-specific addresses when confirmed.
* `walletBytecode` is currently absent. Plan:
   * Add a new module (e.g. `src/evm/wallet-artifacts.ts`) exporting the Wallet creation bytecode and ABI metadata. Source: reuse the artifact already compiled for Axelar factory deployments; if unavailable, add a build step that pulls from the Solidity build output.
   * Surface the bytecode in deployment config (likely a single global blob reused across chains) so the contract code can import it without duplicating large strings per chain record.
   * Document the expected hashing procedure to make it easy to update when the contract changes.
   * ✅ Stub module landed in `src/evm/wallet-artifact.ts`; pending wiring of real bytecode.

### Libraries / Implementation Notes
* Use `@noble/hashes` ("noble") for `keccak256`. (If not yet present, add dependency in the relevant package.)
* Ensure bytecode encoding matches Solidity ABI exactly; consider generating constructor argument encoding via existing ABI tooling rather than manual concatenation.
* Guard against accidental uppercase/lowercase address formatting issues; normalize to checksummed or lowercase before hashing.

### Revised `provideEVMAccount` Flow (Agoric Side)
1. Gather required inputs (above); failure to obtain any yields immediate rejection.
2. Compute:
   * `salt = keccak256(abi.encodePacked(owner))`.
   * `predicted = keccak256(0xff || deployingContractAddress || salt || walletInitCodeHash)[12:]`.
3. Submit deployment transaction (through Axelar / gateway) instructing remote chain to execute the same `new Wallet{salt: ...}`.
4. Resolve the vow immediately with `predicted`.
5. (Optional) Schedule a lightweight confirmation check (poll or event subscription) to verify code presence at `predicted`. If mismatch or timeout, raise an alert / produce a separate error channel (do NOT revoke the already-resolved vow—document invariant expectations instead).
6. Remove previous upcall resolution code paths.

### Implementation Plan (tracked as work progresses)
1. **Config & Types**
    * Broaden `EVMContractAddresses` (and related patterns in `type-guards.ts`) to include `gateway`, `gasService`, and a reference to the Wallet bytecode/hash.
    * Populate the new fields in `portfolio-deploy` configs and ensure `makePrivateArgs` still satisfies the contract's `privateArgsShape` by updating the pattern.
       * ✅ Placeholder values wired, awaiting authoritative chain-specific addresses.
    * Introduce a shared Wallet artifact module exporting `WALLET_BYTECODE` and (optionally) the constructor ABI, with an accompanying unit test that sanity-checks the `keccak256` against a known-good vector.
       * ✅ Stub module created; follow-up to replace dummy bytecode and add tests.
2. **Contract Context Wiring**
   * Update `PortfolioInstanceContext` and any downstream consumers (`pos-gmp.flows.ts`, `portfolio.flows.ts`) to accept the new addresses/artifacts.
   * Thread the Wallet artifact into `provideEVMAccount` so the CREATE2 helper can derive the init-code hash.
3. **Flow Refactor**
   * Compute the predicted address before dispatching the Axelar GMP call and resolve the manager immediately via `pk.manager.resolveAccount`.
   * Remove the Axelar upcall path (`resolveEVMAccount` + related memo parsing) and replace it with optional confirmation logging.
4. **Testing & Verification**
   * Add pure function tests for `deriveWalletSalt`, `computeWalletInitCodeHash`, and `predictWalletAddress` with fixture values sourced from Solidity tests.
   * Update existing GMP flow tests to assert the vow resolves synchronously and that no upcall is required.
   * Include a regression test covering idempotent calls: repeated provisioning should re-use the same predicted address and avoid duplicate `sendMakeAccountCall` dispatches.
   * Deliver a small CLI utility (e.g., `yarn predict-wallet-address`) that invokes the same helper to compute deterministic addresses for a given owner/config tuple, ensuring operators can sanity-check deployments offline.
5. **Resiliency & Retries**
   * Add a planner operation that can retry remote account creation when the initial Axelar/GMP invocation fails or times out, wiring it to reuse the reserved account context and predicted address.
   * Document retry trigger conditions and any manual operator override steps so failures can be recovered without redeploying the portfolio instance.
5. **Operational Follow-ups**
   * Document the new config requirements for deployment teams (e.g. update README / runbook).
   * Plan a one-time validation script that fetches on-chain code at the predicted address post-deploy and compares bytecode hashes, ensuring parity after the migration.

### Error Handling Strategy
* Precompute phase: use guards. Missing inputs or failed hashing => throw early (`condition || Fail\`message\`` style).
* Transaction submission failure: throw before vow resolution so callers receive a rejection instead of a misleading address.
* Post-resolution deployment failure: surfaced via a separate status notifier (not by re-rejecting the vow). Document this clearly.

### Edge Cases
* Account already deployed for given `owner` (idempotent) – predicted address contains code; treat as success and skip deployment.
* Incorrect factory/gateway address configured – would produce a different predicted address than actual; include config sanity assertions.
* Bytecode evolution (Wallet upgraded) – update `walletInitCodeHash` together with on-chain deployment; version the hash source.
* Race: simultaneous requests for same `owner` – should coalesce; salt identical -> same predicted address; ensure only one deployment is sent.
* Chain reorg before confirmation – eventual confirmation logic should tolerate short-lived absence; require multiple confirmations.

### Testing Plan
1. Unit: Pure function test for address derivation vs a known Solidity reference vector (hard-code sample owner, constructor args, expected CREATE2 outcome).
2. Property: Changing any input (owner, deployer, bytecode hash) changes predicted address.
3. Integration (simulated): Invoke `provideEVMAccount`, ensure vow resolves immediately with predicted address and subsequent mock event confirms deployment.
4. Negative: Simulated transaction failure -> vow rejects and no address returned.
5. Idempotent: Repeated calls for same owner return identical address without duplicate deployment.

### Migration / Removal Steps
* Delete/disable Axelar upcall code paths specific to EVM address retrieval.
* Add new helper `computeCreate2Address({ deployer, owner, initCodeHash })` with internal hashing (documented & unit tested).
* Update any orchestration that awaited remote resolution to instead act immediately.
* Add monitoring hook to verify eventual code presence (optional, feature-flagged initially).

### Implementation Checklist
* [ ] Introduce noble keccak256 utility (or reuse if present).
* [ ] Implement helper for constructor args encoding (or leverage existing ABI library).
* [ ] Implement address precompute function.
* [ ] Refactor `provideEVMAccount` to new flow.
* [ ] Remove old upcall resolution logic & tests.
* [ ] Add new unit tests + integration test scaffolding.
* [ ] Update documentation references & any consumers relying on delayed vow resolution.

### Open Questions / Assumptions
* Assumption: `deployingContractAddress` is stable and known at portfolio-contract initialization.
* Assumption: Wallet constructor ABI will not change without coordinated update of `initCodeHash` logic.
* Clarify whether `_gateway` and `gasService` addresses are static or chain‑configurable; include them in init code assembly appropriately.

### Next Steps
Proceed to implement the helper and refactor `provideEVMAccount`, then update tests per plan above.

