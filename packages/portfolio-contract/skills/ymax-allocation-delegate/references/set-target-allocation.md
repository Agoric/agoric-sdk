# SetTargetAllocation Execution

## Purpose
Submit delegated `SetTargetAllocation` safely and verify convergence.

## Preconditions
- Onboarding and owner delegation complete (see `agent-onboarding.md`).
- Candidate allocation uses only currently allowed instruments.

## Submit
Inline payload example:

```sh
./packages/portfolio-contract/tools/submit-evm-allocation.ts \
  --allocations '[{"instrument":"Aave_Arbitrum","portion":"70"},{"instrument":"Compound_Arbitrum","portion":"30"}]'
```

File payload example:

```sh
./packages/portfolio-contract/tools/submit-evm-allocation.ts \
  --allocations-file ./allocations.json
```

## Verify
1. Check CLI response for accepted operation id/status.
2. Poll portfolio endpoint every 5 seconds for up to 2 minutes:

```sh
curl -sS "$YDS_BASE/portfolios/portfolio${PORTFOLIO_ID}" | jq .
```

3. Confirm target allocation matches submitted payload.
4. If timeout expires without convergence, treat as failure and escalate.

## Retry and Escalation
- Input errors (bad payload, unexpected instruments): fix once, retry once.
- Authorization failures: do not blind-retry; re-check delegation handshake and delegated address first.
- Permit/domain failures: refresh domain assumptions (chain ID, contract, key source) and retry once.
- Backend/version errors (unknown operation type): no retry; escalate immediately.
- Same non-input failure twice: stop and escalate.

## Common Error Mapping
- `Unknown Ymax operation type`: backend not upgraded for operation set.
- `Permit validation failed`: domain/signature mismatch.
- Authorization/delegation failure: delegate not authorized for this portfolio or wrong delegated address.
- `cannot add positions`: candidate included instruments outside current allowed set.
