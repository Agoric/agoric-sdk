import test from 'ava';
import { $ } from 'execa';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import {
  makeAgd,
  waitForBlock,
  getUser,
  evalBundles,
  agoric,
} from '@agoric/synthetic-chain';

const SUBMISSION_DIR = 'invitation-test-submission';

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

test.serial('exitOffer tool reclaims stuck payment', async t => {
  const offerId = 'bad-invitation-15';
  const from = 'gov1';

  const showAndExec = (file, args, opts) => {
    console.log('$', file, ...args);
    return execFileSync(file, args, opts);
  };

  // @ts-expect-error string is not assignable to Buffer
  const agd = makeAgd({ execFileSync: showAndExec }).withOpts({
    keyringBackend: 'test',
  });

  const addr = await agd.lookup(from);
  t.log(from, 'addr', addr);

  const getBalance = async target => {
    const { balances } = await agd.query(['bank', 'balances', addr]);
    const { amount } = balances.find(({ denom }) => denom === target);
    return Number(amount);
  };

  const before = await getBalance('uist');
  t.log('uist balance before:', before);

  await $`node ./scripts/exitOffer.js --id ${offerId} --from ${from}`;

  await waitForBlock(2);
  const after = await getBalance('uist');
  t.log('uist balance after:', after);
  t.true(after > before);
});
