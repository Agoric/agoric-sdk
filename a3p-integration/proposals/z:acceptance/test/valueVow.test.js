// @ts-check
/* eslint-env node */
import test from 'ava';
import { inspect } from 'node:util';

import { retryUntilCondition } from '@agoric/client-utils';
import {
  evalBundles,
  getIncarnation,
  GOV1ADDR as GETTER, // not particular to governance, just a handy wallet
  GOV2ADDR as SETTER,
} from '@agoric/synthetic-chain';
import { agdWalletUtils } from './test-lib/index.js';

const START_VALUEVOW_DIR = 'start-valueVow';
const RESTART_VALUEVOW_DIR = 'restart-valueVow';

test('vow survives restart', async t => {
  t.log('start valueVow');
  await evalBundles(START_VALUEVOW_DIR);
  t.is(await getIncarnation('valueVow'), 0);

  t.log('use wallet to get a vow');
  await agdWalletUtils.broadcastBridgeAction(GETTER, {
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
  let getterStatus = await retryUntilCondition(
    /** @type {() => Promise<any>} */
    async () => agdWalletUtils.readLatestHead(`published.wallet.${GETTER}`),
    value => value.status.id === 'get-value' && value.updated === 'offerStatus',
    'Offer get-value not succeeded',
    {
      retryIntervalMs: 5000,
      maxRetries: 15,
      renderResult: status => inspect(status, { depth: 10 }),
      log: t.log,
      setTimeout,
    },
  );

  t.like(getterStatus, {
    status: {
      id: 'get-value',
    },
    updated: 'offerStatus',
  });
  t.false('result' in getterStatus.status, 'no result yet');

  t.log('restart valueVow');
  await evalBundles(RESTART_VALUEVOW_DIR);
  t.is(await getIncarnation('valueVow'), 1);

  const offerArgs = { value: 'Ciao, mondo!' };

  t.log('use wallet to set value');
  await agdWalletUtils.broadcastBridgeAction(SETTER, {
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
  getterStatus = await agdWalletUtils.readLatestHead(
    `published.wallet.${GETTER}`,
  );

  t.like(getterStatus, { status: { result: offerArgs.value } });
});
