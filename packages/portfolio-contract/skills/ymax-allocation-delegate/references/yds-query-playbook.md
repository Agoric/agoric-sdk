# YDS Query Playbook

## Required Inputs
- `YDS_BASE` such as `https://dev0.ymax.app`
- `PORTFOLIO_ID` numeric id (query path uses `portfolio${PORTFOLIO_ID}`)

## Discover API Surface
List relevant endpoints from OpenAPI first:

```sh
curl -sS "$YDS_BASE/openapi.json" \
  | jq -r '.paths | keys[] | select(test("portfolio|evm|operation|flow|offer"; "i"))'
```

Use this to avoid assuming endpoint names.

## Fetch Current Portfolio Allocation
```sh
curl -sS "$YDS_BASE/portfolios/portfolio${PORTFOLIO_ID}" | jq .
```

Extract currently allowed instruments from current target allocation and keep delegate updates within that set.

## Optional: Inspect Endpoint Schemas
```sh
curl -sS "$YDS_BASE/openapi.json" \
  | jq '.paths["/portfolios/{portfolioId}"] // .paths["/portfolios/portfolio{portfolioId}"]'
```

If path differs, query the exact discovered path from the OpenAPI listing.

## Build Allocation Candidate
- Keep instrument set unchanged from current allocation.
- Reweight portions according to current yield hypothesis.
- Keep a record of rationale and data sources used.

## Submit Allocation
Use the repo tool:

```sh
./packages/portfolio-contract/tools/submit-evm-allocation.ts \
  --allocations '[{"instrument":"Aave_Arbitrum","portion":"70"},{"instrument":"Compound_Arbitrum","portion":"30"}]'
```

## Verify Result
1. Check CLI response for accepted operation id / status.
2. Re-query portfolio endpoint.
3. Confirm target allocation matches submission.
4. If not, inspect error payload and retry.

## Common Errors
- Unknown Ymax operation type:
  - backend not upgraded for new operation set.
- Permit validation failed:
  - domain/signature mismatch (chain id, contract, key usage).
- Authorization failure:
  - delegate not bound to that portfolio or wrong signer.
- Cannot add instruments:
  - candidate allocation included destination not in allowed set.
