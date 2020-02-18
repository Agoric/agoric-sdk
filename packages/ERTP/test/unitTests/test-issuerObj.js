// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'tape-promise/tape';
import { E } from '@agoric/eventual-send';

import produceIssuer from '../../src/issuer';

test('issuer.getBrand, brand.isMyIssuer', t => {
  try {
    const { issuer, brand } = produceIssuer('fungible');
    const myBrand = issuer.getBrand();
    t.ok(myBrand.isMyIssuer(issuer));
    t.equals(
      brand,
      myBrand,
      'brand returned from `produceIssuer` and from `getBrand` the same',
    );
    t.equals(issuer.allegedName(), myBrand.allegedName());
    t.equals(issuer.allegedName(), 'fungible');
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('issuer.getAmountMath', t => {
  try {
    const { issuer, amountMath, brand } = produceIssuer('fungible');
    t.equals(issuer.getAmountMath(), amountMath);
    const fungible = amountMath.make;
    t.ok(
      amountMath.isEqual(
        amountMath.add(fungible(100), fungible(50)),
        fungible(150),
      ),
    );
    t.equals(fungible(4000).extent, 4000);
    t.equals(fungible(0).brand, brand);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('issuer.getMathHelpersName', t => {
  try {
    const { issuer } = produceIssuer('fungible');
    t.equals(issuer.getMathHelpersName(), 'nat');
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('issuer.makeEmptyPurse', t => {
  try {
    const { issuer, mint, amountMath, brand } = produceIssuer('fungible');
    const purse = issuer.makeEmptyPurse('my new purse');
    const payment = mint.mintPayment(837);

    t.ok(
      amountMath.isEqual(purse.getBalance(), amountMath.getEmpty()),
      `empty purse is empty`,
    );
    t.equals(purse.allegedBrand(), brand, `purse's brand is correct`);
    const fungible837 = amountMath.make(837);

    const checkDeposit = newPurseBalance => {
      t.ok(
        amountMath.isEqual(newPurseBalance, fungible837),
        `the balance returned is the purse balance`,
      );
      t.ok(
        amountMath.isEqual(purse.getBalance(), fungible837),
        `the new purse balance is the payment's old balance`,
      );
    };

    const performWithdrawal = () => purse.withdraw(fungible837);

    const checkWithdrawal = newPayment => {
      t.ok(
        amountMath.isEqual(issuer.getBalance(newPayment), fungible837),
        `the withdrawn payment has the right balance`,
      );
      t.ok(
        amountMath.isEqual(purse.getBalance(), amountMath.getEmpty()),
        `the purse is empty again`,
      );
    };

    E(purse)
      .deposit(payment, fungible837)
      .then(checkDeposit)
      .then(performWithdrawal)
      .then(checkWithdrawal)
      .catch(e => t.assert(false, e))
      .finally(_ => t.end());
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('issuer.burn', t => {
  try {
    const { issuer, mint, amountMath } = produceIssuer('fungible');
    const payment1 = mint.mintPayment(837);

    E(issuer)
      .burn(payment1, amountMath.make(837))
      .then(burntBalance => {
        t.ok(
          amountMath.isEqual(burntBalance, amountMath.make(837)),
          `entire minted payment was burnt`,
        );
        t.throws(() => issuer.getBalance(payment1), /payment not found/);
      })
      .catch(e => t.assert(false, e))
      .finally(_ => t.end());
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('issuer.claim', t => {
  try {
    const { issuer, amountMath, mint } = produceIssuer('fungible');
    const payment1 = mint.mintPayment(2);
    E(issuer)
      .claim(payment1, amountMath.make(2))
      .then(newPayment1 => {
        t.ok(
          amountMath.isEqual(
            issuer.getBalance(newPayment1),
            amountMath.make(2),
          ),
          `new payment has equal balance to old payment`,
        );
        t.notEqual(
          newPayment1,
          payment1,
          `old payment is different than new payment`,
        );
        t.throws(() => issuer.getBalance(payment1), /payment not found/);
      })
      .catch(e => t.assert(false, e))
      .finally(_ => t.end());
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('issuer.splitMany bad amount', t => {
  try {
    const { mint, issuer, amountMath } = produceIssuer('fungible');
    const payment = mint.mintPayment(1000);
    const badAmounts = Array(2).fill(amountMath.make(10));
    t.rejects(
      _ => E(issuer).splitMany(payment, badAmounts),
      /rights were not conserved/,
      'successfully throw if rights are not conserved in proposed new payments',
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('issuer.splitMany good amount', t => {
  try {
    const { mint, issuer, amountMath } = produceIssuer('fungible');
    const oldPayment = mint.mintPayment(100);
    const goodAmounts = Array(10).fill(amountMath.make(10));

    const checkPayments = splitPayments => {
      for (const payment of splitPayments) {
        t.deepEqual(
          issuer.getBalance(payment),
          amountMath.make(10),
          `split payment has right balance`,
        );
      }
      t.throws(
        () => issuer.getBalance(oldPayment),
        /payment not found/,
        `oldPayment no longer exists`,
      );
    };

    E(issuer)
      .splitMany(oldPayment, goodAmounts)
      .then(checkPayments)
      .catch(e => t.assert(false, e))
      .finally(_ => t.end());
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('issuer.split bad amount', t => {
  try {
    const { mint, issuer } = produceIssuer('fungible');
    const { amountMath: otherUnitOps } = produceIssuer('other fungible');
    const payment = mint.mintPayment(1000);
    t.rejects(
      _ => E(issuer).split(payment, otherUnitOps.make(10)),
      /Unrecognized brand/,
      'throws for bad amount',
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('issuer.split good amount', t => {
  try {
    const { mint, issuer, amountMath } = produceIssuer('fungible');
    const oldPayment = mint.mintPayment(20);

    const checkPayments = splitPayments => {
      for (const payment of splitPayments) {
        t.deepEqual(
          issuer.getBalance(payment),
          amountMath.make(10),
          `split payment has right balance`,
        );
      }
      t.rejects(
        () => E(issuer).getBalance(oldPayment),
        /payment not found/,
        `oldPayment no longer exists`,
      );
    };

    E(issuer)
      .split(oldPayment, amountMath.make(10))
      .then(checkPayments)
      .catch(e => t.assert(false, e))
      .finally(_ => t.end());
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('issuer.combine good payments', t => {
  try {
    const { mint, issuer, amountMath } = produceIssuer('fungible');
    const payments = [];
    for (let i = 0; i < 100; i += 1) {
      payments.push(mint.mintPayment(1));
    }

    const checkCombinedPayment = combinedPayment => {
      t.deepEqual(
        issuer.getBalance(combinedPayment),
        amountMath.make(100),
        `combined payment equal to the original payments total`,
      );
      for (const payment of payments) {
        t.throws(
          () => issuer.getBalance(payment),
          /payment not found/,
          `original payments no longer exist`,
        );
      }
    };
    E(issuer)
      .combine(payments)
      .then(checkCombinedPayment)
      .catch(e => t.assert(false, e))
      .finally(_ => t.end());
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('issuer.combine bad payments', t => {
  try {
    const { mint, issuer } = produceIssuer('fungible');
    const { mint: otherMint } = produceIssuer('other fungible');
    const payments = [];
    for (let i = 0; i < 100; i += 1) {
      payments.push(mint.mintPayment(1));
    }
    const otherPayment = otherMint.mintPayment(10);
    payments.push(otherPayment);

    t.rejects(
      () => E(issuer).combine(payments),
      /payment not found/,
      'payment from other mint is not found',
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
