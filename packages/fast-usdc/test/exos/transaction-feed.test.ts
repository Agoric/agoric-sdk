// Must be first to set up globals
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { deeplyFulfilledObject } from '@agoric/internal';
import { makeHeapZone } from '@agoric/zone';
import {
  prepareTransactionFeedKit,
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
  const evidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  const results = await Promise.all([
    op1.operator.submitEvidence(evidence),
    op2.operator.submitEvidence(evidence),
    op3.operator.submitEvidence(evidence),
  ]);
  t.deepEqual(results, [undefined, undefined, undefined]);

  const accepted = await evidenceSubscriber.getUpdateSince(0);
  t.deepEqual(accepted, {
    value: evidence,
    updateCount: 3n,
  });
});

// TODO: find a way to get this working
test.skip('forged source', async t => {
  const feedKit = makeFeedKit();
  const { op1 } = await makeOperators(feedKit);
  const evidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();

  // op1 is different than the facets object the evidence must come from
  t.throws(() => feedKit.operatorPowers.submitEvidence(evidence, op1));
});
