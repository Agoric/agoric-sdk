import '@endo/init/debug.js';

import test, { type ExecutionContext } from 'ava';
import {
  encodeType,
  getTypesForEIP712Domain,
  hashStruct,
  hashTypedData,
  isHex,
  recoverTypedDataAddress,
} from '@agoric/orchestration/src/stubs/viem-typedData.ts';
import { makeEIP712MessageHandlerUtils } from '@agoric/orchestration/src/utils/eip712-message-handler.ts';
import { normalizeAndValidateEIP712Data } from '@agoric/orchestration/src/utils/viem-utils/eip712-normalize.ts';
import {
  getMerklClaimExpectedAmount,
  portfolioObservationsFromEIP712,
  portfolioObservationsToEIP712,
  ymaxObservationMessageKit,
  YmaxObservationMessageSchema,
  type PortfolioObservationsContent,
  type PortfolioObservationsEIP712,
} from '../src/observation-messages.ts';
import type {
  AaveClaimEvidence,
  CompoundClaimEvidence,
  MerklClaimEvidence,
  OneInchSwapInstructions,
  SelectableObservations,
  TypedHoldingDetail,
} from '../src/types.ts';
import { runWithoutLockdown } from './without-lockdown.ts';

const addr = (digit: string) => `0x${digit.repeat(40)}` as const;
const verifyingContract = addr('1');
const usdc = addr('a');
const morphoToken = addr('b');
const aaveToken = addr('c');
const compToken = addr('d');

const aaveClaim: AaveClaimEvidence = {
  instrumentId: 'Aave_Base',
  tokenId: aaveToken,
  expectedAmount: 10n ** 18n,
};
const compoundClaim: CompoundClaimEvidence = {
  instrumentId: 'Compound_Base',
  tokenId: compToken,
  expectedAmount: 5n * 10n ** 17n,
};
const merklClaim: MerklClaimEvidence = {
  accountPlace: '@Base',
  distributor: addr('e'),
  tokenId: morphoToken,
  cumulativeAmount: 3n * 10n ** 18n,
  claimedAmount: 10n ** 18n,
  proofs: [`0x${'12'.repeat(32)}`, `0x${'34'.repeat(32)}`],
};
const oneInchSwap: OneInchSwapInstructions = {
  accountPlace: '@Base',
  tokenIn: morphoToken,
  tokenOut: usdc,
  amountIn: 2n * 10n ** 18n,
  quotedAmountOut: 3_000_000n,
  minAmountOut: 2_940_000n,
  slippageBps: 200,
  expiresAt: 1_800_000_000n,
  flags: 0n,
  executor: addr('f'),
  srcReceiver: addr('f'),
  data: '0xdeadbeef',
};
const allEvidence: Required<SelectableObservations> = {
  aaveClaims: [aaveClaim],
  compoundClaims: [compoundClaim],
  merklClaims: [merklClaim],
  oneInchSwaps: [oneInchSwap],
};
const evidenceKeys = Object.keys(
  allEvidence,
) as (keyof SelectableObservations)[];
const evidenceTypes = {
  aaveClaims: 'AaveClaim',
  compoundClaims: 'CompoundClaim',
  merklClaims: 'MerklClaim',
  oneInchSwaps: 'OneInchSwap',
} as const;

const claimableAtAccount: TypedHoldingDetail = {
  place: '@Base',
  kind: 'claimable-reward',
  tokenId: morphoToken,
  amount: 2n * 10n ** 18n,
};
const content: PortfolioObservationsContent = {
  portfolioId: 12,
  syncState: { policyVersion: 3, rebalanceCount: 7 },
  observations: {
    balances: {},
    holdings: [claimableAtAccount],
    instrumentTvls: { Aave_Base: { tvlUsd: 12n } },
  },
};

const withEvidence = (
  evidence: SelectableObservations,
): PortfolioObservationsContent => ({
  ...content,
  observations: { ...content.observations, ...evidence },
});

const messageFor = (evidence: SelectableObservations = {}) =>
  ymaxObservationMessageKit.getStandaloneOperationData(
    {
      ...portfolioObservationsToEIP712(withEvidence(evidence)),
      nonce: 1n,
      deadline: 2n,
    },
    'PortfolioObservations',
    1n,
    verifyingContract,
  );

const { extractOperationDetailsFromDataWithAddress } =
  makeEIP712MessageHandlerUtils(
    {
      hashStruct,
      isHex,
      recoverTypedDataAddress,
      encodeType,
      getTypesForEIP712Domain,
    },
    YmaxObservationMessageSchema,
    { onUnknownSignedField: 'throw' },
  );

/** Read a message as the contract does, minus the signature check. */
const readSigned = (message: ReturnType<typeof messageFor>) =>
  extractOperationDetailsFromDataWithAddress(
    {
      ...message,
      address: verifyingContract,
      signature: `0x${'ab'.repeat(65)}`,
    } as any,
    { verifyingContract: { '1': verifyingContract } },
  ).data as PortfolioObservationsEIP712;

const decode = (evidence: SelectableObservations) =>
  portfolioObservationsFromEIP712(readSigned(messageFor(evidence)));

/** All 16 combinations of present and absent evidence arrays. */
const evidenceSubsets = (): SelectableObservations[] =>
  Array.from({ length: 2 ** evidenceKeys.length }, (_, mask) =>
    Object.fromEntries(
      evidenceKeys
        .filter((_k, i) => Math.floor(mask / 2 ** i) % 2 === 1)
        .map(k => [k, allEvidence[k]]),
    ),
  );

test('any mix of present and absent evidence round trips through a signed message', t => {
  for (const evidence of evidenceSubsets()) {
    const label = Object.keys(evidence).join(',') || 'none';
    const message = messageFor(evidence);
    // Only the present evidence fields and struct types are signed.
    const fields = message.types.PortfolioObservations.map(f => f.name);
    for (const key of evidenceKeys) {
      t.is(fields.includes(key), key in evidence, `${label}: ${key} field`);
      t.is(
        evidenceTypes[key] in message.types,
        key in evidence,
        `${label}: ${key} type`,
      );
    }
    t.deepEqual(decode(evidence), withEvidence(evidence), `${label}`);
  }
});

test('evidence-free messages keep the baseline signed schema', t => {
  const message = messageFor();
  t.deepEqual(
    message.types.PortfolioObservations.map(f => f.name),
    ['portfolio', 'syncState', 'holdings', 'instruments', 'nonce', 'deadline'],
  );
  t.deepEqual(Object.keys(message.types).sort(), [
    'EIP712Domain',
    'HoldingDetail',
    'InstrumentDetail',
    'PortfolioObservations',
    'SyncState',
  ]);
  t.deepEqual(decode({}), content);
  t.false('merklClaims' in decode({}).observations);
});

test('absent and empty evidence remain distinct', t => {
  for (const key of evidenceKeys) {
    const empty = { [key]: [] };
    t.deepEqual(decode(empty).observations[key], []);
    t.not(
      hashTypedData(messageFor(empty) as any),
      hashTypedData(messageFor() as any),
      `${key}`,
    );
  }
});

test('evidence uses the declared EIP-712 scalar types', t => {
  const { types } = messageFor(allEvidence);
  const typeOf = (struct: keyof typeof types, name: string) =>
    types[struct].find(f => f.name === name)?.type;
  t.is(typeOf('AaveClaim', 'tokenId'), 'address');
  t.is(typeOf('AaveClaim', 'expectedAmount'), 'uint256');
  t.is(typeOf('MerklClaim', 'proofs'), 'bytes32[]');
  t.is(typeOf('OneInchSwap', 'slippageBps'), 'uint16');
  t.is(typeOf('OneInchSwap', 'expiresAt'), 'uint64');
  t.is(typeOf('OneInchSwap', 'data'), 'bytes');
  for (const struct of Object.values(evidenceTypes)) {
    t.false(
      types[struct].some(f => 'optional' in f),
      `${struct} fields are all required`,
    );
  }
  // Same fields, but distinct struct types, so never confused when signed.
  t.not(
    hashTypedData(messageFor({ aaveClaims: [aaveClaim] }) as any),
    hashTypedData(
      messageFor({
        compoundClaims: [{ ...aaveClaim, instrumentId: 'Compound_Base' }],
      }) as any,
    ),
  );
});

test('every evidence field affects the signature digest', t => {
  const original = hashTypedData(messageFor(allEvidence) as any);
  const changes: {
    [K in keyof SelectableObservations]-?: Record<string, unknown>[];
  } = {
    aaveClaims: [
      { instrumentId: 'Aave_Arbitrum' },
      { tokenId: addr('2') },
      { expectedAmount: 0n },
    ],
    compoundClaims: [
      { instrumentId: 'Compound_Arbitrum' },
      { tokenId: addr('2') },
      { expectedAmount: 0n },
    ],
    merklClaims: [
      { accountPlace: '@Arbitrum' },
      { distributor: addr('2') },
      { tokenId: addr('2') },
      { cumulativeAmount: 4n * 10n ** 18n },
      { claimedAmount: 0n },
      { proofs: [merklClaim.proofs[0]] },
    ],
    oneInchSwaps: [
      { accountPlace: '@Arbitrum' },
      { tokenIn: addr('2') },
      { tokenOut: addr('2') },
      { amountIn: 1n },
      { quotedAmountOut: 3_000_001n },
      { minAmountOut: 1n },
      { slippageBps: 100 },
      { expiresAt: 1n },
      { flags: 1n },
      { executor: addr('2') },
      { srcReceiver: addr('2') },
      { data: '0x' },
    ],
  };
  for (const key of evidenceKeys) {
    for (const change of changes[key]) {
      const evidence = {
        ...allEvidence,
        [key]: [{ ...allEvidence[key][0], ...change }],
      };
      t.not(
        hashTypedData(messageFor(evidence) as any),
        original,
        `${key} ${Object.keys(change)}`,
      );
    }
  }
});

test('handler rejects evidence fields added outside the signed definitions', t => {
  const message = messageFor({ merklClaims: [merklClaim] });
  const altered = {
    ...message,
    message: {
      ...message.message,
      merklClaims: [{ ...message.message.merklClaims![0], recipient: usdc }],
    },
  };
  t.throws(() => readSigned(altered as any), { message: /recipient/ });
  const unsignedArray = {
    ...message,
    message: { ...message.message, oneInchSwaps: [oneInchSwap] },
  };
  t.throws(() => readSigned(unsignedArray as any), {
    message: /oneInchSwaps/,
  });
});

test('the EIP-712 layer rejects malformed evidence primitives', t => {
  const malformed: [string, SelectableObservations][] = [
    [
      'negative amount',
      { aaveClaims: [{ ...aaveClaim, expectedAmount: -1n }] },
    ],
    [
      'short proof node',
      { merklClaims: [{ ...merklClaim, proofs: ['0x1234'] }] },
    ],
    [
      'fractional slippage',
      { oneInchSwaps: [{ ...oneInchSwap, slippageBps: 1.5 }] },
    ],
    [
      'expiry beyond uint64',
      { oneInchSwaps: [{ ...oneInchSwap, expiresAt: 2n ** 64n }] },
    ],
    ['odd-length data', { oneInchSwaps: [{ ...oneInchSwap, data: '0xabc' }] }],
  ];
  const signed = readSigned(messageFor(allEvidence));
  for (const [label, evidence] of malformed) {
    t.throws(() => messageFor(evidence), undefined, `authoring ${label}`);
    const message = messageFor(allEvidence);
    const tampered = { ...message, message: { ...signed, ...evidence } };
    t.throws(() => readSigned(tampered as any), undefined, `reading ${label}`);
  }
});

test('Merkl expected amount is the observed cumulative increment', t => {
  t.is(getMerklClaimExpectedAmount(merklClaim), 2n * 10n ** 18n);
  t.is(
    getMerklClaimExpectedAmount({
      ...merklClaim,
      claimedAmount: 3n * 10n ** 18n,
    }),
    0n,
  );
  t.throws(
    () =>
      getMerklClaimExpectedAmount({
        ...merklClaim,
        claimedAmount: 3n * 10n ** 18n + 1n,
      }),
    { message: /exceeds cumulativeAmount/ },
  );
});

const invalidCases: [
  label: string,
  evidence: Record<string, unknown[]>,
  error: RegExp,
][] = [
  // Aave and Compound
  [
    'Aave claim of another protocol',
    { aaveClaims: [{ ...aaveClaim, instrumentId: 'Compound_Base' }] },
    /\[aaveClaims\[0\]\] invalid Aave instrument/,
  ],
  [
    'Compound claim of another protocol',
    { compoundClaims: [{ ...compoundClaim, instrumentId: 'Aave_Base' }] },
    /\[compoundClaims\[0\]\] invalid Compound instrument/,
  ],
  [
    'Aave claim of an account',
    { aaveClaims: [{ ...aaveClaim, instrumentId: '@Base' }] },
    /Aave instrument/,
  ],
  [
    'Aave claim off EVM',
    { aaveClaims: [{ ...aaveClaim, instrumentId: 'Aave_noble' }] },
    /Aave instrument/,
  ],
  [
    'zero Aave token',
    { aaveClaims: [{ ...aaveClaim, tokenId: addr('0') }] },
    /\[aaveClaims\[0\]\] invalid token address/,
  ],
  [
    'duplicate Aave claim',
    { aaveClaims: [aaveClaim, { ...aaveClaim, expectedAmount: 1n }] },
    /\[aaveClaims\[1\]\] duplicate /,
  ],
  // Merkl
  [
    'Merkl claim at an instrument',
    { merklClaims: [{ ...merklClaim, accountPlace: 'Aave_Base' }] },
    /\[merklClaims\[0\]\] invalid EVM account place/,
  ],
  [
    'Merkl claim off EVM',
    { merklClaims: [{ ...merklClaim, accountPlace: '@noble' }] },
    /\[merklClaims\[0\]\] invalid EVM account place/,
  ],
  [
    'Merkl claim already over-claimed',
    { merklClaims: [{ ...merklClaim, claimedAmount: 4n * 10n ** 18n }] },
    /\[merklClaims\[0\]\] claimedAmount .* exceeds cumulativeAmount/,
  ],
  [
    'duplicate Merkl claim',
    { merklClaims: [merklClaim, merklClaim] },
    /\[merklClaims\[1\]\] duplicate /,
  ],
  [
    'zero Merkl distributor',
    { merklClaims: [{ ...merklClaim, distributor: addr('0') }] },
    /\[merklClaims\[0\]\] invalid distributor address/,
  ],
  // 1inch
  [
    'swap at an instrument',
    { oneInchSwaps: [{ ...oneInchSwap, accountPlace: 'Aave_Base' }] },
    /\[oneInchSwaps\[0\]\] invalid EVM account place/,
  ],
  [
    'swap of a token for itself',
    { oneInchSwaps: [{ ...oneInchSwap, tokenOut: morphoToken }] },
    /tokenIn and tokenOut must differ/,
  ],
  [
    'swap of nothing',
    { oneInchSwaps: [{ ...oneInchSwap, amountIn: 0n }] },
    /amountIn must be positive/,
  ],
  [
    'swap minimum above quoted output',
    { oneInchSwaps: [{ ...oneInchSwap, minAmountOut: 3_000_001n }] },
    /minAmountOut exceeds quotedAmountOut/,
  ],
  [
    'swap slippage above 100%',
    { oneInchSwaps: [{ ...oneInchSwap, slippageBps: 10_001 }] },
    /\[oneInchSwaps\[0\]\] invalid slippageBps/,
  ],
];
for (const [label, evidence, error] of invalidCases) {
  test(`evidence rejects ${label} on encoding and decoding`, t => {
    t.throws(
      () => portfolioObservationsToEIP712(withEvidence(evidence as any)),
      {
        message: error,
      },
    );
    const wire = {
      ...readSigned(messageFor()),
      ...evidence,
    } as unknown as PortfolioObservationsEIP712;
    t.throws(() => portfolioObservationsFromEIP712(wire), { message: error });
  });
}

test('evidence addresses may be checksummed, and compare without case', t => {
  // Base USDC, in its EIP-55 checksummed spelling.
  const checksummed: `0x${string}` =
    '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
  const lower = checksummed.toLowerCase() as `0x${string}`;
  const claim = { ...merklClaim, tokenId: checksummed };
  t.deepEqual(
    decode({ merklClaims: [claim] }).observations.merklClaims,
    [claim],
    'spelling is preserved',
  );
  t.is(
    hashTypedData(messageFor({ merklClaims: [claim] }) as any),
    hashTypedData(
      messageFor({ merklClaims: [{ ...claim, tokenId: lower }] }) as any,
    ),
    'checksummed and lowercase spellings sign the same',
  );
  t.throws(
    () =>
      hashTypedData(
        messageFor({
          merklClaims: [{ ...claim, tokenId: `0x${'A'.repeat(40)}` }],
        }) as any,
      ),
    undefined,
    'other mixed case is not a valid address for signing',
  );
  t.throws(
    () =>
      portfolioObservationsToEIP712(
        withEvidence({
          merklClaims: [{ ...claim, tokenId: lower }, claim],
        }),
      ),
    { message: /\[merklClaims\[1\]\] duplicate / },
  );
  t.throws(
    () =>
      portfolioObservationsToEIP712(
        withEvidence({
          aaveClaims: [
            { ...aaveClaim, tokenId: lower },
            { ...aaveClaim, tokenId: checksummed },
          ],
        }),
      ),
    { message: /\[aaveClaims\[1\]\] duplicate / },
  );
  t.throws(
    () =>
      portfolioObservationsToEIP712(
        withEvidence({
          oneInchSwaps: [
            { ...oneInchSwap, tokenIn: lower, tokenOut: checksummed },
          ],
        }),
      ),
    { message: /tokenIn and tokenOut must differ/ },
  );
});

test('route addresses may be zero, unlike tokens and distributors', t => {
  const swap = { ...oneInchSwap, srcReceiver: addr('0') };
  t.deepEqual(decode({ oneInchSwaps: [swap] }).observations.oneInchSwaps, [
    swap,
  ]);
});

/** Assert that no object reachable from `actual` is reachable from `source`. */
const assertNoSharedObjects = (
  t: ExecutionContext,
  actual: unknown,
  source: unknown,
) => {
  const sourceObjects = new Set<unknown>();
  const collect = (value: unknown) => {
    if (value === null || typeof value !== 'object') return;
    sourceObjects.add(value);
    Object.values(value).forEach(collect);
  };
  collect(source);
  const check = (value: unknown, path: string) => {
    if (value === null || typeof value !== 'object') return;
    t.false(sourceObjects.has(value), `${path} is shared`);
    for (const [k, v] of Object.entries(value)) check(v, `${path}.${k}`);
  };
  check(actual, 'evidence');
};

test('evidence shares no state with its source', t => {
  const source = withEvidence(allEvidence);
  const wire = portfolioObservationsToEIP712(source);
  assertNoSharedObjects(t, wire, source.observations);

  const signed = readSigned(messageFor(allEvidence));
  const decoded = portfolioObservationsFromEIP712(signed).observations;
  assertNoSharedObjects(t, decoded, signed);
  t.deepEqual(decoded, source.observations);
});

test('evidence must be plain data', t => {
  const wire = {
    ...readSigned(messageFor()),
    oneInchSwaps: [{ ...oneInchSwap, data: new Uint8Array([0xab]) }],
  } as unknown as PortfolioObservationsEIP712;
  t.throws(() => portfolioObservationsFromEIP712(wire), {
    message: /expected plain data, got \[object Uint8Array\]/,
  });
});

test('normalized evidence keeps its canonical wire values', t => {
  const message = messageFor(allEvidence);
  const normalized = normalizeAndValidateEIP712Data(
    {
      message: message.message,
      types: ymaxObservationMessageKit.getOperationTypes(
        'PortfolioObservations',
      ),
      primaryType: 'PortfolioObservations',
    },
    { onExtraField: 'drop', onNonCanonicalValue: 'throw' },
  ).message as PortfolioObservationsEIP712;
  t.deepEqual(
    portfolioObservationsFromEIP712(normalized).observations,
    withEvidence(allEvidence).observations,
  );
});

test('evidence is usable without lockdown', async t => {
  const script = `
    const m = await import('@agoric/portfolio-api/src/observation-messages.js');
    const observations = {
      balances: {},
      instrumentTvls: {},
      merklClaims: [{
        accountPlace: '@Base',
        distributor: '0x${'e'.repeat(40)}',
        tokenId: '0x${'b'.repeat(40)}',
        cumulativeAmount: 3n,
        claimedAmount: 1n,
        proofs: ['0x${'12'.repeat(32)}'],
      }],
    };
    const message = m.ymaxObservationMessageKit.getStandaloneOperationData(
      {
        ...m.portfolioObservationsToEIP712({
          portfolioId: 12,
          syncState: { policyVersion: 3, rebalanceCount: 7 },
          observations,
        }),
        nonce: 1n,
        deadline: 2n,
      },
      'PortfolioObservations',
      1n,
      '0x${'1'.repeat(40)}',
    ).message;
    const decoded = m.portfolioObservationsFromEIP712(message).observations;
    if (m.getMerklClaimExpectedAmount(decoded.merklClaims[0]) !== 2n) {
      throw Error('unexpected Merkl increment');
    }
  `;
  await t.notThrowsAsync(runWithoutLockdown(script));
});
