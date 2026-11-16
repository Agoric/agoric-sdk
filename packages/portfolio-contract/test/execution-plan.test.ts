/** Authenticated observations can arrive after a flow has started. */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { AccountId } from '@agoric/orchestration';
import { makeIssuerKit } from '@agoric/ertp';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import { makeHeapZone } from '@agoric/zone';
import { prepareVowTools } from '@agoric/vow';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import type { FundsFlowPlan } from '@agoric/portfolio-api';
import {
  portfolioObservationsToEIP712,
  ymaxObservationMessageKit,
  type PortfolioObservationsContent,
} from '@agoric/portfolio-api/src/observation-messages.js';
import { Far } from '@endo/far';
import { privateKeyToAccount } from 'viem/accounts';
import { DEFAULT_FLOW_CONFIG } from '@agoric/portfolio-api';
import { executePlan } from '../src/portfolio.flows.ts';
import { mocks, USDC, BLD } from './flow-test-kit.ts';
import { decodeFunctionCall } from './abi-utils.ts';
import type { PortfolioKit } from '../src/portfolio.exo.ts';
import { preparePortfolioKit } from '../src/portfolio.exo.ts';
import { preparePlanner } from '../src/planner.exo.ts';
import { makePortfolioObservationsVerifier } from '../src/observation-verifier.ts';
import { makeOfferArgsShapes } from '../src/type-guards-steps.ts';
import {
  contractsMock,
  evmTrader0PrivateKey,
  evmTrader1PrivateKey,
} from './mocks.ts';

const { brand } = makeIssuerKit('USDC');
const attestor = privateKeyToAccount(evmTrader0PrivateKey);
const stranger = privateKeyToAccount(evmTrader1PrivateKey);
const NOW = 1_700_000_000n;
const ROUTER = '0x1234567890abcdef1234567890abcdef12345678' as const;
const vault = 'ERC4626_morphoGauntletUsdcRwa_Ethereum' as const;

const setup = (sourceAccountId?: AccountId) => {
  const zone = makeHeapZone();
  const vt = prepareVowTools(zone);
  const shapes = makeOfferArgsShapes(brand);
  const makePortfolio = preparePortfolioKit(zone, {
    ...({} as any),
    usdcBrand: brand,
    offerArgsShapes: shapes,
    portfoliosNode: makeFakeStorageKit('published').rootNode,
    marshaller: makeFakeBoard().getReadonlyMarshaller(),
    vowTools: vt,
    contracts: contractsMock,
    verifyPortfolioObservations: makePortfolioObservationsVerifier({
      attestorAddress: attestor.address,
      verifyingContracts: { '1': ROUTER },
      timerService: Far('timer', {
        getCurrentTimestamp: () => harden({ absValue: NOW }),
      }) as any,
    }),
  });
  const kit = makePortfolio({ portfolioId: 12, sourceAccountId });
  kit.manager.setTargetAllocation({ '@Ethereum': 1n });
  const planner = preparePlanner(zone, {
    shapes,
    getPortfolioPlanner: () => kit.planner,
    getPlannerDelegation: () => undefined,
  })();
  return { vt, kit, planner };
};

const sign = async (
  content: PortfolioObservationsContent,
  signer = attestor,
  deadline = NOW + 300n,
) => {
  const data = ymaxObservationMessageKit.getStandaloneOperationData(
    {
      ...portfolioObservationsToEIP712(content),
      nonce: NOW,
      deadline,
    },
    'PortfolioObservations',
    1n,
    ROUTER,
  );
  return harden({ ...data, signature: await signer.signTypedData(data) });
};

for (const flowType of ['rebalance', 'deposit', 'withdraw'] as const) {
  for (const kind of ['shares', 'principal'] as const) {
    for (const minimum of [0n, 1n]) {
      test(`late signed ${kind} evidence binds a ${minimum} minimum for ${flowType}`, async t => {
        const { vt, kit, planner } = setup();
        // Neither the observations nor the plan exists when the flow starts.
        const started = kit.manager.startFlow(
          flowType === 'rebalance'
            ? { type: flowType }
            : { type: flowType, amount: { brand, value: 50n } },
        );
        const src = kind === 'shares' ? vault : 'Aave_Ethereum';
        const plan: FundsFlowPlan = harden({
          flow: [
            {
              src,
              dest: '@Ethereum',
              amount: { brand, value: minimum },
              withdraw:
                kind === 'shares' ? { amountOfShares: 50n } : { max: true },
            },
          ],
        });
        const signed = await sign({
          portfolioId: 12,
          syncState: { policyVersion: 1, rebalanceCount: 0 },
          observations: {
            balances: { '@Ethereum': 0n, [src]: 50n },
            instrumentTvls: {},
            holdings: [
              {
                place: src,
                kind,
                tokenId: (kind === 'shares'
                  ? contractsMock.Ethereum[vault]!
                  : contractsMock.Ethereum.usdc
                ).toLowerCase() as `0x${string}`,
                amount: 50n,
                valueUusd: 50n,
                balanceUsdc: 50n,
              },
              {
                place: '@Ethereum',
                kind: 'token',
                tokenId:
                  contractsMock.Ethereum.usdc.toLowerCase() as `0x${string}`,
                amount: 0n,
                valueUusd: 0n,
                balanceUsdc: 0n,
              },
            ],
          },
        });
        await vt.when(
          planner.resolveObservedPlan(12, started.flowId, plan, signed, 1),
        );
        const resolved = await vt.when(started.stepsP);
        t.assert(!Array.isArray(resolved) && 'plan' in resolved);
        if (Array.isArray(resolved) || !('plan' in resolved)) return;
        t.deepEqual(resolved.plan, plan);
        t.like(resolved.boundSteps?.[0], {
          kind: kind === 'shares' ? 'redeemShares' : 'withdrawMax',
          src,
          ...(kind === 'shares' ? { shares: 50n } : { amount: 50n }),
        });
        t.is(resolved.boundSteps?.[0]?.minimumProceeds ?? 0n, minimum);
      });
    }
  }
}

for (const invalid of ['signature', 'expired', 'portfolio', 'sync'] as const) {
  test(`late evidence rejects ${invalid} without settling or advancing the flow`, async t => {
    const { vt, kit, planner } = setup();
    const started = kit.manager.startFlow({ type: 'rebalance' });
    const signed = await sign(
      {
        portfolioId: invalid === 'portfolio' ? 13 : 12,
        syncState: {
          policyVersion: invalid === 'sync' ? 2 : 1,
          rebalanceCount: 0,
        },
        observations: { balances: {}, instrumentTvls: {} },
      },
      invalid === 'signature' ? stranger : attestor,
      invalid === 'expired' ? NOW - 1n : NOW + 300n,
    );
    await t.throwsAsync(
      vt.when(
        planner.resolveObservedPlan(
          12,
          started.flowId,
          { flow: [] },
          signed,
          1,
        ),
      ),
      {
        message:
          /not signed by the attestor|deadline has passed|another portfolio|sync state does not match/,
      },
    );
    t.notThrows(() => kit.reader.checkVersion(1, 0));
    // A failed observation submission leaves the authorized resolver usable.
    t.notThrows(() => kit.planner.resolveFlowPlan(started.flowId, []));
  });
}

test('late signed share observations drive the remote redemption transaction', async t => {
  const { orch, ctx, offer, txResolver, vowTools } = mocks(
    {},
    {},
    {
      verifyPortfolioObservations: makePortfolioObservationsVerifier({
        attestorAddress: attestor.address,
        verifyingContracts: { '1': ROUTER },
        timerService: Far('timer', {
          getCurrentTimestamp: () => harden({ absValue: NOW }),
        }) as any,
      }),
    },
  );
  const guestKit = await ctx.makePortfolioKit();
  const kit = guestKit as unknown as PortfolioKit;
  kit.manager.setTargetAllocation({ '@Ethereum': 1n });
  const started = kit.manager.startFlow({ type: 'rebalance' });
  const execution = executePlan(
    orch,
    ctx,
    offer.seat,
    {},
    guestKit,
    undefined,
    started,
    DEFAULT_FLOW_CONFIG,
  );
  const plan: FundsFlowPlan = harden({
    flow: [
      {
        src: vault,
        dest: '@Ethereum',
        amount: { brand: USDC, value: 0n },
        fee: { brand: BLD, value: 100n },
        withdraw: { max: true },
      },
    ],
  });
  const signed = await sign({
    portfolioId: 1,
    syncState: { policyVersion: 1, rebalanceCount: 0 },
    observations: {
      balances: { [vault]: 50n, '@Ethereum': 0n },
      instrumentTvls: {},
      holdings: [
        {
          place: vault,
          kind: 'shares',
          tokenId: contractsMock.Ethereum[
            vault
          ]!.toLowerCase() as `0x${string}`,
          amount: 73n,
          valueUusd: 50n,
          balanceUsdc: 50n,
        },
        {
          place: '@Ethereum',
          kind: 'token',
          tokenId: contractsMock.Ethereum.usdc.toLowerCase() as `0x${string}`,
          amount: 0n,
          valueUusd: 0n,
          balanceUsdc: 0n,
        },
      ],
    },
  });
  t.false(offer.log.some(({ _method }) => _method === 'transfer'));
  await vowTools.when(
    kit.planner.resolveObservedFlowPlan(started.flowId, plan, signed, 1, 0),
  );
  await offer.factoryPK.promise;
  await txResolver.drainPending();
  await execution;
  const redemption = offer.log
    .filter(
      ({ _method, opts }) =>
        _method === 'transfer' && typeof opts?.memo === 'string',
    )
    .at(-1)!;
  t.deepEqual(
    decodeFunctionCall(redemption.opts!.memo, [
      'redeem(uint256,address,address)',
    ]).calls.map(call => call.args![0]),
    [73n],
  );
});

for (const origin of ['cosmos', 'evm'] as const) {
  for (const direction of ['deposit', 'withdraw'] as const) {
    for (const kind of ['shares', 'principal'] as const) {
      test(`signed ${origin} owner ${direction} resolves a complete ${kind} plan`, async t => {
        const { vt, kit, planner } = setup(
          origin === 'evm' ? `eip155:1:${stranger.address}` : undefined,
        );
        const amount = { brand, value: 1n };
        const started = kit.manager.startFlow({
          type: direction,
          amount,
          ...(origin === 'evm' &&
            (direction === 'deposit'
              ? { fromChain: 'Ethereum' }
              : { toChain: 'Ethereum' })),
        });
        const src = kind === 'shares' ? vault : 'Aave_Ethereum';
        const redemption = {
          src,
          dest: '@Ethereum',
          amount,
          withdraw: { max: true },
        } as const;
        const funding =
          origin === 'evm'
            ? [{ src: '+Ethereum', dest: '@Ethereum', amount } as const]
            : [
                { src: '<Deposit>', dest: '@agoric', amount } as const,
                { src: '@agoric', dest: '@noble', amount } as const,
                { src: '@noble', dest: '@Ethereum', amount } as const,
              ];
        const payout =
          origin === 'evm'
            ? [{ src: '@Ethereum', dest: '-Ethereum', amount } as const]
            : [
                { src: '@Ethereum', dest: '@agoric', amount } as const,
                { src: '@agoric', dest: '<Cash>', amount } as const,
              ];
        const plan: FundsFlowPlan = harden({
          flow:
            direction === 'deposit'
              ? [...funding, redemption]
              : [redemption, ...payout],
        });
        const places = [
          ...new Set(plan.flow.flatMap(move => [move.src, move.dest])),
        ].filter(place => place.startsWith('@')) as (
          | '@Ethereum'
          | '@agoric'
          | '@noble'
        )[];
        const signed = await sign({
          portfolioId: 12,
          syncState: { policyVersion: 1, rebalanceCount: 0 },
          observations: {
            balances: {
              [src]: 50n,
              ...Object.fromEntries(places.map(place => [place, 0n])),
            },
            instrumentTvls: {},
            holdings: [
              {
                place: src,
                kind,
                tokenId: (kind === 'shares'
                  ? contractsMock.Ethereum[vault]!
                  : contractsMock.Ethereum.usdc
                ).toLowerCase() as `0x${string}`,
                amount: 50n,
                valueUusd: 50n,
                balanceUsdc: 50n,
              },
              ...places.map(place =>
                place === '@Ethereum'
                  ? {
                      place,
                      kind: 'token' as const,
                      tokenId:
                        contractsMock.Ethereum.usdc.toLowerCase() as `0x${string}`,
                      amount: 0n,
                      valueUusd: 0n,
                      balanceUsdc: 0n,
                    }
                  : {
                      place,
                      kind: 'token' as const,
                      tokenId: 'uusdc',
                      amount: 0n,
                      valueUusd: 0n,
                      balanceUsdc: 0n,
                    },
              ),
            ],
          },
        });
        if (kind === 'shares') {
          const excessive: FundsFlowPlan = harden({
            flow: plan.flow.map(move =>
              move === redemption
                ? { ...move, withdraw: { amountOfShares: 51n } }
                : move,
            ),
          });
          await t.throwsAsync(
            vt.when(
              planner.resolveObservedPlan(
                12,
                started.flowId,
                excessive,
                signed,
                1,
              ),
            ),
            { message: /requested shares.*exceed observed shares/ },
          );
        }
        await vt.when(
          planner.resolveObservedPlan(12, started.flowId, plan, signed, 1),
        );
        const resolved = await vt.when(started.stepsP);
        if (Array.isArray(resolved) || !('plan' in resolved)) {
          t.fail('expected execution envelope');
          return;
        }
        t.deepEqual(resolved.plan, plan);
        const index = direction === 'deposit' ? funding.length : 0;
        t.deepEqual(Object.keys(resolved.boundSteps!), [String(index)]);
        t.like(resolved.boundSteps![index], {
          kind: kind === 'shares' ? 'redeemShares' : 'withdrawMax',
          src,
          minimumProceeds: 1n,
        });
      });
    }
  }
}

test('signed owner deposit cannot add a position outside the target allocation', async t => {
  const { vt, kit, planner } = setup();
  const amount = { brand, value: 1n };
  const started = kit.manager.startFlow({ type: 'deposit', amount });
  const plan: FundsFlowPlan = harden({
    flow: [
      { src: '<Deposit>', dest: '@agoric', amount },
      { src: '@agoric', dest: '@noble', amount },
      { src: '@noble', dest: 'USDN', amount },
    ],
  });
  const signed = await sign({
    portfolioId: 12,
    syncState: { policyVersion: 1, rebalanceCount: 0 },
    observations: {
      balances: { '@agoric': 0n, '@noble': 0n, USDN: 0n },
      instrumentTvls: {},
    },
  });
  await t.throwsAsync(
    vt.when(planner.resolveObservedPlan(12, started.flowId, plan, signed, 1)),
    { message: /plan cannot add positions/ },
  );
  t.notThrows(() => kit.reader.checkVersion(1, 0));
});

test('signed owner withdrawal cannot introduce deposit endpoints', async t => {
  const { vt, kit, planner } = setup();
  const amount = { brand, value: 1n };
  const started = kit.manager.startFlow({ type: 'withdraw', amount });
  const plan: FundsFlowPlan = harden({
    flow: [{ src: '<Deposit>', dest: '@agoric', amount }],
  });
  const signed = await sign({
    portfolioId: 12,
    syncState: { policyVersion: 1, rebalanceCount: 0 },
    observations: { balances: { '@agoric': 0n }, instrumentTvls: {} },
  });
  await t.throwsAsync(
    vt.when(planner.resolveObservedPlan(12, started.flowId, plan, signed, 1)),
    { message: /not allowed in.*withdraw.*flow/ },
  );
  t.notThrows(() => kit.reader.checkVersion(1, 0));
});

test('signed owner withdrawal redeems principal and transfers proceeds to the owner', async t => {
  const { orch, ctx, offer, txResolver, vowTools } = mocks(
    {},
    {},
    {
      verifyPortfolioObservations: makePortfolioObservationsVerifier({
        attestorAddress: attestor.address,
        verifyingContracts: { '1': ROUTER },
        timerService: Far('timer', {
          getCurrentTimestamp: () => harden({ absValue: NOW }),
        }) as any,
      }),
    },
  );
  const guestKit = await ctx.makePortfolioKit({
    sourceAccountId: `eip155:1:${stranger.address}`,
  });
  const kit = guestKit as unknown as PortfolioKit;
  kit.manager.setTargetAllocation({ '@Ethereum': 1n });
  const amount = { brand: USDC, value: 1n };
  const fee = { brand: BLD, value: 100n };
  const started = kit.manager.startFlow({
    type: 'withdraw',
    amount,
    toChain: 'Ethereum',
  });
  const execution = executePlan(
    orch,
    ctx,
    offer.seat,
    {},
    guestKit,
    undefined,
    started,
    DEFAULT_FLOW_CONFIG,
  );
  const plan: FundsFlowPlan = harden({
    flow: [
      {
        src: 'Aave_Ethereum',
        dest: '@Ethereum',
        amount,
        fee,
        withdraw: { max: true },
      },
      { src: '@Ethereum', dest: '-Ethereum', amount, fee },
    ],
  });
  const signed = await sign({
    portfolioId: 1,
    syncState: { policyVersion: 1, rebalanceCount: 0 },
    observations: {
      balances: { Aave_Ethereum: 73n, '@Ethereum': 0n },
      instrumentTvls: {},
      holdings: [
        {
          place: 'Aave_Ethereum',
          kind: 'principal',
          tokenId: contractsMock.Ethereum.usdc.toLowerCase() as `0x${string}`,
          amount: 73n,
          valueUusd: 73n,
          balanceUsdc: 73n,
        },
        {
          place: '@Ethereum',
          kind: 'token',
          tokenId: contractsMock.Ethereum.usdc.toLowerCase() as `0x${string}`,
          amount: 0n,
          valueUusd: 0n,
          balanceUsdc: 0n,
        },
      ],
    },
  });
  await vowTools.when(
    kit.planner.resolveObservedFlowPlan(started.flowId, plan, signed, 1, 0),
  );
  await offer.factoryPK.promise;
  await txResolver.drainPending();
  await execution;
  const payout = offer.log
    .filter(
      ({ _method, opts }) =>
        _method === 'transfer' && typeof opts?.memo === 'string',
    )
    .at(-1)!;
  const { calls } = decodeFunctionCall(payout.opts!.memo, [
    'transfer(address,uint256)',
  ]);
  t.is(calls[0].functionName, 'transfer');
  t.is(String(calls[0].args![0]).toLowerCase(), stranger.address.toLowerCase());
  t.is(calls[0].args![1], 1n);
});
