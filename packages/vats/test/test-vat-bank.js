// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava';

import { E } from '@agoric/eventual-send';
import { makeIssuerKit, MathKind } from '@agoric/ertp';
import { Far } from '@agoric/marshal';
import { buildRootObject } from '../src/vat-bank';

test('communication', async t => {
  // t.plan(4);
  const bankVat = E(buildRootObject)();
  let bankHandler;

  /** @type {import('../src/bridge').BridgeManager} */
  const bridgeMgr = Far('fakeBridgeManager', {
    register(srcID, handler) {
      t.is(srcID, 'bank');
      t.assert(handler);
      bankHandler = handler;
    },
    toBridge(dstID, obj) {
      t.is(dstID, 'bank');
      t.assert(obj);
    },
    unregister(srcID) {
      t.is(srcID, 'bank');
      t.fail('no expected unregister');
    },
  });

  // Create a bank manager.
  const bankMgr = await E(bankVat).makeBankManager(bridgeMgr);
  const bank = E(bankMgr).makeBankForAddress('agoricfoo');

  const sub = await E(bank).getAssetSubscription();
  const it = sub[Symbol.asyncIterator]();

  const kit = makeIssuerKit('BLD', MathKind.NAT, harden({ decimalPlaces: 6 }));
  await t.throwsAsync(() => E(bank).getPurse(kit.brand), {
    message: /"brand" not found/,
  });

  /** @type {undefined | IteratorResult<{brand: Brand, issuer: Issuer, proposedName: string}>} */
  let itResult;
  const p = it.next().then(r => (itResult = r));
  t.is(itResult, undefined);
  await E(bankMgr).addAsset('ubld', 'BLD Staking Tokens', kit);
  await p;
  t.is(itResult && itResult.done, false);

  // TODO test deposit/withdrawal/balance via test-vpurse.js
});
