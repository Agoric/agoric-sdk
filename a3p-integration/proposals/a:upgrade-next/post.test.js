// @ts-check

import test from 'ava';
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import tmp from 'tmp';
import { readFile as readFileAmbient, writeFile } from 'fs/promises';

import { getIncarnation } from '@agoric/synthetic-chain/src/lib/vat-status.js';
import { voteLatestProposalAndWait, waitForBlock } from '@agoric/synthetic-chain/src/lib/commonUpgradeHelpers.js';
import { agoric } from '@agoric/synthetic-chain/src/lib/cliHelper.js';
import { makeAgd } from '@agoric/synthetic-chain/src/lib/agd-lib.js';
import * as env from '@agoric/synthetic-chain/src/lib/constants.js';

const nodeRequire = createRequire(import.meta.url);
const asset = {
  sendScript: nodeRequire.resolve('./send-script.js'),
};

// #region copy-pasta from @agoric/synthetic-chain

// XXX import from '@agoric/synthetic-chain/src/lib/core-eval-support.js';

/**
 * @param { Record<string, string>} record - e.g. { color: 'blue' }
 * @returns {string[]} e.g. ['--color', 'blue']
 */
export const flags = record => {
  return Object.entries(record)
    .map(([k, v]) => [`--${k}`, v])
    .flat();
};

export const txAbbr = tx => {
  const { txhash, code, height, gas_used } = tx;
  return { txhash, code, height, gas_used };
};

// XXX overlaps with passCoreEvalProposal from synthetic chain
const passCoreEvalProposal = async (t, opts) => {
  const {
    agd,
    script,
    permit,
    title,
    chainId,
    description = 'run some code',
    from = 'validator',
    deposit = '10000000ubld',
  } = opts;
  const result = await agd.tx(
    [
      'gov',
      'submit-proposal',
      'swingset-core-eval',
      permit,
      script,
      ...flags({ title, description, deposit }),
      ...flags({ gas: 'auto', 'gas-adjustment': '1.2' }),
    ],
    { from, chainId, yes: true },
  );
  console.log(txAbbr(result));
  t.is(result.code, 0);

  const detail = await voteLatestProposalAndWait();
  console.log(detail.proposal_id, detail.voting_end_time, detail.status);
  t.is(detail.status, 'PROPOSAL_STATUS_PASSED');
};

// #endregion

test(`Ensure Network Vat was installed`, async t => {
  const incarnation = await getIncarnation('network');
  t.is(incarnation, 0);
});

test(`Smart Wallet vat was upgraded`, async t => {
  const incarnation = await getIncarnation('walletFactory');

  t.is(incarnation, 2);
});

test(`Zoe vat was upgraded`, async t => {
  const incarnation = await getIncarnation('zoe');

  t.is(incarnation, 1);
});

test.before(async t => {
  const readAsset = name => readFileAmbient(asset[name], 'utf-8');

  const saveToTemp = text =>
    new Promise((resolve, reject) =>
      tmp.tmpName((err, path) => {
        if (err != null) return reject(err);
        return writeFile(path, text).then(() => resolve(path));
      }),
    );

  const agd = makeAgd({ execFileSync }).withOpts({
    keyringBackend: 'test',
  });

  t.context = { env, readAsset, agd, saveToTemp, agoric };
});

test(`provisioning vat was upgraded`, async t => {
  const incarnation = await getIncarnation('provisioning');

  t.is(incarnation, 1);
});

test(`send invitation via namesByAddress`, async t => {
  const io = t.context;
  const template = await io.readAsset('sendScript');
  const addr = io.env.GOV1ADDR;
  const code = template.replace('{{ADDRESS}}', addr);
  const script = await io.saveToTemp(code);
  const permit = await io.saveToTemp('true');

  const title = `send Add Collateral invitation to ${addr}`;
  t.log('proposal:', title);
  await passCoreEvalProposal(t, {
    agd: io.agd,
    script,
    permit,
    title,
    chainId: env.CHAINID,
  });

  await waitForBlock(2); // enough time for invitation to arrive?
  const update = await agoric.follow('-lF', `:published.wallet.${addr}`);
  t.is(update.updated, 'balance');
  t.notDeepEqual(update.currentAmount.value, []);
  t.log('balance value', update.currentAmount.value);
  t.log('balance brand', update.currentAmount.brand);
  // XXX agoric follow returns brands as strings
  t.regex(update.currentAmount.brand, /Invitation/);
});
