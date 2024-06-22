import test from 'ava';

import { agd, evalBundles, waitForBlock } from '@agoric/synthetic-chain';

const SUBMISSION_DIR = 'localchaintest-submission';

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

  await waitForBlock(2); // enough time for core eval to execute ?

  t.is(await readPublished(nodePath), nodeValue);
});
