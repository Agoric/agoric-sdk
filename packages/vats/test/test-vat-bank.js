// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava';

import { E } from '@agoric/eventual-send';
import { amountMath, makeIssuerKit, MathKind } from '@agoric/ertp';
import { Far } from '@agoric/marshal';
import { buildRootObject } from '../src/vat-bank';

test('communication', async t => {
  t.plan(24);
  const bankVat = E(buildRootObject)();

  /** @type {undefined | { fromBridge: (srcID: string, obj: any) => void }} */
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
      let ret;
      switch (obj.type) {
        case 'VPURSE_GET_BALANCE': {
          const { address, denom, type: _type, ...rest } = obj;
          t.is(address, 'agoricfoo');
          t.is(denom, 'ubld');
          t.deepEqual(rest, {});
          ret = '11993';
          break;
        }

        case 'VPURSE_GIVE': {
          const { amount, denom, recipient, type: _type, ...rest } = obj;
          t.is(recipient, 'agoricfoo');
          t.is(denom, 'ubld');
          t.is(amount, '14');
          t.deepEqual(rest, {});
          ret = amount;
          break;
        }

        case 'VPURSE_GRAB': {
          const { amount, denom, sender, type: _type, ...rest } = obj;
          t.is(sender, 'agoricfoo');
          t.is(denom, 'ubld');
          t.is(amount, '14');
          t.deepEqual(rest, {});
          ret = amount;
          break;
        }

        default: {
          t.is(obj, null);
        }
      }
      return ret;
    },
    unregister(srcID) {
      t.is(srcID, 'bank');
      t.fail('no expected unregister');
    },
  });

  // Create a bank manager.
  const bankMgr = await E(bankVat).makeBankManager(bridgeMgr);
  const bank = E(bankMgr).getBankForAddress('agoricfoo');

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
  await E(bankMgr).addAsset('ubld', 'BLD', 'Staking Tokens', kit);
  await p;
  t.is(itResult && itResult.done, false);

  // First balance.
  const vpurse = await E(bank).getPurse(kit.brand);
  const bal = await E(vpurse).getCurrentAmount();
  t.assert(amountMath.isEqual(bal, amountMath.make(kit.brand, 11993n)));

  // Deposit.
  const paymentAmount = amountMath.make(kit.brand, 14n);
  const payment = await E(kit.mint).mintPayment(paymentAmount);
  const actualPaymentAmount = await E(vpurse).deposit(payment, paymentAmount);
  t.assert(amountMath.isEqual(actualPaymentAmount, paymentAmount));

  // Withdrawal.
  const payment2 = /** @type {Payment} */ (await E(vpurse).withdraw(
    paymentAmount,
  ));
  const actualPaymentAmount2 = await E(kit.issuer).burn(
    payment2,
    paymentAmount,
  );
  t.assert(amountMath.isEqual(actualPaymentAmount2, paymentAmount));

  // Balance update.
  const notifier = E(vpurse).getCurrentAmountNotifier();
  const updateRecord = await E(notifier).getUpdateSince();
  const balance = { address: 'agoricfoo', denom: 'ubld', amount: '92929' };
  const obj = { type: 'VPURSE_BALANCE_UPDATE', updated: [balance] };
  t.assert(bankHandler);
  await (bankHandler && E(bankHandler).fromBridge('bank', obj));

  // Wait for new balance.
  await E(notifier).getUpdateSince(updateRecord.updateCount);
  const bal2 = await E(vpurse).getCurrentAmount();
  t.assert(
    amountMath.isEqual(
      bal2,
      amountMath.make(kit.brand, BigInt(balance.amount)),
    ),
  );
});
