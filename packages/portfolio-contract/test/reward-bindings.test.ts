/** @file Binding reward claim and swap steps to signed evidence. */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import type {
  FundsFlowPlan,
  MerklClaimEvidence,
  MovementDesc,
  OneInchSwapInstructions,
  PlanObservations,
  TypedHoldingDetail,
} from '@agoric/portfolio-api';
import type { AxelarChain } from '@agoric/portfolio-api/src/constants.js';
import {
  bindRewardClaim,
  bindRewardSwap,
  getProtectedSwapTokens,
  vetRewardSwapBudgets,
  type ClaimBoundStep,
  type GetEvmContracts,
  type RewardBoundStep,
} from '../src/reward-bindings.ts';
import { contractsMock } from './mocks.ts';

const { brand: USDC } = makeIssuerKit('USDC');
const usdc = (value: bigint) => AmountMath.make(USDC, value);
const getEvmContracts: GetEvmContracts = chain => contractsMock[chain];

const eth = contractsMock.Ethereum;
const REWARD = '0x00000000000000000000000000000000000000aa' as const;
const OTHER_REWARD = '0x00000000000000000000000000000000000000bb' as const;
const NOW = 1_000_000n;

const observations = (
  extra: Partial<PlanObservations> = {},
): PlanObservations => harden({ balances: {}, instrumentTvls: {}, ...extra });

const merklClaim: MerklClaimEvidence = harden({
  accountPlace: '@Ethereum',
  distributor: eth.merkleDistributor!.toLowerCase() as `0x${string}`,
  tokenId: REWARD,
  cumulativeAmount: 3_000n,
  claimedAmount: 1_000n,
  proofs: [
    '0x1111111111111111111111111111111111111111111111111111111111111111',
  ],
});

const swapInstructions: OneInchSwapInstructions = harden({
  accountPlace: '@Ethereum',
  tokenIn: REWARD,
  tokenOut: eth.usdc,
  amountIn: 2_000n,
  quotedAmountOut: 3_000_000n,
  minAmountOut: 2_940_000n,
  slippageBps: 200,
  expiresAt: NOW + 60n,
  flags: 0n,
  executor: '0x2222222222222222222222222222222222222222',
  srcReceiver: '0x3333333333333333333333333333333333333333',
  data: '0xdeadbeef',
  calldataSuffix: '0x1a2b3c4d',
});

const claimMove = (src: string, dest = src): MovementDesc =>
  harden({ src, dest, amount: usdc(0n) }) as MovementDesc;
const swapMove = (amount = swapInstructions.minAmountOut) =>
  harden({
    src: '@Ethereum',
    dest: '@Ethereum',
    amount: usdc(amount),
  }) as MovementDesc;

test('Aave and Compound claims bind to their instrument and configuration', t => {
  const obs = observations({
    aaveClaims: [
      { instrumentId: 'Aave_Ethereum', tokenId: REWARD, expectedAmount: 5n },
    ],
    compoundClaims: [
      {
        instrumentId: 'Compound_Ethereum',
        tokenId: REWARD,
        expectedAmount: 7n,
      },
    ],
  });
  t.deepEqual(
    bindRewardClaim(
      claimMove('Aave_Ethereum', '@Ethereum'),
      { protocol: 'aave', index: 0 },
      obs,
      getEvmContracts,
    ),
    {
      kind: 'claimRewards',
      protocol: 'aave',
      src: 'Aave_Ethereum',
      account: '@Ethereum',
      controller: eth.aaveRewardsController,
      asset: eth.aaveUSDC,
      tokenId: REWARD,
      expectedAmount: 5n,
    },
  );
  t.deepEqual(
    bindRewardClaim(
      claimMove('Compound_Ethereum', '@Ethereum'),
      { protocol: 'compound', index: 0 },
      obs,
      getEvmContracts,
    ),
    {
      kind: 'claimRewards',
      protocol: 'compound',
      src: 'Compound_Ethereum',
      account: '@Ethereum',
      controller: eth.compoundRewardsController,
      comet: eth.compound,
      tokenId: REWARD,
      expectedAmount: 7n,
    },
  );

  const bad: Array<[string, MovementDesc, number, RegExp, GetEvmContracts?]> = [
    [
      'other instrument',
      claimMove('Aave_Arbitrum', '@Arbitrum'),
      0,
      /evidence is for "Aave_Ethereum", not "Aave_Arbitrum"/,
    ],
    [
      'account destination on another chain',
      claimMove('Aave_Ethereum', '@Base'),
      0,
      /must go to "@Ethereum", not "@Base"/,
    ],
    [
      'nonzero amount',
      { ...claimMove('Aave_Ethereum', '@Ethereum'), amount: usdc(1n) },
      0,
      /claim step amount must be zero/,
    ],
    [
      'missing evidence',
      claimMove('Aave_Ethereum', '@Ethereum'),
      1,
      /no "aaveClaims" evidence at index 1/,
    ],
    [
      'fractional index',
      claimMove('Aave_Ethereum', '@Ethereum'),
      0.5,
      /no "aaveClaims" evidence at index 0.5/,
    ],
    [
      'missing configuration',
      claimMove('Aave_Ethereum', '@Ethereum'),
      0,
      /Aave rewards not configured for "Ethereum"/,
      () => ({ ...eth, aaveRewardsController: undefined }),
    ],
  ];
  for (const [name, move, index, message, contracts] of bad) {
    t.throws(
      () =>
        bindRewardClaim(
          move,
          { protocol: 'aave', index },
          obs,
          contracts ?? getEvmContracts,
        ),
      { message },
      name,
    );
  }
  t.throws(
    () =>
      bindRewardClaim(
        claimMove('Aave_Ethereum', '@Ethereum'),
        { protocol: 'compound', index: 0 },
        observations({
          compoundClaims: [
            {
              instrumentId: 'Aave_Ethereum',
              tokenId: REWARD,
              expectedAmount: 1n,
            },
          ],
        }),
        getEvmContracts,
      ),
    { message: /requires a "Compound" instrument, not "Aave_Ethereum"/ },
  );
});

test('Merkl claims are account-scoped, expecting their increment', t => {
  const obs = observations({ merklClaims: [merklClaim] });
  t.deepEqual(
    bindRewardClaim(
      claimMove('@Ethereum'),
      { protocol: 'merkl', index: 0 },
      obs,
      getEvmContracts,
    ),
    {
      kind: 'claimRewards',
      protocol: 'merkl',
      account: '@Ethereum',
      // configured, rather than signed, spelling
      distributor: eth.merkleDistributor!,
      tokenId: REWARD,
      cumulativeAmount: 3_000n,
      proofs: merklClaim.proofs,
      expectedAmount: 2_000n,
    },
    'no instrument or claimable holding is needed',
  );

  const bad: Array<[string, MovementDesc, PlanObservations, RegExp]> = [
    [
      'from an instrument',
      claimMove('ERC4626_vaultU2_Ethereum', '@Ethereum'),
      obs,
      /invalid EVM account place "ERC4626_vaultU2_Ethereum"/,
    ],
    [
      'for another account',
      claimMove('@Base'),
      obs,
      /Merkl claim for "@Ethereum" must stay at that account/,
    ],
    [
      'unconfigured distributor',
      claimMove('@Ethereum'),
      observations({
        merklClaims: [
          {
            ...merklClaim,
            distributor: '0x0000000000000000000000000000000000000001',
          },
        ],
      }),
      /distributor .* is not configured for "Ethereum"/,
    ],
    [
      'negative increment',
      claimMove('@Ethereum'),
      observations({
        merklClaims: [{ ...merklClaim, claimedAmount: 3_001n }],
      }),
      /claimedAmount "\[3001n\]" exceeds cumulativeAmount/,
    ],
    [
      'chain without a distributor',
      claimMove('@Avalanche'),
      observations({
        merklClaims: [{ ...merklClaim, accountPlace: '@Avalanche' }],
      }),
      /Merkl distributor not configured for "Avalanche"/,
    ],
  ];
  for (const [name, move, specimen, message] of bad) {
    t.throws(
      () =>
        bindRewardClaim(
          move,
          { protocol: 'merkl', index: 0 },
          specimen,
          getEvmContracts,
        ),
      { message },
      name,
    );
  }
});

test('1inch swaps bind to configured USDC output and minimums', t => {
  const obs = observations({ oneInchSwaps: [swapInstructions] });
  const bind = (
    instructions: Partial<OneInchSwapInstructions> = {},
    move = swapMove(instructions.minAmountOut),
    now = NOW,
  ) =>
    bindRewardSwap(
      move,
      { provider: '1inch', index: 0 },
      observations({
        oneInchSwaps: [{ ...swapInstructions, ...instructions }],
      }),
      getEvmContracts,
      now,
    );
  t.deepEqual(
    bindRewardSwap(
      swapMove(),
      { provider: '1inch', index: 0 },
      obs,
      getEvmContracts,
      NOW,
    ),
    {
      kind: 'swap',
      provider: '1inch',
      account: '@Ethereum',
      router: eth.oneInchRouter!,
      tokenIn: REWARD,
      tokenOut: eth.usdc,
      amountIn: 2_000n,
      quotedAmountOut: 3_000_000n,
      minAmountOut: 2_940_000n,
      executor: swapInstructions.executor,
      srcReceiver: swapInstructions.srcReceiver,
      data: swapInstructions.data,
      calldataSuffix: swapInstructions.calldataSuffix,
    },
  );
  t.notThrows(
    () => bind({ tokenOut: eth.usdc.toLowerCase() as `0x${string}` }),
    'addresses compare regardless of case',
  );
  t.notThrows(
    () => bind({ slippageBps: 50, minAmountOut: 2_985_000n }),
    'a stricter slippage is allowed',
  );

  const bad: Array<
    [string, Partial<OneInchSwapInstructions>, RegExp, MovementDesc?, bigint?]
  > = [
    [
      'other output token',
      { tokenOut: OTHER_REWARD },
      /tokenOut .* is not the configured USDC of "Ethereum"/,
    ],
    ['nonzero flags', { flags: 1n }, /swap flags must be 0, not "\[1n\]"/],
    [
      'excessive slippage',
      { slippageBps: 201, minAmountOut: 2_000_000n },
      /slippageBps 201 exceeds 200/,
    ],
    [
      'minimum below slippage',
      { minAmountOut: 2_939_999n },
      /minAmountOut "\[2939999n\]" is below "\[2940000n\]"/,
    ],
    ['expired', {}, /swap instructions expired/, undefined, NOW + 60n],
    [
      'amount other than the minimum',
      {},
      /swap step amount "\[2939999n\]" must be its minAmountOut/,
      swapMove(2_939_999n),
    ],
    ['no input', { amountIn: 0n }, /swap amountIn must be positive/],
    [
      'no output',
      { quotedAmountOut: 0n, minAmountOut: 0n },
      /swap minAmountOut must be positive/,
    ],
    [
      'other account',
      { accountPlace: '@Base' },
      /swap at "@Base" must stay at that account/,
    ],
    [
      'moving between accounts',
      {},
      /must stay at that account/,
      { ...swapMove(), dest: '@Base' } as MovementDesc,
    ],
  ];
  for (const [name, change, message, move, now] of bad) {
    t.throws(() => bind(change, move, now), { message }, name);
  }
  t.throws(
    () =>
      bindRewardSwap(
        swapMove(),
        { provider: '0x' as any, index: 0 },
        obs,
        getEvmContracts,
        NOW,
      ),
    { message: /unsupported swap provider "0x"/ },
  );
});

test('signed swaps cannot spend principal or cash tokens', t => {
  // Each instruction is otherwise valid and quoted favorably.
  const protectedTokens = {
    USDC: eth.usdc,
    aToken: eth.aaveUSDC,
    Comet: eth.compound,
    'ERC4626 share': eth.ERC4626_vaultU2_Ethereum!,
    'Beefy share': eth.Beefy_morphoGauntletUsdc_Ethereum!,
  };
  for (const [name, tokenIn] of Object.entries(protectedTokens)) {
    for (const spelling of [tokenIn, tokenIn.toLowerCase()]) {
      t.throws(
        () =>
          bindRewardSwap(
            swapMove(),
            { provider: '1inch', index: 0 },
            observations({
              holdings: [holding('claimed-reward', 10n ** 30n, spelling)],
              oneInchSwaps: [
                {
                  ...swapInstructions,
                  tokenIn: spelling as `0x${string}`,
                  quotedAmountOut: 10n ** 18n,
                  minAmountOut: 2_940_000n,
                },
              ],
            }),
            getEvmContracts,
            NOW,
          ),
        { message: /is a protected token of "Ethereum"/ },
        `${name}: ${spelling}`,
      );
    }
  }
});

test('protected tokens fail closed without their configuration', t => {
  t.true(
    getProtectedSwapTokens('Ethereum', eth).includes(
      eth.ERC4626_morphoGauntletUsdcRwa_Ethereum!,
    ),
  );
  t.false(
    getProtectedSwapTokens('Ethereum', eth).includes(
      contractsMock.Base.Beefy_morphoSeamlessUsdc_Base!,
    ),
    'only instruments of the chain',
  );
  for (const key of ['usdc', 'aaveUSDC', 'compound'] as const) {
    t.throws(
      () => getProtectedSwapTokens('Ethereum', { ...eth, [key]: undefined }),
      { message: /protected token configuration is incomplete for "Ethereum"/ },
      key,
    );
  }
  t.throws(
    () =>
      bindRewardSwap(
        swapMove(),
        { provider: '1inch', index: 0 },
        observations({ oneInchSwaps: [swapInstructions] }),
        chain => ({ ...contractsMock[chain], aaveUSDC: undefined }),
        NOW,
      ),
    { message: /protected token configuration is incomplete/ },
  );
});

/** Bound steps for budget checks, in plan order. */
const merkl = (
  expectedAmount: bigint,
  tokenId: `0x${string}` = REWARD,
  account: `@${AxelarChain}` = '@Ethereum',
): ClaimBoundStep =>
  harden({
    kind: 'claimRewards',
    protocol: 'merkl',
    account,
    distributor: eth.merkleDistributor!,
    tokenId,
    cumulativeAmount: expectedAmount,
    proofs: [],
    expectedAmount,
  });
const swapOf = (
  amountIn: bigint,
  tokenIn: `0x${string}` = REWARD,
): RewardBoundStep =>
  harden({
    kind: 'swap',
    provider: '1inch',
    account: '@Ethereum',
    router: eth.oneInchRouter!,
    tokenIn,
    tokenOut: eth.usdc,
    amountIn,
    quotedAmountOut: 1n,
    minAmountOut: 1n,
    executor: swapInstructions.executor,
    srcReceiver: swapInstructions.srcReceiver,
    data: '0x',
    calldataSuffix: '0x',
  });
const holding = (
  kind: TypedHoldingDetail['kind'],
  amount: bigint,
  tokenId: string = REWARD,
  place: TypedHoldingDetail['place'] = '@Ethereum',
) => ({ place, kind, tokenId, amount }) as TypedHoldingDetail;

test('reward swaps are funded by held rewards and prior claims, once', t => {
  const ok = (
    name: string,
    steps: Array<RewardBoundStep | undefined>,
    order: FundsFlowPlan['order'],
    holdings: TypedHoldingDetail[] = [],
  ) =>
    t.notThrows(() => vetRewardSwapBudgets(steps, order, { holdings }), name);
  const unfunded = (
    name: string,
    steps: Array<RewardBoundStep | undefined>,
    order: FundsFlowPlan['order'],
    holdings: TypedHoldingDetail[] = [],
  ) =>
    t.throws(
      () => vetRewardSwapBudgets(steps, order, { holdings }),
      { message: /unfunded reward swap at step/ },
      name,
    );

  ok('held claimed rewards', [swapOf(10n)], undefined, [
    holding('claimed-reward', 10n),
  ]);
  ok('held, regardless of token address case', [swapOf(10n)], undefined, [
    holding('claimed-reward', 10n, REWARD.toUpperCase().replace('0X', '0x')),
  ]);
  unfunded('claimable rewards are not spendable', [swapOf(10n)], undefined, [
    holding('claimable-reward', 10n),
  ]);
  unfunded('ordinary tokens are not rewards', [swapOf(10n)], undefined, [
    holding('token', 10n),
  ]);
  unfunded('rewards at another account', [swapOf(10n)], undefined, [
    holding('claimed-reward', 10n, REWARD, '@Base'),
  ]);
  unfunded('other reward tokens', [swapOf(10n)], undefined, [
    holding('claimed-reward', 10n, OTHER_REWARD),
  ]);

  ok('a prior claim, sequentially', [merkl(10n), swapOf(10n)], undefined);
  ok('a prior claim, explicitly', [merkl(10n), swapOf(10n)], [[1, [0]]]);
  ok(
    'a transitively prior claim',
    [merkl(10n), undefined, swapOf(10n)],
    [
      [1, [0]],
      [2, [1]],
    ],
  );
  unfunded('a concurrent claim', [merkl(10n), swapOf(10n)], []);
  unfunded('a later claim', [swapOf(10n), merkl(10n)], undefined);
  unfunded(
    'a claim of another token',
    [merkl(10n, OTHER_REWARD), swapOf(10n)],
    undefined,
  );
  unfunded(
    'a claim at another account',
    [merkl(10n, REWARD, '@Base'), swapOf(10n)],
    undefined,
  );

  ok('held rewards and a claim combined', [merkl(6n), swapOf(10n)], undefined, [
    holding('claimed-reward', 4n),
  ]);
  ok(
    'two swaps sharing a claim',
    [merkl(10n), swapOf(4n), swapOf(6n)],
    [
      [1, [0]],
      [2, [0]],
    ],
  );
  unfunded(
    'two swaps spending a claim twice',
    [merkl(10n), swapOf(10n), swapOf(10n)],
    [
      [1, [0]],
      [2, [0]],
    ],
  );
  unfunded(
    'concurrent swaps spending held rewards twice',
    [swapOf(10n), swapOf(10n)],
    [],
    [holding('claimed-reward', 10n)],
  );
  ok(
    'a dependent swap prefers its claim, leaving held rewards',
    [swapOf(4n), merkl(10n), swapOf(10n)],
    [[2, [1]]],
    [holding('claimed-reward', 4n)],
  );
  ok(
    'a multi-claim swap',
    [merkl(4n), merkl(6n, REWARD, '@Ethereum'), swapOf(10n)].map((step, i) =>
      i === 1 && step?.kind === 'claimRewards'
        ? harden({
            ...step,
            protocol: 'aave' as const,
            src: 'Aave_Ethereum' as const,
            controller: eth.aaveRewardsController,
            asset: eth.aaveUSDC,
          })
        : step,
    ) as RewardBoundStep[],
    [[2, [0, 1]]],
  );
});

test('a reward may be claimed only once per plan', t => {
  t.throws(() => vetRewardSwapBudgets([merkl(1n), merkl(2n)], [], {}), {
    message: /duplicate reward claim "merkl:@Ethereum:0x0+aa"/,
  });
  t.notThrows(
    () => vetRewardSwapBudgets([merkl(1n), merkl(2n, OTHER_REWARD)], [], {}),
    'other tokens',
  );
  const compound = (tokenId: `0x${string}`): ClaimBoundStep =>
    harden({
      kind: 'claimRewards',
      protocol: 'compound',
      src: 'Compound_Ethereum',
      account: '@Ethereum',
      controller: eth.compoundRewardsController,
      comet: eth.compound,
      tokenId,
      expectedAmount: 1n,
    });
  t.throws(
    () =>
      vetRewardSwapBudgets([compound(REWARD), compound(OTHER_REWARD)], [], {}),
    { message: /duplicate reward claim "compound:Compound_Ethereum"/ },
    'a Compound claim collects every token owed',
  );
});
