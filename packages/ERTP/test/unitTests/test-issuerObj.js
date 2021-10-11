// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { E } from '@agoric/eventual-send';
import { AssetKind, makeIssuerKit, AmountMath } from '../../src/index.js';

test('issuer.getBrand, brand.isMyIssuer', t => {
  const { issuer, brand } = makeIssuerKit('fungible');
  const myBrand = issuer.getBrand();
  t.assert(myBrand.isMyIssuer(issuer));
  t.is(
    brand,
    myBrand,
    'brand returned from `makeIssuerKit` and from `getBrand` the same',
  );
  t.is(issuer.getAllegedName(), myBrand.getAllegedName());
  t.is(issuer.getAllegedName(), 'fungible');
  t.deepEqual(brand.getDisplayInfo(), { assetKind: AssetKind.NAT });
});

test('brand.getDisplayInfo()', t => {
  const displayInfo = harden({ decimalPlaces: 3 });
  const { brand } = makeIssuerKit('fungible', AssetKind.NAT, displayInfo);
  t.deepEqual(brand.getDisplayInfo(), {
    ...displayInfo,
    assetKind: AssetKind.NAT,
  });
  const display = amount => {
    const { brand: myBrand, value } = amount;
    const { decimalPlaces } = myBrand.getDisplayInfo();
    const valueDisplay = value.toString();
    const length = valueDisplay.length;
    return [
      valueDisplay.slice(0, length - decimalPlaces),
      '.',
      valueDisplay.slice(length - decimalPlaces),
    ].join('');
  };
  t.is(display({ brand, value: 3000 }), '3.000');
});

test('bad display info', t => {
  const displayInfo = harden({ somethingUnexpected: 3 });
  // @ts-ignore deliberate invalid arguments for testing
  t.throws(() => makeIssuerKit('fungible', AssetKind.NAT, displayInfo), {
    message:
      // Should be able to use more informative error once SES double
      // disclosure bug is fixed. See
      // https://github.com/endojs/endo/pull/640
      //
      // /key "somethingUnexpected" was not one of the expected keys \["decimalPlaces"\]/,
      /key .* was not one of the expected keys .*/,
  });
});

test('empty display info', t => {
  const displayInfo = harden({});
  const { brand } = makeIssuerKit('fungible', AssetKind.NAT, displayInfo);
  t.deepEqual(brand.getDisplayInfo(), {
    ...displayInfo,
    assetKind: AssetKind.NAT,
  });
});

test('issuer.getAssetKind', t => {
  const { issuer } = makeIssuerKit('fungible');
  t.is(issuer.getAssetKind(), AssetKind.NAT);
});

test('issuer.makeEmptyPurse', async t => {
  t.plan(9);
  const { issuer, mint, brand } = makeIssuerKit('fungible');
  const purse = issuer.makeEmptyPurse();
  const payment = mint.mintPayment(AmountMath.make(brand, 837n));

  const notifier = purse.getCurrentAmountNotifier();
  let nextUpdate = notifier.getUpdateSince();

  const checkNotifier = async () => {
    const { value: balance, updateCount } = await nextUpdate;
    t.assert(
      AmountMath.isEqual(purse.getCurrentAmount(), balance),
      `the notifier balance is the same as the purse`,
    );
    nextUpdate = notifier.getUpdateSince(updateCount);
  };

  t.assert(
    AmountMath.isEqual(purse.getCurrentAmount(), AmountMath.makeEmpty(brand)),
    `empty purse is empty`,
  );
  await checkNotifier();
  t.is(purse.getAllegedBrand(), brand, `purse's brand is correct`);
  const fungible837 = AmountMath.make(brand, 837n);

  const checkDeposit = async newPurseBalance => {
    t.assert(
      AmountMath.isEqual(newPurseBalance, fungible837),
      `the balance returned is the purse balance`,
    );
    t.assert(
      AmountMath.isEqual(purse.getCurrentAmount(), fungible837),
      `the new purse balance is the payment's old balance`,
    );
    await checkNotifier();
  };

  const performWithdrawal = () => purse.withdraw(fungible837);

  const checkWithdrawal = async newPayment => {
    issuer.getAmountOf(newPayment).then(amount => {
      t.assert(
        AmountMath.isEqual(amount, fungible837),
        `the withdrawn payment has the right balance`,
      );
    });
    t.assert(
      AmountMath.isEqual(purse.getCurrentAmount(), AmountMath.makeEmpty(brand)),
      `the purse is empty again`,
    );
    await checkNotifier();
  };

  await E(purse)
    .deposit(payment, fungible837)
    .then(checkDeposit)
    .then(performWithdrawal)
    .then(checkWithdrawal);
});

test('purse.withdraw overdrawn', async t => {
  t.plan(1);
  const { issuer, mint, brand } = makeIssuerKit('fungible');
  const purse = issuer.makeEmptyPurse();
  const purseBalance = AmountMath.make(brand, 103980n);
  const payment = mint.mintPayment(purseBalance);
  purse.deposit(payment);

  const tooMuch = AmountMath.make(brand, 103981n);

  t.throws(() => purse.withdraw(tooMuch), {
    message:
      'Withdrawal of {"brand":"[Alleged: fungible brand]","value":"[103981n]"} failed because the purse only contained {"brand":"[Alleged: fungible brand]","value":"[103980n]"}',
  });
});

test('purse.deposit', async t => {
  t.plan(7);
  const { issuer, mint, brand } = makeIssuerKit('fungible');
  const fungible0 = AmountMath.makeEmpty(brand);
  const fungible17 = AmountMath.make(brand, 17n);
  const fungible25 = AmountMath.make(brand, 25n);
  const fungibleSum = AmountMath.add(fungible17, fungible25);

  const purse = issuer.makeEmptyPurse();
  const notifier = purse.getCurrentAmountNotifier();
  const payment17 = mint.mintPayment(fungible17);
  const payment25 = mint.mintPayment(fungible25);

  let nextUpdate = notifier.getUpdateSince();

  const checkNotifier = async () => {
    const { value: balance, updateCount } = await nextUpdate;
    t.assert(
      AmountMath.isEqual(purse.getCurrentAmount(), balance),
      `the notifier balance is the same as the purse`,
    );
    nextUpdate = notifier.getUpdateSince(updateCount);
  };

  const checkDeposit = (
    expectedOldBalance,
    expectedNewBalance,
  ) => async depositResult => {
    const delta = AmountMath.subtract(expectedNewBalance, expectedOldBalance);
    t.assert(
      AmountMath.isEqual(depositResult, delta),
      `the balance changes by the deposited amount: ${delta.value}`,
    );
    t.assert(
      AmountMath.isEqual(purse.getCurrentAmount(), expectedNewBalance),
      `the new purse balance ${depositResult.value} is the expected amount: ${expectedNewBalance.value}`,
    );
    await checkNotifier();
  };

  await checkNotifier();
  await E(purse)
    .deposit(payment17, fungible17)
    .then(checkDeposit(fungible0, fungible17));
  await E(purse)
    .deposit(payment25, fungible25)
    .then(checkDeposit(fungible17, fungibleSum));
});

test('purse.deposit promise', async t => {
  t.plan(1);
  const { issuer, mint, brand } = makeIssuerKit('fungible');
  const fungible25 = AmountMath.make(brand, 25n);

  const purse = issuer.makeEmptyPurse();
  const payment = mint.mintPayment(fungible25);
  // const exclusivePaymentP = E(issuer).claim(payment);

  await t.throwsAsync(
    // @ts-ignore deliberate invalid arguments for testing
    // () => E(purse).deposit(exclusivePaymentP, fungible25),
    () => E(purse).deposit(payment, fungible25),
    { message: /deposit does not accept promises/ },
    'failed to reject a promise for a payment',
  );
});

test('purse.getDepositFacet', async t => {
  t.plan(4);
  const { issuer, mint, brand } = makeIssuerKit('fungible');
  const fungible25 = AmountMath.make(brand, 25n);

  const purse = issuer.makeEmptyPurse();
  const payment = mint.mintPayment(fungible25);
  const notifier = purse.getCurrentAmountNotifier();

  let nextUpdate = notifier.getUpdateSince();
  const checkNotifier = async () => {
    const { value: balance, updateCount } = await nextUpdate;
    nextUpdate = notifier.getUpdateSince(updateCount);
    t.assert(
      AmountMath.isEqual(purse.getCurrentAmount(), balance),
      `the notifier balance is the same as the purse's`,
    );
  };

  const checkDeposit = async newPurseBalance => {
    t.assert(
      AmountMath.isEqual(newPurseBalance, fungible25),
      `the balance returned is the purse balance`,
    );
    t.assert(
      AmountMath.isEqual(purse.getCurrentAmount(), fungible25),
      `the new purse balance is the payment's old balance`,
    );
    await checkNotifier();
  };

  await checkNotifier();
  await E(purse)
    .getDepositFacet()
    .then(({ receive }) => receive(payment))
    .then(checkDeposit);
});

test('issuer.burn', async t => {
  t.plan(2);
  const { issuer, mint, brand } = makeIssuerKit('fungible');
  const payment1 = mint.mintPayment(AmountMath.make(brand, 837n));

  const burntBalance = await E(issuer).burn(
    payment1,
    AmountMath.make(brand, 837n),
  );
  t.assert(
    AmountMath.isEqual(burntBalance, AmountMath.make(brand, 837n)),
    `entire minted payment was burnt`,
  );
  await t.throwsAsync(() => issuer.getAmountOf(payment1), {
    message: /payment not found/,
  });
});
