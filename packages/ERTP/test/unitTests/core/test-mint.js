import { test } from 'tape-promise/tape';

import { makeMint } from '../../../core/mint';

test('split bad units', t => {
  try {
    const mint = makeMint('fungible');
    const assay = mint.getAssay();
    const purse = mint.mint(1000);
    const payment = purse.withdrawAll();

    const badUnitsArray = Array(2).fill(assay.makeUnits(10));
    t.throws(
      _ => assay.split(payment, badUnitsArray),
      /Error: the units of the proposed new payments do not equal the units of the source payment/,
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('split good units', t => {
  try {
    const mint = makeMint('fungible');
    const assay = mint.getAssay();
    const purse = mint.mint(100);
    const oldPayment = purse.withdrawAll();

    const goodUnitsArray = Array(10).fill(assay.makeUnits(10));
    const splitPayments = assay.split(oldPayment, goodUnitsArray);

    for (const payment of splitPayments) {
      t.deepEqual(payment.getBalance(), assay.makeUnits(10));
    }
    // TODO: Improve error message for a deleted payment
    t.throws(() => oldPayment.getBalance(), /Error: key not found/);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('combine good payments', t => {
  try {
    const mint = makeMint('fungible');
    const assay = mint.getAssay();
    const purse = mint.mint(1000);
    const payments = [];
    for (let i = 0; i < 100; i += 1) {
      payments.push(purse.withdraw(1));
    }

    const combinedPayment = assay.combine(payments);
    t.deepEqual(combinedPayment.getBalance(), assay.makeUnits(100));
    for (const payment of payments) {
      t.throws(() => payment.getBalance(), /Error: key not found/);
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
    const assay = mint.getAssay();
    const purse = mint.mint(1000);
    const payments = [];
    for (let i = 0; i < 100; i += 1) {
      payments.push(purse.withdraw(1));
    }

    const otherPurse = otherMint.mint(10);
    const otherPayment = otherPurse.withdrawAll();
    payments.push(otherPayment);

    t.throws(() => assay.combine(payments), /Error: key not found/);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('depositExactly badUnits', async t => {
  try {
    const mint = makeMint('fungible');
    const assay = mint.getAssay();
    const purse = mint.mint(1000);
    const targetPurse = assay.makeEmptyPurse();
    const payment = await purse.withdraw(7);
    try {
      await targetPurse.depositExactly(assay.makeUnits(6), payment);
      t.fail();
    } catch (err) {
      t.equal(
        err.message,
        'payment balance (a object) must equal units (a object)\nSee console for error data.',
      );
    }
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('depositExactly goodUnits', async t => {
  try {
    const mint = makeMint('fungible');
    const assay = mint.getAssay();
    const purse = mint.mint(1000);
    const targetPurse = assay.makeEmptyPurse();
    const payment = await purse.withdraw(7);
    await targetPurse.depositExactly(7, payment);
    t.deepEqual(targetPurse.getBalance(), assay.makeUnits(7));
    t.throws(() => payment.getBalance(), /Error: key not found/);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('depositAll goodUnits', async t => {
  try {
    const mint = makeMint('fungible');
    const assay = mint.getAssay();
    const purse = mint.mint(1000);
    const targetPurse = assay.makeEmptyPurse();
    const payment = await purse.withdraw(7);
    await targetPurse.depositAll(payment);
    t.deepEqual(targetPurse.getBalance(), assay.makeUnits(7));
    t.throws(() => payment.getBalance(), /Error: key not found/);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('burnExactly badUnits', async t => {
  try {
    const mint = makeMint('fungible');
    const assay = mint.getAssay();
    const purse = mint.mint(1000);
    const payment = await purse.withdraw(7);
    try {
      await assay.burnExactly(6, payment);
      t.fail();
    } catch (err) {
      t.equal(
        err.message,
        'payment balance (a object) must equal units (a object)\nSee console for error data.',
      );
    }
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('burnExactly goodUnits', async t => {
  try {
    const mint = makeMint('fungible');
    const assay = mint.getAssay();
    const purse = mint.mint(1000);
    const payment = await purse.withdraw(7);
    await assay.burnExactly(7, payment);
    t.throws(() => payment.getBalance(), /Error: key not found/);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('burnAll goodUnits', async t => {
  try {
    const mint = makeMint('fungible');
    const assay = mint.getAssay();
    const purse = mint.mint(1000);
    const payment = await purse.withdraw(7);
    await assay.burnAll(payment);
    t.throws(() => payment.getBalance(), /Error: key not found/);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('claimExactly badUnits', async t => {
  try {
    const mint = makeMint('fungible');
    const assay = mint.getAssay();
    const purse = mint.mint(1000);
    const payment = await purse.withdraw(7);
    try {
      await assay.claimExactly(6, payment);
      t.fail();
    } catch (err) {
      t.equal(
        err.message,
        'payment balance (a object) must equal units (a object)\nSee console for error data.',
      );
    }
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('claimExactly goodUnits', async t => {
  try {
    const mint = makeMint('fungible');
    const assay = mint.getAssay();
    const purse = mint.mint(1000);
    const payment = await purse.withdraw(7);
    const newPayment = await assay.claimExactly(7, payment);
    t.throws(() => payment.getBalance(), /Error: key not found/);
    t.deepEqual(newPayment.getBalance(), assay.makeUnits(7));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('claimAll goodUnits', async t => {
  try {
    const mint = makeMint('fungible');
    const assay = mint.getAssay();
    const purse = mint.mint(1000);
    const payment = await purse.withdraw(7);
    const newPayment = await assay.claimAll(payment);
    t.throws(() => payment.getBalance(), /Error: key not found/);
    t.deepEqual(newPayment.getBalance(), assay.makeUnits(7));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
