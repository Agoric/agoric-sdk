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
 * @import {BridgeAction} from '@agoric/smart-wallet/src/smartWallet';
 */
test(`walletFactory incarnation reflects invokeEntry`, async t => {
  const history = { walletFactory: 9 };
  t.is(await getIncarnation('walletFactory'), history.walletFactory);
});

test('pre-existing wallets cannot use saveResultAs nor invokeEntry', async t => {
  const expected =
    'executeOffer saveResult requires a new smart wallet with myStore';

  /** @type {BridgeAction} */
  const saveAction = {
    method: 'executeOffer',
    offer: {
      id: 'save-1',
      invitationSpec: {
        source: 'agoricContract',
        instancePath: ['ymax0'],
        callPipe: [['makeOpenPortfolioInvitation']],
      },
      proposal: {},
      // @ts-expect-error XXX BridgeAction type here is stale, from npm
      saveResult: { name: 'invitation-1' },
    },
  };
  const vsc = await makeVstorageKit({ fetch }, LOCAL_CONFIG);

  /** @param {BridgeAction} action */
  const sendOffer = async action => {
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

  const sent = await sendOffer(saveAction);
  t.log('sent:', sent);

  const actionUpdate = await retryUntilCondition(
    () => vsc.readPublished(`wallet.${GOV1ADDR}`),
    update => update.updated === 'walletAction',
    'gov1 walletAction',
    { setTimeout },
  );

  assert(actionUpdate.updated === 'walletAction');
  t.log('offer status', actionUpdate);
  t.is(actionUpdate.status.error, expected);
});
