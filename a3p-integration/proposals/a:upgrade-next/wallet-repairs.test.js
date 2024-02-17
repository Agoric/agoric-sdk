import { readFile, writeFile } from 'node:fs/promises';

import test from 'ava';

import { agd, getUser, evalBundles } from '@agoric/synthetic-chain';

const SUBMISSION_DIR = 'invite-submission';

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

test('smartWallet repairs', async t => {
  const gov1Address = await getUser('gov1');

  await replaceTemplateValuesInFile(`${SUBMISSION_DIR}/sendInvite`, {
    ADDRESS: gov1Address,
  });

  await evalBundles(SUBMISSION_DIR);

  // agd query vstorage data published.wallet.$GOV1ADDR.current  -o json \
  //   |& jq '.value | fromjson | .values[0] | fromjson | .body[1:] \
  //   | fromjson | .purses '
  const walletCurrent = await agd.query(
    'vstorage',
    'data',
    `published.wallet.${gov1Address}.current`,
  );

  const body = JSON.parse(JSON.parse(walletCurrent.value).values[0]);
  const bodyTruncated = JSON.parse(body.body.substring(1));
  const invitePurseBalance = bodyTruncated.purses[0].balance;
  t.truthy(invitePurseBalance.value[0], 'expecting a non-empty purse');
  const description = invitePurseBalance.value[0].description;

  t.is(description, 'Add Collateral', 'invitation purse should not be empty');
});
