#!/usr/bin/env node
/** @file grant ymax1 control authz from the ledger multisig to the test ops multisig */
// Presumes make-ledger-multisig.js and make-test-multisig.js have already been run.
import { mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { $ } from 'execa';

const config = {
  hours: 24 * 90,
  fee: '10000ubld',
  gas: '400000',
  msgType: '/agoric.swingset.MsgWalletSpendAction',
  granter: {
    name: 'ymax1-ms',
    members: [
      { name: 'ymax1-ledger-30', account: 3, index: 0 },
      { name: 'ymax1-ledger-31', account: 3, index: 1 },
    ],
  },
  granteeName: 'ymax1-ops-ms',
};

const $x = $({ env: process.env, stdio: 'pipe', verbose: 'short' });
const $q = $x({ stdio: 'ignore' });
const $i = $x({ stdio: 'inherit', verbose: 'short' });
const $f = $({ env: process.env });
const outj = ['--output=json'];
const testKeys = ['--keyring-backend', 'test'];
const outJson = async p => JSON.parse((await p).stdout);
const flags = record =>
  Object.entries(record).flatMap(([key, value]) =>
    value === true ? [`--${key}`] : value ? [`--${key}`, value] : [],
  );

const main = async ({
  work = mkdtemp(join(tmpdir(), 'ymax-authz-ms-')),
  env = process.env,
} = {}) => {
  for (const { name } of [
    ...config.granter.members,
    { name: config.granter.name },
  ]) {
    await $q`agd keys show ${name}`;
  }

  const { address: granter } = await outJson(
    $x`agd keys show ${config.granter.name} ${outj}`,
  );

  const { address: grantee } = await outJson(
    $x`agd keys show ${config.granteeName} ${outj} ${testKeys}`,
  );

  const account = env.FIXED
    ? { account: { value: { account_number: '31', sequence: '0' } } }
    : await outJson($x`agd query auth account ${granter} ${outj}`);
  const { account_number: accountNumber, sequence = '0' } =
    account.account.value;

  const { network: chainId } = (
    (await env.FIXED)
      ? { node_info: { network: 'agoriclocal' } }
      : outJson($x`agd status ${outj}`)
  ).node_info;
  const expiration =
    Math.floor(Date.now() / 1000) +
    (env.FIXED ? 24 * 365 * 100 : config.hours) * 60 * 60;
  const signerOpts = {
    'account-number': accountNumber,
    sequence,
    'chain-id': chainId,
  };
  const tempDir = await work;

  const unsignedFile = join(tempDir, 'unsigned.json');
  const sigFiles = config.granter.members.map(({ name }) =>
    join(tempDir, `${name}.sig.json`),
  );
  const signedFile = join(tempDir, 'signed.json');

  await $f({
    stdout: { file: unsignedFile },
  })`agd tx authz grant ${grantee} generic ${flags({
    'msg-type': config.msgType,
    expiration,
    fees: config.fee,
    gas: config.gas,
    from: config.granter.name,
    'generate-only': true,
    'chain-id': chainId,
    output: 'json',
  })}`;

  for (const [index, { name }] of config.granter.members.entries()) {
    await $i`agd tx sign ${unsignedFile} ${flags({
      ...signerOpts,
      offline: true,
      ledger: true,
      multisig: config.granter.name,
      from: name,
      'sign-mode': 'amino-json',
      overwrite: true,
      'output-document': sigFiles[index],
    })}`;
  }

  await $i`agd tx multisign ${unsignedFile} ${config.granter.name} ${sigFiles} ${flags(
    {
      ...signerOpts,
      offline: true,
      'output-document': signedFile,
    },
  )}`;

  if (env.FIXED) return;
  const { stdout } = await $x`agd tx broadcast ${signedFile} --output=json`;
  process.stdout.write(stdout);
  process.stdout.write('\n');
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

export { config, main };
