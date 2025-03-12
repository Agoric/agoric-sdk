// Must be first to set up globals
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { deeplyFulfilledObject } from '@agoric/internal';
import { makeHeapZone } from '@agoric/zone';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import {
  prepareTransactionFeedKit,
  stateShape,
  type TransactionFeedKit,
} from '../../src/exos/transaction-feed.js';
import { MockCctpTxEvidences } from '../fixtures.js';

const nullZcf = null as any;

const makeFeedKit = () => {
  const zone = makeHeapZone();
  const makeKit = prepareTransactionFeedKit(zone, nullZcf);
  return makeKit();
};

const makeOperators = (feedKit: TransactionFeedKit) => {
  const operators = Object.fromEntries(
    ['op1', 'op2', 'op3'].map(name => [
      name,
      feedKit.creator.initOperator(name),
    ]),
  );
  return deeplyFulfilledObject(harden(operators));
};

test('stateShape', t => {
  t.snapshot(stateShape);
});

test('facets', t => {
  const kit = makeFeedKit();
  t.deepEqual(Object.keys(kit).sort(), ['creator', 'operatorPowers', 'public']);
});

test('status shape', async t => {
  const { op1 } = await makeOperators(makeFeedKit());

  // status shape
  t.deepEqual(op1.operator.getStatus(), {
    disabled: false,
    operatorId: 'op1',
  });
});

test('happy aggregation', async t => {
  const feedKit = makeFeedKit();
  const evidenceSubscriber = feedKit.public.getEvidenceSubscriber();

  const { op1, op2, op3 } = await makeOperators(feedKit);

  const e1 = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  op1.operator.submitEvidence(e1);
  op2.operator.submitEvidence(e1);

  // Publishes with 2 of 3
  const accepted = await evidenceSubscriber.getUpdateSince(0);
  t.deepEqual(accepted, {
    value: { evidence: e1, risk: { risksIdentified: [] } },
    updateCount: 1n,
  });

  // Now third operator catches up with same evidence already published
  op3.operator.submitEvidence(e1);
  t.like(await evidenceSubscriber.getUpdateSince(0), {
    // The confirming evidence doesn't change anything
    updateCount: 1n,
  });

  const e2 = MockCctpTxEvidences.AGORIC_PLUS_DYDX();
  assert(e1.txHash !== e2.txHash);
  op1.operator.submitEvidence(e2);
  t.like(await evidenceSubscriber.getUpdateSince(0), {
    // op1 attestation insufficient
    updateCount: 1n,
  });
});

test('Atredis: operator submits twice', async t => {
  const feedKit = makeFeedKit();
  const evidenceSubscriber = feedKit.public.getEvidenceSubscriber();

  const { op1, op2, op3 } = await makeOperators(feedKit);

  const e1 = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  op1.operator.submitEvidence(e1);
  
  // Resubmit. This will emit a trace but no error or event. 
  t.notThrows(() => op1.operator.submitEvidence(e1));
  
  const e2 = { ...e1, tx: { ...e1.tx, amount: 1n } };
  t.notThrows(() => op1.operator.submitEvidence(e2));
  
  // Submit with op2, publishes with 2 of 2
  op2.operator.submitEvidence(e1);

  const accepted = await evidenceSubscriber.getUpdateSince(0);
  t.deepEqual(accepted, {
    value: { evidence: e1, risk: { risksIdentified: [] } },
    updateCount: 1n,
  });
});

test('Atredis: tx hash tampering', async t => {
  const feedKit = makeFeedKit();
  const evidenceSubscriber = feedKit.public.getEvidenceSubscriber();

  const { op1, op2, op3 } = await makeOperators(feedKit);

  const e1 = {...MockCctpTxEvidences.AGORIC_PLUS_OSMO(), txHash: "A".repeat(66) };
  op1.operator.submitEvidence(e1);
  
  // Create a copy of e1, add a null to the hash, and expect a "too long" exception
  let e2 = {...e1, txHash: e1.txHash + 0x0 };
  
  t.throws(() => op1.operator.submitEvidence(e2), {
    message:
      'In "submitEvidence" method of (Operator Kit operator): arg 0: txHash: string "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA0" must not be bigger than 66',
  });
  
  e2 = {...e1, txHash: 0x0 };
  
  t.throws(() => op1.operator.submitEvidence(e2), {
    message:
      'In "submitEvidence" method of (Operator Kit operator): arg 0: txHash: number 0 - Must be a string',
  });

  // Create a copy of e1 and replace the first byte of the hash with a null
  e2 = {...e1, txHash: 0x0 + e1.txHash.slice(1) };
  
  // Submit the modified evidence. This will emit a trace showing it's a new 1 of 2 transaction.
  t.notThrows(() => op1.operator.submitEvidence(e2));
  
  // Create a copy of e1 and replace the first byte of the hash with a unicode character
  e2 = {...e1, txHash: "Å" + e1.txHash.slice(1) };
  
  // Submit the modified evidence. This will emit a trace showing it's a new 1 of 2 transaction.
  t.notThrows(() => op1.operator.submitEvidence(e2));
});

test('Atredis: 1-byte hash', async t => {
  const feedKit = makeFeedKit();
  const evidenceSubscriber = feedKit.public.getEvidenceSubscriber();

  const { op1, op2 } = await makeOperators(feedKit);

  const e1 = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  e1.txHash = "0" 
  
  op1.operator.submitEvidence(e1);
  // Resubmit will emit "operator op1 already reported 0" but otherwise be ignored
  t.notThrows(() => op1.operator.submitEvidence(e1));

  // Second op submit will result in 2/2 publish
  t.notThrows(() => op2.operator.submitEvidence(e1));
  
  const accepted = await evidenceSubscriber.getUpdateSince(0);
  t.deepEqual(accepted, {
    value: { evidence: e1, risk: { risksIdentified: [] } },
    updateCount: 1n,
  });
});

test('Atredis: different amount from same operator', async t => {
  const feedKit = makeFeedKit();
  const evidenceSubscriber = feedKit.public.getEvidenceSubscriber();

  const { op1 } = await makeOperators(feedKit);

  const e1 = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  op1.operator.submitEvidence(e1);
  
  // Modify the transaction amount
  const e2 = { ...e1, tx: { ...e1.tx, amount: 1n } };
  
  // Since the the transaction hash is used as the index, this will emit "already reported"
  t.notThrows(() => op1.operator.submitEvidence(e2));
});

test('Atredis: different block hash from different operators', async t => {
  const feedKit = makeFeedKit();
  const { op1, op2 } = await makeOperators(feedKit);
  const e1 = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  let e1bad = { ...e1, blockHash: "0" };
  
  assert(e1.txHash === e1bad.txHash);
  op1.operator.submitEvidence(e1);

  t.throws(() => op2.operator.submitEvidence(e1bad), {
    message:
      'conflicting evidence for "0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702"',
  });
  
  e1bad = { ...e1, blockHash: "1" };
  assert(e1.txHash === e1bad.txHash);

  t.throws(() => op2.operator.submitEvidence(e1bad), {
    message:
      'conflicting evidence for "0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702"',
  });

  e1bad = { ...e1, blockHash: 0n };
  assert(e1.txHash === e1bad.txHash);

  t.throws(() => op2.operator.submitEvidence(e1bad), {
    message:
      'In "submitEvidence" method of (Operator Kit operator): arg 0: blockHash: bigint "[0n]" - Must be a string',
  });
  
  e1bad = { ...e1, blockHash: e1.blockHash + "00" };
  assert(e1.txHash === e1bad.txHash);

  t.throws(() => op2.operator.submitEvidence(e1bad), {
    message:
      'In "submitEvidence" method of (Operator Kit operator): arg 0: blockHash: string "0x90d7343e04f8160892e94f02d6a9b9f255663ed0ac34caca98544c8143fee66500" must not be bigger than 66',
  });
  
  e1bad = { ...e1, blockHash: "1" + e1.blockHash.slice(1)  };
  assert(e1.txHash === e1bad.txHash);

  t.throws(() => op2.operator.submitEvidence(e1bad), {
    message:
      'conflicting evidence for "0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702"',
  });
});

test('Atredis: different block numbers from different operators', async t => {
  const feedKit = makeFeedKit();
  const { op1, op2 } = await makeOperators(feedKit);
  const e1 = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  let e1bad = { ...e1, blockNumber: 0n };
  
  assert(e1.txHash === e1bad.txHash);
  op1.operator.submitEvidence(e1);

  t.throws(() => op2.operator.submitEvidence(e1bad), {
    message:
      'conflicting evidence for "0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702"',
  });
  
  e1bad = { ...e1, blockNumber: 1n };
  assert(e1.txHash === e1bad.txHash);

  t.throws(() => op2.operator.submitEvidence(e1bad), {
    message:
      'conflicting evidence for "0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702"',
  });

  e1bad = { ...e1, blockNumber: 2n ** 63n }; // > BigInt max
  assert(e1.txHash === e1bad.txHash);

  t.throws(() => op2.operator.submitEvidence(e1bad), {
	message:
	  'conflicting evidence for "0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702"',
  });
});

test('Atredis: different block timestamp from different operators', async t => {
  const feedKit = makeFeedKit();
  const { op1, op2 } = await makeOperators(feedKit);
  const e1 = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  op1.operator.submitEvidence(e1);
  
  let e1bad = { ...e1, blockTimestamp: 0n };
  assert(e1.txHash === e1bad.txHash);

  t.throws(() => op2.operator.submitEvidence(e1bad), {
    message:
      'conflicting evidence for "0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702"',
  });
  
  e1bad = { ...e1, blockTimestamp: String.fromCharCode(0x0) };
  assert(e1.txHash === e1bad.txHash);

  t.throws(() => op2.operator.submitEvidence(e1bad), {
    message:
      'In "submitEvidence" method of (Operator Kit operator): arg 0: blockTimestamp: string "\\u0000" - Must be a bigint',
  });
});

test('Atredis: different tx forwarding addresses from different operators', async t => {
  const feedKit = makeFeedKit();
  const { op1, op2 } = await makeOperators(feedKit);
  const e1 = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  let e1bad = { ...e1, tx: { ...e1.tx, forwardingAddress: 0x0 } };
  assert(e1.txHash === e1bad.txHash);
  op1.operator.submitEvidence(e1);

  t.throws(() => op2.operator.submitEvidence(e1bad), {
    message: 'In "submitEvidence" method of (Operator Kit operator): arg 0: tx: forwardingAddress: number 0 - Must be a string',
  });
  
  e1bad = { ...e1, tx: { ...e1.tx, forwardingAddress: e1.tx.forwardingAddress + 0x0 } };
  assert(e1.txHash === e1bad.txHash);

  t.throws(() => op2.operator.submitEvidence(e1bad), {
    message: 'conflicting evidence for "0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702"',
  });
  
  e1bad = { ...e1, tx: { ...e1.tx, forwardingAddress: e1.tx.forwardingAddress + "A".repeat(1000) } };
  assert(e1.txHash === e1bad.txHash);

  t.throws(() => op2.operator.submitEvidence(e1bad), {
    message: 'conflicting evidence for "0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702"',
  });
  
  e1bad = { ...e1, tx: { ...e1.tx, forwardingAddress: "A".repeat(100001) } }; // It will accept up to 100k characters
  assert(e1.txHash === e1bad.txHash);

  t.throws(() => op2.operator.submitEvidence(e1bad), {
    message: 'conflicting evidence for "0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702"',
  });
});

test('Atredis: large input reflected', async t => {
  const feedKit = makeFeedKit();
  const { op1 } = await makeOperators(feedKit);
  const e1 = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  let e1bad = { ...e1, tx: { ...e1.tx, forwardingAddress: "A".repeat(100001) } }; // It will accept up to 100k characters  
  op1.operator.submitEvidence(e1bad);
});

test('Atredis: different tx senders from different operators', async t => {
  const feedKit = makeFeedKit();
  const { op1, op2 } = await makeOperators(feedKit);
  const e1 = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  let e1bad = { ...e1, tx: { ...e1.tx, sender: 0x0 } };
  assert(e1.txHash === e1bad.txHash);

  op1.operator.submitEvidence(e1);

  t.throws(() => op2.operator.submitEvidence(e1bad), {
    message: 'In "submitEvidence" method of (Operator Kit operator): arg 0: tx: sender: number 0 - Must be a string',
  });
  
  e1bad = { ...e1, tx: { ...e1.tx, sender: String.fromCharCode(0) } };
  
  t.throws(() => op2.operator.submitEvidence(e1bad), {
    message: 'conflicting evidence for "0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702"',
  });
  
  e1bad = { ...e1, tx: { ...e1.tx, sender: String.fromCharCode(0).repeat(43) } };
  
  t.throws(() => op2.operator.submitEvidence(e1bad), {
    message: 'In "submitEvidence" method of (Operator Kit operator): arg 0: tx: sender: string "\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000\\u0000" must not be bigger than 42',
  });
  
  e1bad = { ...e1, tx: { ...e1.tx, sender: "0" } };
  
  t.throws(() => op2.operator.submitEvidence(e1bad), {
    message: 'conflicting evidence for "0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702"',
  });
});

test('Atredis: different tx senders unicode string', async t => {
  const feedKit = makeFeedKit();
  const { op1, op2 } = await makeOperators(feedKit);
  let evidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();

  const e1 = { ...evidence, tx: { ...evidence.tx, sender: "A" } };
  op1.operator.submitEvidence(e1);

  const e2 = { ...evidence, tx: { ...evidence.tx, sender: "Å" } };
  
  t.throws(() => op2.operator.submitEvidence(e2), {
    message: 'conflicting evidence for "0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702"',
  });
});

test('Atredis: different tx senders escaped unicode string', async t => {
  const feedKit = makeFeedKit();
  const { op1, op2 } = await makeOperators(feedKit);
  let evidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();

  const e1 = { ...evidence, tx: { ...evidence.tx, sender: "\u0041" } };
  op1.operator.submitEvidence(e1);

  const e2 = { ...evidence, tx: { ...evidence.tx, sender: "\u1041" } };
  
  t.throws(() => op2.operator.submitEvidence(e2), {
    message: 'conflicting evidence for "0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702"',
  });
  
  const e3 = { ...evidence, tx: { ...evidence.tx, sender: "\u0141" } };
  
  t.throws(() => op2.operator.submitEvidence(e3), {
    message: 'conflicting evidence for "0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702"',
  });
});

test('Atredis: extra tx parameter from different operator', async t => {
  const feedKit = makeFeedKit();
  const { op1, op2 } = await makeOperators(feedKit);
  const e1 = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  let e1bad = { ...e1, tx: { ...e1.tx, forwardingChannel: 0x0 } };
  assert(e1.txHash === e1bad.txHash);

  op1.operator.submitEvidence(e1);

  t.throws(() => op2.operator.submitEvidence(e1bad), {
    message: 'In "submitEvidence" method of (Operator Kit operator): arg 0: tx: {"amount":"[150000000n]","forwardingAddress":"noble1x0ydg69dh6fqvr27xjvp6maqmrldam6yfelqkd","forwardingChannel":0,"sender":"0xDefaultFakeEthereumAddress"} - Must not have unexpected properties: ["forwardingChannel"]',
  });
});

test('Atredis: extra aux parameter from different operator', async t => {
  const feedKit = makeFeedKit();
  const { op1, op2 } = await makeOperators(feedKit);
  let evidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();

  const e1 = { ...evidence, aux: { ...evidence.aux, forwardingChannel: "A" } };
  op1.operator.submitEvidence(e1);
  
  let e2 = { ...evidence, aux: { ...evidence.aux, sender: "Å" } };
  
  t.throws(() => op2.operator.submitEvidence(e2), {
    message: 'In "submitEvidence" method of (Operator Kit operator): arg 0: aux: {"forwardingChannel":"channel-21","recipientAddress":"agoric10rchp4vc53apxn32q42c3zryml8xq3xshyzuhjk6405wtxy7tl3d7e0f8az423padaek6me38qekget2vdhx66mtvy6kg7nrw5uhsaekd4uhwufswqex6dtsv44hxv3cd4jkuqpqvduyhf","sender":"Å"} - Must not have unexpected properties: ["sender"]',
  });
});

test('Atredis: different aux forwarding channel from different operator', async t => {
  const feedKit = makeFeedKit();
  const { op1, op2 } = await makeOperators(feedKit);
  let evidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();

  const e1 = { ...evidence, aux: { ...evidence.aux, forwardingChannel: "A" } };
  op1.operator.submitEvidence(e1);
  
  let e2 = { ...evidence, aux: { ...evidence.aux, forwardingChannel: "Å" } };
  
  t.throws(() => op2.operator.submitEvidence(e2), {
    message: 'conflicting evidence for "0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702"',
  });
  
  e2 = { ...evidence, aux: { ...evidence.aux, forwardingChannel: "\u0041" } };

  t.throws(() => op2.operator.submitEvidence(e2), {
    message: 'conflicting evidence for "0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702"',
  });

  e2 = { ...evidence, aux: { ...evidence.aux, forwardingChannel: "\u1041" } };
  
  t.throws(() => op2.operator.submitEvidence(e2), {
    message: 'conflicting evidence for "0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702"',
  });
  
  e2 = { ...evidence, aux: { ...evidence.aux, forwardingChannel: "\u0141" } };
  
  t.throws(() => op2.operator.submitEvidence(e2), {
    message: 'conflicting evidence for "0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702"',
  });
  
  e2 = { ...evidence, aux: { ...evidence.aux, forwardingChannel: "\u4100" } };
  
  t.throws(() => op2.operator.submitEvidence(e2), {
    message: 'conflicting evidence for "0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702"',
  });
});


test('Atredis: different aux recipient address from different operator', async t => {
  const feedKit = makeFeedKit();
  const { op1, op2 } = await makeOperators(feedKit);
  let evidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();

  const e1 = { ...evidence, aux: { ...evidence.aux, recipientAddress: "A" } };
  op1.operator.submitEvidence(e1);
  
  let e2 = { ...evidence, aux: { ...evidence.aux, recipientAddress: "Å" } };
  
  t.throws(() => op2.operator.submitEvidence(e2), {
    message: 'conflicting evidence for "0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702"',
  });
  
  e2 = { ...evidence, aux: { ...evidence.aux, recipientAddress: "\u0041" } };

  t.throws(() => op2.operator.submitEvidence(e2), {
    message: 'conflicting evidence for "0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702"',
  });

  e2 = { ...evidence, aux: { ...evidence.aux, recipientAddress: "\u1041" } };
  
  t.throws(() => op2.operator.submitEvidence(e2), {
    message: 'conflicting evidence for "0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702"',
  });
  
  e2 = { ...evidence, aux: { ...evidence.aux, recipientAddress: "\u0141" } };
  
  t.throws(() => op2.operator.submitEvidence(e2), {
    message: 'conflicting evidence for "0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702"',
  });
  
  e2 = { ...evidence, aux: { ...evidence.aux, recipientAddress: "\u4100" } };
  
  t.throws(() => op2.operator.submitEvidence(e2), {
    message: 'conflicting evidence for "0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702"',
  });
});

test('Atredis: different chain id from different operator', async t => {
  const feedKit = makeFeedKit();
  const { op1, op2 } = await makeOperators(feedKit);
  let evidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  
  // First, test data type  validation
  let e1 = { ...evidence, chainId: "A" };
  
  t.throws(() => op1.operator.submitEvidence(e1), {
    message: 'In "submitEvidence" method of (Operator Kit operator): arg 0: chainId: string "A" - Must be a number',
  });
  
  e1 = { ...evidence, chainId: "0" };
  
  t.throws(() => op1.operator.submitEvidence(e1), {
	message: 'In "submitEvidence" method of (Operator Kit operator): arg 0: chainId: string "0" - Must be a number',
  });
  
  e1 = { ...evidence, chainId: "\u0000" };
  
  t.throws(() => op1.operator.submitEvidence(e1), {
	message: 'In "submitEvidence" method of (Operator Kit operator): arg 0: chainId: string "\\u0000" - Must be a number',
  });

  e1 = { ...evidence, chainId: 1n }; // > BigInt max

  t.throws(() => op1.operator.submitEvidence(e1), {
	message: 'In "submitEvidence" method of (Operator Kit operator): arg 0: chainId: bigint "[1n]" - Must be a number',
  });
  
  // First valid evidence won't emit anything but logs
  e1 = { ...evidence, chainId: 1 };
  op1.operator.submitEvidence(e1);
  
  let e2 = { ...evidence, chainId: 0x0 };

  t.throws(() => op2.operator.submitEvidence(e2), {
	message: 'conflicting evidence for "0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702"',
  });
  
  e2 = { ...evidence, chainId: 2 ** 128 };
  
  t.throws(() => op2.operator.submitEvidence(e2), {
	message: 'conflicting evidence for "0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702"',
  });
  
  e2 = { ...evidence, chainId: 1.0};
  
  t.throws(() => op2.operator.submitEvidence(e2), {
	message: 'conflicting evidence for "0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702"',
  });
  
  e2 = { ...evidence, chainId: 0x1 };
  
  t.throws(() => op2.operator.submitEvidence(e2), {
	message: 'conflicting evidence for "0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702"',
  });
  
  e2 = { ...evidence, chainId: Number(1.0) };
  
  t.throws(() => op2.operator.submitEvidence(e2), {
	message: 'conflicting evidence for "0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702"',
  });
  
  e2 = { ...evidence, chainId: Number(1.1) };

  t.throws(() => op2.operator.submitEvidence(e2), {
	message: 'conflicting evidence for "0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702"',
  });
  
  e2 = { ...evidence, chainId: Number(1.00000000001) };

  t.throws(() => op2.operator.submitEvidence(e2), {
	message: 'conflicting evidence for "0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702"',
  });
  
  e2 = { ...evidence, chainId: Number(1.0000000000000000000000000000000000000000000000000000000000000000001) };

  t.throws(() => op2.operator.submitEvidence(e2), {
	message: 'conflicting evidence for "0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702"',
  });
  
  e2 = { ...evidence, chainId: Number(0.999999999999999999999999999999999999999999999999999999999999999999999999) };

  t.throws(() => op2.operator.submitEvidence(e2), {
	message: 'conflicting evidence for "0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702"',
  });
});

test('takes union of risk assessments', async t => {
  const feedKit = makeFeedKit();
  const evidenceSubscriber = feedKit.public.getEvidenceSubscriber();

  const { op1, op2 } = await makeOperators(feedKit);

  const e1 = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  op1.operator.submitEvidence(e1, { risksIdentified: ['RISK1'] });
  op2.operator.submitEvidence(e1, { risksIdentified: ['RISK2'] });

  // Publishes with 2 of 3
  const accepted = await evidenceSubscriber.getUpdateSince(0);
  t.deepEqual(accepted, {
    value: { evidence: e1, risk: { risksIdentified: ['RISK1', 'RISK2'] } },
    updateCount: 1n,
  });
});

test('takes union of risk assessments pt. 2', async t => {
  const feedKit = makeFeedKit();
  const evidenceSubscriber = feedKit.public.getEvidenceSubscriber();

  const { op1, op2 } = await makeOperators(feedKit);

  const e1 = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  op1.operator.submitEvidence(e1, { risksIdentified: ['RISK1'] });
  op2.operator.submitEvidence(e1);

  // Publishes with 2 of 3
  const accepted = await evidenceSubscriber.getUpdateSince(0);
  t.deepEqual(accepted, {
    value: { evidence: e1, risk: { risksIdentified: ['RISK1'] } },
    updateCount: 1n,
  });
});

test('takes union of risk assessments pt. 3', async t => {
  const feedKit = makeFeedKit();
  const evidenceSubscriber = feedKit.public.getEvidenceSubscriber();

  const { op1, op2 } = await makeOperators(feedKit);

  const e1 = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  op1.operator.submitEvidence(e1, { risksIdentified: ['RISK1'] });
  op2.operator.submitEvidence(e1, { risksIdentified: ['RISK1'] });

  // Publishes with 2 of 3
  const accepted = await evidenceSubscriber.getUpdateSince(0);
  t.deepEqual(accepted, {
    value: { evidence: e1, risk: { risksIdentified: ['RISK1'] } },
    updateCount: 1n,
  });
});

test('takes union of risk assessments pt. 4', async t => {
  const feedKit = makeFeedKit();
  const evidenceSubscriber = feedKit.public.getEvidenceSubscriber();

  const { op1, op2 } = await makeOperators(feedKit);

  const e1 = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  op1.operator.submitEvidence(e1);
  op2.operator.submitEvidence(e1);

  // Publishes with 2 of 3
  const accepted = await evidenceSubscriber.getUpdateSince(0);
  t.deepEqual(accepted, {
    value: { evidence: e1, risk: { risksIdentified: [] } },
    updateCount: 1n,
  });
});

test('disagreement', async t => {
  const feedKit = makeFeedKit();
  const { op1, op2 } = await makeOperators(feedKit);
  const e1 = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  const e1bad = { ...e1, tx: { ...e1.tx, amount: 999_999_999n } };
  assert(e1.txHash === e1bad.txHash);
  op1.operator.submitEvidence(e1);

  // conflicting between operators
  t.throws(() => op2.operator.submitEvidence(e1bad), {
    message: /conflicting evidence/,
  });

  // self conflicting
  t.throws(() => op1.operator.submitEvidence(e1bad), {
    message: /conflicting evidence/,
  });
});

test('disagreement after publishing', async t => {
  const feedKit = makeFeedKit();
  const evidenceSubscriber = feedKit.public.getEvidenceSubscriber();
  const { op1, op2, op3 } = await makeOperators(feedKit);
  const e1 = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  const e1bad = { ...e1, tx: { ...e1.tx, amount: 999_999_999n } };
  assert(e1.txHash === e1bad.txHash);
  op1.operator.submitEvidence(e1);
  op2.operator.submitEvidence(e1);

  t.like(await evidenceSubscriber.getUpdateSince(0), {
    updateCount: 1n,
  });

  t.throws(() => op3.operator.submitEvidence(e1bad), {
    message: /conflicting evidence/,
  });
  t.like(await evidenceSubscriber.getUpdateSince(0), {
    updateCount: 1n,
  });

  // Disagreement is still detected after publishing
  t.throws(() => op1.operator.submitEvidence(e1bad), {
    message: /conflicting evidence/,
  });
  t.like(await evidenceSubscriber.getUpdateSince(0), {
    updateCount: 1n,
  });
});

test('remove operator', async t => {
  const feedKit = makeFeedKit();
  const evidenceSubscriber = feedKit.public.getEvidenceSubscriber();
  const { op1, op2 } = await makeOperators(feedKit);
  const evidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();

  let published;
  void evidenceSubscriber
    .getUpdateSince(0)
    .then(accepted => (published = accepted.value.evidence));

  // works before disabling
  op1.operator.submitEvidence(evidence);
  await eventLoopIteration();
  t.falsy(published);

  // remove op1 and their in-flight evidence
  feedKit.creator.removeOperator('op1');
  t.throws(() => op1.operator.submitEvidence(evidence), {
    message: 'submitEvidence for disabled operator',
  });

  // one attestation is now sufficient (half of two) but the only evidence was just removed
  await eventLoopIteration();
  t.falsy(published);
  op2.operator.submitEvidence(evidence);
  await eventLoopIteration();
  t.deepEqual(published, evidence);
});
