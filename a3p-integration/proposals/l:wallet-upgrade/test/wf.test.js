// @ts-check
import '@endo/init/debug.js';

import {
  LOCAL_CONFIG,
  makeVstorageKit,
  retryUntilCondition,
} from '@agoric/client-utils';
import {
  agoric,
  getIncarnation,
  GOV1ADDR,
  mkTemp,
} from '@agoric/synthetic-chain';
import test from 'ava';
import { writeFile } from 'node:fs/promises';

/**
 * @import {BridgeAction} from '@agoric/smart-wallet/src/smartWallet.js';
 */

test(`walletFactory incarnation reflects invokeEntry on existing wallets`, async t => {
  const history = { walletFactory: 10 };
  t.is(await getIncarnation('walletFactory'), history.walletFactory);
});

test('pre-existing wallets can use saveResultAs and invokeEntry', async t => {
  const vsc = await makeVstorageKit({ fetch }, LOCAL_CONFIG);

  /** @param {BridgeAction} action */
  const sendAction = async action => {
    const capData = vsc.marshaller.toCapData(harden(action));
    const f1 = await mkTemp('offer-send-XXX');
    await writeFile(f1, JSON.stringify(capData), 'utf-8');
    return agoric.wallet(
      'send',
      '--from',
      GOV1ADDR,
      '--keyring-backend=test',
      '--offer',
      f1,
    );
  };

  /** @type {BridgeAction} */
  const saveAction = {
    method: 'executeOffer',
    offer: {
      id: 'save-bogus',
      invitationSpec: {
        source: 'agoricContract',
        instancePath: ['bogus'],
        callPipe: [['someBogusCall']],
      },
      proposal: {},
      saveResult: { name: 'someEntry' },
    },
  };

  const sentSave = await sendAction(saveAction);
  t.log('sent:', sentSave);

  const saveActionUpdate = await retryUntilCondition(
    () => vsc.readPublished(`wallet.${GOV1ADDR}`),
    update =>
      update.updated === 'offerStatus' && update.status.id === 'save-bogus',
    'gov1 walletAction',
    { setTimeout },
  );

  t.log('offer status', saveActionUpdate);
  t.like(saveActionUpdate, {
    updated: 'offerStatus',
    status: {
      id: 'save-bogus',
      error: 'Error: "nameKey" not found: "bogus"',
      saveResult: {
        name: 'someEntry',
      },
    },
  });

  /** @type {BridgeAction} */
  const invokeAction = {
    method: 'invokeEntry',
    message: {
      id: 'invoke-bogus',
      targetName: 'someEntry',
      method: 'someMethod',
      args: [],
    },
  };

  const sentInvoke = await sendAction(invokeAction);
  t.log('sent:', sentInvoke);

  const invokeActionUpdate = await retryUntilCondition(
    () => vsc.readPublished(`wallet.${GOV1ADDR}`),
    update => update.updated === 'invocation' && update.id === 'invoke-bogus',
    'gov1 walletAction',
    { setTimeout },
  );

  t.log('invocation status', invokeActionUpdate);
  t.like(invokeActionUpdate, {
    updated: 'invocation',
    id: 'invoke-bogus',
    error: 'Error: cannot invoke "someEntry": no such item',
  });
});
