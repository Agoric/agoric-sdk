// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
// eslint-disable-next-line import/no-extraneous-dependencies
import { E, Far } from '@endo/far';
import { Remotable } from '@endo/marshal';
import { HandledPromise } from '@endo/eventual-send'; // TODO: convince tsc this isn't needed
import { makeImportContext } from '../src/marshal-contexts.js';

/**
 * @param {string} iface
 * @param {{
 *   applyMethod: (target: unknown, method: string | symbol, args: unknown[]) => void,
 *   applyFunction: (target: unknown, args: unknown[]) => void,
 * }} handler
 */
const makePresence = (iface, handler) => {
  let it;
  const hp = new HandledPromise((resolve, reject, resolveWithPresence) => {
    it = resolveWithPresence(handler);
  });
  assert(it);
  assert(hp);
  return Remotable(iface, undefined, it);
};

/**
 * @param {string} iface
 * @param {(parts: unknown[]) => void} log
 */
const makeLoggingPresence = (iface, log) => {
  /** @type {any} */ // TODO: solve types puzzle
  const it = makePresence(iface, {
    applyMethod: (target, method, args) => {
      log(harden(['applyMethod', target, method, args]));
    },
    applyFunction: (target, args) => {
      log(harden(['applyFunction', target, args]));
    },
  });
  return it;
};

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
  const capData = ctx.fromWallet.serialize(harden([...msgs]));
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
