import '@endo/init/debug.js';

import test from '@endo/ses-ava/prepare-endo.js';

import type { Address } from 'abitype';
import { privateKeyToAccount } from 'viem/accounts';
import {
  encodeType,
  getTypesForEIP712Domain,
  hashStruct,
  hashTypedData,
  isHex,
  recoverTypedDataAddress,
} from '../../src/stubs/viem-typedData.ts';
import {
  makeEIP712MessageKit,
  type EIP712MessageSchema,
} from '../../src/utils/eip712-messages.ts';
import { makeEIP712MessageHandlerUtils } from '../../src/utils/eip712-message-handler.ts';
import { getPermitWitnessTransferFromData } from '../../src/utils/permit2.ts';

const viemUtils = {
  isHex,
  hashStruct,
  recoverTypedDataAddress,
  encodeType,
  getTypesForEIP712Domain,
};

const account = privateKeyToAccount(
  '0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318',
);
const CHAIN_ID = 42161n;
const CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890' as const;
const OTHER_ADDRESS = '0x0987654321098765432109876543210987654321' as const;
const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3' as const;
const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as const;
const MOCK_SIGNATURE = `0x${'ab'.repeat(65)}` as const;

/** A standalone-only schema, e.g. for oracle observations */
const ObservationSchema = {
  domainName: 'TestOracle',
  domainVersion: '2',
  operationTypes: {
    Observe: [
      { name: 'portfolio', type: 'uint256' },
      { name: 'tvls', type: 'InstrumentTvl[]' },
      { name: 'note', type: 'string', optional: true },
    ],
  },
  subTypes: {
    InstrumentTvl: [
      { name: 'instrument', type: 'string' },
      { name: 'tvlUsd', type: 'uint256' },
    ],
  },
} as const satisfies EIP712MessageSchema;

/** A schema supporting permit2 witness messages */
const DepositSchema = {
  domainName: 'TestVault',
  domainVersion: '1',
  witnessFieldNamePrefix: 'vault',
  operationTypes: {
    Deposit: [{ name: 'account', type: 'uint256' }],
  },
  subTypes: {},
} as const satisfies EIP712MessageSchema;

const observationKit = makeEIP712MessageKit(ObservationSchema);
const observationUtils = makeEIP712MessageHandlerUtils(
  viemUtils,
  ObservationSchema,
);
const depositKit = makeEIP712MessageKit(DepositSchema);
const depositUtils = makeEIP712MessageHandlerUtils(viemUtils, DepositSchema);

const makeObservation = (verifyingContract: Address = CONTRACT_ADDRESS) =>
  observationKit.getStandaloneOperationData(
    {
      portfolio: 7n,
      tvls: [
        { instrument: 'Aave_Arbitrum', tvlUsd: 1_000_000n },
        { instrument: 'Compound_Base', tvlUsd: 2_000_000n },
      ],
      nonce: 3n,
      deadline: 1700000000n,
    },
    'Observe',
    CHAIN_ID,
    verifyingContract,
  );

type DepositWitness = ReturnType<typeof depositKit.getWitness<'Deposit'>>;

const makeDepositPermit = (
  witness = depositKit.getWitness('Deposit', { account: 5n }),
) =>
  getPermitWitnessTransferFromData(
    {
      permitted: { token: USDC_ADDRESS, amount: 1_000_000n },
      spender: CONTRACT_ADDRESS,
      nonce: 11n,
      deadline: 1700000000n,
    },
    PERMIT2_ADDRESS,
    CHAIN_ID,
    witness,
  );

test('standalone message of a custom schema round-trips through signing', async t => {
  const data = makeObservation();
  t.deepEqual(data.domain, {
    name: 'TestOracle',
    version: '2',
    chainId: CHAIN_ID,
    verifyingContract: CONTRACT_ADDRESS,
  });
  // unused optional field is dropped from the types
  t.deepEqual(
    data.types.Observe.map(({ name }) => name),
    ['portfolio', 'tvls', 'nonce', 'deadline'],
  );

  const signature = await account.signTypedData(data);
  const address = await recoverTypedDataAddress({ ...data, signature });
  t.is(address, account.address);

  const details = observationUtils.extractOperationDetailsFromDataWithAddress(
    { ...data, address },
    { verifyingContract: { [String(CHAIN_ID)]: CONTRACT_ADDRESS } },
  );
  t.deepEqual(details, {
    operation: 'Observe',
    domain: data.domain,
    data: {
      portfolio: 7n,
      tvls: [
        { instrument: 'Aave_Arbitrum', tvlUsd: 1_000_000n },
        { instrument: 'Compound_Base', tvlUsd: 2_000_000n },
      ],
    },
    evmWalletAddress: account.address,
    nonce: 3n,
    deadline: 1700000000n,
    normalizedData: {
      domain: data.domain,
      types: data.types,
      primaryType: data.primaryType,
      message: data.message,
    },
  });

  const recovered =
    await observationUtils.extractOperationDetailsFromSignedData({
      ...data,
      signature,
    });
  t.is(recovered.evmWalletAddress, account.address);
});

test('string-encoded integers in a signed standalone message are normalized to bigints', async t => {
  const data = makeObservation();
  // As an ethers.js-based client (or JSON transport) might send them: every
  // message integer (including in nested arrays) as a string, and the domain
  // `chainId` as a number.
  const stringData = {
    ...data,
    domain: { ...data.domain, chainId: Number(CHAIN_ID) },
    message: {
      portfolio: '0x7',
      tvls: [
        { instrument: 'Aave_Arbitrum', tvlUsd: '1000000' },
        { instrument: 'Compound_Base', tvlUsd: '+2000000' },
      ],
      nonce: '3',
      deadline: '1700000000',
    },
  };

  // Signed (and recovered) over the raw strings, which hash identically.
  const signature = await account.signTypedData(data);
  const address = await recoverTypedDataAddress({
    ...(stringData as unknown as typeof data),
    signature,
  });
  t.is(address, account.address);

  const details = observationUtils.extractOperationDetailsFromDataWithAddress(
    { ...(stringData as unknown as typeof data), address },
    { verifyingContract: { [String(CHAIN_ID)]: CONTRACT_ADDRESS } },
  );
  t.deepEqual(details, {
    operation: 'Observe',
    domain: data.domain,
    data: {
      portfolio: 7n,
      tvls: [
        { instrument: 'Aave_Arbitrum', tvlUsd: 1_000_000n },
        { instrument: 'Compound_Base', tvlUsd: 2_000_000n },
      ],
    },
    evmWalletAddress: account.address,
    nonce: 3n,
    deadline: 1700000000n,
    // `data.message` is the original, all-bigint message `stringData` was
    // derived from: the string integers come back in canonical form.
    normalizedData: {
      domain: data.domain,
      types: data.types,
      primaryType: data.primaryType,
      message: data.message,
    },
  });
  // The normalized data hashes identically to what was received.
  t.is(
    hashTypedData(details.normalizedData as unknown as typeof data),
    hashTypedData(stringData as unknown as typeof data),
  );

  // A string `chainId` is hashed by viem's recovery when `types.EIP712Domain`
  // declares it (as `eth_signTypedData_v4` payloads do), so it's accepted.
  const stringChainIdData = {
    ...(stringData as unknown as typeof data),
    domain: { ...data.domain, chainId: String(CHAIN_ID) as any },
  };
  t.truthy(stringChainIdData.types.EIP712Domain);
  t.is(
    await recoverTypedDataAddress({ ...stringChainIdData, signature }),
    account.address,
  );
  t.deepEqual(
    observationUtils.extractOperationDetailsFromDataWithAddress(
      { ...stringChainIdData, address },
      { verifyingContract: { [String(CHAIN_ID)]: CONTRACT_ADDRESS } },
    ).domain,
    data.domain,
  );

  // Without `types.EIP712Domain`, viem leaves a string `chainId` out of the
  // domain hash entirely (ethers.js doesn't), so it's ambiguous and rejected.
  const { EIP712Domain: _, ...typesWithoutDomain } = stringChainIdData.types;
  t.throws(
    () =>
      observationUtils.extractOperationDetailsFromDataWithAddress(
        {
          ...stringChainIdData,
          types: typesWithoutDomain as typeof data.types,
          address,
        },
        { verifyingContract: { [String(CHAIN_ID)]: CONTRACT_ADDRESS } },
      ),
    {
      message:
        /Unexpected field\(s\) on EIP-712 type "EIP712Domain": "chainId"/,
    },
  );
  // ... while a number `chainId` is hashed by both.
  t.notThrows(() =>
    observationUtils.extractOperationDetailsFromDataWithAddress(
      {
        ...(stringData as unknown as typeof data),
        types: typesWithoutDomain as typeof data.types,
        address,
      },
      { verifyingContract: { [String(CHAIN_ID)]: CONTRACT_ADDRESS } },
    ),
  );
});

test('a declared types.EIP712Domain must cover exactly the present domain fields', t => {
  const data = makeObservation();
  const extract = (EIP712Domain: unknown, domain: object = data.domain) =>
    observationUtils.extractOperationDetailsFromDataWithAddress(
      {
        ...data,
        domain: domain as typeof data.domain,
        types: { ...data.types, EIP712Domain } as typeof data.types,
        address: account.address,
      },
      { verifyingContract: { [String(CHAIN_ID)]: CONTRACT_ADDRESS } },
    );
  const declared = data.types.EIP712Domain;

  // Any order is accepted, since that's what the signer hashed.
  t.notThrows(() => extract([...declared].reverse()));
  // But values are still checked against the standard domain types, e.g. a
  // negative chain ID declared as `int256`.
  t.throws(
    () =>
      extract(
        declared.map(field =>
          field.name === 'chainId' ? { ...field, type: 'int256' } : field,
        ),
        { ...data.domain, chainId: -1n },
      ),
    { message: /Value -1n is out of range for EIP-712 type "uint256"/ },
  );

  // Omitting a present field would leave it out of the signed hash.
  t.throws(
    () => extract(declared.filter(({ name }) => name !== 'verifyingContract')),
    {
      message:
        /Unexpected field\(s\) on EIP-712 type "EIP712Domain": "verifyingContract"/,
    },
  );
  // A declared field must be present.
  t.throws(() => extract([...declared, { name: 'salt', type: 'bytes32' }]), {
    message: /Missing required field "salt"/,
  });
  // A non-standard declared type is caught by domain validation.
  t.throws(
    () =>
      extract(
        declared.map(field =>
          field.name === 'chainId' ? { ...field, type: 'string' } : field,
        ),
        { ...data.domain, chainId: String(CHAIN_ID) },
      ),
    // Not part of the standard domain types viem derives for a string.
    {
      message:
        /Unexpected field\(s\) on EIP-712 type "EIP712Domain": "chainId"/,
    },
  );
  // Even a non-standard integer type that hashes fine: a `uint32` chainId
  // normalizes to a number, but the standard `uint256` requires a bigint.
  t.throws(
    () =>
      extract(
        declared.map(field =>
          field.name === 'chainId' ? { ...field, type: 'uint32' } : field,
        ),
        { ...data.domain, chainId: Number(CHAIN_ID) },
      ),
    { message: /Expected a bigint for EIP-712 type "uint256", got 42161$/ },
  );
});

test('a verifying contract declared with a non-address type must still be an address', t => {
  const withVerifyingContract = <D extends { domain?: object; types: object }>(
    data: D,
    type: string,
    verifyingContract: unknown,
  ) => ({
    ...data,
    domain: { ...data.domain, verifyingContract },
    types: {
      ...data.types,
      EIP712Domain: getTypesForEIP712Domain({
        domain: data.domain as any,
      }).map(field =>
        field.name === 'verifyingContract' ? { ...field, type } : field,
      ),
    },
    signature: MOCK_SIGNATURE,
    address: account.address,
  });

  // No contract address allowlist given, so only the shape is checked:
  // against the standard `address` domain type.
  const data = makeObservation();
  for (const [type, value] of [
    ['string', 'not-an-address'],
    ['uint256', 0x1234n],
  ] as const) {
    t.throws(
      () =>
        observationUtils.extractOperationDetailsFromDataWithAddress(
          withVerifyingContract(data, type, value) as any,
        ),
      { message: /Invalid EIP-712 address value/ },
      type,
    );
  }
  // Domain validation also checks it by itself.
  t.throws(
    () =>
      observationKit.validateDomain({
        ...data.domain,
        verifyingContract: 'not-an-address' as Address,
      }),
    { message: /Invalid verifying contract address in TestOracle domain/ },
  );
  // A real address declared as `string` still binds the same value.
  t.is(
    observationUtils.extractOperationDetailsFromDataWithAddress(
      withVerifyingContract(data, 'string', CONTRACT_ADDRESS) as any,
    ).domain.verifyingContract,
    CONTRACT_ADDRESS,
  );

  t.throws(
    () =>
      depositUtils.extractOperationDetailsFromDataWithAddress(
        withVerifyingContract(
          makeDepositPermit(),
          'string',
          'not-an-address',
        ) as any,
      ),
    { message: /Invalid EIP-712 address value/ },
  );
});

test('rejects a known field signed with a type other than the expected one', t => {
  const data = makeObservation();
  const extract = (name: string, type: string, value: unknown) =>
    observationUtils.extractOperationDetailsFromDataWithAddress(
      {
        ...data,
        types: {
          ...data.types,
          Observe: data.types.Observe.map(field =>
            field.name === name ? { ...field, type } : field,
          ),
        },
        message: { ...data.message, [name]: value },
        address: account.address,
      } as unknown as typeof data & { address: Address },
      { verifyingContract: { [String(CHAIN_ID)]: CONTRACT_ADDRESS } },
    );

  // Normalized to a number per the signed `uint48`, not the bigint the
  // expected `uint256` promises.
  t.throws(() => extract('portfolio', 'uint48', 7n), {
    message: /Expected a bigint for EIP-712 type "uint256", got 7$/,
  });
  // Kept as a string per the signed `string`.
  t.throws(() => extract('portfolio', 'string', '7'), {
    message: /Expected a bigint for EIP-712 type "uint256", got "7"/,
  });
  // Same for the envelope fields.
  t.throws(() => extract('nonce', 'uint48', 3n), {
    message: /Expected a bigint for EIP-712 type "uint256", got 3$/,
  });
  t.throws(() => extract('deadline', 'string', '1700000000'), {
    message: /Expected a bigint for EIP-712 type "uint256", got "1700000000"/,
  });
  // A wider integer type still yields the expected JS type for the value.
  t.is(extract('portfolio', 'uint64', 7n).data.portfolio, 7n);

  // Same for a permit2 witness.
  const permitData = makeDepositPermit();
  t.throws(
    () =>
      depositUtils.extractOperationDetailsFromDataWithAddress(
        {
          ...permitData,
          types: {
            ...permitData.types,
            TestVaultV1Deposit: [{ name: 'account', type: 'uint48' }],
          },
          signature: MOCK_SIGNATURE,
          address: account.address,
        } as unknown as typeof permitData & {
          signature: typeof MOCK_SIGNATURE;
          address: Address;
        },
        { permit2: { [String(CHAIN_ID)]: PERMIT2_ADDRESS } },
      ),
    { message: /Expected a bigint for EIP-712 type "uint256", got 5$/ },
  );
});

test('rejects a standalone message with an unexpected verifying contract', t => {
  const data = makeObservation(OTHER_ADDRESS);
  t.throws(
    () =>
      observationUtils.extractOperationDetailsFromDataWithAddress(
        { ...data, address: account.address },
        { verifyingContract: { [String(CHAIN_ID)]: CONTRACT_ADDRESS } },
      ),
    { message: /Invalid verifying contract/ },
  );
});

test('rejects a standalone message of another schema', t => {
  const data = makeObservation();
  const asDeposit = {
    ...data,
    domain: depositKit.getStandaloneDomain(CHAIN_ID, CONTRACT_ADDRESS),
  };
  t.throws(
    () =>
      observationUtils.extractOperationDetailsFromDataWithAddress({
        ...asDeposit,
        address: account.address,
      } as any),
    { message: /Invalid TestOracle domain name: TestVault/ },
  );
  t.throws(
    () =>
      depositUtils.extractOperationDetailsFromDataWithAddress({
        ...data,
        address: account.address,
      } as any),
    { message: /Invalid TestVault domain name: TestOracle/ },
  );
});

test('rejects an operation not in the schema, even in the schema domain', t => {
  const data = makeObservation();
  const { Observe, ...types } = data.types;
  const forged = {
    ...data,
    types: { ...types, Rebalance: Observe },
    primaryType: 'Rebalance',
    address: account.address,
  };
  t.throws(
    () =>
      observationUtils.extractOperationDetailsFromDataWithAddress(
        forged as any,
      ),
    { message: /Unknown TestOracle operation type: Rebalance/ },
  );
});

test('operation names are own properties of the schema', t => {
  t.throws(() => observationKit.validateOperationTypeName('toString'), {
    message: /Unknown TestOracle operation type/,
  });
});

test('operations named after inherited properties are not mistaken for permit2 messages', t => {
  // Relies on the permit2 primary types lookup not inheriting properties.
  const schema = {
    domainName: 'Test',
    domainVersion: '1',
    operationTypes: { toString: [{ name: 'x', type: 'uint256' }] },
    subTypes: {},
  } as const satisfies EIP712MessageSchema;
  const kit = makeEIP712MessageKit(schema);
  const utils = makeEIP712MessageHandlerUtils(viemUtils, schema);
  const data = kit.getStandaloneOperationData(
    { x: 1n, nonce: 2n, deadline: 3n },
    'toString',
    CHAIN_ID,
    CONTRACT_ADDRESS,
  );
  const details = utils.extractOperationDetailsFromDataWithAddress({
    ...data,
    address: account.address,
  });
  t.like(details, { operation: 'toString', data: { x: 1n }, nonce: 2n });
});

test('permit2 witness messages are rejected for a standalone-only schema', t => {
  t.throws(
    () => observationKit.getWitness('Observe', { portfolio: 1n, tvls: [] }),
    { message: /TestOracle messages do not support permit2 witness data/ },
  );

  // Forge a witness message of the right shape for the schema's operation.
  const permitData = makeDepositPermit({
    witness: { portfolio: 1n, tvls: [] },
    witnessTypes: {
      TestOracleV2Observe: ObservationSchema.operationTypes.Observe.slice(0, 2),
      InstrumentTvl: ObservationSchema.subTypes.InstrumentTvl,
    },
    witnessField: { name: 'oracleObserve', type: 'TestOracleV2Observe' },
  } as unknown as DepositWitness);
  t.throws(
    () =>
      observationUtils.extractOperationDetailsFromDataWithAddress({
        ...permitData,
        signature: MOCK_SIGNATURE,
        address: account.address,
      } as any),
    { message: /TestOracle messages do not support permit2 witness data/ },
  );
});

test('permit2 witness message of a custom schema', t => {
  const permitData = makeDepositPermit();
  t.deepEqual(permitData.types.PermitWitnessTransferFrom.at(-1), {
    name: 'vaultDeposit',
    type: 'TestVaultV1Deposit',
  });

  const details = depositUtils.extractOperationDetailsFromDataWithAddress(
    { ...permitData, signature: MOCK_SIGNATURE, address: account.address },
    {
      permit2: { [String(CHAIN_ID)]: PERMIT2_ADDRESS },
      verifyingContract: { [String(CHAIN_ID)]: CONTRACT_ADDRESS },
    },
  );
  const { permitDetails, normalizedData, ...rest } = details;
  t.deepEqual(normalizedData, {
    domain: permitData.domain,
    types: permitData.types,
    primaryType: permitData.primaryType,
    message: permitData.message,
  });
  t.deepEqual(rest, {
    operation: 'Deposit',
    domain: {
      name: 'TestVault',
      version: '1',
      chainId: CHAIN_ID,
      verifyingContract: CONTRACT_ADDRESS,
    },
    data: { account: 5n },
    evmWalletAddress: account.address,
    nonce: 11n,
    deadline: 1700000000n,
  });
  t.like(permitDetails, {
    chainId: CHAIN_ID,
    token: USDC_ADDRESS,
    amount: 1_000_000n,
    spender: CONTRACT_ADDRESS,
    permit2Payload: {
      owner: account.address,
      witnessTypeString:
        'TestVaultV1Deposit vaultDeposit)TestVaultV1Deposit(uint256 account)TokenPermissions(address token,uint256 amount)',
      signature: MOCK_SIGNATURE,
    },
  });

  t.throws(
    () =>
      depositUtils.extractOperationDetailsFromDataWithAddress(
        { ...permitData, signature: MOCK_SIGNATURE, address: account.address },
        { verifyingContract: { [String(CHAIN_ID)]: OTHER_ADDRESS } },
      ),
    { message: /Invalid verifying contract/ },
  );
});

test('rejects a permit2 witness of another schema version', t => {
  const witness = depositKit.getWitness('Deposit', { account: 5n });
  const { TestVaultV1Deposit, ...subTypes } = witness.witnessTypes;
  const permitData = makeDepositPermit({
    witness: witness.witness,
    witnessTypes: { ...subTypes, TestVaultV2Deposit: TestVaultV1Deposit },
    witnessField: { name: 'vaultDeposit', type: 'TestVaultV2Deposit' },
  } as unknown as DepositWitness);
  t.throws(
    () =>
      depositUtils.extractOperationDetailsFromDataWithAddress({
        ...permitData,
        signature: MOCK_SIGNATURE,
        address: account.address,
      } as any),
    { message: /Invalid TestVault domain version: 2/ },
  );
});

test('makeEIP712MessageKit rejects invalid schemas', t => {
  const base = {
    domainName: 'Test',
    domainVersion: '1',
    operationTypes: { Op: [{ name: 'x', type: 'uint256' }] },
    subTypes: {},
  } as const satisfies EIP712MessageSchema;
  t.notThrows(() => makeEIP712MessageKit(base));
  t.throws(() => makeEIP712MessageKit({ ...base, domainName: 'Te st' }), {
    message: /domain name/,
  });
  t.throws(
    () => makeEIP712MessageKit({ ...base, domainVersion: '1.0' as '1' }),
    { message: /domain version/ },
  );
  t.throws(
    () => makeEIP712MessageKit({ ...base, witnessFieldNamePrefix: '' }),
    { message: /witness field name prefix/ },
  );
  t.throws(
    () =>
      makeEIP712MessageKit({
        ...base,
        subTypes: { Op: [{ name: 'y', type: 'uint256' }] },
      }),
    { message: /collides/ },
  );
  t.throws(
    () =>
      makeEIP712MessageKit({
        ...base,
        operationTypes: { EIP712Domain: [{ name: 'y', type: 'uint256' }] },
      }),
    { message: /operation name is reserved: EIP712Domain/ },
  );
  // would be dispatched as a permit2 message
  t.throws(
    () =>
      makeEIP712MessageKit({
        ...base,
        operationTypes: {
          PermitWitnessTransferFrom: [{ name: 'y', type: 'uint256' }],
        },
      }),
    { message: /operation name is reserved: PermitWitnessTransferFrom/ },
  );
  // would be merged with the permit2 types of a witness message
  t.throws(
    () =>
      makeEIP712MessageKit({
        ...base,
        subTypes: { TokenPermissions: [{ name: 'y', type: 'uint256' }] },
      }),
    { message: /sub-type name is reserved: TokenPermissions/ },
  );
  // would be duplicated by the standalone envelope
  t.throws(
    () =>
      makeEIP712MessageKit({
        ...base,
        operationTypes: { Op: [{ name: 'deadline', type: 'uint256' }] },
      }),
    { message: /Op field name is reserved: deadline/ },
  );
  const withWitness = { ...base, witnessFieldNamePrefix: 'test' } as const;
  t.notThrows(() => makeEIP712MessageKit(withWitness));
  // a sub-type would replace the generated witness type
  t.throws(
    () =>
      makeEIP712MessageKit({
        ...withWitness,
        subTypes: { TestV1Op: [{ name: 'y', type: 'uint256' }] },
      }),
    { message: /witness type name of Op collides with a sub-type: TestV1Op/ },
  );
  t.notThrows(
    () =>
      makeEIP712MessageKit({
        ...base,
        subTypes: { TestV1Op: [{ name: 'y', type: 'uint256' }] },
      }),
    'no witness types without permit2 support',
  );
  // the witness field would shadow a permit field
  t.throws(
    () =>
      makeEIP712MessageKit({
        ...base,
        witnessFieldNamePrefix: 'spend',
        operationTypes: { er: [{ name: 'x', type: 'uint256' }] },
      }),
    {
      message: /witness field name of er collides with a permit field: spender/,
    },
  );
});

test('authoring accepts string-encoded integers and normalizes them', t => {
  const witness = depositKit.getWitness('Deposit', { account: '0x5' });
  t.deepEqual(witness, depositKit.getWitness('Deposit', { account: 5n }));

  const data = observationKit.getStandaloneOperationData(
    {
      portfolio: '7',
      tvls: [{ instrument: 'Aave_Arbitrum', tvlUsd: 1_000_000 }],
      nonce: '+3',
      deadline: 1700000000n,
    },
    'Observe',
    CHAIN_ID,
    CONTRACT_ADDRESS,
  );
  t.deepEqual(data.message, {
    portfolio: 7n,
    tvls: [{ instrument: 'Aave_Arbitrum', tvlUsd: 1_000_000n }],
    nonce: 3n,
    deadline: 1700000000n,
  });
  // The output type is still the canonical `bigint`.
  const portfolio: bigint = data.message.portfolio;
  t.is(portfolio, 7n);

  // @ts-expect-error not an integer encoding
  t.throws(() => depositKit.getWitness('Deposit', { account: true }));
});

test('normalized output matches abitype types for small and large integer widths', t => {
  const kit = makeEIP712MessageKit({
    domainName: 'TestWidths',
    domainVersion: '1',
    operationTypes: {
      Sized: [
        { name: 'small', type: 'uint32' },
        { name: 'large', type: 'uint64' },
      ],
    },
    subTypes: {},
  } as const satisfies EIP712MessageSchema);

  const { message } = kit.getStandaloneOperationData(
    { small: 7n, large: 8, nonce: 1n, deadline: 2n },
    'Sized',
    CHAIN_ID,
    CONTRACT_ADDRESS,
  );
  const small: number = message.small;
  const large: bigint = message.large;
  t.is(small, 7);
  t.is(large, 8n);
});
