// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { E, Far } from '@endo/far';
import {
  makeExportContext,
  makeImportContext,
  makeLoggingPresence,
} from '@agoric/smart-wallet/src/marshal-contexts.js';

const capData1 = {
  body: '#[["applyMethod","$0.Alleged: purse.actions","deposit",["$1.Alleged: payment"]],["applyFunction","$0",[1,"thing"]]]',
  slots: ['purse:1', 'payment:1'],
};

test('makeLoggingPresence logs calls on purse/payment actions', async t => {
  const msgs = [];
  const enqueue = m => msgs.push(m);
  const purse = {
    actions: await makeLoggingPresence('Alleged: purse.actions', enqueue),
  };
  const myPayment = Far('payment', {
    getAllegedBrand: () => assert.fail('mock'),
  });
  await E(purse.actions).deposit(myPayment); // promise resolves???
  await E(purse.actions)(1, 'thing');
  t.deepEqual(msgs, [
    ['applyMethod', purse.actions, 'deposit', [myPayment]],
    ['applyFunction', purse.actions, [1, 'thing']],
  ]);

  const ctx = makeExportContext();
  ctx.savePurseActions(purse.actions);
  ctx.savePaymentActions(myPayment);
  const capData = ctx.toCapData(harden([...msgs]));
  t.deepEqual(capData, capData1);
});

test('makeImportContext in wallet UI can unserialize messages', async t => {
  const msgs = [];
  const enqueue = m => msgs.push(m);
  const mkp = iface => makeLoggingPresence(iface, enqueue);

  const ctx = makeImportContext(mkp);

  const stuff = ctx.fromMyWallet.fromCapData(capData1);
  t.is(stuff.length, 2);
  const [[_tag, purse, method, _args]] = stuff;
  t.is(method, 'deposit');
  await E(purse).transfer(1);

  // unserialization is consistent
  const stuff2 = ctx.fromMyWallet.fromCapData(capData1);
  t.deepEqual(stuff, stuff2);

  const capData = ctx.fromMyWallet.toCapData(harden([...msgs]));

  t.deepEqual(capData, {
    body: '#[["applyMethod","$0.Alleged: purse.actions","transfer",[1]]]',
    slots: ['purse:1'],
  });
});

//   {
//     type: "WalletReversibleAction",
//     spec: [{
//       json: <bunch of data>,
//       lang: "en-US"
//       readable: "deposit 3 [IST] into [MyPurse] purse"
//     }]
