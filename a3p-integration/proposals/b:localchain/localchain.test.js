/* eslint-disable @jessie.js/safe-await-separator */
import test from 'ava';

import { agd, waitForBlock } from '@agoric/synthetic-chain';

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

test(`localchain passes tests`, async t => {
  const nodePath = 'test.localchain';
  const nodeValue = JSON.stringify({ success: true });

  await waitForBlock(2); // enough time for core eval to execute ?

  t.is(await readPublished(nodePath), nodeValue);
});
