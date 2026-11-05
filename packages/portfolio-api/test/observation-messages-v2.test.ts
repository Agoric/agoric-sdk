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
import { makeEIP712MessageHandlerUtils } from '@agoric/orchestration/src/utils/eip712-message-handler.ts';
import {
  YmaxObservationMessageSchemaV2,
  OPT_UINT_UNDEFINED,
  ymaxObservationMessageKit,
  ymaxObservationMessageKitV2,
  portfolioObservationsToEIP712V2,
  portfolioObservationsFromEIP712V2,
  type PortfolioObservationsContentV2,
  type PortfolioObservationsEIP712V2,
} from '../src/observation-messages.ts';
import type { HoldingDetail } from '../src/types.ts';
import { runWithoutLockdown } from './without-lockdown.ts';

const address = '0x123456789012345678901234567890123456789a' as const;
const zeroAddress = `0x${'0'.repeat(40)}` as const;
const morpho = 'ERC4626_morphoGauntletUsdcPrimeV2_Base' as const;
const holding: HoldingDetail = {
  place: morpho,
  kind: 'shares',
  tokenAddress: address,
  amount: 10n ** 24n,
  valueUsd: OPT_UINT_UNDEFINED,
  balanceUsdc: OPT_UINT_UNDEFINED,
};
const content: PortfolioObservationsContentV2 = {
  portfolioId: 12,
  syncState: { policyVersion: 3, rebalanceCount: 7 },
  observations: {
    holdings: [holding],
    instrumentTvls: { [morpho]: { tvlUsd: 12n } },
  },
};
const messageFor = (holdings: HoldingDetail[] = [holding]) =>
  ymaxObservationMessageKitV2.getStandaloneOperationData(
    {
      ...portfolioObservationsToEIP712V2({
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

const decode = (holdings: HoldingDetail[]) =>
  portfolioObservationsFromEIP712V2(messageFor(holdings).message);

test('v2 round trip keeps raw units separate from required signed valuations', t => {
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
  t.deepEqual(decode([]).observations.holdings, []);
  t.deepEqual(decode([{ ...holding, amount: 0n }]).observations.holdings, [
    { ...holding, amount: 0n },
  ]);
  t.throws(() =>
    portfolioObservationsToEIP712V2({
      ...content,
      observations: { instrumentTvls: {} },
    } as unknown as PortfolioObservationsContentV2),
  );
});

test('multiple kinds and reward tokens can share one instrument place', t => {
  const entries: HoldingDetail[] = [
    holding,
    { ...holding, kind: 'principal' },
    { ...holding, kind: 'reward' },
    { ...holding, kind: 'reward', tokenAddress: `0x${'2'.repeat(40)}` },
    {
      place: '@Base',
      kind: 'token',
      tokenAddress: address,
      amount: 123n,
      valueUsd: 123n,
      balanceUsdc: 123n,
    },
    {
      place: '@Base',
      kind: '$ETH',
      tokenAddress: zeroAddress,
      amount: 0n,
      valueUsd: OPT_UINT_UNDEFINED,
      balanceUsdc: OPT_UINT_UNDEFINED,
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
    /invalid optUint255 balanceUsdc/,
  ],
  [
    'overflow balanceUsdc',
    { balanceUsdc: 2n ** 255n },
    /invalid optUint255 balanceUsdc/,
  ],
  ['negative shares', { amount: -1n }, /invalid uint256 amount/],
  ['overflow shares', { amount: 2n ** 256n }, /invalid uint256 amount/],
  [
    'invalid negative valuation',
    { valueUsd: -2n },
    /invalid optUint255 valueUsd/,
  ],
  ['missing valuation', { valueUsd: undefined }, /invalid optUint255 valueUsd/],
  [
    'overflow valuation',
    { valueUsd: 2n ** 255n },
    /invalid optUint255 valueUsd/,
  ],
] as const) {
  test(`v2 rejects ${label} on encoding and decoding`, t => {
    const entry = { ...holding, ...fields } as HoldingDetail;
    t.throws(() => decode([entry]), { message: error });
    const data = {
      ...messageFor().message,
      holdings: [entry],
    } as unknown as PortfolioObservationsEIP712V2;
    t.throws(() => portfolioObservationsFromEIP712V2(data), { message: error });
  });
}

test('deprecated balanceUsdc can be observed independently for each holding', t => {
  const entries: HoldingDetail[] = [
    holding,
    { ...holding, kind: 'principal', balanceUsdc: 123n },
    { ...holding, kind: 'reward', balanceUsdc: 0n },
  ];
  t.deepEqual(decode(entries).observations.holdings, entries);
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
      YmaxObservationMessageSchemaV2,
      { onUnknownSignedField: 'throw' },
    );
  const message = messageFor();
  const altered = {
    ...message,
    message: {
      ...message.message,
      holdings: [{ ...holding, unsignedShares: 123n }],
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
  for (const field of ['amount', 'valueUsd'] as const) {
    const withoutField: Partial<HoldingDetail> = { ...holding };
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
        extractOperationDetailsFromDataWithAddress(missingSignedField as any, {
          verifyingContract: { '1': address },
        }),
      { message: new RegExp(field) },
    );
  }
});

test('v1 remains explicit and domain-separated from v2', t => {
  const v1 = ymaxObservationMessageKit.getStandaloneDomain(1n, address);
  const v2 = ymaxObservationMessageKitV2.getStandaloneDomain(1n, address);
  t.is(v1.version, '1');
  t.is(v2.version, '2');
  t.throws(() => ymaxObservationMessageKit.validateDomain(v2));
  t.throws(() => ymaxObservationMessageKitV2.validateDomain(v1));
});

test('v2 rejects duplicate instruments and unsafe context numbers', t => {
  const data = messageFor().message;
  t.throws(
    () =>
      portfolioObservationsFromEIP712V2({
        ...data,
        instruments: [...data.instruments, ...data.instruments],
      }),
    { message: /duplicate instrument/ },
  );
  for (const portfolio of [-1n, 2n ** 53n])
    t.throws(() => portfolioObservationsFromEIP712V2({ ...data, portfolio }));
});

test('v2 is usable without lockdown', async t => {
  await t.notThrowsAsync(
    runWithoutLockdown(`
    const m = await import('@agoric/portfolio-api/src/observation-messages.js');
    const content = ${JSON.stringify({ portfolioId: 1, syncState: { policyVersion: 1, rebalanceCount: 0 } })};
    content.observations = { holdings: [{ place: '${morpho}', kind: 'shares', tokenAddress: '${address}', amount: 0n, valueUsd: m.OPT_UINT_UNDEFINED, balanceUsdc: m.OPT_UINT_UNDEFINED }], instrumentTvls: {} };
    const data = m.portfolioObservationsToEIP712V2(content);
    const signedData = m.ymaxObservationMessageKitV2.getStandaloneOperationData({ ...data, nonce: 1n, deadline: 2n }, 'PortfolioObservations', 1n, '${address}');
    m.portfolioObservationsFromEIP712V2(signedData.message);
  `),
  );
});

test('one signed message can mix known, unknown and zero valuations', t => {
  const entries: HoldingDetail[] = [
    { ...holding, valueUsd: OPT_UINT_UNDEFINED },
    {
      ...holding,
      kind: 'principal',
      valueUsd: 100_000_000n,
      balanceUsdc: 100_000_000n,
    },
    { ...holding, kind: 'reward', valueUsd: 0n, balanceUsdc: 0n },
  ];
  t.deepEqual(decode(entries).observations.holdings, entries);
  const definition = messageFor(entries).types.HoldingDetail;
  t.deepEqual(
    definition.filter(
      field => field.name === 'balanceUsdc' || field.name === 'valueUsd',
    ),
    [
      { name: 'balanceUsdc', type: 'int256' },
      { name: 'valueUsd', type: 'int256' },
    ],
  );
});

test('decimal-string unknown valuation normalizes to the signed bigint sentinel', t => {
  const data = portfolioObservationsToEIP712V2(content);
  const normalized = ymaxObservationMessageKitV2.getStandaloneOperationData(
    {
      ...data,
      holdings: [{ ...holding, valueUsd: '-1', balanceUsdc: '-1' }],
      nonce: 1n,
      deadline: 2n,
    },
    'PortfolioObservations',
    1n,
    address,
  );
  t.is(
    portfolioObservationsFromEIP712V2(normalized.message).observations
      .holdings[0]!.valueUsd,
    OPT_UINT_UNDEFINED,
  );
  t.is(hashTypedData(normalized as any), hashTypedData(messageFor() as any));
});

test('balanceUsdc can be omitted for the whole message without fabricating a sentinel', t => {
  const { balanceUsdc: _balanceUsdc, ...withoutBalance } = holding;
  const entries: HoldingDetail[] = [
    withoutBalance,
    { ...withoutBalance, kind: 'reward' },
  ];
  t.deepEqual(decode(entries).observations.holdings, entries);
  const message = messageFor(entries);
  t.false(
    message.types.HoldingDetail.some(field => field.name === 'balanceUsdc'),
  );
  t.not(
    hashTypedData(messageFor([withoutBalance]) as any),
    hashTypedData(messageFor() as any),
  );
  t.throws(() => decode([holding, { ...withoutBalance, kind: 'reward' }]), {
    message: /inconsistent balanceUsdc presence/,
  });
});
