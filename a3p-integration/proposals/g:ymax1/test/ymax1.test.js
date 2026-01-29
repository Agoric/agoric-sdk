// @ts-check
import '@endo/init/debug.js';

import { LOCAL_CONFIG, makeVstorageKit } from '@agoric/client-utils';
import {
  getVatInfoFromID,
  getDetailsMatchingVats,
} from '@agoric/synthetic-chain';
import anyTest from 'ava';
import { walletUpdates } from '../walletUpdates.js';
import {
  bundleId,
  ymax1ControlAddr as ymaxControlAddr,
  ymaxDataArgs,
} from './consts.js';
import { makeActionId, sendWalletAction } from '../wallet-util.js';
import { redeemInvitation, submitYmaxControl } from '../ymax-util.js';

/**
 * @import {BridgeAction} from '@agoric/smart-wallet/src/smartWallet.js';
 */

const { fromEntries } = Object;

const contractName = 'ymax1';

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

/** @param {import('ava').ExecutionContext} _t */
const makeTestContext = async _t => {
  /**
   * Hack to share data between test
   * @type {{vatID?: string; instanceId?: string, vatIDsToIgnore?: string[]}}
   */
  const shared = {};

  return { shared };
};

test.before(async t => (t.context = await makeTestContext(t)));

test.serial('no instance currently deployed', async t => {
  const { [contractName]: instance } = fromEntries(
    await vsc.readPublished(`agoricNames.instance`),
  );

  // @ts-expect-error non-nullable type
  t.is(instance, undefined);

  const potentialVats = await getDetailsMatchingVats(contractName).then(
    candidates => candidates.filter(v => !v.terminated),
  );
  t.context.shared.vatIDsToIgnore = potentialVats.map(({ vatID }) => vatID);
  t.deepEqual(potentialVats, []);
});

test.serial('invoke ymaxControl showing no instance', async t => {
  const id = makeActionId('getCreatorFacet');
  /** @type {BridgeAction} */
  const invokeAction = {
    // @ts-expect-error old type from npm
    method: 'invokeEntry',
    message: {
      id,
      targetName: 'ymaxControl',
      method: 'getCreatorFacet',
      args: [],
      saveResult: { name: 'creatorFacet' },
    },
  };

  await sendWalletAction(vsc, ymaxControlAddr, invokeAction);

  await t.throwsAsync(wup.invocation(id), {
    message: /no StartedInstanceKit/,
  });
});

test.serial('installAndStart using ymaxControl', async t => {
  const { BLD, USDC, PoC26 } = fromEntries(
    // @ts-expect-error old type from npm
    await vsc.readPublished('agoricNames.issuer'),
  );

  const issuers = harden({ USDC, Access: PoC26, BLD, Fee: BLD });

  const id = makeActionId('installAndStart');
  /** @type {BridgeAction} */
  const invokeAction = {
    // @ts-expect-error old type from npm
    method: 'invokeEntry',
    message: {
      id,
      targetName: 'ymaxControl',
      method: 'installAndStart',
      args: [{ bundleId, issuers, privateArgsOverrides: ymaxDataArgs }],
    },
  };

  await sendWalletAction(vsc, ymaxControlAddr, invokeAction);

  t.deepEqual(await wup.invocation(id), { passStyle: 'copyRecord' });

  const { [contractName]: instance } = fromEntries(
    await vsc.readPublished(`agoricNames.instance`),
  );
  t.not(instance, undefined);
  t.context.shared.instanceId = boardId(instance);

  const potentialVats = await getDetailsMatchingVats(contractName).then(
    candidates =>
      candidates.filter(
        v =>
          !v.terminated && !t.context.shared.vatIDsToIgnore?.includes(v.vatID),
      ),
  );
  t.log('potential vats', potentialVats);
  t.is(potentialVats.length, 1);

  const vatDetails = potentialVats.slice(-1)[0];
  t.log(vatDetails);

  t.context.shared.vatID = vatDetails.vatID;
});

test.serial('invoke ymaxControl to getCreatorFacet', async t => {
  const id = makeActionId('getCreatorFacet');

  /** @type {BridgeAction} */
  const invokeAction = {
    // @ts-expect-error old type from npm
    method: 'invokeEntry',
    message: {
      id,
      targetName: 'ymaxControl',
      method: 'getCreatorFacet',
      args: [],
      saveResult: { name: 'creatorFacet' },
    },
  };

  await sendWalletAction(vsc, ymaxControlAddr, invokeAction);

  t.deepEqual(await wup.invocation(id), {
    name: 'creatorFacet',
    passStyle: 'remotable',
  });
});

test.serial('ymax told zoe that Access token is required', async t => {
  const { [contractName]: instance } = fromEntries(
    await vsc.readPublished(`agoricNames.instance`),
  );

  const id = makeActionId('open');

  /** @type {BridgeAction} */
  const redeemAction = {
    method: 'executeOffer',
    offer: {
      id,
      invitationSpec: {
        source: 'contract',
        // @ts-expect-error XXX Type 'import("...node_modules/@agoric/zoe/src/zoeService/types").Instance' is not assignable to type 'globalThis.Instance'.
        instance,
        publicInvitationMaker: 'makeOpenPortfolioInvitation',
      },
      proposal: {},
    },
  };

  await sendWalletAction(vsc, ymaxControlAddr, redeemAction);

  await t.throwsAsync(wup.offerResult(id), {
    message: /missing properties \["Access"\]/,
  });
});

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
    t.context.shared.instanceId,
    `${contractName} has a the same instance`,
  );

  const vatInfo = await getVatInfoFromID(
    /** @type {string} **/ (t.context.shared.vatID),
  );

  t.is(
    /** @type {{incarnation: number}} */ (vatInfo.currentSpan()).incarnation,
    1,
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

test.serial('get new contract control and upgrade', async t => {
  // This is equivalent to a core eval that grabs the upgrade kit to manually upgrade it

  await submitYmaxControl(contractName);

  const result = await redeemInvitation(ymaxControlAddr);
  t.deepEqual(result, { name: 'ymaxControl', passStyle: 'remotable' });

  const id = makeActionId('upgrade2');

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
    t.context.shared.instanceId,
    `${contractName} has a the same instance`,
  );

  const vatInfo = await getVatInfoFromID(
    /** @type {string} **/ (t.context.shared.vatID),
  );

  t.is(
    /** @type {{incarnation: number}} */ (vatInfo.currentSpan()).incarnation,
    2,
  );

  // Check we have the args from the first upgrade, not the start args
  const { privateArgs } = JSON.parse(vatInfo.parameters().body.slice(1));
  t.like(privateArgs, privateArgsOverrides);
});

test.serial('terminate', async t => {
  const id = makeActionId('terminate');

  /** @type {BridgeAction} */
  const invokeAction = {
    // @ts-expect-error old type from npm
    method: 'invokeEntry',
    message: {
      id,
      targetName: 'ymaxControl',
      method: 'terminate',
      args: [
        {
          message: 'terminate to leave state as we found it',
        },
      ],
    },
  };

  await sendWalletAction(vsc, ymaxControlAddr, invokeAction);

  t.deepEqual(await wup.invocation(id), { passStyle: 'undefined' });

  const { [contractName]: instance } = fromEntries(
    await vsc.readPublished(`agoricNames.instance`),
  );
  // @ts-expect-error non-nullable type
  t.is(instance, undefined);
});
