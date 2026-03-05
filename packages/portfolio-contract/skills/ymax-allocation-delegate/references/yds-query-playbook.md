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

Extract currently allowed instruments from current target allocation.
If no instruments are present, do not submit allocation changes; escalate to owner/operator.

## Optional: Inspect Endpoint Schemas
```sh
curl -sS "$YDS_BASE/openapi.json" \
  | jq '.paths["/portfolios/{portfolioId}"] // .paths["/portfolios/portfolio{portfolioId}"]'
```

If path differs, query the exact discovered path from the OpenAPI listing.

## Build Yield Hypothesis Inputs
- Current target allocation.
- Any available performance/yield-related endpoint data from discovered API surface.
- Data freshness checks for each input source.

## Build Candidate Constraints
- Keep instrument set unchanged from current allocation.
- If any candidate instrument is not in the allowed set, fail before submit.
- Record rationale and source timestamps used in decision.
