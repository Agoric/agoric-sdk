import { test } from 'tape-promise/tape';

import { makeMint } from '../../../core/mint';

test('split bad assetDescs', t => {
  try {
    const mint = makeMint('fungible');
    const assay = mint.getAssay();
    const purse = mint.mint(1000);
    const payment = purse.withdrawAll();

    const badAssetDescsArray = Array(2).fill(assay.makeAssetDesc(10));
    t.throws(_ => assay.split(payment, badAssetDescsArray));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('split good assetDescs', t => {
  try {
    const mint = makeMint('fungible');
    const assay = mint.getAssay();
    const purse = mint.mint(100);
    const oldPayment = purse.withdrawAll();

    const goodAssetDescsArray = Array(10).fill(assay.makeAssetDesc(10));
    const splitPayments = assay.split(oldPayment, goodAssetDescsArray);

    for (const payment of splitPayments) {
      t.deepEqual(payment.getBalance(), assay.makeAssetDesc(10));
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
    const assay = mint.getAssay();
    const purse = mint.mint(1000);
    const payments = [];
    for (let i = 0; i < 100; i += 1) {
      payments.push(purse.withdraw(1));
    }

    const combinedPayment = assay.combine(payments);
    t.deepEqual(combinedPayment.getBalance(), assay.makeAssetDesc(100));
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
    const assay = mint.getAssay();
    const purse = mint.mint(1000);
    const payments = [];
    for (let i = 0; i < 100; i += 1) {
      payments.push(purse.withdraw(1));
    }

    const otherPurse = otherMint.mint(10);
    const otherPayment = otherPurse.withdrawAll();
    payments.push(otherPayment);

    t.throws(() => assay.combine(payments));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('depositExactly badAssetDesc', async t => {
  try {
    const mint = makeMint('fungible');
    const assay = mint.getAssay();
    const purse = mint.mint(1000);
    const targetPurse = assay.makeEmptyPurse();
    const payment = await purse.withdraw(7);
    try {
      await targetPurse.depositExactly(assay.makeAssetDesc(6), payment);
      t.fail();
    } catch (err) {
      t.equal(
        err.message,
        'payment balance (a object) must equal assetDesc (a object)\nSee console for error data.',
      );
    }
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('depositExactly goodAssetDesc', async t => {
  try {
    const mint = makeMint('fungible');
    const assay = mint.getAssay();
    const purse = mint.mint(1000);
    const targetPurse = assay.makeEmptyPurse();
    const payment = await purse.withdraw(7);
    await targetPurse.depositExactly(7, payment);
    t.deepEqual(targetPurse.getBalance(), assay.makeAssetDesc(7));
    t.throws(() => payment.getBalance());
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('depositAll goodAssetDesc', async t => {
  try {
    const mint = makeMint('fungible');
    const assay = mint.getAssay();
    const purse = mint.mint(1000);
    const targetPurse = assay.makeEmptyPurse();
    const payment = await purse.withdraw(7);
    await targetPurse.depositAll(payment);
    t.deepEqual(targetPurse.getBalance(), assay.makeAssetDesc(7));
    t.throws(() => payment.getBalance());
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('burnExactly badAssetDesc', async t => {
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
        'payment balance (a object) must equal assetDesc (a object)\nSee console for error data.',
      );
    }
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('burnExactly goodAssetDesc', async t => {
  try {
    const mint = makeMint('fungible');
    const assay = mint.getAssay();
    const purse = mint.mint(1000);
    const payment = await purse.withdraw(7);
    await assay.burnExactly(7, payment);
    t.throws(() => payment.getBalance());
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('burnAll goodAssetDesc', async t => {
  try {
    const mint = makeMint('fungible');
    const assay = mint.getAssay();
    const purse = mint.mint(1000);
    const payment = await purse.withdraw(7);
    await assay.burnAll(payment);
    t.throws(() => payment.getBalance());
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('claimExactly badAssetDesc', async t => {
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
        'payment balance (a object) must equal assetDesc (a object)\nSee console for error data.',
      );
    }
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('claimExactly goodAssetDesc', async t => {
  try {
    const mint = makeMint('fungible');
    const assay = mint.getAssay();
    const purse = mint.mint(1000);
    const payment = await purse.withdraw(7);
    const newPayment = await assay.claimExactly(7, payment);
    t.throws(() => payment.getBalance());
    t.deepEqual(newPayment.getBalance(), assay.makeAssetDesc(7));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('claimAll goodAssetDesc', async t => {
  try {
    const mint = makeMint('fungible');
    const assay = mint.getAssay();
    const purse = mint.mint(1000);
    const payment = await purse.withdraw(7);
    const newPayment = await assay.claimAll(payment);
    t.throws(() => payment.getBalance());
    t.deepEqual(newPayment.getBalance(), assay.makeAssetDesc(7));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
