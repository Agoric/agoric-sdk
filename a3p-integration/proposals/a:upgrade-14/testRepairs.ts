#!/usr/bin/env tsx

import { execFileSync } from 'child_process';
import { readFile, writeFile } from 'fs/promises';

import { makeAgd } from '@agoric/synthetic-chain/src/lib/agd-lib.js';
import {
  getUser,
  voteLatestProposalAndWait,
} from '@agoric/synthetic-chain/src/lib/commonUpgradeHelpers.js';
import assert from 'assert';

const SUBMISSION_DIR = 'invite-submission';

const staticConfig = {
  deposit: '10000000ubld', // 10 BLD
  installer: 'gov1', // as in: agd keys show gov1
  proposer: 'validator',
  collateralPrice: 6, // conservatively low price. TODO: look up
  swingstorePath: '~/.agoric/data/agoric/swingstore.sqlite',
};

/** Provide access to the outside world via context. */
const makeContext = async () => {
  const config = {
    chainId: 'agoriclocal',
    ...staticConfig,
  };

  const agd = makeAgd({ execFileSync }).withOpts({
    keyringBackend: 'test',
  });

  return { agd, config };
};

// XXX vestige of Ava
const step = async (name: string, fn: Function) => {
  console.log(name);
  await fn();
};

const replaceAddressInFile = async (string, fileName, replacement) => {
  const scriptBuffer = await readFile(`${SUBMISSION_DIR}/${fileName}.tpl`);

  const newScript = scriptBuffer.toString().replace(string, replacement);
  await writeFile(`${SUBMISSION_DIR}/${fileName}.js`, newScript);
};

await step('verify smartWallet repairs', async () => {
  const { agd, config } = await makeContext();
  const { chainId, deposit, proposer } = config;
  const from = agd.lookup(proposer);

  const gov1Address = await getUser('gov1');
  await replaceAddressInFile('XX_ADDRESS_XX', 'sendInvite', gov1Address);

  // agd tx  gov submit-proposal swingset-core-eval bar.json  foo.js
  await agd.tx(
    [
      'gov',
      'submit-proposal',
      'swingset-core-eval',
      `${SUBMISSION_DIR}/sendInvite-permit.json`,
      `${SUBMISSION_DIR}/sendInvite.js`,
      '--title=sendInvite',
      '--description="send an invitation to verify the purse accepts deposits"',
      `--deposit=${deposit}`,
      '--gas=auto',
      '--gas-adjustment=1.2',
      '--keyring-backend=test',
    ],
    { from, chainId, yes: true },
  );
  await voteLatestProposalAndWait();

  // agd query vstorage data published.wallet.$GOV1ADDR.current  -o json \
  //   |& jq '.value | fromjson | .values[0] | fromjson | .body[1:] \
  //   | fromjson | .purses '
  const walletCurrent = await agd.query([
    'vstorage',
    'data',
    `published.wallet.${gov1Address}.current`,
  ]);

  const body = JSON.parse(JSON.parse(walletCurrent.value).values[0]);
  const bodyTruncated = JSON.parse(body.body.substring(1));
  const invitePurseBalance = bodyTruncated.purses[0].balance;
  assert(invitePurseBalance.value[0], 'expecting a non-empty purse');
  const description = invitePurseBalance.value[0].description;

  assert.equal(
    description,
    'Add Collateral',
    'invitation purse should not be empty',
  );

  console.log('✅ invitation purse is not empty');
});
