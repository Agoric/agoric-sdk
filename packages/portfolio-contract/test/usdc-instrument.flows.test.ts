import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath, type NatAmount } from '@agoric/ertp';
import type { AccountId } from '@agoric/orchestration';
import { openPortfolio } from '../src/portfolio.flows.ts';
import { decodeCreateAndDepositPayload } from './abi-utils.ts';
import { BLD, USDC, makePermitDetails, mocks } from './flow-test-kit.ts';
import { makeStorageTools } from './supports.ts';

/* eslint-disable no-underscore-dangle */
/* We use _method to get it to sort before other properties. */

const trackOpts = {
  features: { useProgressTracker: true },
} as const;

test('openPortfolio and deposit to USDC instrument / cash', async t => {
  const { orch, ctx, offer, storage, txResolver } = mocks();
  const { seat } = offer;
  const { getPortfolioStatus } = makeStorageTools(storage);

  const userRequest = {
    depositChain: 'Base',
    allocations: { '@Base': 100n },
    amount: 3_000n * 1_000_000n,
  } as const;

  const openPermit = makePermitDetails({
    chain: userRequest.depositChain,
    amount: userRequest.amount,
  });
  const sourceAccountId =
    `eip155:${openPermit.chainId}:${openPermit.permit2Payload.owner.toLowerCase()}` as AccountId;
  const kit = await ctx.makePortfolioKit({ sourceAccountId });
  const portfolioId = kit.reader.getPortfolioId();

  const openAmount = AmountMath.make(USDC, userRequest.amount);

  const createAndDepositP = openPortfolio(
    orch,
    ctx,
    seat,
    { targetAllocation: userRequest.allocations },
    kit,
    trackOpts,
    {
      fromChain: userRequest.depositChain,
      permitDetails: openPermit,
      amount: openAmount,
    },
  );

  const fee = AmountMath.make(BLD, 100n); // axelar GMP fee

  const resolveDryPowderPlan = async (
    amount: NatAmount,
    flowNum = 1,
    flowKey = `flow${flowNum}` as const,
    fromChain = 'Base' as const,
  ) => {
    const { flowsRunning = {} } = await getPortfolioStatus(portfolioId);
    t.deepEqual(Object.keys(flowsRunning), [flowKey]);
    const { [flowKey]: detail } = flowsRunning;
    t.like(detail, { type: 'deposit', fromChain });
    kit.planner.resolveFlowPlan(flowNum, [
      { src: `+${fromChain}`, dest: `@${fromChain}`, amount, fee },
    ]);
    await txResolver.drainPending();
  };

  await Promise.all([
    createAndDepositP,
    resolveDryPowderPlan(openAmount),
    offer.factoryPK.promise,
  ]);

  const statusAfterOpen = await getPortfolioStatus(portfolioId);
  t.like(
    statusAfterOpen,
    {
      flowsRunning: {},
      positionKeys: [],
      targetAllocation: userRequest.allocations,
    },
    'cash allocation; no yield positions',
  );
  t.log(statusAfterOpen.accountIdByChain);
  t.truthy(statusAfterOpen.accountIdByChain?.Base, 'Base account recorded');

  t.log(offer.log.map(e => e._method).join(', '));
  const gmpRaw = offer.log.find(
    e =>
      e._method === 'transfer' &&
      (e as any).address.chainId === 'axelar-dojo-1',
  );
  t.truthy(gmpRaw, 'makes GMP call to Axelar');
  const gmpDecoded = decodeCreateAndDepositPayload(gmpRaw!.opts!.memo);

  const likeLogged = (l, e, a) => {
    t.like(e, a);
    t.log(l, a);
  };

  likeLogged('GMP permit transfer', gmpDecoded, {
    lcaOwner: 'agoric11028',
    permit: { permitted: { amount: userRequest.amount } },
  });
});
