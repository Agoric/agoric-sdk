import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeHeapZone } from '@agoric/zone';
import { preparePlanner } from '../src/planner.exo.ts';
import { makeIssuerKit } from '@agoric/ertp';
import {
  makeOfferArgsShapes,
  type MovementDesc,
} from '../src/type-guards-steps.ts';
import { prepareVowTools } from '@agoric/vow';
import type { ZCF } from '@agoric/zoe';

const { brand: USDC } = makeIssuerKit('USDC');

test('planner exo submit method', async t => {
  const zone = makeHeapZone();

  const vt = prepareVowTools(zone);
  // Mock dependencies with minimal implementation
  const mockRebalance = (seat, offerArgs, kit) => {
    t.log('rebalance called with', { seat, offerArgs, kit });
    return vt.asVow(() => undefined);
  };

  const mockZcf = {
    makeEmptySeatKit: () => ({
      zcfSeat: null as any,
    }),
  } as ZCF;

  const mockGetPortfolio = id => null as any;

  const shapes = makeOfferArgsShapes(USDC);
  // Create planner exo
  const makePlanner = preparePlanner(zone, {
    rebalance: mockRebalance,
    zcf: mockZcf,
    getPortfolio: mockGetPortfolio,
    shapes,
  });

  const planner = makePlanner();

  // Test submit method
  const portfolioId = 0;
  const plan: MovementDesc[] = [
    { src: '<Deposit>', dest: '@agoric', amount: { brand: USDC, value: 100n } },
  ];

  const result = await vt.when(planner.submit(portfolioId, plan));

  t.is(result, undefined);
});
