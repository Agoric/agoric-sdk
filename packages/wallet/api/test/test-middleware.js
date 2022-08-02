// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
// eslint-disable-next-line import/no-extraneous-dependencies
import { E, Far } from '@endo/far';
import { HandledPromise } from '@endo/eventual-send'; // TODO: convince tsc this isn't needed

/**
 * @param {{
 *   applyMethod: (target: unknown, method: string | symbol, args: unknown[]) => void,
 *   applyFunction: (target: unknown, args: unknown[]) => void,
 * }} handler
 */
const makePresence = handler => {
  let it;
  const hp = new HandledPromise((resolve, reject, resolveWithPresence) => {
    it = resolveWithPresence(handler);
  });
  assert(it);
  assert(hp);
  return it;
};

/**
 * @param {(parts: unknown[]) => void} log
 */
const makeLoggingPresence = log => {
  /** @type {any} */ // TODO: solve types puzzle
  const it = makePresence({
    applyMethod: (target, method, args) => {
      log(['applyMethod', target, method, args]);
    },
    applyFunction: (target, args) => {
      log(['applyFunction', target, args]);
    },
  });
  return it;
};

test('presences for actions log their work', async t => {
  const msgs = [];
  const enqueue = m => msgs.push(m);
  const purse = {
    actions: makeLoggingPresence(enqueue),
  };
  const myPayment = Far('payment', {});
  await E(purse.actions).deposit(myPayment);
  await E(purse.actions)(1, 'thing');
  t.deepEqual(msgs, [
    ['applyMethod', purse.actions, 'deposit', [myPayment]],
    ['applyFunction', purse.actions, [1, 'thing']],
  ]);
});

// marshalData1 = JSON.stringify({
//     body: [
//       'applyMethod',
//       {"@qclass":"slot", index: 0},
//       'deposit',
//       [
//         {
//           amount: {“@qclass”:”bigint”, digits: “3000000”},
//           brand: {"@qclass": "slot", index:1 },
//         }
//       ]
//     ],
//     slots: [[‘purse’, ["MyPurse"]], [‘brand’, ["IST"], {decimalPlaces:6}]],
//   });

//   {
//     type: "WalletReversibleAction",
//     spec: [{
//       json: <bunch of data>,
//       lang: "en-US"
//       readable: "deposit 3 [IST] into [MyPurse] purse"
//     }]
