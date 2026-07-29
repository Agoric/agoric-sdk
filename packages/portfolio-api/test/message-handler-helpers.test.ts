import '@endo/init/debug.js';

import test from 'ava';

import {
  isHex,
  hashStruct,
  recoverTypedDataAddress,
  validateTypedData,
  getTypesForEIP712Domain,
  encodeType,
} from '@agoric/orchestration/src/stubs/viem-typedData.ts';

import { getYmaxStandaloneOperationData } from '../src/evm-wallet/eip712-messages.ts';
import { makeEVMHandlerUtils } from '../src/evm-wallet/message-handler-helpers.ts';

// `extractOperationDetailsFromDataWithAddress` doesn't itself verify the
// signature or the `address` -- that's expected to have already been done by
// the caller (e.g. via `recoverTypedDataAddress`). So these can be mock
// values rather than an actual signature over the message, and no real
// signing dependency (`viem/accounts`) is needed.
const MOCK_ADDRESS = '0xMockSignerAddress0000000000000000000000' as const;
const MOCK_SIGNATURE = `0x${'ab'.repeat(65)}` as const;

const CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890' as const;
const CHAIN_ID = 42161n;

const { extractOperationDetailsFromDataWithAddress } = makeEVMHandlerUtils({
  isHex,
  hashStruct,
  recoverTypedDataAddress,
  validateTypedData,
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

test('extractOperationDetailsFromDataWithAddress drops (does not reject) a field that was genuinely signed but is unsupported by this version (standalone Grant)', t => {
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
  // since it was actually signed (not smuggled in unsigned), it should be
  // silently dropped rather than rejected.
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
  });
  t.false('memo' in (details.data as any));
});
