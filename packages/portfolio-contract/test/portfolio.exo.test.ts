/** @file tests for PortfolioKit exo */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeIssuerKit } from '@agoric/ertp';
import type { StorageNode } from '@agoric/internal/src/lib-chainStorage.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import { prepareVowTools } from '@agoric/vow';
import { makeHeapZone } from '@agoric/zone';
import { preparePortfolioKit } from '../src/portfolio.exo.ts';
import type { StatusFor } from '../src/type-guards.ts';
import { gmpAddresses } from './mocks.ts';

const { brand: USDC } = makeIssuerKit('USDC');

const makeTestSetup = () => {
  const zone = makeHeapZone();
  const board = makeFakeBoard();
  const marshaller = board.getReadonlyMarshaller();
  const vowTools = prepareVowTools(zone);

  const makeMockNode = (here: string) => {
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
    vowTools,
    // rest are not used for this test
    zcf: null as any,
    axelarIds: null as any,
    gmpAddresses,
    chainHubTools: null as any,
    rebalance: null as any,
    parseInboundTransfer: null as any,
    proposalShapes: null as any,
    offerArgsShapes: null as any,
  });

  return { makePortfolioKit, vowTools };
};

test('portfolio exo caches storage nodes', async t => {
  const zone = makeHeapZone();
  const board = makeFakeBoard();
  const marshaller = board.getReadonlyMarshaller();
  const vowTools = prepareVowTools(zone);

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
    vowTools,
    // rest are not used
    zcf: null as any,
    axelarIds: null as any,
    gmpAddresses,
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
  const flowStatus: StatusFor['flow'] = { state: 'run', step: 1, how: 'USDN' };
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

test('releaseAccount clears pending account reservation', async t => {
  const { makePortfolioKit, vowTools } = makeTestSetup();
  const { manager } = makePortfolioKit({ portfolioId: 456 });

  // First call to reserveAccount should return undefined and create pending entry
  const result1 = manager.reserveAccount('Arbitrum');
  t.is(result1, undefined, 'first reserveAccount returns undefined');

  // Second call should return the pending vow
  const result2 = manager.reserveAccount('Arbitrum');
  t.truthy(result2, 'second reserveAccount returns vow');
  t.not(result2, result1, 'returns the pending vow');

  // Release the account with a reason
  const reason = new Error('Account creation failed');
  manager.releaseAccount('Arbitrum', reason);

  // After release, reserveAccount should work again (return undefined)
  const result3 = manager.reserveAccount('Arbitrum');
  t.is(result3, undefined, 'reserveAccount works again after release');

  // Verify the released vow was rejected, but handle it properly
  const rejectionPromise = vowTools.when(result2);
  await t.throwsAsync(
    rejectionPromise,
    { is: reason },
    'released vow was rejected with the provided reason',
  );
});

test('releaseAccount handles non-existent pending account gracefully', async t => {
  const { makePortfolioKit } = makeTestSetup();
  const { manager } = makePortfolioKit({ portfolioId: 789 });

  // Try to release an account that was never reserved
  t.notThrows(() => {
    manager.releaseAccount('Ethereum', new Error('Some reason'));
  }, 'releaseAccount handles non-existent pending gracefully');

  // Verify reserveAccount still works normally
  const result = manager.reserveAccount('Ethereum');
  t.is(result, undefined, 'reserveAccount works normally after failed release');
});

test('critical section pattern: reserve -> try resolve -> catch release', async t => {
  const { makePortfolioKit, vowTools } = makeTestSetup();
  const { manager } = makePortfolioKit({ portfolioId: 999 });
  const chainName = 'Optimism';

  // First reservation - returns undefined, creates pending entry
  const reserved1 = manager.reserveAccount(chainName);
  t.is(reserved1, undefined, 'first reservation returns undefined');

  // Get the vow that will be rejected
  const pending = manager.reserveAccount(chainName);
  t.truthy(pending, 'second call returns pending vow');

  // Release the account with a reason (simulating failed creation)
  const reason = new Error('Insufficient funds for account creation');
  manager.releaseAccount(chainName, reason);

  // Handle the rejection properly
  await t.throwsAsync(
    vowTools.when(pending),
    { is: reason },
    'pending vow was rejected with expected reason',
  );

  // Second attempt can proceed (not stuck in pending state)
  const reserved2 = manager.reserveAccount(chainName);
  t.is(reserved2, undefined, 'second attempt gets fresh start');
});
