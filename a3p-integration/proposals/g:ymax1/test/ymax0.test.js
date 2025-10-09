// @ts-check
import '@endo/init/debug.js';

import { LOCAL_CONFIG, makeVstorageKit } from '@agoric/client-utils';
import {
  getVatInfoFromID,
  getDetailsMatchingVats,
} from '@agoric/synthetic-chain';
import anyTest from 'ava';
import { walletUpdates } from '../walletUpdates.js';
import { bundleId, ymax0ControlAddr as ymaxControlAddr } from './consts.js';
import { redeemInvitation, submitYmaxControl } from '../ymax-util.js';
import { makeActionId, sendWalletAction } from '../wallet-util.js';

/**
 * @import {BridgeAction} from '@agoric/smart-wallet/src/smartWallet';
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
const wup = walletUpdates(
  () => vsc.readPublished(`wallet.${ymaxControlAddr}`),
  { setTimeout, log: () => {} },
);

/** @param {any} x */
const boardId = x => x.getBoardId();

const test =
  /** @type {import('ava').TestFn<Awaited<ReturnType<typeof makeTestContext>>>} */ (
    anyTest
  );

/** @param {import('ava').ExecutionContext} t */
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
  const id = makeActionId('upgrade');

  /** @type {BridgeAction} */
  const invokeAction = {
    // @ts-expect-error old type from npm
    method: 'invokeEntry',
    message: {
      id,
      targetName: 'ymaxControl',
      method: 'upgrade',
      args: [
        {
          bundleId,
          privateArgsOverrides,
        },
      ],
    },
  };

  await sendWalletAction(vsc, ymaxControlAddr, invokeAction);

  t.deepEqual(await wup.invocation(id), { passStyle: 'copyRecord' });

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
  const id = makeActionId('revoke');

  /** @type {BridgeAction} */
  const invokeAction = {
    // @ts-expect-error old type from npm
    method: 'invokeEntry',
    message: {
      id,
      targetName: 'ymaxControl',
      method: 'revoke',
      args: [],
    },
  };

  await sendWalletAction(vsc, ymaxControlAddr, invokeAction);

  t.deepEqual(await wup.invocation(id), { passStyle: 'undefined' });
});

test.serial('get new contract control', async t => {
  await submitYmaxControl(contractName);

  const result = await redeemInvitation(ymaxControlAddr);
  t.deepEqual(result, { name: 'ymaxControl', passStyle: 'remotable' });
});

test.todo('new portfolio-control upgrade keeps upgraded privateArgs');
