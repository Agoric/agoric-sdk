// @ts-check

import test from 'ava';
import { readFile, writeFile } from 'node:fs/promises';

import {
  getIncarnation,
  getUser,
  evalBundles,
  waitForBlock,
  agoric,
} from '@agoric/synthetic-chain';

const SUBMISSION_DIR = 'provisioning-test-submission';

/**
 * @param {string} fileName base file name without .tjs extension
 * @param {Record<string, string>} replacements
 */
const replaceTemplateValuesInFile = async (fileName, replacements) => {
  let script = await readFile(`${fileName}.tjs`, 'utf-8');
  for (const [template, value] of Object.entries(replacements)) {
    script = script.replaceAll(`{{${template}}}`, value);
  }
  await writeFile(`${fileName}.js`, script);
};

test.serial(`provisioning vat was upgraded`, async t => {
  const incarnation = await getIncarnation('provisioning');

  t.is(incarnation, 1);
});

test.serial(`send invitation via namesByAddress`, async t => {
  const addr = await getUser('gov1');

  await replaceTemplateValuesInFile(`${SUBMISSION_DIR}/send-script`, {
    ADDRESS: addr,
  });

  await evalBundles(SUBMISSION_DIR);

  await waitForBlock(2); // enough time for invitation to arrive?
  const update = await agoric.follow('-lF', `:published.wallet.${addr}`);
  t.is(update.updated, 'balance');
  t.notDeepEqual(update.currentAmount.value, []);
  t.log('balance value', update.currentAmount.value);
  t.log('balance brand', update.currentAmount.brand);
  // XXX agoric follow returns brands as strings
  t.regex(update.currentAmount.brand, /Invitation/);
});
