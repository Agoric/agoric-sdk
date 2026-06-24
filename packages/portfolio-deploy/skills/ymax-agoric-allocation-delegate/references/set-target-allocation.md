# Delegated setTargetAllocation

## Purpose
Submit delegated `setTargetAllocation` safely and verify convergence.

## Preconditions
- Onboarding and delegation complete (see `agent-onboarding.md`).
- YDS query work complete (see `yds-query-playbook.md`).
- Delegation invitation redeemed into a known wallet-store key, for example `delegate-portfolio95`.
- Candidate allocation file preserves the current instrument key set.
- The signing tool must derive the same delegate address that was funded and granted authority. `wallet-admin.ts` currently inherits the default `client-utils` HD path `m/44'/564'/0'/0/0`; if your funded delegate key was derived on another path such as `m/44'/118'/0'/0/0`, use a custom helper or patch the path before submitting.
- Export the delegate wallet mnemonic in the environment:

```sh
export MNEMONIC='delegate mnemonic'
```

## File Format
The allocation file is a JSON object from instrument key to non-negative integer portion:

```json
{
  "Aave_Arbitrum": 50,
  "Compound_Arbitrum": 50
}
```

String or integer JSON values are accepted. The tool converts them to bigint portions before submission.

## Submit
The delegated submission command reads `policyVersion` and `rebalanceCount` itself. Agents should use YDS for query and verification work, not vstorage directly.

```sh
./packages/portfolio-deploy/scripts/wallet-admin.ts \
  ./packages/portfolio-deploy/src/delegated-set-target-allocation.ts \
  --contract ymax0 \
  --portfolio-id 95 \
  --delegation-key delegate-portfolio95 \
  --allocations-file ./allocations-portfolio95.json
```

Capture the returned Agoric tx hash. In current production behavior, YDS may not reflect the change until that tx hash is registered with the public transactions endpoint:

```sh
curl -sS -X POST "$YDS_BASE/transactions" \
  -H 'content-type: application/json' \
  --data '{
    "txHash":"AGORIC_TX_HASH",
    "chain":"agoric-3",
    "ymaxInstance":"ymax0"
  }'
```

## Verify
Use the YDS query patterns from `yds-query-playbook.md`.

1. Check the CLI response for the submission tx hash and sync state used.
2. Submit the tx hash to `POST /transactions` as above unless you have confirmed the backend already indexed it.
3. Poll the YDS portfolio endpoint, for example:

```sh
curl -sS "$YDS_BASE/portfolios/portfolio${PORTFOLIO_ID}" | jq .
```

4. Confirm the published `targetAllocation` matches the submitted file.
5. If the contract rejects due to sync-state drift, refresh and retry once.

## Retry and Escalation
- Sync-state mismatch: refresh and retry once.
- Key-set rejection: fix the file and retry once.
- Authorization failure: confirm the redeemed delegation key corresponds to the granted portfolio.
- YDS remains stale after successful on-chain submission: confirm `POST /transactions` accepted the tx hash before escalating.
- Same non-input failure twice: stop and escalate.
