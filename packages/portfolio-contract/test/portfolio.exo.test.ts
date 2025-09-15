/** @file tests for PortfolioKit exo */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { makeHeapZone } from '@agoric/zone';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import type { StorageNode } from '@agoric/internal/src/lib-chainStorage.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { preparePortfolioKit } from '../src/portfolio.exo.ts';
import { gmpAddresses } from './mocks.ts';
import type { StatusFor } from '../src/type-guards.ts';

const { brand: USDC } = makeIssuerKit('USDC');

test('portfolio exo caches storage nodes', async t => {
  const zone = makeHeapZone();
  const board = makeFakeBoard();
  const marshaller = board.getReadonlyMarshaller();

  // count each time we makeChildNode(...)
  let nodeQty = 0;
  const makeMockNode = (here: string) => {
    nodeQty += 1;
    t.log(nodeQty, here);
    const node = harden({
      makeChildNode: (name: string) => makeMockNode(`${here}.${name}`),
      setValue: _x => {},
    }) as unknown as StorageNode;
    return node;
  };

  const makePortfolioKit = preparePortfolioKit(zone, {
    portfoliosNode: makeMockNode('published.ymax0.portfolios'),
    marshaller,
    usdcBrand: USDC,
    // rest are not used
    zcf: null as any,
    axelarIds: null as any,
    gmpAddresses,
    vowTools: null as any,
    timer: null as any,
    chainHubTools: null as any,
    rebalance: null as any,
    parseInboundTransfer: null as any,
    proposalShapes: null as any,
    offerArgsShapes: null as any,
  });
  await eventLoopIteration(); // wait for vstorage writes to settle
  t.is(nodeQty, 1, '1 root node for all portfolios');

  const { reporter, manager } = makePortfolioKit({ portfolioId: 123 });
  reporter.publishStatus();
  reporter.publishStatus();
  await eventLoopIteration();
  t.is(nodeQty, 2, 'root + portfolio');

  reporter.allocateFlowId();
  const amount = AmountMath.make(USDC, 123n);
  const flowStatus: StatusFor['flow'] = {
    step: 1,
    amount,
    src: '@noble',
    dest: 'USDN',
    how: 'USDN',
  };
  reporter.publishFlowStatus(1, flowStatus);
  reporter.publishFlowStatus(1, { ...flowStatus, step: 2 });
  await eventLoopIteration();
  t.is(nodeQty, 4, 'root, portfolio, flows, flow1');

  const acctId = 'cosmos:noble-1:noble1xyz';
  const pos = manager.providePosition('USDN', 'USDN', acctId);
  pos.publishStatus();
  pos.publishStatus();
  await eventLoopIteration();
  t.is(nodeQty, 6, 'root, portfolio, flows, flow1, positions, position1');
});
