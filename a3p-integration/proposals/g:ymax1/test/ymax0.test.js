// @ts-check
import '@endo/init/debug.js';

import {
  LOCAL_CONFIG,
  makeVstorageKit,
  reflectWalletStore,
} from '@agoric/client-utils';
import {
  getVatInfoFromID,
  getDetailsMatchingVats,
} from '@agoric/synthetic-chain';
import anyTest from 'ava';
import { YMAX_CONTROL_WALLET_KEY } from '@agoric/portfolio-api/src/portfolio-constants.js';
import { bundleId, ymax0ControlAddr as ymaxControlAddr } from './consts.js';
import { redeemInvitation, submitYmaxControl } from '../ymax-util.js';
import { makeSyntheticWalletKit } from '../synthetic-wallet-kit.js';

/**
 * @import {TestFn} from 'ava';
 * @import {ExecutionContext} from 'ava';
 */

const { fromEntries } = Object;

const contractName = 'ymax0';

const privateArgsOverrides = harden({
  gmpAddresses: {
    AXELAR_GAS: 'axelar1gasnew',
    AXELAR_GMP: 'axelar1gmpnew',
  },
});

const vsc = makeVstorageKit({ fetch }, LOCAL_CONFIG);

// Create synthetic wallet kit and wallet store
const syntheticWallet = makeSyntheticWalletKit({
  address: ymaxControlAddr,
  vstorageKit: vsc,
});
const walletStore = reflectWalletStore(syntheticWallet, {
  setTimeout,
  log: () => {},
  makeNonce: () => String(Date.now()),
});

/** @param {any} x */
const boardId = x => x.getBoardId();

const test =
  /** @type {TestFn<Awaited<ReturnType<typeof makeTestContext>>>} */ (anyTest);

/** @param {ExecutionContext} t */
const makeTestContext = async t => {
  const { [contractName]: instance } = fromEntries(
    await vsc.readPublished(`agoricNames.instance`),
  );

  const potentialVats = await getDetailsMatchingVats(contractName).then(
    candidates => candidates.filter(v => !v.terminated),
  );
  if (potentialVats.length !== 1) {
    t.log('WARN', 'Multiple running vats found', potentialVats);
  }

  const vatDetails = potentialVats.slice(-1)[0];
  t.log(vatDetails);

  return {
    instanceId: boardId(instance),
    vatDetails,
  };
};

test.before(async t => (t.context = await makeTestContext(t)));

test.serial('null upgrade existing instance with args override', async t => {
  // Get contract control from wallet store and call upgrade directly
  const yc = walletStore.get(YMAX_CONTROL_WALLET_KEY);
  await yc.upgrade({ bundleId, privateArgsOverrides });

  const { [contractName]: instance } = fromEntries(
    await vsc.readPublished(`agoricNames.instance`),
  );
  t.is(
    boardId(instance),
    t.context.instanceId,
    `${contractName} has a the same instance`,
  );

  const vatInfo = await getVatInfoFromID(t.context.vatDetails.vatID);

  t.is(
    /** @type {{incarnation: number}} */ (vatInfo.currentSpan()).incarnation,
    t.context.vatDetails.incarnation + 1,
  );

  const { privateArgs } = JSON.parse(vatInfo.parameters().body.slice(1));
  t.like(privateArgs, privateArgsOverrides);
});

test.serial('revoke contract control', async t => {
  // Get contract control from wallet store and call revoke directly
  const yc = walletStore.get(YMAX_CONTROL_WALLET_KEY);
  await yc.revoke();

  t.pass('Contract control revoked');
});

test.serial('get new contract control', async t => {
  await submitYmaxControl(contractName);

  const result = await redeemInvitation(ymaxControlAddr);
  t.deepEqual(result, { name: 'ymaxControl', passStyle: 'remotable' });
});

test.todo('new portfolio-control upgrade keeps upgraded privateArgs');
