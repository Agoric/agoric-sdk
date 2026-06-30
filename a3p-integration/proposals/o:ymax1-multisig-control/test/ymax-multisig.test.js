// @ts-check
import '@endo/init/debug.js';

import anyTest from 'ava';
import { mkdtemp, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { $ } from 'execa';

import { config } from '../scripts/make-test-multisig.js';

/**
 * @import {TestFn} from 'ava';
 * @import {ExecutionContext} from 'ava';
 */

const testKeyring = ['--keyring-backend', 'test'];

/** @param {ExecutionContext} t */
const makeTestContext = async t => {
  const tmp = await mkdtemp(join(tmpdir(), 'ymax-multisig-test-'));
  const home = join(tmp, 'home');
  await $`mkdir -p ${home}`;

  const require = createRequire(import.meta.url);
  const proposalDir = join(require.resolve('../package.json'), '..');
  const $$ = $({ env: { ...process.env, HOME: home }, cwd: proposalDir });

  return { home, $$ };
};

const test =
  /** @type {TestFn<Awaited<ReturnType<typeof makeTestContext>>>} */ (anyTest);

test.before(async t => (t.context = await makeTestContext(t)));
test.after.always(async t => {
  await rm(join(t.context.home, '..'), { recursive: true, force: true });
});

test('make-test-multisig mnemonics are valid for agd recovery', async t => {
  const { fromMnemonic } = DirectSecp256k1HdWallet;
  for (const { mnemonic } of config.members) {
    await t.notThrowsAsync(fromMnemonic(mnemonic, { prefix: 'agoric' }));
  }
});

test.serial('make test ops multisig', async t => {
  const { $$ } = t.context;

  await $$`./scripts/make-test-multisig.js`;

  const { stdout } =
    await $$`agd keys show ${config.multisigName} --output=json ${testKeyring}`;
  const record = JSON.parse(stdout);

  t.is(record.name, config.multisigName);
  t.truthy(record.address);
  t.truthy(record.pubkey);

  await $$`./scripts/make-test-multisig.js`; // idempotent
});

test.todo('send funds to the multisigs'); // query auth account to test

// from make-ledger-multisig.js
// `agoric15x7cnyqs59we6e3dndlnzkwsmnxw0er2r5r0ak`
test.todo('corporate multisig can delegate to the ops multi-sig with authz');

// ~/projects/agoric-sdk/a3p-integration/proposals/j:ymax1-multisig-control
// 21:01 connolly@bldbox$ HOME=/tmp/agoric-devnet-home ./scripts/grant-ledger-to-test-multisig.js
// [21:03:01.265] [0] $ agd tx sign /tmp/ymax-authz-ms-wWZlOr/unsigned.json --account-number 1304 --sequence 0 --chain-id agoricdev-25 --offline --ledger --multisig ymax1-ms --from ymax1-ledger-30 --sign-mode amino-json --overwrite --output-document /tmp/ymax-authz-ms-wWZlOr/ymax1-ledger-30.sig.json
// [21:03:14.132] [0] ✔ (done in 12.8s)
// [21:03:14.133] [1] $ agd tx sign /tmp/ymax-authz-ms-wWZlOr/unsigned.json --account-number 1304 --sequence 0 --chain-id agoricdev-25 --offline --ledger --multisig ymax1-ms --from ymax1-ledger-31 --sign-mode amino-json --overwrite --output-document /tmp/ymax-authz-ms-wWZlOr/ymax1-ledger-31.sig.json
// [21:03:23.490] [1] ✔ (done in 9.3s)
// [21:03:23.491] [2] $ agd tx multisign /tmp/ymax-authz-ms-wWZlOr/unsigned.json ymax1-ms /tmp/ymax-authz-ms-wWZlOr/ymax1-ledger-30.sig.json /tmp/ymax-authz-ms-wWZlOr/ymax1-ledger-31.sig.json --account-number 1304 --sequence 0 --chain-id agoricdev-25 --offline --output-document /tmp/ymax-authz-ms-wWZlOr/signed.json
// [21:03:23.619] [2] ✔ (done in 128ms)
// {"height":"0","txhash":"39C4B2585D8A6BFF17C84B425EA038B8C50524BA9EB3EA6548A129E1058FB677","codespace":"","code":0,"data":"","raw_log":"","logs":[],"info":"","gas_wanted":"0","gas_used":"0","tx":null,"timestamp":"","events":[]}

test.todo('updates ymax1 control to the new multisig address');
test.todo('old ymax1 control can no longer perform manager actions');
test.todo('new multisig can upgrade the contract');
test.todo(
  'existing invitations and wallet state remain usable after control transfer',
);
