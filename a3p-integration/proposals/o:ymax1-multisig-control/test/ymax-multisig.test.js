// @ts-check
/** @file exercise the ymax1 multisig-control proposal flow against the local chain */
import '@endo/init/debug.js';

import {
  LOCAL_CONFIG,
  makeVstorageKit,
  retryUntilCondition,
} from '@agoric/client-utils';
import {
  makeActionId,
  walletUpdates,
} from '@agoric/deploy-script-support/src/wallet-utils.js';
import { YMAX_CONTROL_WALLET_KEY } from '@agoric/portfolio-api/src/portfolio-constants.js';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { makePromiseKit } from '@endo/promise-kit';
import anyTest from 'ava';
import { $ } from 'execa';
import { mkdtemp } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeWalletActionBuilder } from '@aglocal/portfolio-deploy/src/ymax-authz-msgs.js';

import { config as opsConfig } from '../scripts/make-test-multisig.js';

/**
 * @import {ExecaScriptMethod} from 'execa';
 * @import {ExecutionContext, TestFn} from 'ava';
 * @import {VstorageKit} from '@agoric/client-utils';
 * @import {OfferSpec} from '@agoric/smart-wallet/src/offers.js';
 * @import {BridgeAction} from '@agoric/smart-wallet/src/smartWallet.js';
 * @import {PromiseKit} from '@endo/promise-kit';
 * @import {ContractControl} from '@agoric/deploy-script-support/src/control/contract-control.contract.js';
 */

// a3p proposal 106 (`ymax-alpha4`), adopted in agoric-sdk commit
// ac0680c98384 (`chore(a3p): use ymax-alpha4`).
export const bundleId =
  'b1-078729b9683de5f81afe8b14bd163f0165b8dd803f587413df8dff76b557d56e5d0d67f8f654bc920b5bb3a734d7d7644791692efbbc08c08984e37c6e0e6c88';

const ymax1Control = {
  keyName: 'ymax1-ms',
  address: 'agoric15x7cnyqs59we6e3dndlnzkwsmnxw0er2r5r0ak',
  number: '31', // XXX fragile, but we need to know the account number for signing
  members: [
    {
      name: 'ymax1-ledger-30',
      account: 3,
      index: 0,
      pubkey:
        '{"@type":"/cosmos.crypto.secp256k1.PubKey","key":"A7v2IrDcimWzZWeN4ATfIXq5wB28p1baqBbsysTTSmTe"}',
    },
    {
      name: 'ymax1-ledger-31',
      account: 3,
      index: 1,
      pubkey:
        '{"@type":"/cosmos.crypto.secp256k1.PubKey","key":"Axl2xhwNl4+oU9BuCyB4ypUW6BXRCr7CiL+3GDkgC51h"}',
    },
  ],
};

const testKeys = { 'keyring-backend': 'test' };
const localChain = { 'chain-id': 'agoriclocal' };
const outputJson = { output: 'json' };
const generateOnly = {
  'generate-only': true,
  ...localChain,
  ...outputJson,
};
const blockBroadcast = { 'broadcast-mode': 'block' };
const mediumFee = { fees: '10000ubld', gas: '400000' };
const offline = { offline: true };
const opsMultisig = { multisig: opsConfig.keyName };
const outj = ['--output=json'];
const flags = record =>
  Object.entries(record).flatMap(([key, value]) =>
    value === true ? [`--${key}`] : value ? [`--${key}`, value] : [],
  );
const fromJson = async p => JSON.parse((await p).stdout);

/** @param {ExecutionContext} t */
const makeTestContext = async t => {
  const require = createRequire(import.meta.url);
  const proposalDir = join(require.resolve('../package.json'), '..');
  t.log('cwd', proposalDir);
  const $$ = $({ env: process.env, cwd: proposalDir, verbose: 'short' });
  /** @type {PromiseKit<{ number: string, address: string }>} */
  const opsAcctPK = makePromiseKit();
  const vsc = makeVstorageKit({ fetch }, LOCAL_CONFIG);

  return { $$, opsAcctPK, vsc, now: () => Date.now() };
};

const test =
  /** @type {TestFn<Awaited<ReturnType<typeof makeTestContext>>>} */ (anyTest);

test.before(async t => (t.context = await makeTestContext(t)));

test('make-test-multisig mnemonics are valid for agd recovery', async t => {
  const { fromMnemonic } = DirectSecp256k1HdWallet;
  for (const { mnemonic } of opsConfig.members) {
    await t.notThrowsAsync(fromMnemonic(mnemonic, { prefix: 'agoric' }));
  }
});

test.serial('add ymax1 control multisig to the test keyring', async t => {
  const { $$ } = t.context;

  for (const { name, pubkey } of ymax1Control.members) {
    await $$`agd keys add ${name} ${flags({ pubkey, ...testKeys })} `;
  }

  const multisig = ymax1Control.members.map(({ name }) => name).join(',');
  const info = await fromJson($$`agd keys add ${ymax1Control.keyName}
    ${flags({ multisig, 'multisig-threshold': 2, ...testKeys })} ${outj}`);

  t.log('ymax1 control multisig info', info);
  t.is(info.address, ymax1Control.address);
});

test.serial('make test ops multisig', async t => {
  const { $$, opsAcctPK } = t.context;

  await $$`./scripts/make-test-multisig.js`;

  const record = await fromJson(
    $$`agd keys show ${opsConfig.keyName} ${outj} ${flags(testKeys)}`,
  );

  t.is(record.name, opsConfig.keyName);
  t.truthy(record.address);
  t.truthy(record.pubkey);
  opsAcctPK.resolve({ address: record.address, number: '30' });

  await $$`./scripts/make-test-multisig.js`; // idempotent
});

test.serial('send funds to the multisigs', async t => {
  const { $$, opsAcctPK } = t.context;

  await $$`./scripts/make-test-multisig.js`;

  const opsAcct = await opsAcctPK.promise;
  const fromGov1 = {
    ...localChain,
    ...blockBroadcast,
    ...testKeys,
    yes: true,
    from: 'gov1',
  };

  await $$`agd tx bank send gov1 ${opsAcct.address} 20000000ubld ${flags(fromGov1)}`;
  await $$`agd tx bank send gov1 ${ymax1Control.address} 20000000ubld ${flags(fromGov1)}`;

  const opsAccount = await fromJson(
    $$`agd query auth account ${opsAcct.address} ${outj}`,
  );
  t.log('opsAccount', opsAccount);
  t.is(opsAccount.account.value.address, opsAcct.address);
  t.is(opsAccount.account.value.account_number, opsAcct.number);
  t.falsy(opsAccount.account.value.sequence);

  const ledgerAccount = await fromJson(
    await $$`agd query auth account ${ymax1Control.address} ${outj}`,
  );
  t.log('ledgerAccount', ledgerAccount);
  t.is(ledgerAccount.account.value.address, ymax1Control.address);
  t.is(ledgerAccount.account.value.account_number, ymax1Control.number);
  t.falsy(ledgerAccount.account.value.sequence);
});

test.serial('control multisig delegates to the ops multi-sig', async t => {
  const { $$ } = t.context;

  const sigFiles = ymax1Control.members.map(({ name }) =>
    join('./test/fixtures', `${name}.sig.json`),
  );
  const signerOpts = {
    'account-number': ymax1Control.number,
    sequence: '0',
    ...localChain,
  };

  const [unsignedFile, signedFile] = ['./unsigned.json', './signed.json'].map(
    n => join('./test/fixtures', n),
  );

  await $$`agd tx multisign ${unsignedFile} ${ymax1Control.keyName} ${sigFiles} ${flags(
    {
      ...signerOpts,
      ...testKeys,
      ...offline,
      'output-document': signedFile,
    },
  )}`;

  const tx = await fromJson(
    $$`agd tx broadcast ${signedFile} ${flags(blockBroadcast)} ${outj}`,
  );
  const { events: _e, logs: _l, ...txRest } = tx;
  t.log('authz grant tx', txRest);
  t.truthy(tx.txhash);
  t.is(tx.code, 0);
});

/**
 * XXX pass FileRW and FileRd rather than string
 *
 * @param {{
 *  $$: ExecaScriptMethod,
 *  acct: { number: string },
 *  sequence: string,
 *  unsignedFile: string,
 *  signedFile: string
 * }} access
 * @returns {Promise<{ code: number, txhash: string, events:unknown[], logs: string, rawLog: string }>}
 */
const signBroadcastWithOpsMultisig = async ({
  $$,
  acct,
  sequence,
  unsignedFile,
  signedFile,
}) => {
  const signers = opsConfig.members.slice(0, opsConfig.threshold);
  const sigDir = signedFile.slice(0, signedFile.lastIndexOf('/'));
  const sigFiles = signers.map(({ name }) => join(sigDir, `${name}.sig.json`));
  const signerOpts = { 'account-number': acct.number, sequence, ...localChain };
  for (const [index, { name }] of signers.entries()) {
    await $$`agd tx sign ${unsignedFile} ${flags({
      ...signerOpts,
      ...offline,
      ...testKeys,
      from: name,
      'sign-mode': 'amino-json',
      overwrite: true,
      'output-document': sigFiles[index],
      ...opsMultisig,
    })}`;
  }

  await $$`agd tx multisign ${unsignedFile} ${opsConfig.keyName} ${sigFiles} ${flags(
    {
      ...signerOpts,
      ...offline,
      ...testKeys,
      'output-document': signedFile,
    },
  )}`;

  return fromJson(
    $$`agd tx broadcast ${signedFile} ${flags(blockBroadcast)} ${outj}`,
  );
};

test.serial('provision control smart wallet with ops multisig', async t => {
  const { $$, opsAcctPK } = t.context;
  const opsAcct = await opsAcctPK.promise;
  const { sequence = '0' } = (
    await fromJson($$`agd query auth account ${opsAcct.address} ${outj}`)
  ).account.value;
  const work = await mkdtemp(join(tmpdir(), 'ymax-provision-'));
  const unsignedFile = join(work, 'unsigned.json');
  const signedFile = join(work, 'signed.json');

  await $$({
    stdout: { file: unsignedFile },
  })`agd tx swingset provision-one ymax1-control ${ymax1Control.address} SMART_WALLET ${flags(
    {
      from: opsConfig.keyName,
      ...generateOnly,
      ...mediumFee,
      ...testKeys,
    },
  )}`;

  const tx = await signBroadcastWithOpsMultisig({
    $$,
    acct: opsAcct,
    sequence,
    unsignedFile,
    signedFile,
  });
  const { events: _e, logs: _l, ...txRest } = tx;
  t.log('wallet provision tx', txRest);
  t.truthy(tx.txhash);
  t.is(tx.code, 0);

  const walletPath = await retryUntilCondition(
    () =>
      fromJson(
        $$`agd query vstorage path published.wallet.${ymax1Control.address} ${outj}`,
      ),
    value => !!value?.value,
    `smart wallet for ${ymax1Control.address} was not published`,
    { setTimeout, retryIntervalMs: 1000, maxRetries: 10, log: t.log },
  );

  t.truthy(walletPath?.value);
});

/**
 * @param {{
 *   address: string,
 *   readPublished: (path: string) => Promise<unknown>,
 *   executeOffer: OpsWalletKit['executeOffer'],
 * }} wallet
 * @param {() => number} now
 */
const redeemInvitation = async (wallet, now) => {
  const id = makeActionId(`deliver ${YMAX_CONTROL_WALLET_KEY}`, now);
  const instances = Object.fromEntries(
    await wallet.readPublished('agoricNames.instance'),
  );
  const { postalService } = instances;

  return wallet.executeOffer({
    id,
    invitationSpec: {
      source: 'purse',
      instance: postalService,
      description: `deliver ${YMAX_CONTROL_WALLET_KEY}`,
    },
    proposal: {},
    saveResult: { name: YMAX_CONTROL_WALLET_KEY, overwrite: true },
  });
};

/**
 * @param {{
 *   $$: ExecaScriptMethod,
 *   opsAcct: { address: string, number: string },
 *   vsc: VstorageKit,
 *   address: string
 * }} access
 */
const makeOpsWalletKit = ({ $$, opsAcct, vsc, address }) => {
  /** @param {string} path */
  const readPublished = path => vsc.readPublished(path);

  /**
   * @param {BridgeAction} action
   */
  const sendBridgeAction = async action => {
    const work = await mkdtemp(join(tmpdir(), 'offer-send-'));
    const spendUnsignedFile = join(work, 'spend-unsigned.json');
    const execUnsignedFile = join(work, 'exec-unsigned.json');
    const execSignedFile = join(work, 'exec-signed.json');
    const { sequence = '0' } = (
      await fromJson($$`agd query auth account ${opsAcct.address} ${outj}`)
    ).account.value;
    const capData = vsc.marshaller.toCapData(harden(action));

    await $$({
      stdout: { file: spendUnsignedFile },
    })`agd tx swingset wallet-action --allow-spend ${JSON.stringify(capData)} ${flags(
      { from: address, ...generateOnly, ...testKeys },
    )}`;

    await $$({
      stdout: { file: execUnsignedFile },
    })`agd tx authz exec ${spendUnsignedFile} ${flags({
      from: opsConfig.keyName,
      ...generateOnly,
      ...mediumFee,
      ...testKeys,
    })}`;

    return signBroadcastWithOpsMultisig({
      $$,
      acct: opsAcct,
      sequence,
      unsignedFile: execUnsignedFile,
      signedFile: execSignedFile,
    });
  };

  /**
   * @param {OfferSpec} offer
   */
  const executeOffer = async offer => {
    const wup = walletUpdates(() => vsc.readPublished(`wallet.${address}`), {
      setTimeout, // XXX ambient
      log: () => {},
    });
    const tx = await sendBridgeAction({ method: 'executeOffer', offer });
    return { tx, result: wup.offerResult(offer.id) };
  };

  return harden({
    address,
    readPublished,
    query: {
      getLastUpdate: () => vsc.readPublished(`wallet.${address}`),
    },
    sendBridgeAction,
    executeOffer,
  });
};
/** @typedef {ReturnType<typeof makeOpsWalletKit>} OpsWalletKit */

test.serial('redeem ymaxControl invitation', async t => {
  const { $$, vsc, now, opsAcctPK } = t.context;
  const opsAcct = await opsAcctPK.promise;
  const { address } = ymax1Control;
  const opsControlWallet = makeOpsWalletKit({ $$, vsc, opsAcct, address });
  const redeemed = await redeemInvitation(opsControlWallet, now);
  const { events: _e, logs: _l, ...txRest } = redeemed.tx;
  t.log('redeem invitation tx', txRest);
  t.is(redeemed.tx.code, 0);
  t.deepEqual(await redeemed.result, {
    name: 'ymaxControl',
    passStyle: 'remotable',
  });
});

test.serial('ops multisig can upgrade the contract', async t => {
  const { $$, vsc, now, opsAcctPK } = t.context;
  const opsAcct = await opsAcctPK.promise;
  const { address } = ymax1Control;
  const opsWallet = makeOpsWalletKit({ $$, vsc, opsAcct, address });

  const id = `upgrade-${new Date(now()).toISOString()}`;
  // XXX switch to .ts
  /** @type {{ upgrade: (args: { bundleId: string; privateArgsOverrides: Record<string, unknown> }) => BridgeAction }} */
  const builder = makeWalletActionBuilder(YMAX_CONTROL_WALLET_KEY, id);
  const action = builder.upgrade({ bundleId, privateArgsOverrides: {} });
  const tx = await opsWallet.sendBridgeAction(action);
  t.is(tx.code, 0);

  const wup = walletUpdates(opsWallet.query.getLastUpdate, {
    setTimeout, // XXX ambient
    log: () => {},
  });
  const result = await wup.invocation(id);
  t.log('upgrade result', result);
  t.deepEqual(result, { passStyle: 'copyRecord' });
});

test.todo('uses ymax1 rather than ymax0');
test.todo('old ymax1 control can no longer perform manager actions');
test.todo(
  'existing invitations and wallet state remain usable after control transfer',
);
