// @ts-check
import test from 'ava';
import { inspect } from 'node:util';
import '@endo/init/debug.js';

import {
  evalBundles,
  getIncarnation,
  waitForBlock,
  GOV1ADDR as GETTER, // not particular to governance, just a handy wallet
  GOV2ADDR as SETTER, // not particular to governance, just a handy wallet
} from '@agoric/synthetic-chain';
import { walletUtils } from './test-lib/index.js';

const START_VALUEVOW_DIR = 'start-valueVow';
const RESTART_VALUEVOW_DIR = 'restart-valueVow';

test('vow survives restart', async t => {
  t.log('start valueVow');
  await evalBundles(START_VALUEVOW_DIR);
  t.is(await getIncarnation('valueVow'), 0);

  t.log('use wallet to get a vow');
  await walletUtils.broadcastBridgeAction(GETTER, {
    method: 'executeOffer',
    offer: {
      id: 'get-value',
      invitationSpec: {
        source: 'agoricContract',
        instancePath: ['valueVow'],
        callPipe: [['makeGetterInvitation']],
      },
      proposal: {},
    },
  });

  t.log('confirm the value is not in offer results');
  await waitForBlock(2);
  {
    /** @type {any} */
    const getterStatus = await walletUtils.readLatestHead(
      `published.wallet.${GETTER}`,
    );
    console.log('current: ', inspect(getterStatus, { depth: 10 }));
    t.like(getterStatus, {
      status: {
        id: 'get-value',
      },
      updated: 'offerStatus',
    });
    t.false('result' in getterStatus.status, 'no result yet');
  }

  t.log('restart valueVow');
  await evalBundles(RESTART_VALUEVOW_DIR);
  t.is(await getIncarnation('valueVow'), 1);

  const offerArgs = { value: 'Ciao, mondo!' };

  t.log('use wallet to set value');
  await walletUtils.broadcastBridgeAction(SETTER, {
    method: 'executeOffer',
    offer: {
      id: 'set-value',
      invitationSpec: {
        source: 'agoricContract',
        instancePath: ['valueVow'],
        callPipe: [['makeSetterInvitation']],
      },
      offerArgs,
      proposal: {},
    },
  });

  t.log('confirm the value is now in offer results');
  {
    const getterStatus = await walletUtils.readLatestHead(
      `published.wallet.${GETTER}`,
    );

    t.like(getterStatus, { status: { result: offerArgs.value } });
  }
});
