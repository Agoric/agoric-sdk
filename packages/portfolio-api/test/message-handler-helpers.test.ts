import '@endo/init/debug.js';

import test from 'ava';

import { getPermitWitnessTransferFromData } from '@agoric/orchestration/src/utils/permit2.js';
import {
  isHex,
  hashStruct,
  recoverTypedDataAddress,
  getTypesForEIP712Domain,
  encodeType,
} from '@agoric/orchestration/src/stubs/viem-typedData.ts';

import {
  getYmaxStandaloneOperationData,
  getYmaxWitness,
} from '../src/evm-wallet/eip712-messages.ts';
import { makeEVMHandlerUtils } from '../src/evm-wallet/message-handler-helpers.ts';

// `extractOperationDetailsFromDataWithAddress` doesn't itself verify the
// signature or the `address` -- that's expected to have already been done by
// the caller (e.g. via `recoverTypedDataAddress`). So these can be mock
// values rather than an actual signature over the message, and no real
// signing dependency (`viem/accounts`) is needed.
const MOCK_ADDRESS = '0xMockSignerAddress0000000000000000000000' as const;
const MOCK_SIGNATURE = `0x${'ab'.repeat(65)}` as const;

const CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890' as const;
const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3' as const;
const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as const;
const CHAIN_ID = 42161n;

const { extractOperationDetailsFromDataWithAddress } = makeEVMHandlerUtils({
  isHex,
  hashStruct,
  recoverTypedDataAddress,
  encodeType,
  getTypesForEIP712Domain,
});

test('extractOperationDetailsFromDataWithAddress rejects an extra top-level field (standalone Grant)', t => {
  const message = getYmaxStandaloneOperationData(
    {
      accountHolder: 'agoric1exampleaccountholder',
      permissions: { allocation: true },
      portfolio: 0n,
      nonce: 1n,
      deadline: 1700000000n,
    },
    'Grant',
    CHAIN_ID,
    CONTRACT_ADDRESS,
  );

  // Extra field added to `message`. Since it isn't declared in `types`, it
  // never affects the EIP-712 hash, so a real signature would still be
  // valid for this tampered payload -- this is exactly the AGO-874 gap.
  const tampered = {
    ...message,
    message: { ...message.message, adminOverride: true },
    signature: MOCK_SIGNATURE,
    address: MOCK_ADDRESS,
  };

  t.throws(
    () => extractOperationDetailsFromDataWithAddress(tampered as any, {}),
    {
      message: /adminOverride/,
    },
  );
});

test('extractOperationDetailsFromDataWithAddress rejects an extra nested field (permissions)', t => {
  const message = getYmaxStandaloneOperationData(
    {
      accountHolder: 'agoric1exampleaccountholder',
      permissions: { allocation: true },
      portfolio: 0n,
      nonce: 1n,
      deadline: 1700000000n,
    },
    'Grant',
    CHAIN_ID,
    CONTRACT_ADDRESS,
  );

  const tampered = {
    ...message,
    message: {
      ...message.message,
      permissions: { ...message.message.permissions, rebalance2: true },
    },
    signature: MOCK_SIGNATURE,
    address: MOCK_ADDRESS,
  };

  t.throws(
    () => extractOperationDetailsFromDataWithAddress(tampered as any, {}),
    {
      message: /rebalance2/,
    },
  );
});

test('extractOperationDetailsFromDataWithAddress accepts a legitimate optional permission constraint', t => {
  const message = getYmaxStandaloneOperationData(
    {
      accountHolder: 'agoric1exampleaccountholder',
      permissions: {
        allocation: true,
        maxWeightBps: 1_500n,
      },
      portfolio: 0n,
      nonce: 1n,
      deadline: 1700000000n,
    },
    'Grant',
    CHAIN_ID,
    CONTRACT_ADDRESS,
  );

  const details = extractOperationDetailsFromDataWithAddress(
    { ...message, signature: MOCK_SIGNATURE, address: MOCK_ADDRESS } as any,
    {},
  );

  t.is(details.operation, 'Grant');
  t.deepEqual((details.data as any).permissions, {
    allocation: true,
    maxWeightBps: 1_500n,
  });
});

test('extractOperationDetailsFromDataWithAddress keeps (does not reject or drop) a field that was genuinely signed but is unsupported by this version (standalone Grant)', t => {
  const message = getYmaxStandaloneOperationData(
    {
      accountHolder: 'agoric1exampleaccountholder',
      permissions: { allocation: true },
      portfolio: 0n,
      nonce: 1n,
      deadline: 1700000000n,
    },
    'Grant',
    CHAIN_ID,
    CONTRACT_ADDRESS,
  );

  // Simulate a newer client that signs an extra `memo` field on `Grant`,
  // declaring it in `types` too -- so it's genuinely part of what gets
  // hashed/signed. This (older) code doesn't know about `memo` yet, but
  // since it was actually signed (not smuggled in unsigned), it must be
  // kept rather than silently dropped -- an unknown field could be
  // permissions-bearing (e.g. a not-yet-understood attenuation), and
  // dropping it would turn an attenuated grant into an unconstrained one.
  const augmented = {
    ...message,
    types: {
      ...message.types,
      Grant: [...message.types.Grant, { name: 'memo', type: 'string' }],
    },
    message: { ...message.message, memo: 'hello' },
  };

  const details = extractOperationDetailsFromDataWithAddress(
    { ...augmented, signature: MOCK_SIGNATURE, address: MOCK_ADDRESS } as any,
    {},
  );

  t.is(details.operation, 'Grant');
  t.deepEqual(details.data, {
    accountHolder: 'agoric1exampleaccountholder',
    permissions: { allocation: true },
    portfolio: 0n,
    memo: 'hello',
  });
});

test('extractOperationDetailsFromDataWithAddress keeps a signed-but-unsupported field nested inside `permissions` (standalone Grant)', t => {
  const message = getYmaxStandaloneOperationData(
    {
      accountHolder: 'agoric1exampleaccountholder',
      permissions: { allocation: true },
      portfolio: 0n,
      nonce: 1n,
      deadline: 1700000000n,
    },
    'Grant',
    CHAIN_ID,
    CONTRACT_ADDRESS,
  );

  // Simulate a newer client whose `permissions` struct carries an extra,
  // genuinely signed constraint field this (older) code doesn't understand
  // yet -- e.g. a future per-instrument attenuation. This is exactly the
  // compatibility hazard: silently dropping it here would make an
  // attenuated grant look unconstrained to this version's `grant()`.
  // Permission consumers, not this extraction step, are responsible for
  // rejecting the unrecognized field.
  const augmented = {
    ...message,
    types: {
      ...message.types,
      PortfolioPermissions: [
        ...message.types.PortfolioPermissions,
        { name: 'allocationMaxWeights', type: 'string' },
      ],
    },
    message: {
      ...message.message,
      permissions: {
        ...message.message.permissions,
        allocationMaxWeights: 'unsupported-constraint',
      },
    },
  };

  const details = extractOperationDetailsFromDataWithAddress(
    { ...augmented, signature: MOCK_SIGNATURE, address: MOCK_ADDRESS } as any,
    {},
  );

  t.is(details.operation, 'Grant');
  t.deepEqual((details.data as any).permissions, {
    allocation: true,
    allocationMaxWeights: 'unsupported-constraint',
  });
});

test('extractOperationDetailsFromDataWithAddress rejects an extra field nested inside a permit2 witness (OpenPortfolio with grantee)', t => {
  const witness = getYmaxWitness('OpenPortfolio', {
    allocations: [{ instrument: 'Aave_Arbitrum', portion: 10000n }],
    grantee: {
      address: 'agoric1exampleagentaddress',
      permissions: { allocation: true },
    },
  });
  const permitMessage = getPermitWitnessTransferFromData(
    {
      permitted: { token: USDC_ADDRESS, amount: 1_000_000n },
      spender: CONTRACT_ADDRESS,
      nonce: 1n,
      deadline: 1700000000n,
    },
    PERMIT2_ADDRESS,
    CHAIN_ID,
    witness,
  );

  const witnessFieldName = witness.witnessField.name;
  const witnessData = (permitMessage.message as any)[witnessFieldName];
  const tamperedWitnessData = {
    ...witnessData,
    grantee: { ...witnessData.grantee, extra: 'not-signed' },
  };
  const tampered = {
    ...permitMessage,
    message: {
      ...permitMessage.message,
      [witnessFieldName]: tamperedWitnessData,
    },
    signature: MOCK_SIGNATURE,
    address: MOCK_ADDRESS,
  };

  t.throws(
    () => extractOperationDetailsFromDataWithAddress(tampered as any, {}),
    {
      message: /extra/,
    },
  );
});

test('extractOperationDetailsFromDataWithAddress computes the permit2 witness hash/type string from the actual signed data, consistent with the kept generated-types data', t => {
  const witness = getYmaxWitness('OpenPortfolio', {
    allocations: [{ instrument: 'Aave_Arbitrum', portion: 10000n }],
  });

  // Simulate a newer client that signs an extra `memo` field on the witness
  // struct, declaring it in `witnessTypes` too -- so it's genuinely part of
  // what gets hashed/signed, even though this (older) code doesn't know
  // about `memo` for `OpenPortfolio` yet.
  const witnessTypeName = witness.witnessField.type;
  const augmentedWitnessData = { ...witness.witness, memo: 'hello' };
  const augmentedWitness = {
    witnessField: witness.witnessField,
    witnessTypes: {
      ...witness.witnessTypes,
      [witnessTypeName]: [
        ...(witness.witnessTypes as any)[witnessTypeName],
        { name: 'memo', type: 'string' },
      ],
    },
    witness: augmentedWitnessData,
  };

  const permitMessage = getPermitWitnessTransferFromData(
    {
      permitted: { token: USDC_ADDRESS, amount: 1_000_000n },
      spender: CONTRACT_ADDRESS,
      nonce: 1n,
      deadline: 1700000000n,
    },
    PERMIT2_ADDRESS,
    CHAIN_ID,
    augmentedWitness as any,
  );

  // Ground truth: the hash of exactly what was actually signed (`memo`
  // included), computed directly rather than through extraction.
  const expectedWitness = hashStruct({
    primaryType: witnessTypeName,
    types: permitMessage.types as any,
    data: augmentedWitnessData,
  });

  const details = extractOperationDetailsFromDataWithAddress(
    {
      ...permitMessage,
      signature: MOCK_SIGNATURE,
      address: MOCK_ADDRESS,
    } as any,
    {},
  );

  // The authorization-facing `data` keeps `memo` even though it isn't part
  // of this version's generated types for `OpenPortfolio` -- it was
  // genuinely signed, so it must not silently disappear.
  t.is(details.operation, 'OpenPortfolio');
  t.deepEqual(details.data, {
    allocations: [{ instrument: 'Aave_Arbitrum', portion: 10000n }],
    memo: 'hello',
  });

  // But the permit2 witness hash and type string -- what actually gets
  // presented to the on-chain Permit2 contract to verify the signature --
  // must reflect the full signed struct, `memo` included. Using the
  // dropped/generated-types data here would hash something the user never
  // actually signed, breaking Permit2's own signature check.
  const { permit2Payload } = details.permitDetails!;
  t.is(permit2Payload.witness, expectedWitness);
  t.regex(permit2Payload.witnessTypeString, /memo/);
});
