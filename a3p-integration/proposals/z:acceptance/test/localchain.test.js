/* global setTimeout */

import { agd, evalBundles } from '@agoric/synthetic-chain';
import test from 'ava';
import { retryUntilCondition } from '@agoric/client-utils';

const SUBMISSION_DIR = 'localchaintest-submission';

/** @param {string} path */
const readPublished = async path => {
  const { value } = await agd.query(
    'vstorage',
    'data',
    '--output',
    'json',
    `published.${path}`,
  );
  if (value === '') {
    return undefined;
  }
  const obj = JSON.parse(value);
  return obj.values[0];
};

// The testing assertions are in the submission that runs in the core-eval.
// The test here runs that and confirms the eval made it through all the assertions.
test(`localchain passes tests`, async t => {
  await evalBundles(SUBMISSION_DIR);

  const nodePath = 'test.localchain';
  const nodeValue = JSON.stringify({ success: true });

  const actualValue = await retryUntilCondition(
    async () => readPublished(nodePath),
    value => value === nodeValue,
    'core eval not processed yet',
    { setTimeout, retryIntervalMs: 5000, maxRetries: 15 },
  );

  t.is(actualValue, nodeValue);
});
