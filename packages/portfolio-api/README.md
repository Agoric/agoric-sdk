# Portfolio management API

API shared between on-chain contract and external clients

## Vstorage schema and readers

Portfolio vstorage paths, shapes, and helpers now live here (see `src/vstorage-schema.ts`):

- Path builders and parsers: `makePortfolioPath`, `makePositionPath`, `makeFlowPath`, `portfolioIdFromKey`, etc.
- Shape guards: `PortfolioStatusShapeExt`, `PositionStatusShape`, `FlowStatusShape`, `FlowStepsShape`.
- Pool mapping: `PoolPlaces` / `BeefyPoolPlaces` and allocation shapes.
- Derived reader: `readPortfolioLatest({ readLatest, listChildren, portfoliosPathPrefix, portfolioKey })` returns the latest portfolio state plus a joined view of `flowsRunning` and any `flows.flowN` nodes. It marks flows as `phase: 'init'` when they appear in `flowsRunning` but no flow node exists yet (covers the “flowsRunning written first” pattern). Currently this reads only the latest entry per node; history/replay helpers can be added later.

Example (latest-only):

```js
import { readPortfolioLatest } from '@agoric/portfolio-api';

const snapshot = await readPortfolioLatest({
  readLatest: vstorage.readLatest,
  listChildren: vstorage.keys,
  portfoliosPathPrefix: 'published.ymax0.portfolios',
  portfolioKey: 'portfolio3',
});

console.log(snapshot.flows.flow2.phase); // 'init' until flow node is written
```
