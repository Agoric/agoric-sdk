import { test } from 'tape-promise/tape';

import { makeMint } from '../../../core/issuers';

test('split bad amounts', t => {
  try {
    const mint = makeMint('fungible');
    const issuer = mint.getIssuer();
    const purse = mint.mint(1000);
    const payment = purse.withdrawAll();

    const badAmountsArray = Array(2).fill(issuer.makeAmount(10));
    t.throws(_ => issuer.split(payment, badAmountsArray));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('split good amounts', t => {
  try {
    const mint = makeMint('fungible');
    const issuer = mint.getIssuer();
    const purse = mint.mint(100);
    const oldPayment = purse.withdrawAll();

    const goodAmountsArray = Array(10).fill(issuer.makeAmount(10));
    const splitPayments = issuer.split(oldPayment, goodAmountsArray);

    for (const payment of splitPayments) {
      t.deepEqual(payment.getBalance(), issuer.makeAmount(10));
    }
    t.throws(() => oldPayment.getBalance());
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('combine good payments', t => {
  try {
    const mint = makeMint('fungible');
    const issuer = mint.getIssuer();
    const purse = mint.mint(1000);
    const payments = [];
    for (let i = 0; i < 100; i += 1) {
      payments.push(purse.withdraw(1));
    }

    const combinedPayment = issuer.combine(payments);
    t.deepEqual(combinedPayment.getBalance(), issuer.makeAmount(100));
    for (const payment of payments) {
      t.throws(() => payment.getBalance());
    }
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('combine bad payments', t => {
  try {
    const mint = makeMint('fungible');
    const otherMint = makeMint('other fungible');
    const issuer = mint.getIssuer();
    const purse = mint.mint(1000);
    const payments = [];
    for (let i = 0; i < 100; i += 1) {
      payments.push(purse.withdraw(1));
    }

    const otherPurse = otherMint.mint(10);
    const otherPayment = otherPurse.withdrawAll();
    payments.push(otherPayment);

    t.throws(() => issuer.combine(payments));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('depositExactly badAmount', async t => {
  try {
    const mint = makeMint('fungible');
    const issuer = mint.getIssuer();
    const purse = mint.mint(1000);
    const targetPurse = issuer.makeEmptyPurse();
    const payment = await purse.withdraw(7);
    try {
      await targetPurse.depositExactly(issuer.makeAmount(6), payment);
      t.fail();
    } catch (err) {
      t.equal(
        err.message,
        'payment balance (a object) must equal amount (a object)\nSee console for error data.',
      );
    }
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('depositExactly goodAmount', async t => {
  try {
    const mint = makeMint('fungible');
    const issuer = mint.getIssuer();
    const purse = mint.mint(1000);
    const targetPurse = issuer.makeEmptyPurse();
    const payment = await purse.withdraw(7);
    await targetPurse.depositExactly(7, payment);
    t.deepEqual(targetPurse.getBalance(), issuer.makeAmount(7));
    t.throws(() => payment.getBalance());
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('depositAll goodAmount', async t => {
  try {
    const mint = makeMint('fungible');
    const issuer = mint.getIssuer();
    const purse = mint.mint(1000);
    const targetPurse = issuer.makeEmptyPurse();
    const payment = await purse.withdraw(7);
    await targetPurse.depositAll(payment);
    t.deepEqual(targetPurse.getBalance(), issuer.makeAmount(7));
    t.throws(() => payment.getBalance());
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('burnExactly badAmount', async t => {
  try {
    const mint = makeMint('fungible');
    const issuer = mint.getIssuer();
    const purse = mint.mint(1000);
    const payment = await purse.withdraw(7);
    try {
      await issuer.burnExactly(6, payment);
      t.fail();
    } catch (err) {
      t.equal(
        err.message,
        'payment balance (a object) must equal amount (a object)\nSee console for error data.',
      );
    }
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('burnExactly goodAmount', async t => {
  try {
    const mint = makeMint('fungible');
    const issuer = mint.getIssuer();
    const purse = mint.mint(1000);
    const payment = await purse.withdraw(7);
    await issuer.burnExactly(7, payment);
    t.throws(() => payment.getBalance());
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('burnAll goodAmount', async t => {
  try {
    const mint = makeMint('fungible');
    const issuer = mint.getIssuer();
    const purse = mint.mint(1000);
    const payment = await purse.withdraw(7);
    await issuer.burnAll(payment);
    t.throws(() => payment.getBalance());
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('claimExactly badAmount', async t => {
  try {
    const mint = makeMint('fungible');
    const issuer = mint.getIssuer();
    const purse = mint.mint(1000);
    const payment = await purse.withdraw(7);
    try {
      await issuer.claimExactly(6, payment);
      t.fail();
    } catch (err) {
      t.equal(
        err.message,
        'payment balance (a object) must equal amount (a object)\nSee console for error data.',
      );
    }
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('claimExactly goodAmount', async t => {
  try {
    const mint = makeMint('fungible');
    const issuer = mint.getIssuer();
    const purse = mint.mint(1000);
    const payment = await purse.withdraw(7);
    const newPayment = await issuer.claimExactly(7, payment);
    t.throws(() => payment.getBalance());
    t.deepEqual(newPayment.getBalance(), issuer.makeAmount(7));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('claimAll goodAmount', async t => {
  try {
    const mint = makeMint('fungible');
    const issuer = mint.getIssuer();
    const purse = mint.mint(1000);
    const payment = await purse.withdraw(7);
    const newPayment = await issuer.claimAll(payment);
    t.throws(() => payment.getBalance());
    t.deepEqual(newPayment.getBalance(), issuer.makeAmount(7));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
