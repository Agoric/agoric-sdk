// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { E } from '@agoric/eventual-send';
import { AmountMath, makeIssuerKit, AssetKind } from '@agoric/ertp';
import { Far } from '@agoric/marshal';
import { makeAsyncIterableFromNotifier } from '@agoric/notifier';
import { buildRootObject } from '../src/vat-bank.js';

test('communication', async t => {
  t.plan(35);
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
        case 'VBANK_GET_BALANCE': {
          const { address, denom, type: _type, ...rest } = obj;
          t.is(address, 'agoricfoo');
          t.deepEqual(rest, {});
          if (denom === 'ubld') {
            ret = '11993';
          } else if (denom === 'ufee') {
            ret = '34';
          } else {
            t.fail(`unrecognized denomination ${denom}`);
          }
          break;
        }

        case 'VBANK_GIVE': {
          const { amount, denom, recipient, type: _type, ...rest } = obj;
          t.is(recipient, 'agoricfoo');
          t.is(denom, 'ubld');
          t.is(amount, '14');
          t.deepEqual(rest, {});
          ret = amount;
          break;
        }

        case 'VBANK_GRAB': {
          const { amount, denom, sender, type: _type, ...rest } = obj;
          t.is(sender, 'agoricfoo');
          t.deepEqual(rest, {});
          if (denom === 'ubld') {
            t.is(amount, '14');
            ret = amount;
          } else if (denom === 'ufee') {
            if (BigInt(amount) > 35n) {
              throw Error('insufficient ufee funds');
            } else {
              t.is(amount, '35');
              ret = amount;
            }
          } else {
            t.fail(`unrecognized denomination ${denom}`);
          }
          break;
        }

        case 'VBANK_GIVE_TO_FEE_COLLECTOR': {
          const { amount, denom, type: _type, ...rest } = obj;
          t.is(denom, 'ufee');
          t.is(amount, '12');
          t.deepEqual(rest, {});
          ret = true;
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

  const kit = makeIssuerKit('BLD', AssetKind.NAT, harden({ decimalPlaces: 6 }));
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
  t.deepEqual(bal, AmountMath.make(kit.brand, 11993n));

  // Deposit.
  const paymentAmount = AmountMath.make(kit.brand, 14n);
  const payment = await E(kit.mint).mintPayment(paymentAmount);
  const actualPaymentAmount = await E(vpurse).deposit(payment, paymentAmount);
  t.deepEqual(actualPaymentAmount, paymentAmount);

  // Withdrawal.  We can't easily type a `VirtualPurse` unless we make it
  // callable only with `E`, in which case we can't automatically unwrap the
  // return result of `E(vpurse).withdraw` to a sync interface (which `Payment`
  // is).
  //
  // TODO: We can fix this only if the ERTP methods also allow consuming a
  // `Remote<Payment>` instead of just `Payment`.  That typing has not yet been
  // done, hence the cast.
  const payment2 = /** @type {Payment} */ (await E(vpurse).withdraw(
    paymentAmount,
  ));
  const actualPaymentAmount2 = await E(kit.issuer).burn(
    payment2,
    paymentAmount,
  );
  t.deepEqual(actualPaymentAmount2, paymentAmount);

  // Balance update.
  const notifier = E(vpurse).getCurrentAmountNotifier();
  const updateRecord = await E(notifier).getUpdateSince();
  const balance = { address: 'agoricfoo', denom: 'ubld', amount: '92929' };
  const obj = { type: 'VBANK_BALANCE_UPDATE', updated: [balance] };
  t.assert(bankHandler);
  await (bankHandler && E(bankHandler).fromBridge('bank', obj));

  // Wait for new balance.
  await E(notifier).getUpdateSince(updateRecord.updateCount);
  const bal2 = await E(vpurse).getCurrentAmount();
  t.deepEqual(bal2, AmountMath.make(kit.brand, BigInt(balance.amount)));

  const { mint, ...feeKit } = makeIssuerKit(
    'fee',
    AssetKind.NAT,
    harden({
      decimalPlaces: 6,
    }),
  );

  const backingFee = mint.mintPayment(AmountMath.make(feeKit.brand, 20000000n));
  await E(bankMgr).addAsset('ufee', 'FEE', 'ERTP Fees', {
    ...feeKit,
    payment: backingFee,
  });

  const feePurse = await E(bank).getPurse(feeKit.brand);
  await E(feePurse).withdraw(AmountMath.make(feeKit.brand, 35n));
  await t.throwsAsync(
    () => E(feePurse).withdraw(AmountMath.make(feeKit.brand, 99n)),
    { instanceOf: Error, message: 'insufficient ufee funds' },
  );

  // Try sending in some fees.
  const feeAmount = AmountMath.make(feeKit.brand, 12n);
  const feePayment = mint.mintPayment(feeAmount);
  const feeReceived = await E(
    E(bankMgr).getFeeCollectorDepositFacet('ufee', feeKit),
  ).receive(feePayment);
  t.deepEqual(feeReceived, feeAmount);
});

/**
 * @param {import('ava').Assertions} t
 */
const setupBalanceNotifierTest = async t => {
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
        case 'VBANK_GET_BALANCE': {
          const { address, denom: _denom, type: _type, ...rest } = obj;
          t.is(address, 'agoricfoo');
          t.deepEqual(rest, {});
          ret = '0';
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
  t.assert(bankHandler);
  const bank = E(bankMgr).getBankForAddress('agoricfoo');

  const kit = makeIssuerKit('BLD', AssetKind.NAT, harden({ decimalPlaces: 4 }));
  await E(bankMgr).addAsset('ubld', 'BLD', 'Staking Tokens', kit);

  const vpurse = E(bank).getPurse(kit.brand);
  const notifier = E(vpurse).getCurrentAmountNotifier();
  const ait = makeAsyncIterableFromNotifier(notifier)[Symbol.asyncIterator]();

  const sendBalanceUpdate = value => {
    assert(bankHandler);
    bankHandler.fromBridge('bank', {
      type: 'VBANK_BALANCE_UPDATE',
      updated: [
        { address: 'agoricatata', denom: 'ubld', amount: `${value + 3n}` },
        { address: 'agoricfoo', denom: 'ubld', amount: `${value}` },
        { address: 'agoricfoo', denom: 'urun', amount: `${value + 5n}` },
      ],
    });
  };

  const getNextBalance = () => ait.next().then(r => r.value.value);
  const setNotifierThresholdValue = value =>
    bankMgr.setNotifierThresholdAmount(AmountMath.make(kit.brand, value));

  return {
    getNextBalance,
    sendBalanceUpdate,
    setNotifierThresholdValue,
  };
};

test('balance updates with thresholds', async t => {
  const {
    getNextBalance,
    sendBalanceUpdate,
    setNotifierThresholdValue,
  } = await setupBalanceNotifierTest(t);

  let currentBalance;
  let nextP = getNextBalance().then(b => (currentBalance = b));
  await null;
  t.is(currentBalance, undefined);

  t.log('check initial zero');
  t.is(await nextP, 0n);

  t.log('done travel to zero');
  setNotifierThresholdValue(0n);
  sendBalanceUpdate(1n);
  t.is(await getNextBalance(), 1n);

  setNotifierThresholdValue(1n);
  sendBalanceUpdate(2n);
  t.is(await getNextBalance(), 2n);

  sendBalanceUpdate(3n);
  t.is(await getNextBalance(), 3n);

  setNotifierThresholdValue(2n);
  nextP = getNextBalance();
  sendBalanceUpdate(4n);
  sendBalanceUpdate(5n);
  t.is(await nextP, 5n);

  setNotifierThresholdValue(1n);
  nextP = getNextBalance();
  sendBalanceUpdate(4n);
  sendBalanceUpdate(3n);
  t.is(await nextP, 4n);

  t.log('check up and down');
  setNotifierThresholdValue(10n);
  nextP = getNextBalance();
  sendBalanceUpdate(8n);
  sendBalanceUpdate(2n);
  sendBalanceUpdate(15n);
  t.is(await nextP, 15n);

  t.log('check trigger on zero');
  setNotifierThresholdValue(20_000n);
  nextP = getNextBalance();
  sendBalanceUpdate(0n);
  t.is(await nextP, 0n);

  // Make sure we don't trigger again for the same value.
  t.log('check no trigger on repeat');
  let nonzeroBalance;
  nextP = getNextBalance().then(b => (nonzeroBalance = b));
  sendBalanceUpdate(0n);
  await null;
  t.is(nonzeroBalance, undefined);

  sendBalanceUpdate(5n);
  await null;
  t.is(nonzeroBalance, undefined);

  sendBalanceUpdate(30_000n);
  t.is(await nextP, 30_000n);
});
