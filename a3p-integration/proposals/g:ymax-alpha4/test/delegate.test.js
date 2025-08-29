// @ts-check
import '@endo/init/debug.js';

import { LOCAL_CONFIG, makeVstorageKit } from '@agoric/client-utils';
import { agoric, mkTemp } from '@agoric/synthetic-chain';
import test from 'ava';
import { writeFile } from 'node:fs/promises';
import { walletUpdates } from './walletUpdates.js';

// see ../prepare.sh for mnemonic
const ymaxControlAddr = 'agoric15u29seyj3c9rdwg7gwkc97uttrk6j9fl4jkuyh';

/** ymax0 bundleID from mainnet proposal 103 */
const bundleId =
  'b1-867596e047f55dcf08bafe36e4a6719adb36421ee4718f4c94f4747771fd0e89b3bd5db4dadaff29a837181d669b61332ef2a5c67e7feb28e5377d19ee2f16fc';

const { fromEntries } = Object;

const vsc = makeVstorageKit({ fetch }, LOCAL_CONFIG);
const wup = walletUpdates(
  () => vsc.readPublished(`wallet.${ymaxControlAddr}`),
  { setTimeout, log: () => {} },
);

const boardId = x => x.getBoardId();

test.serial('ymaxControl wallet has invitations', async t => {
  const current = await vsc.readPublished(`wallet.${ymaxControlAddr}.current`);
  const brands = fromEntries(await vsc.readPublished(`agoricNames.brand`));
  t.log('balances', vsc.marshaller.toCapData(current.purses));
  const invitationBalance = current.purses.find(
    p => boardId(p.brand) === boardId(brands.Invitation),
  )?.balance;
  t.like(invitationBalance?.value, [{ description: 'deliver ymaxControl' }]);
});

/**
 * @import {BridgeAction} from '@agoric/smart-wallet/src/smartWallet';
 */

/**
 * @param {string} addr
 * @param {BridgeAction} action
 */
const sendWalletAction = async (addr, action) => {
  const capData = vsc.marshaller.toCapData(harden(action));
  const f1 = await mkTemp('offer-send-XXX');
  await writeFile(f1, JSON.stringify(capData), 'utf-8');
  return agoric.wallet(
    'send',
    '--from',
    addr,
    '--keyring-backend=test',
    '--offer',
    f1,
  );
};

test.serial('redeem ymaxControl invitation', async t => {
  const { postalService } = fromEntries(
    await vsc.readPublished(`agoricNames.instance`),
  );

  const id = 'redeem-1';
  /** @type {BridgeAction} */
  const redeemAction = {
    method: 'executeOffer',
    offer: {
      id,
      invitationSpec: {
        source: 'purse',
        // @ts-expect-error XXX x...Instance not assignable to y...Instance
        instance: postalService,
        description: 'deliver ymaxControl',
      },
      proposal: {},
      saveResult: { name: 'ymaxControl', overwrite: true },
    },
  };

  await sendWalletAction(ymaxControlAddr, redeemAction);

  t.deepEqual(await wup.offerResult(id), {
    name: 'ymaxControl',
    passStyle: 'remotable',
  });
});

test.serial('invoke ymaxControl showing no instance', async t => {
  const id = 'getCreatorFacet.1';
  /** @type {BridgeAction} */
  const invokeAction = {
    // @ts-expect-error old type from npm
    method: 'invokeEntry',
    message: {
      id,
      targetName: 'ymaxControl',
      method: 'getCreatorFacet',
      args: [],
      saveResult: { name: 'ymax0.creatorFacet' },
    },
  };

  await sendWalletAction(ymaxControlAddr, invokeAction);

  await t.throwsAsync(wup.invocation(id), {
    message: /no StartedInstanceKit/,
  });
});

test.serial('installAndStart using ymaxControl', async t => {
  const { BLD, USDC, PoC26 } = fromEntries(
    await vsc.readPublished('agoricNames.issuer'),
  );

  const issuers = harden({ USDC, Access: PoC26, BLD, Fee: BLD });

  const id = 'installAndStart.3';
  /** @type {BridgeAction} */
  const invokeAction = {
    // @ts-expect-error old type from npm
    method: 'invokeEntry',
    message: {
      id,
      targetName: 'ymaxControl',
      method: 'installAndStart',
      args: [{ bundleId, issuers }],
    },
  };

  await sendWalletAction(ymaxControlAddr, invokeAction);

  t.deepEqual(await wup.invocation(id), { passStyle: 'copyRecord' });
});

test.serial('invoke ymaxControl to getCreatorFacet', async t => {
  const id = 'getCreatorFacet.33';

  /** @type {BridgeAction} */
  const invokeAction = {
    // @ts-expect-error old type from npm
    method: 'invokeEntry',
    message: {
      id,
      targetName: 'ymaxControl',
      method: 'getCreatorFacet',
      args: [],
      saveResult: { name: 'ymax0.creatorFacet' },
    },
  };

  await sendWalletAction(ymaxControlAddr, invokeAction);

  t.deepEqual(await wup.invocation(id), {
    name: 'ymax0.creatorFacet',
    passStyle: 'remotable',
  });
});

test.serial('no deliverPlannerInvitation yet', async t => {
  const { postalService } = fromEntries(
    await vsc.readPublished('agoricNames.instance'),
  );

  const id = 'deliverResolverInvitation.34';

  /** @type {BridgeAction} */
  const invokeAction = {
    // @ts-expect-error old type from npm
    method: 'invokeEntry',
    message: {
      id,
      targetName: 'ymax0.creatorFacet',
      method: 'deliverResolverInvitation',
      args: [postalService],
    },
  };

  await sendWalletAction(ymaxControlAddr, invokeAction);

  await t.throwsAsync(wup.invocation(id), { message: /no method/ });
});

test.serial('ymax0 told zoe that Access token is required', async t => {
  const { ymax0 } = fromEntries(
    await vsc.readPublished(`agoricNames.instance`),
  );

  const id = 'open.132';

  /** @type {BridgeAction} */
  const redeemAction = {
    method: 'executeOffer',
    offer: {
      id,
      invitationSpec: {
        source: 'contract',
        // @ts-expect-error XXX Type 'import("...node_modules/@agoric/zoe/src/zoeService/types").Instance' is not assignable to type 'globalThis.Instance'.
        instance: ymax0,
        publicInvitationMaker: 'makeOpenPortfolioInvitation',
      },
      proposal: {},
    },
  };

  await sendWalletAction(ymaxControlAddr, redeemAction);

  await t.throwsAsync(wup.offerResult(id), {
    message: /missing properties \["Access"\]/,
  });
});
