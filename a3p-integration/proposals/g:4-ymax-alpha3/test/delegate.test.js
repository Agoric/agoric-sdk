// @ts-check
import '@endo/init/debug.js';

import {
  LOCAL_CONFIG,
  makeVstorageKit,
  retryUntilCondition,
} from '@agoric/client-utils';
import { agoric, mkTemp } from '@agoric/synthetic-chain';
import { passStyleOf } from '@endo/pass-style';
import test from 'ava';
import { writeFile } from 'node:fs/promises';

// see ../prepare.sh for mnemonic
const ymaxControlAddr = 'agoric15u29seyj3c9rdwg7gwkc97uttrk6j9fl4jkuyh';

const { fromEntries } = Object;

const vsc = makeVstorageKit({ fetch }, LOCAL_CONFIG);

test.serial('postalService is in vstorage', async t => {
  const instanceEntries = await vsc.readPublished('agoricNames.instance');
  const instances = fromEntries(instanceEntries);
  const { postalService } = instances;

  t.is(passStyleOf(postalService), 'remotable');
});

const id = x => x.getBoardId();

test.serial('ymaxControl wallet has invitations', async t => {
  const current = await vsc.readPublished(`wallet.${ymaxControlAddr}.current`);
  const brands = fromEntries(await vsc.readPublished(`agoricNames.brand`));
  t.log('balances', vsc.marshaller.toCapData(current.purses));
  const invitationBalance = current.purses.find(
    p => id(p.brand) === id(brands.Invitation),
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
  const instances = fromEntries(
    await vsc.readPublished(`agoricNames.instance`),
  );
  const { postalService } = instances;

  /** @type {BridgeAction} */
  const redeemAction = {
    method: 'executeOffer',
    offer: {
      id: 'redeem-1',
      invitationSpec: {
        source: 'purse',
        // @ts-expect-error XXX x...Instance not assignable to y...Instance
        instance: postalService,
        description: 'deliver ymaxControl',
      },
      proposal: {},
      saveResult: { name: 'ymaxControl' },
    },
  };

  await sendWalletAction(ymaxControlAddr, redeemAction);

  const actionUpdate = await retryUntilCondition(
    () => vsc.readPublished(`wallet.${ymaxControlAddr}`),
    update => update.updated === 'offerStatus' && !!update.status.result,
    'redeem offer',
    { setTimeout },
  );
  t.log(actionUpdate);
  t.pass('redeem offer produced result');
});

test.serial('invoke ymaxControl to getCreatorFacet', async t => {
  /** @type {BridgeAction} */
  const invokeAction = {
    // @ts-expect-error old type from npm
    method: 'invokeEntry',
    message: {
      id: 100,
      targetName: 'ymaxControl',
      method: 'getCreatorFacet',
      args: [],
      saveResult: { name: 'ymax0.creatorFacet' },
    },
  };

  await sendWalletAction(ymaxControlAddr, invokeAction);

  const actionUpdate = await retryUntilCondition(
    () => vsc.readPublished(`wallet.${ymaxControlAddr}`),
    update =>
      // @ts-expect-error XXX old type from npm
      update.updated === 'invocation' && update.id === 100 && !!update.result,
    'invoke ymaxControl',
    { setTimeout },
  );
  t.log(actionUpdate);

  t.pass('ymaxControl invocation produced result');
});

test.serial('invoke (future) creatorFacet w/postalService', async t => {
  const instanceEntries = await vsc.readPublished('agoricNames.instance');
  const instances = fromEntries(instanceEntries);
  const { postalService } = instances;

  /** @type {BridgeAction} */
  const invokeAction = {
    // @ts-expect-error old type from npm
    method: 'invokeEntry',
    message: {
      id: 101,
      targetName: 'ymax0.creatorFacet',
      method: 'deliverResolverInvitation',
      args: [postalService],
    },
  };

  await sendWalletAction(ymaxControlAddr, invokeAction);

  const actionUpdate = await retryUntilCondition(
    () => vsc.readPublished(`wallet.${ymaxControlAddr}`),
    update =>
      // @ts-expect-error XXX old type from npm
      update.updated === 'invocation' && update.id === 101 && !!update.error,
    'invoke ymax0.creatorFacet',
    { setTimeout },
  );
  t.log(actionUpdate);

  t.pass('current ymax0.creatorFacet has no methods');
});
