// @ts-check
import '@endo/init/debug.js';

import { LOCAL_CONFIG, makeVstorageKit } from '@agoric/client-utils';
import { walletUpdates } from '@agoric/deploy-script-support/src/wallet-utils.js';
import {
  getDetailsMatchingVats,
  getVatInfoFromID,
} from '@agoric/synthetic-chain';
import { makeYmaxControlKitForSynthetic } from '@aglocal/portfolio-deploy/src/ymax-control.js';
import anyTest from 'ava';
import { makeSyntheticWalletKit } from '../synthetic-wallet-kit.js';
import { makeActionId, sendWalletAction } from '../wallet-util.js';
import { redeemInvitation, submitYmaxControl } from '../ymax-util.js';
import {
  bundleId,
  ymax1ControlAddr as ymaxControlAddr,
  ymaxDataArgs,
} from './consts.js';

/**
 * @import {BridgeAction} from '@agoric/smart-wallet/src/smartWallet.js';
 * @import {TestFn} from 'ava';
 * @import {ExecutionContext} from 'ava';
 */

const { fromEntries } = Object;

const contractName = 'ymax1';

const privateArgsOverrides = harden(
  /** @type {const} */ ({
    gmpAddresses: {
      AXELAR_GAS: 'axelar1gasnew',
      AXELAR_GMP: 'axelar1gmpnew',
    },
  }),
);

const vsc = makeVstorageKit({ fetch }, LOCAL_CONFIG);
const wup = walletUpdates(
  () => vsc.readPublished(`wallet.${ymaxControlAddr}`),
  { setTimeout, log: () => {} },
);

// Create synthetic wallet kit and wallet store
const syntheticWallet = makeSyntheticWalletKit({
  address: ymaxControlAddr,
  vstorageKit: vsc,
});
const { ymaxControl } = makeYmaxControlKitForSynthetic(
  { setTimeout },
  {
    signer: syntheticWallet,
    log: () => {},
    makeNonce: () => String(Date.now()),
  },
);

/** @param {any} x */
const boardId = x => x.getBoardId();

const test =
  /** @type {TestFn<Awaited<ReturnType<typeof makeTestContext>>>} */ (anyTest);

/** @param {ExecutionContext} _t */
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
  const yc = ymaxControl.saveAs('creatorFacet');

  await t.throwsAsync(yc.getCreatorFacet(), {
    message: /no StartedInstanceKit/,
  });
});

test.serial('installAndStart using ymaxControl', async t => {
  const { BLD, USDC, PoC26 } = fromEntries(
    await vsc.readPublished('agoricNames.issuer'),
  );

  const issuers = harden({ USDC, Access: PoC26, BLD, Fee: BLD });

  const yc = ymaxControl;
  await yc.installAndStart({
    bundleId,
    issuers,
    privateArgsOverrides: ymaxDataArgs,
  });

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
  const { result } = await ymaxControl.saveAs('creatorFacet').getCreatorFacet();

  t.truthy(result, 'Creator facet saved to wallet store');
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
  const yc = ymaxControl;
  await yc.upgrade({ bundleId, privateArgsOverrides });

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
  const yc = ymaxControl;
  await yc.revoke();

  t.pass('Contract control revoked');
});

test.serial('get new contract control and upgrade', async t => {
  // This is equivalent to a core eval that grabs the upgrade kit to manually upgrade it

  await submitYmaxControl(contractName);

  const result = await redeemInvitation(ymaxControlAddr);
  t.deepEqual(result, { name: 'ymaxControl', passStyle: 'remotable' });

  const yc = ymaxControl;
  await yc.upgrade({ bundleId });

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
  const yc = ymaxControl;
  await yc.terminate({ message: 'terminate to leave state as we found it' });

  const { [contractName]: instance } = fromEntries(
    await vsc.readPublished(`agoricNames.instance`),
  );
  // @ts-expect-error non-nullable type
  t.is(instance, undefined);
});
