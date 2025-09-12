import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeHeapZone } from '@agoric/zone';
import { makeIssuerKit } from '@agoric/ertp';
import { prepareVowTools } from '@agoric/vow';
import type { ZCF } from '@agoric/zoe';
import {
  makeOfferArgsShapes,
  type MovementDesc,
} from '../src/type-guards-steps.ts';
import { prepareVowTools } from '@agoric/vow';
import type { ZCF } from '@agoric/zoe';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { preparePortfolioKit } from '../src/portfolio.exo.ts';
import { preparePlanner } from '../src/planner.exo.ts';

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
    );
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
    const { policyVersion, policyVersionAck } = await readPublished(
      'portfolios.portfolio1',
    );
    t.log('targetAllocation', aPortfolio.reader.getTargetAllocation(), {
      policyVersion,
      policyVersionAck,
    });
    t.deepEqual(
      { policyVersion, policyVersionAck },
      { policyVersion: 1, policyVersionAck: 0 },
    );
  }

  const portfolioId = 0;
  const amount = { brand: USDC, value: 100n };
  const plan: MovementDesc[] = [
    { src: '+agoric', dest: '@agoric', amount },
    { src: '@agoric', dest: '@noble', amount },
    { src: '@noble', dest: 'USDN', amount },
  ];

  t.throwsAsync(vt.when(planner.submit(portfolioId, plan, 0)), {
    message: /expected policyVersion 1; got 0/,
  });

  await vt.when(planner.submit(portfolioId, plan, 1));

  {
    const { policyVersion, policyVersionAck } = await readPublished(
      'portfolios.portfolio1',
    );
    t.log({ policyVersion, policyVersionAck });
    t.deepEqual(
      { policyVersion, policyVersionAck },
      { policyVersion: 1, policyVersionAck: 1 },
    );
  }
});
