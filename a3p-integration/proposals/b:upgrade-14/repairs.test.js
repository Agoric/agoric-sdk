import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

import test from 'ava';

import {
  makeAgd,
  getUser,
  voteLatestProposalAndWait,
} from '@agoric/synthetic-chain';

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

const replacePatternInFile = async (fileName, pattern, replacement) => {
  const scriptBuffer = await readFile(`${fileName}.template.js`);
  const newScript = scriptBuffer.toString().replace(pattern, replacement);
  await writeFile(`${fileName}.js`, newScript);
};

test('smartWallet repairs', async t => {
  const { agd, config } = await makeContext();
  const { chainId, deposit, proposer } = config;
  const from = agd.lookup(proposer);

  const gov1Address = await getUser('gov1');
  await replacePatternInFile(
    `${SUBMISSION_DIR}/sendInvite`,
    'XX_ADDRESS_XX',
    gov1Address,
  );

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
  t.truthy(invitePurseBalance.value[0], 'expecting a non-empty purse');
  const description = invitePurseBalance.value[0].description;

  t.is(description, 'Add Collateral', 'invitation purse should not be empty');
});
