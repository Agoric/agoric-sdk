import '@endo/init/debug.js';

import test from '@endo/ses-ava/prepare-endo.js';

import type { Address } from 'abitype';
import { privateKeyToAccount } from 'viem/accounts';
import {
  encodeType,
  getTypesForEIP712Domain,
  hashStruct,
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
  });

  const recovered =
    await observationUtils.extractOperationDetailsFromSignedData({
      ...data,
      signature,
    });
  t.is(recovered.evmWalletAddress, account.address);
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
  const { permitDetails, ...rest } = details;
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
