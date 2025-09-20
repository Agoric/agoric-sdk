import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeIssuerKit } from '@agoric/ertp';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import { prepareVowTools } from '@agoric/vow';
import type { ZCF } from '@agoric/zoe';
import { makeHeapZone } from '@agoric/zone';
import { preparePlanner } from '../src/planner.exo.ts';
import { preparePortfolioKit } from '../src/portfolio.exo.ts';
import {
  makeOfferArgsShapes,
  type MovementDesc,
} from '../src/type-guards-steps.ts';
import type { StatusFor } from '../src/type-guards.ts';

const { brand: USDC } = makeIssuerKit('USDC');

test('planner exo submit method', async t => {
  const zone = makeHeapZone();

  const vt = prepareVowTools(zone);
  // Mock dependencies with minimal implementation
  const mockRebalance = (_seat, offerArgs, _kit) => {
    t.log('rebalance called with', offerArgs);
    return vt.asVow(() => undefined);
  };

  const mockZcf = {
    makeEmptySeatKit: () => ({
      zcfSeat: null as any,
    }),
  } as ZCF;

  const board = makeFakeBoard();
  const storage = makeFakeStorageKit('published', { sequence: true });
  const readPublished = async path => {
    await eventLoopIteration();
    return marshaller.fromCapData(
      JSON.parse(storage.getValues(`published.${path}`).at(-1) || ''),
    ) as StatusFor['portfolio'];
  };
  const marshaller = board.getReadonlyMarshaller();
  const makePortfolio = preparePortfolioKit(zone, {
    usdcBrand: USDC,
    marshaller,
    portfoliosNode: storage.rootNode.makeChildNode('portfolios'),
    ...({} as any),
  });
  const aPortfolio = makePortfolio({ portfolioId: 1 });
  const mockGetPortfolio = _id => aPortfolio;

  // Create planner exo
  const makePlanner = preparePlanner(zone, {
    rebalance: mockRebalance,
    zcf: mockZcf,
    getPortfolio: mockGetPortfolio,
    shapes: makeOfferArgsShapes(USDC),
    vowTools: vt,
  });

  const planner = makePlanner();

  // Test submit method
  aPortfolio.manager.setTargetAllocation({ USDN: 100n });

  {
    const { policyVersion, rebalanceCount } = await readPublished(
      'portfolios.portfolio1',
    );
    t.log('targetAllocation', aPortfolio.reader.getTargetAllocation(), {
      policyVersion,
      rebalanceCount,
    });
    t.deepEqual(
      { policyVersion, rebalanceCount },
      { policyVersion: 1, rebalanceCount: 0 },
      'version 1 after setTargetAllocation',
    );
  }

  const portfolioId = 0;
  const amount = { brand: USDC, value: 100n };
  const plan: MovementDesc[] = [
    { src: '+agoric', dest: '@agoric', amount },
    { src: '@agoric', dest: '@noble', amount },
    { src: '@noble', dest: 'USDN', amount },
  ];

  await t.throwsAsync(vt.when(planner.submit(portfolioId, plan, 0, 0)), {
    message: /expected policyVersion 1; got 0/,
  });

  await vt.when(planner.submit(portfolioId, plan, 1, 0));

  {
    const { policyVersion, rebalanceCount } = await readPublished(
      'portfolios.portfolio1',
    );
    t.log({ policyVersion, rebalanceCount });
    t.deepEqual(
      { policyVersion, rebalanceCount },
      { policyVersion: 1, rebalanceCount: 1 },
      'rebalanceCount 1 after .submit(plan, ...)',
    );
  }

  const mockRebalancePlan = [];
  await t.notThrowsAsync(
    vt.when(planner.submit(portfolioId, mockRebalancePlan, 1, 1)),
    'planner may rebalance >1 times at same policyVersion',
  );
});
