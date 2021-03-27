// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava';

import { E } from '@agoric/eventual-send';
import { MathKind, makeIssuerKit, amountMath } from '../../src';

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
  t.is(brand.getDisplayInfo(), undefined);
});

test('brand.getDisplayInfo()', t => {
  const displayInfo = harden({ decimalPlaces: 3 });
  const { brand } = makeIssuerKit('fungible', MathKind.NAT, displayInfo);
  t.deepEqual(brand.getDisplayInfo(), displayInfo);
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
  t.throws(() => makeIssuerKit('fungible', MathKind.NAT, displayInfo), {
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
  const { brand } = makeIssuerKit('fungible', MathKind.NAT, displayInfo);
  t.deepEqual(brand.getDisplayInfo(), displayInfo);
});

test('issuer.getAmountMathKind', t => {
  const { issuer } = makeIssuerKit('fungible');
  t.is(issuer.getAmountMathKind(), MathKind.NAT);
});

test('issuer.makeEmptyPurse', async t => {
  t.plan(9);
  const { issuer, mint, brand } = makeIssuerKit('fungible');
  const purse = issuer.makeEmptyPurse();
  const payment = mint.mintPayment(amountMath.make(837n, brand));

  const notifier = purse.getCurrentAmountNotifier();
  let nextUpdate = notifier.getUpdateSince();

  const checkNotifier = async () => {
    const { value: balance, updateCount } = await nextUpdate;
    t.assert(
      amountMath.isEqual(purse.getCurrentAmount(), balance),
      `the notifier balance is the same as the purse`,
    );
    nextUpdate = notifier.getUpdateSince(updateCount);
  };

  t.assert(
    amountMath.isEqual(purse.getCurrentAmount(), amountMath.makeEmpty(brand)),
    `empty purse is empty`,
  );
  await checkNotifier();
  t.is(purse.getAllegedBrand(), brand, `purse's brand is correct`);
  const fungible837 = amountMath.make(837n, brand);

  const checkDeposit = async newPurseBalance => {
    t.assert(
      amountMath.isEqual(newPurseBalance, fungible837),
      `the balance returned is the purse balance`,
    );
    t.assert(
      amountMath.isEqual(purse.getCurrentAmount(), fungible837),
      `the new purse balance is the payment's old balance`,
    );
    await checkNotifier();
  };

  const performWithdrawal = () => purse.withdraw(fungible837);

  const checkWithdrawal = async newPayment => {
    issuer.getAmountOf(newPayment).then(amount => {
      t.assert(
        amountMath.isEqual(amount, fungible837),
        `the withdrawn payment has the right balance`,
      );
    });
    t.assert(
      amountMath.isEqual(purse.getCurrentAmount(), amountMath.makeEmpty(brand)),
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

test('purse.deposit', async t => {
  t.plan(7);
  const { issuer, mint, brand } = makeIssuerKit('fungible');
  const fungible0 = amountMath.makeEmpty(brand);
  const fungible17 = amountMath.make(17n, brand);
  const fungible25 = amountMath.make(25n, brand);
  const fungibleSum = amountMath.add(fungible17, fungible25);

  const purse = issuer.makeEmptyPurse();
  const notifier = purse.getCurrentAmountNotifier();
  const payment17 = mint.mintPayment(fungible17);
  const payment25 = mint.mintPayment(fungible25);

  let nextUpdate = notifier.getUpdateSince();

  const checkNotifier = async () => {
    const { value: balance, updateCount } = await nextUpdate;
    t.assert(
      amountMath.isEqual(purse.getCurrentAmount(), balance),
      `the notifier balance is the same as the purse`,
    );
    nextUpdate = notifier.getUpdateSince(updateCount);
  };

  const checkDeposit = (
    expectedOldBalance,
    expectedNewBalance,
  ) => async depositResult => {
    const delta = amountMath.subtract(expectedNewBalance, expectedOldBalance);
    t.assert(
      amountMath.isEqual(depositResult, delta),
      `the balance changes by the deposited amount: ${delta.value}`,
    );
    t.assert(
      amountMath.isEqual(purse.getCurrentAmount(), expectedNewBalance),
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
  const fungible25 = amountMath.make(25n, brand);

  const purse = issuer.makeEmptyPurse();
  const payment = mint.mintPayment(fungible25);
  const exclusivePaymentP = E(issuer).claim(payment);

  await t.throwsAsync(
    // @ts-ignore deliberate invalid arguments for testing
    () => E(purse).deposit(exclusivePaymentP, fungible25),
    { message: /deposit does not accept promises/ },
    'failed to reject a promise for a payment',
  );
});

test('purse.getDepositFacet', async t => {
  t.plan(4);
  const { issuer, mint, brand } = makeIssuerKit('fungible');
  const fungible25 = amountMath.make(25n, brand);

  const purse = issuer.makeEmptyPurse();
  const payment = mint.mintPayment(fungible25);
  const notifier = purse.getCurrentAmountNotifier();

  let nextUpdate = notifier.getUpdateSince();
  const checkNotifier = async () => {
    const { value: balance, updateCount } = await nextUpdate;
    nextUpdate = notifier.getUpdateSince(updateCount);
    t.assert(
      amountMath.isEqual(purse.getCurrentAmount(), balance),
      `the notifier balance is the same as the purse's`,
    );
  };

  const checkDeposit = async newPurseBalance => {
    t.assert(
      amountMath.isEqual(newPurseBalance, fungible25),
      `the balance returned is the purse balance`,
    );
    t.assert(
      amountMath.isEqual(purse.getCurrentAmount(), fungible25),
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
  const payment1 = mint.mintPayment(amountMath.make(837n, brand));

  const burntBalance = await E(issuer).burn(
    payment1,
    amountMath.make(837n, brand),
  );
  t.assert(
    amountMath.isEqual(burntBalance, amountMath.make(837n, brand)),
    `entire minted payment was burnt`,
  );
  await t.throwsAsync(() => issuer.getAmountOf(payment1), {
    message: /payment not found/,
  });
});

test('issuer.claim', async t => {
  t.plan(3);
  const { issuer, mint, brand } = makeIssuerKit('fungible');
  const payment1 = mint.mintPayment(amountMath.make(2n, brand));
  await E(issuer)
    .claim(payment1, amountMath.make(2n, brand))
    .then(async newPayment1 => {
      await issuer.getAmountOf(newPayment1).then(amount => {
        t.assert(
          amountMath.isEqual(amount, amountMath.make(2n, brand)),
          `new payment has equal balance to old payment`,
        );
        t.not(
          newPayment1,
          payment1,
          `old payment is different than new payment`,
        );
      });

      return t.throwsAsync(() => issuer.getAmountOf(payment1), {
        message: /payment not found/,
      });
    });
});

test('issuer.splitMany bad amount', async t => {
  const { mint, issuer, brand } = makeIssuerKit('fungible');
  const payment = mint.mintPayment(amountMath.make(1000n, brand));
  const badAmounts = Array(2).fill(amountMath.make(10n, brand));
  await t.throwsAsync(
    _ => E(issuer).splitMany(payment, badAmounts),
    { message: /rights were not conserved/ },
    'successfully throw if rights are not conserved in proposed new payments',
  );
});

test('issuer.splitMany good amount', async t => {
  t.plan(11);
  const { mint, issuer, brand } = makeIssuerKit('fungible');
  const oldPayment = mint.mintPayment(amountMath.make(100n, brand));
  const goodAmounts = Array(10).fill(amountMath.make(10n, brand));

  const checkPayments = async splitPayments => {
    const amounts = await Promise.all(
      splitPayments.map(payment => issuer.getAmountOf(payment)),
    );
    for (const amount of amounts) {
      t.deepEqual(
        amount,
        amountMath.make(10n, brand),
        `split payment has right balance`,
      );
    }
    await t.throwsAsync(
      () => issuer.getAmountOf(oldPayment),
      { message: /payment not found/ },
      `oldPayment no longer exists`,
    );
  };

  await E(issuer)
    .splitMany(oldPayment, goodAmounts)
    .then(checkPayments);
});

test('issuer.split bad amount', async t => {
  const { mint, issuer, brand } = makeIssuerKit('fungible');
  const { brand: otherBrand } = makeIssuerKit('other fungible');
  const payment = mint.mintPayment(amountMath.make(1000n, brand));
  await t.throwsAsync(
    _ => E(issuer).split(payment, amountMath.make(10n, otherBrand)),
    {
      message: /The brand in the allegedAmount .* in 'coerce' didn't match the specified brand/,
    },
    'throws for bad amount',
  );
});

test('issuer.split good amount', async t => {
  t.plan(3);
  const { mint, issuer, brand } = makeIssuerKit('fungible');
  const oldPayment = mint.mintPayment(amountMath.make(20n, brand));

  const checkPayments = async splitPayments => {
    const amounts = await Promise.all(
      splitPayments.map(payment => issuer.getAmountOf(payment)),
    );
    for (const amount of amounts) {
      t.deepEqual(
        amount,
        amountMath.make(10n, brand),
        `split payment has right balance`,
      );
    }
    await t.throwsAsync(
      () => issuer.getAmountOf(oldPayment),
      { message: /payment not found/ },
      `oldPayment no longer exists`,
    );
  };

  await E(issuer)
    .split(oldPayment, amountMath.make(10n, brand))
    .then(checkPayments);
});

test('issuer.combine good payments', async t => {
  t.plan(101);
  const { mint, issuer, brand } = makeIssuerKit('fungible');
  const payments = [];
  for (let i = 0; i < 100; i += 1) {
    payments.push(mint.mintPayment(amountMath.make(1n, brand)));
  }

  const checkCombinedPayment = async combinedPayment => {
    const amount = await issuer.getAmountOf(combinedPayment);
    t.deepEqual(
      amount,
      amountMath.make(100n, brand),
      `combined payment equal to the original payments total`,
    );

    await Promise.all(
      payments.map(payment =>
        t.throwsAsync(
          () => issuer.getAmountOf(payment),
          { message: /payment not found/ },
          `original payments no longer exist`,
        ),
      ),
    );
  };
  await E(issuer)
    .combine(payments)
    .then(checkCombinedPayment);
});

test('issuer.combine array of promises', async t => {
  t.plan(1);
  const { mint, issuer, brand } = makeIssuerKit('fungible');
  const paymentsP = [];
  for (let i = 0; i < 100; i += 1) {
    const freshPayment = mint.mintPayment(amountMath.make(1n, brand));
    const paymentP = issuer.claim(freshPayment);
    paymentsP.push(paymentP);
  }

  const checkCombinedResult = paymentP => {
    issuer.getAmountOf(paymentP).then(pAmount => {
      t.is(pAmount.value, 100n);
    });
  };

  await E(issuer)
    .combine(paymentsP)
    .then(checkCombinedResult);
});

test('issuer.combine bad payments', async t => {
  const { mint, issuer, brand } = makeIssuerKit('fungible');
  const { mint: otherMint, brand: otherBrand } = makeIssuerKit(
    'other fungible',
  );
  const payments = [];
  for (let i = 0; i < 100; i += 1) {
    payments.push(mint.mintPayment(amountMath.make(1n, brand)));
  }
  const otherPayment = otherMint.mintPayment(amountMath.make(10n, otherBrand));
  payments.push(otherPayment);

  await t.throwsAsync(
    () => E(issuer).combine(payments),
    {
      message:
        // Should be able to use more informative error once SES double
        // disclosure bug is fixed. See
        // https://github.com/endojs/endo/pull/640
        //
        // /"payment" not found/
        /.* not found/,
    },
    'payment from other mint is not found',
  );
});
