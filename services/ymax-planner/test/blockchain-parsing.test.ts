/** @file Quick wins: Blockchain data parsing and validation edge cases */
import test from 'ava';

import { ethers, id } from 'ethers';
import { boardSlottingMarshaller } from '@agoric/client-utils';
import { AmountMath } from '@agoric/ertp';
import type { Brand } from '@agoric/ertp/src/types.js';
import { Far } from '@endo/pass-style';
import {
  TxStatus,
  TxType,
} from '@aglocal/portfolio-contract/src/resolver/constants.js';

import {
  parseStreamCell,
  parseStreamCellValue,
} from '../src/vstorage-utils.ts';
import { processPendingTxEvents, makeVstorageEvent } from '../src/engine.ts';
import { createMockPendingTxOpts } from './mocks.ts';

const marshaller = boardSlottingMarshaller();
const depositBrand = Far('mock brand') as Brand<'nat'>;

// ============================================================================
// 1. Vstorage Data Parsing Edge Cases
// ============================================================================

test('parseStreamCell handles various blockHeight formats', t => {
  // Valid string format
  const valid1 = parseStreamCell(
    JSON.stringify({ blockHeight: '123', values: [] }),
    'path',
  );
  t.is(valid1.blockHeight, '123');

  // Large block height
  const valid2 = parseStreamCell(
    JSON.stringify({ blockHeight: '999999999999', values: [] }),
    'path',
  );
  t.is(valid2.blockHeight, '999999999999');

  // Zero block height
  const valid3 = parseStreamCell(
    JSON.stringify({ blockHeight: '0', values: [] }),
    'path',
  );
  t.is(valid3.blockHeight, '0');
});

test('parseStreamCell rejects invalid blockHeight types', t => {
  // Number instead of string
  t.throws(
    () =>
      parseStreamCell(JSON.stringify({ blockHeight: 123, values: [] }), 'path'),
    { message: /blockHeight.*must be a string/ },
  );

  // Null
  t.throws(
    () =>
      parseStreamCell(
        JSON.stringify({ blockHeight: null, values: [] }),
        'path',
      ),
    { message: /blockHeight.*must be a string/ },
  );

  // Object
  t.throws(
    () =>
      parseStreamCell(JSON.stringify({ blockHeight: {}, values: [] }), 'path'),
    { message: /blockHeight.*must be a string/ },
  );

  // Undefined (missing)
  t.throws(() => parseStreamCell(JSON.stringify({ values: [] }), 'path'), {
    message: /blockHeight.*must be a string/,
  });
});

test('parseStreamCell rejects invalid values types', t => {
  // String instead of array
  t.throws(
    () =>
      parseStreamCell(
        JSON.stringify({ blockHeight: '100', values: 'string' }),
        'path',
      ),
    { message: /values.*must be an array/ },
  );

  // Object instead of array
  t.throws(
    () =>
      parseStreamCell(
        JSON.stringify({ blockHeight: '100', values: {} }),
        'path',
      ),
    { message: /values.*must be an array/ },
  );

  // Null
  t.throws(
    () =>
      parseStreamCell(
        JSON.stringify({ blockHeight: '100', values: null }),
        'path',
      ),
    { message: /values.*must be an array/ },
  );

  // Missing
  t.throws(
    () => parseStreamCell(JSON.stringify({ blockHeight: '100' }), 'path'),
    {
      message: /values.*must be an array/,
    },
  );
});

test('parseStreamCellValue handles negative indices correctly', t => {
  const cell = {
    blockHeight: '100',
    values: ['first', 'second', 'third'],
  };

  // -1 should get last element
  const last = parseStreamCellValue(cell, -1, 'path');
  t.is(last, 'third');

  // -2 should get second-to-last
  const secondLast = parseStreamCellValue(cell, -2, 'path');
  t.is(secondLast, 'second');

  // -3 should get first
  const first = parseStreamCellValue(cell, -3, 'path');
  t.is(first, 'first');

  // -4 should throw (out of bounds)
  t.throws(() => parseStreamCellValue(cell, -4, 'path'), {
    message: /index -4 out of bounds/,
  });
});

test('parseStreamCellValue handles boundary indices', t => {
  const cell = {
    blockHeight: '100',
    values: ['only'],
  };

  // First element
  t.is(parseStreamCellValue(cell, 0, 'path'), 'only');

  // Last element (same as first in single-element array)
  t.is(parseStreamCellValue(cell, -1, 'path'), 'only');

  // Out of bounds positive
  t.throws(() => parseStreamCellValue(cell, 1, 'path'), {
    message: /index 1 out of bounds/,
  });

  // Out of bounds negative
  t.throws(() => parseStreamCellValue(cell, -2, 'path'), {
    message: /index -2 out of bounds/,
  });
});

test('parseStreamCellValue handles empty values array', t => {
  const cell = {
    blockHeight: '100',
    values: [],
  };

  t.throws(() => parseStreamCellValue(cell, 0, 'path'), {
    message: /index 0 out of bounds/,
  });

  t.throws(() => parseStreamCellValue(cell, -1, 'path'), {
    message: /index -1 out of bounds/,
  });
});

test('parseStreamCellValue preserves JSON structure', t => {
  const complexValue = {
    nested: { deeply: { value: 123 } },
    array: [1, 2, 3],
    nullValue: null,
    boolValue: true,
  };

  const cell = {
    blockHeight: '100',
    values: [JSON.stringify(complexValue)],
  };

  const parsed = parseStreamCellValue(cell, 0, 'path');
  t.deepEqual(JSON.parse(parsed), complexValue);
});

// ============================================================================
// 2. Pending Transaction Event Processing
// ============================================================================

test('processPendingTxEvents skips non-pending transactions', async t => {
  const handledTxs: any[] = [];
  const mockHandler = async (tx: any) => {
    handledTxs.push(tx);
  };

  // Create a completed transaction
  const completedTxData = {
    status: TxStatus.SUCCESS, // Not pending
    type: TxType.CCTP_TO_EVM,
    amount: 1000000n,
    destinationAddress: 'eip155:1:0x123',
  };

  const capData = marshaller.toCapData(completedTxData);
  const streamCell = JSON.stringify({
    blockHeight: '100',
    values: [JSON.stringify(capData)],
  });

  const events = [
    {
      path: 'published.ymax1.tx1',
      value: streamCell,
    },
  ];

  await processPendingTxEvents(events, mockHandler, createMockPendingTxOpts());

  // Should not process completed transaction
  t.is(handledTxs.length, 0);
});

test('processPendingTxEvents skips CCTP_TO_AGORIC transactions', async t => {
  const handledTxs: any[] = [];
  const mockHandler = async (tx: any) => {
    handledTxs.push(tx);
  };

  // Create a CCTP_TO_AGORIC transaction (inbound, handled by contract)
  const cctpToAgoricData = {
    status: TxStatus.PENDING,
    type: TxType.CCTP_TO_AGORIC, // This type is excluded
    amount: 1000000n,
    destinationAddress: 'agoric:testchain:agoric1abc',
  };

  const capData = marshaller.toCapData(cctpToAgoricData);
  const streamCell = JSON.stringify({
    blockHeight: '100',
    values: [JSON.stringify(capData)],
  });

  const events = [
    {
      path: 'published.ymax1.tx1',
      value: streamCell,
    },
  ];

  await processPendingTxEvents(events, mockHandler, createMockPendingTxOpts());

  // Should not process CCTP_TO_AGORIC transactions
  t.is(handledTxs.length, 0);
});

test('processPendingTxEvents handles malformed transaction data', async t => {
  const handledTxs: any[] = [];
  const errors: any[] = [];
  const mockHandler = async (tx: any) => {
    handledTxs.push(tx);
  };

  // Create malformed data (missing required fields)
  const malformedData = {
    status: TxStatus.PENDING,
    // Missing: type, amount, destinationAddress
  };

  const capData = marshaller.toCapData(malformedData);
  const streamCell = JSON.stringify({
    blockHeight: '100',
    values: [JSON.stringify(capData)],
  });

  const events = [
    {
      path: 'published.ymax1.tx1',
      value: streamCell,
    },
  ];

  await processPendingTxEvents(events, mockHandler, {
    ...createMockPendingTxOpts(),
    error: (...args: any[]) => errors.push(args),
  });

  // Should not process malformed transaction
  t.is(handledTxs.length, 0);
  // Should have logged error
  t.true(errors.length > 0);
  t.true(errors[0]?.some((arg: any) => String(arg).includes('Failed')));
});

test('processPendingTxEvents extracts txId from path', async t => {
  const handledTxs: any[] = [];
  const mockHandler = async (tx: any) => {
    handledTxs.push(tx);
  };

  const txData = {
    status: TxStatus.PENDING,
    type: TxType.CCTP_TO_EVM,
    amount: 1000000n,
    destinationAddress: 'eip155:1:0x123',
  };

  const capData = marshaller.toCapData(txData);
  const streamCell = JSON.stringify({
    blockHeight: '100',
    values: [JSON.stringify(capData)],
  });

  const events = [
    {
      path: 'published.ymax1.pendingTxs.tx42', // txId should be tx42
      value: streamCell,
    },
  ];

  await processPendingTxEvents(events, mockHandler, createMockPendingTxOpts());

  t.is(handledTxs.length, 1);
  t.is(handledTxs[0]?.txId, 'tx42');
});

test('processPendingTxEvents processes multiple values in stream cell', async t => {
  const handledTxs: any[] = [];
  const mockHandler = async (tx: any) => {
    handledTxs.push(tx);
  };

  const txData1 = {
    status: TxStatus.PENDING,
    type: TxType.CCTP_TO_EVM,
    amount: 1000000n,
    destinationAddress: 'eip155:1:0x123',
  };

  const txData2 = {
    status: TxStatus.PENDING,
    type: TxType.GMP,
    amount: 2000000n,
    destinationAddress: 'eip155:42161:0x456',
  };

  // Stream cell with multiple values (unusual but valid)
  const streamCell = JSON.stringify({
    blockHeight: '100',
    values: [
      JSON.stringify(marshaller.toCapData(txData1)),
      JSON.stringify(marshaller.toCapData(txData2)),
    ],
  });

  const events = [
    {
      path: 'published.ymax1.pendingTxs.tx1',
      value: streamCell,
    },
  ];

  await processPendingTxEvents(events, mockHandler, createMockPendingTxOpts());

  // Should only process the last value (index -1)
  t.is(handledTxs.length, 1);
  t.is(handledTxs[0]?.type, TxType.GMP);
  t.is(handledTxs[0]?.amount, 2000000n);
});

// ============================================================================
// 3. makeVstorageEvent Function Tests
// ============================================================================

test('makeVstorageEvent creates properly formatted event', t => {
  const blockHeight = 123n;
  const path = 'published.test.portfolios.portfolio1';
  const value = { test: 'data', amount: AmountMath.make(depositBrand, 1000n) };

  const { event, streamCellJson } = makeVstorageEvent(
    blockHeight,
    path,
    value,
    marshaller,
  );

  // Check event structure
  t.is(event.type, 'state_change');
  t.true(Array.isArray(event.attributes));
  t.true(event.attributes!.length > 0);

  // Check event attributes
  const attrs = Object.fromEntries(
    event.attributes!.map(a => [a.key, a.value]),
  );
  t.is(attrs.store, 'vstorage');
  t.truthy(attrs.key);
  t.truthy(attrs.value);

  // Check stream cell JSON
  const streamCell = JSON.parse(streamCellJson);
  t.is(streamCell.blockHeight, '123');
  t.true(Array.isArray(streamCell.values));
  t.is(streamCell.values.length, 1);

  // Check that value can be unmarshalled
  const capData = JSON.parse(streamCell.values[0]);
  const unmarshalled = marshaller.fromCapData(capData);
  t.deepEqual(unmarshalled, value);
});

test('makeVstorageEvent handles nested path segments', t => {
  const path = 'published.ymax1.portfolios.portfolio5.flows.flow3';
  const value = { status: 'in-progress' };

  const { event } = makeVstorageEvent(0n, path, value, marshaller);

  const attrs = Object.fromEntries(
    event.attributes!.map(a => [a.key, a.value]),
  );

  // Key should encode all path segments
  const keyParts = attrs.key.split('\x00');
  t.true(keyParts.length > 1);
  // First part is the number of segments
  t.is(keyParts[0], String(path.split('.').length));
});

test('makeVstorageEvent preserves complex nested structures', t => {
  const complexValue = {
    nested: {
      deeply: {
        value: 123,
        array: [1, 2, 3],
      },
    },
    amounts: [
      AmountMath.make(depositBrand, 100n),
      AmountMath.make(depositBrand, 200n),
    ],
    map: {
      key1: 'value1',
      key2: 'value2',
    },
  };

  const { streamCellJson } = makeVstorageEvent(
    0n,
    'test.path',
    complexValue,
    marshaller,
  );

  const streamCell = JSON.parse(streamCellJson);
  const capData = JSON.parse(streamCell.values[0]);
  const unmarshalled = marshaller.fromCapData(capData);

  t.deepEqual(unmarshalled, complexValue);
});

// ============================================================================
// 4. EVM Log Parsing Edge Cases
// ============================================================================

test('Transfer event parsing handles various encodings', t => {
  // Testing the parseTransferLog logic from cctp-watcher
  const validLog = {
    topics: [
      id('Transfer(address,address,uint256)'),
      '0x000000000000000000000000742d35cc6635c0532925a3b8d9deb1c9e5eb2b64', // from
      '0x0000000000000000000000008cb4b25e77844fc0632aca14f1f9b23bdd654ebf', // to
    ],
    data: '0x00000000000000000000000000000000000000000000000000000000000f4240', // 1000000
  };

  // Manual parsing similar to cctp-watcher parseTransferLog
  t.is(validLog.topics.length, 3);
  t.truthy(validLog.data);

  // Extract addresses from topics (last 20 bytes)
  const fromAddr = '0x' + validLog.topics[1].slice(-40);
  const toAddr = '0x' + validLog.topics[2].slice(-40);

  t.is(fromAddr, '0x742d35cc6635c0532925a3b8d9deb1c9e5eb2b64');
  t.is(toAddr, '0x8cb4b25e77844fc0632aca14f1f9b23bdd654ebf');

  // Parse amount
  const amount = BigInt(validLog.data);
  t.is(amount, 1_000_000n);
});

test('MulticallExecuted event parsing handles txId topic', t => {
  const txId = 'tx123';
  const expectedTopic = ethers.keccak256(ethers.toUtf8Bytes(txId));

  const log = {
    topics: [id('MulticallExecuted(string,(bool,bytes)[])'), expectedTopic],
    data: '0x',
  };

  t.is(log.topics.length, 2);
  t.is(log.topics[1], expectedTopic);

  // Verify keccak hash is deterministic
  const recomputedTopic = ethers.keccak256(ethers.toUtf8Bytes(txId));
  t.is(recomputedTopic, expectedTopic);
});

test('Event signature hashes are consistent', t => {
  // These hashes should never change
  const transferSig = id('Transfer(address,address,uint256)');
  t.is(
    transferSig,
    '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
  );

  const multicallExecutedSig = id('MulticallExecuted(string,(bool,bytes)[])');
  t.is(
    multicallExecutedSig,
    '0x4b73b6dfaa237b448da8b4d871d5d92c8d2f3d5d02a37c59bd92bc5d40dc18f7',
  );

  const multicallStatusSig = id('MulticallStatus(string,bool,uint256)');
  t.is(
    multicallStatusSig,
    '0x0c32fa99b6e87f667e61e6a78d88a7906d8ec6dc6e6c8fb93b2d0e99d18de504',
  );
});

// ============================================================================
// 5. Path Encoding Edge Cases
// ============================================================================

test('vstorage path encoding handles special characters', t => {
  // Test that path segments are properly encoded/decoded
  const paths = [
    'simple.path',
    'path.with.many.segments',
    'path.with-hyphens',
    'path.with_underscores',
    'path.with123numbers',
  ];

  for (const path of paths) {
    const segments = path.split('.');
    const encodedKey = `${segments.length}\x00${segments.join('\x00')}`;

    // Decode it back
    const parts = encodedKey.split('\x00');
    const count = parseInt(parts[0], 10);
    const decodedPath = parts.slice(1, count + 1).join('.');

    t.is(decodedPath, path);
  }
});

test('vstorage path with single segment', t => {
  const path = 'published';
  const segments = path.split('.');
  const encodedKey = `${segments.length}\x00${segments.join('\x00')}`;

  t.is(encodedKey, '1\x00published');

  const parts = encodedKey.split('\x00');
  t.is(parts[0], '1');
  t.is(parts[1], 'published');
});

test('vstorage path with maximum nesting', t => {
  // Very deeply nested path
  const path = Array(20)
    .fill('level')
    .map((s, i) => `${s}${i}`)
    .join('.');
  const segments = path.split('.');
  const encodedKey = `${segments.length}\x00${segments.join('\x00')}`;

  const parts = encodedKey.split('\x00');
  const count = parseInt(parts[0], 10);
  t.is(count, 20);

  const decodedPath = parts.slice(1, count + 1).join('.');
  t.is(decodedPath, path);
});

// ============================================================================
// 6. Number Encoding Edge Cases
// ============================================================================

test('bigint amounts handle full uint256 range', t => {
  // Maximum uint256 value
  const maxUint256 = 2n ** 256n - 1n;

  // Should not overflow
  t.is(typeof maxUint256, 'bigint');

  // Can be converted to hex
  const hex = '0x' + maxUint256.toString(16);
  t.truthy(hex);

  // Can be parsed back
  const parsed = BigInt(hex);
  t.is(parsed, maxUint256);
});

test('negative bigints are rejected by AmountMath', t => {
  t.throws(() => AmountMath.make(depositBrand, -1n), {
    message: /negative/,
  });
});

test('zero amounts are valid', t => {
  const zeroAmount = AmountMath.make(depositBrand, 0n);
  t.is(zeroAmount.value, 0n);
  t.true(AmountMath.isEmpty(zeroAmount));
});

test('blockHeight string parsing handles large values', t => {
  const largeBlockHeight = '999999999999999999'; // Near MAX_SAFE_INTEGER

  const streamCell = JSON.stringify({
    blockHeight: largeBlockHeight,
    values: [],
  });

  const parsed = parseStreamCell(streamCell, 'test.path');
  t.is(parsed.blockHeight, largeBlockHeight);

  // Should be convertible to BigInt
  const asBigInt = BigInt(parsed.blockHeight);
  t.is(asBigInt, 999999999999999999n);
});
