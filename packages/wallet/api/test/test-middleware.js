// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
// eslint-disable-next-line import/no-extraneous-dependencies
import { E, Far } from '@endo/far';
import {
  makeImportContext,
  makeLoggingPresence,
} from '../src/marshal-contexts.js';

test('presences for actions log their work', async t => {
  const msgs = [];
  const enqueue = m => msgs.push(m);
  const purse = {
    actions: await makeLoggingPresence('Alleged: purse.actions', enqueue),
  };
  const myPayment = Far('payment', {});
  await E(purse.actions).deposit(myPayment);
  await E(purse.actions)(1, 'thing');
  t.deepEqual(msgs, [
    ['applyMethod', purse.actions, 'deposit', [myPayment]],
    ['applyFunction', purse.actions, [1, 'thing']],
  ]);

  const ctx = makeImportContext();
  ctx.savePurseActions(purse.actions);
  ctx.savePaymentActions(myPayment);
  const capData = ctx.fromMyWallet.serialize(harden([...msgs]));
  t.deepEqual(capData, {
    body: JSON.stringify([
      [
        'applyMethod',
        { '@qclass': 'slot', iface: 'Alleged: purse.actions', index: 0 },
        'deposit',
        [{ '@qclass': 'slot', iface: 'Alleged: payment', index: 1 }],
      ],
      ['applyFunction', { '@qclass': 'slot', index: 0 }, [1, 'thing']],
    ]),
    slots: ['purse:1', 'payment:1'],
  });
});

//   {
//     type: "WalletReversibleAction",
//     spec: [{
//       json: <bunch of data>,
//       lang: "en-US"
//       readable: "deposit 3 [IST] into [MyPurse] purse"
//     }]
