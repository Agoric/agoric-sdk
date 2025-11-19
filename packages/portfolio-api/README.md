# Portfolio management API

API shared between on-chain contract and external clients

## Vstorage schema and readers

Portfolio vstorage paths, shapes, and helpers now live here (see `src/vstorage-schema.ts`):

- Path builders and parsers: `makePortfolioPath`, `makePositionPath`, `makeFlowPath`, `portfolioIdFromKey`, etc.
- Shape guards: `PortfolioStatusShapeExt`, `PositionStatusShape`, `FlowStatusShape`, `FlowStepsShape`.
- Pool mapping: `PoolPlaces` / `BeefyPoolPlaces` and allocation shapes.
- Derived reader: `readPortfolioLatest({ readLatest, listChildren, portfoliosPathPrefix, portfolioKey })` returns the latest portfolio state plus a joined view of `flowsRunning` and any `flows.flowN` nodes. It marks flows as `phase: 'init'` when they appear in `flowsRunning` but no flow node exists yet (covers the “flowsRunning written first” pattern). Pass `includePositions: true` to also fetch `positions.*` nodes alongside `positionKeys`, returning `positions` keyed by pool and `positionsByChain` keyed by chain. Currently this reads only the latest entry per node; history/replay helpers can be added later.
- Materializer: `materializePortfolioPositions({ status, positionNodes, poolPlaces })` turns raw `positions.*` entries (or mock data) into the same `positions`/`positionsByChain` view for UIs that already have the node data.

Example (latest-only):

```js
import { readPortfolioLatest } from '@agoric/portfolio-api';

const snapshot = await readPortfolioLatest({
  readLatest: vstorage.readLatest,
  listChildren: vstorage.keys,
  portfoliosPathPrefix: 'published.ymax0.portfolios',
  portfolioKey: 'portfolio3',
  includePositions: true,
});

console.log(snapshot.flows.flow2.phase); // 'init' until flow node is written
console.log(snapshot.positions.USDN.place.chainName); // 'noble'
console.log(snapshot.positionsByChain.Base.positions.length); // grouped by chain
```
