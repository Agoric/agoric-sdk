import '@endo/init/debug.js';

import test from 'ava';
import {
  hashTypedData,
  hashStruct,
  isHex,
  recoverTypedDataAddress,
  encodeType,
  getTypesForEIP712Domain,
} from '@agoric/orchestration/src/stubs/viem-typedData.ts';
import { normalizeAndValidateEIP712Data } from '@agoric/orchestration/src/utils/viem-utils/eip712-normalize.ts';
import { makeEIP712MessageHandlerUtils } from '@agoric/orchestration/src/utils/eip712-message-handler.ts';
import {
  YmaxObservationMessageSchema,
  ymaxObservationMessageKit,
  portfolioObservationsToEIP712,
  portfolioObservationsFromEIP712,
  VALUE_USD_UNKNOWN,
  type PortfolioObservationsContent,
  type PortfolioObservationsEIP712,
} from '../src/observation-messages.ts';
import type { TypedHoldingDetail as HoldingDetail } from '../src/types.ts';
import { runWithoutLockdown } from './without-lockdown.ts';

const address = '0x123456789012345678901234567890123456789a' as const;
const zeroAddress = `0x${'0'.repeat(40)}` as const;
const morpho = 'ERC4626_morphoGauntletUsdcPrimeV2_Base' as const;
const holding: HoldingDetail = {
  place: morpho,
  kind: 'shares',
  tokenAddress: address,
  amount: 10n ** 24n,
};
const content: PortfolioObservationsContent = {
  portfolioId: 12,
  syncState: { policyVersion: 3, rebalanceCount: 7 },
  observations: {
    balances: {},
    holdings: [holding],
    instrumentTvls: { [morpho]: { tvlUsd: 12n } },
  },
};
const messageFor = (holdings: HoldingDetail[] = [holding]) =>
  ymaxObservationMessageKit.getStandaloneOperationData(
    {
      ...portfolioObservationsToEIP712({
        ...content,
        observations: { ...content.observations, holdings },
      }),
      nonce: 1n,
      deadline: 2n,
    },
    'PortfolioObservations',
    1n,
    address,
  );

const readMessage = (message: PortfolioObservationsEIP712) =>
  normalizeAndValidateEIP712Data(
    {
      message,
      types: ymaxObservationMessageKit.getOperationTypes(
        'PortfolioObservations',
      ),
      primaryType: 'PortfolioObservations',
    },
    { onExtraField: 'drop', onNonCanonicalValue: 'throw' },
  ).message as PortfolioObservationsEIP712;
const decode = (holdings: HoldingDetail[]) =>
  portfolioObservationsFromEIP712(readMessage(messageFor(holdings).message));

test('typed holdings round trip keeps raw units separate from optional signed valuations', t => {
  for (const fields of [
    {},
    { valueUsd: 0n },
    { valueUsd: 2n ** 255n - 1n },
    { valueUsd: 100_000_000n, balanceUsdc: 100_000_000n },
  ]) {
    const entry = { ...holding, ...fields };
    t.deepEqual(decode([entry]), {
      ...content,
      observations: { ...content.observations, holdings: [entry] },
    });
  }
});

test('missing holdings, empty holdings and observed zero remain distinct', t => {
  t.deepEqual(decode([]).observations, {
    balances: {},
    instrumentTvls: content.observations.instrumentTvls,
  });
  t.deepEqual(decode([{ ...holding, amount: 0n }]).observations.holdings, [
    { ...holding, amount: 0n },
  ]);
  t.throws(() =>
    portfolioObservationsToEIP712({
      ...content,
      observations: { instrumentTvls: {} },
    } as unknown as PortfolioObservationsContent),
  );
});

test('multiple kinds and reward tokens can share one instrument place', t => {
  const entries: HoldingDetail[] = [
    holding,
    { ...holding, kind: 'principal' },
    { ...holding, kind: 'claimable-reward' },
    { ...holding, place: '@Base', kind: 'claimed-reward' },
    {
      ...holding,
      kind: 'claimable-reward',
      tokenAddress: `0x${'2'.repeat(40)}`,
    },
    {
      place: '@Base',
      kind: 'token',
      tokenAddress: address,
      amount: 123n,
      valueUsd: 123n,
    },
    {
      place: '@Base',
      kind: '$ETH',
      tokenAddress: zeroAddress,
      amount: 0n,
    },
  ];
  t.deepEqual(decode(entries).observations.holdings, entries);
});

test('duplicate holding identity is case-insensitive for token addresses', t => {
  t.throws(
    () =>
      decode([
        holding,
        {
          ...holding,
          tokenAddress: address
            .toUpperCase()
            .replace('0X', '0x') as `0x${string}`,
        },
      ]),
    { message: /duplicate holding identity/ },
  );
});

for (const [label, fields, error] of [
  ['unknown kind', { kind: 'share' }, /invalid holding kind/],
  ['obsolete reward kind', { kind: 'reward' }, /invalid holding kind/],
  [
    'claimed reward on instrument',
    { kind: 'claimed-reward' },
    /incompatible with place/,
  ],
  [
    'claimable reward on account',
    { place: '@Base', kind: 'claimable-reward' },
    /incompatible with place/,
  ],
  ['invalid place', { place: '?FutureVault' }, /invalid holding place/],
  ['seat', { place: '<Cash>' }, /invalid holding place/],
  ['shares on account', { place: '@Base' }, /incompatible with place/],
  ['token on instrument', { kind: 'token' }, /incompatible with place/],
  ['bad address', { tokenAddress: '0x1234' }, /invalid holding token address/],
  ['zero ERC20', { tokenAddress: zeroAddress }, /incompatible token address/],
  [
    'native nonzero address',
    { place: '@Base', kind: '$ETH' },
    /incompatible token address/,
  ],
  [
    'invalid negative balanceUsdc',
    { balanceUsdc: -2n },
    /invalid uint256 balanceUsdc/,
  ],
  [
    'overflow balanceUsdc',
    { balanceUsdc: 2n ** 256n },
    /invalid uint256 balanceUsdc/,
  ],
  ['negative shares', { amount: -1n }, /invalid uint256 amount/],
  ['overflow shares', { amount: 2n ** 256n }, /invalid uint256 amount/],
  [
    'invalid negative valuation',
    { valueUsd: -2n },
    /invalid valuation valueUsd/,
  ],
  [
    'overflow valuation',
    { valueUsd: 2n ** 255n },
    /invalid valuation valueUsd/,
  ],
] as const) {
  test(`v2 rejects ${label} on encoding and decoding`, t => {
    const entry = { ...holding, ...fields } as HoldingDetail;
    t.throws(() => decode([entry]), { message: error });
    const data = {
      ...messageFor().message,
      holdings: [entry],
    } as unknown as PortfolioObservationsEIP712;
    t.throws(() => portfolioObservationsFromEIP712(data), { message: error });
  });
}

test('the wire sentinel is not an application valuation', t => {
  t.throws(() => messageFor([{ ...holding, valueUsd: -1n }]), {
    message: /invalid valuation valueUsd/,
  });
});

test('syntactically valid future instruments retain their raw evidence', t => {
  const future: HoldingDetail = {
    ...holding,
    place: 'FutureVault_FutureChain' as HoldingDetail['place'],
  };
  t.deepEqual(decode([future]).observations.holdings, [future]);
});

test('every holding field affects the signature digest', t => {
  const entry: HoldingDetail = { ...holding, valueUsd: 1n, balanceUsdc: 1n };
  const original = hashTypedData(messageFor([entry]) as any);
  for (const change of [
    { place: 'Aave_Base' },
    { kind: 'principal' },
    { tokenAddress: `0x${'2'.repeat(40)}` },
    { amount: 0n },
    { valueUsd: 0n },
    { balanceUsdc: 0n },
  ])
    t.not(
      hashTypedData(
        messageFor([{ ...entry, ...change } as HoldingDetail]) as any,
      ),
      original,
    );
  t.not(
    hashTypedData(messageFor() as any),
    hashTypedData(messageFor([{ ...holding, valueUsd: 0n }]) as any),
  );
  t.not(
    hashTypedData(messageFor([]) as any),
    hashTypedData(messageFor([{ ...holding, amount: 0n }]) as any),
  );
});

test('handler rejects raw holdings added outside the signed field definitions', t => {
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
  const message = messageFor();
  const altered = {
    ...message,
    message: {
      ...message.message,
      holdings: [{ ...message.message.holdings[0], unsignedShares: 123n }],
    },
    address,
    signature: `0x${'ab'.repeat(65)}`,
  };
  t.throws(
    () =>
      extractOperationDetailsFromDataWithAddress(altered as any, {
        verifyingContract: { '1': address },
      }),
    { message: /unsignedShares/ },
  );
  for (const field of ['amount'] as const) {
    const withoutField: Partial<
      PortfolioObservationsEIP712['holdings'][number]
    > = {
      ...message.message.holdings[0],
    };
    delete withoutField[field];
    const missingSignedField = {
      ...altered,
      types: {
        ...message.types,
        HoldingDetail: message.types.HoldingDetail.filter(
          p => p.name !== field,
        ),
      },
      message: { ...message.message, holdings: [withoutField] },
    };
    t.throws(
      () =>
        portfolioObservationsFromEIP712(
          extractOperationDetailsFromDataWithAddress(
            missingSignedField as any,
            {
              verifyingContract: { '1': address },
            },
          ).data,
        ),
      { message: new RegExp(field) },
    );
  }
});

test('legacy and typed holdings use one domain with distinct signed field definitions', t => {
  const legacy = ymaxObservationMessageKit.getStandaloneOperationData(
    {
      portfolio: 12n,
      syncState: { policyVersion: 3n, rebalanceCount: 7n },
      holdings: [{ place: morpho, balanceUsdc: 123n }],
      instruments: [],
      nonce: 1n,
      deadline: 2n,
    },
    'PortfolioObservations',
    1n,
    address,
  );
  const typed = messageFor();
  t.is(legacy.domain.version, '1');
  t.deepEqual(legacy.domain, typed.domain);
  t.deepEqual(legacy.types.HoldingDetail, [
    { name: 'place', type: 'string' },
    { name: 'balanceUsdc', type: 'uint256' },
  ]);
  t.notDeepEqual(legacy.types.HoldingDetail, typed.types.HoldingDetail);
  t.not(hashTypedData(legacy as any), hashTypedData(typed as any));
});

test('typed holdings rejects duplicate instruments and unsafe context numbers', t => {
  const data = readMessage(messageFor().message);
  t.throws(
    () =>
      portfolioObservationsFromEIP712({
        ...data,
        instruments: [...data.instruments, ...data.instruments],
      }),
    { message: /duplicate instrument/ },
  );
  for (const portfolio of [-1n, 2n ** 53n])
    t.throws(() => portfolioObservationsFromEIP712({ ...data, portfolio }));
});

test('typed holdings is usable without lockdown', async t => {
  await t.notThrowsAsync(
    runWithoutLockdown(`
    const m = await import('@agoric/portfolio-api/src/observation-messages.js');
    const content = ${JSON.stringify({ portfolioId: 1, syncState: { policyVersion: 1, rebalanceCount: 0 } })};
    content.observations = { balances: {}, holdings: [{ place: '${morpho}', kind: 'shares', tokenAddress: '${address}', amount: 0n }], instrumentTvls: {} };
    const data = m.portfolioObservationsToEIP712(content);
    const signedData = m.ymaxObservationMessageKit.getStandaloneOperationData({ ...data, nonce: 1n, deadline: 2n }, 'PortfolioObservations', 1n, '${address}');
    const { normalizeAndValidateEIP712Data } = await import('@agoric/orchestration/src/utils/viem-utils/eip712-normalize.ts');
    const decoded = normalizeAndValidateEIP712Data({ ...signedData, types: m.ymaxObservationMessageKit.getOperationTypes('PortfolioObservations') }, { onExtraField: 'drop', onNonCanonicalValue: 'throw' });
    m.portfolioObservationsFromEIP712(decoded.message);
  `),
  );
});

test('one signed message can mix known, unknown and zero valuations', t => {
  const entries: HoldingDetail[] = [
    holding,
    { ...holding, kind: 'principal', valueUsd: 100_000_000n },
    { ...holding, kind: 'claimable-reward', valueUsd: 0n },
  ];
  t.deepEqual(decode(entries).observations.holdings, entries);
  const message = messageFor(entries);
  t.is(message.message.holdings[0]!.valueUsd, VALUE_USD_UNKNOWN);
  t.deepEqual(
    message.types.HoldingDetail.find(field => field.name === 'valueUsd'),
    { name: 'valueUsd', type: 'int256' },
  );
});

test('decimal-string unknown valuation normalizes to the signed sentinel', t => {
  const data = portfolioObservationsToEIP712(content);
  const normalized = ymaxObservationMessageKit.getStandaloneOperationData(
    {
      ...data,
      holdings: [{ ...holding, valueUsd: String(-1n) as `${bigint}` }],
      nonce: 1n,
      deadline: 2n,
    },
    'PortfolioObservations',
    1n,
    address,
  );
  t.is(
    portfolioObservationsFromEIP712(readMessage(normalized.message))
      .observations.holdings![0]!.valueUsd,
    undefined,
  );
  t.is(hashTypedData(normalized as any), hashTypedData(messageFor() as any));
});

test('legacy compatibility balances remain unsigned and require uniform presence', t => {
  const entries: HoldingDetail[] = [
    { ...holding, balanceUsdc: 0n },
    { ...holding, kind: 'claimable-reward', balanceUsdc: 2n ** 256n - 1n },
  ];
  t.deepEqual(decode(entries).observations.holdings, entries);
  t.throws(
    () => decode([entries[0]!, { ...holding, kind: 'claimable-reward' }]),
    {
      message: /balanceUsdc/,
    },
  );
});

test('typed observations do not fabricate aggregate balances or silently drop them', t => {
  t.deepEqual(
    decode([{ ...holding, valueUsd: 123n }]).observations.balances,
    {},
  );
  t.throws(
    () =>
      portfolioObservationsToEIP712({
        ...content,
        observations: { ...content.observations, balances: { [morpho]: 1n } },
      }),
    { message: /cannot combine/ },
  );
});

test('handler leaves the sentinel on the wire for the converter to decode', t => {
  for (const onUnknownSignedField of ['throw', 'keep'] as const) {
    const handler = makeEIP712MessageHandlerUtils(
      {
        hashStruct,
        isHex,
        recoverTypedDataAddress,
        encodeType,
        getTypesForEIP712Domain,
      },
      YmaxObservationMessageSchema,
      { onUnknownSignedField },
    );
    const message = messageFor([
      holding,
      { ...holding, kind: 'claimable-reward', valueUsd: 0n },
    ]);
    const details = handler.extractOperationDetailsFromDataWithAddress(
      { ...message, address, signature: `0x${'ab'.repeat(65)}` } as any,
      { verifyingContract: { '1': address } },
    );
    t.is(details.data.holdings[0]!.valueUsd, VALUE_USD_UNKNOWN);
    t.is(details.data.holdings[1]!.valueUsd, 0n);
    t.deepEqual(
      portfolioObservationsFromEIP712(details.data).observations.holdings,
      [holding, { ...holding, kind: 'claimable-reward', valueUsd: 0n }],
    );
  }
});

test('typed holdings always carry valueUsd on the wire', t => {
  const data = portfolioObservationsToEIP712(content);
  t.is(data.holdings[0]!.valueUsd, VALUE_USD_UNKNOWN);
  const decoded = decode([holding]).observations.holdings![0]!;
  t.false(Object.hasOwn(decoded, 'valueUsd'));
  // A typed holding signed without the field also decodes as unknown.
  const { valueUsd: _, ...wire } = readMessage(messageFor().message)
    .holdings[0]!;
  t.deepEqual(
    portfolioObservationsFromEIP712({
      ...readMessage(messageFor().message),
      holdings: [wire],
    }).observations.holdings,
    [holding],
  );
});

test('observation context rejects non-bigint and unsafe wire numbers', t => {
  const data = readMessage(messageFor().message);
  for (const portfolio of [NaN, undefined, 'garbage', 0, -1n, 2n ** 53n]) {
    t.throws(() =>
      portfolioObservationsFromEIP712({ ...data, portfolio } as any),
    );
  }
});
