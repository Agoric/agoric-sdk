import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';
import makeStore from '@agoric/store';

import { makeMint } from '../../src/mint';
import { makeCoreMintKeeper } from '../../src/config/coreMintKeeper';

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
    t.throws(() => oldPayment.getBalance(), /payment not found/);
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
      t.throws(() => payment.getBalance(), /payment not found/);
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

    t.throws(() => assay.combine(payments), /payment not found/);
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
        'payment balance (an object) must equal units (an object)\nSee console for error data.',
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
    t.throws(() => payment.getBalance(), /payment not found/);
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
    t.throws(() => payment.getBalance(), /payment not found/);
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
        'payment balance (an object) must equal units (an object)\nSee console for error data.',
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
    t.throws(() => payment.getBalance(), /payment not found/);
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
    t.throws(() => payment.getBalance(), /payment not found/);
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
        'payment balance (an object) must equal units (an object)\nSee console for error data.',
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
    t.throws(() => payment.getBalance(), /payment not found/);
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
    t.throws(() => payment.getBalance(), /payment not found/);
    t.deepEqual(newPayment.getBalance(), assay.makeUnits(7));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('makeMint with no config', t => {
  t.plan(1);

  const mint = makeMint('test');
  const purse = mint.mint(mint.getAssay().makeUnits(1000));

  t.equal(purse.getBalance().extent, 1000);
});

// This tests calling makeMint with a partial config
// Right now, partial configs throw
// In the future (https://github.com/Agoric/agoric-sdk/issues/324), partial configs
// will be completed by makeMint
test('makeMint with partial config', t => {
  t.plan(1);

  function makeMintTrait(_coreMint) {
    return {
      get37: () => 37,
    };
  }

  t.throws(() => {
    makeMint('test', { makeMintTrait });
  });
});

function completeConfig(partialConfig) {
  return {
    makeAssayTrait: _makeMintContext => _self => {
      return {};
    },
    makePaymentTrait: _makeMintContext => _self => {
      return {};
    },
    makePurseTrait: _makeMintContext => _self => {
      return {};
    },
    makeMintTrait: _makeMintContext => _self => {
      return {};
    },
    makeMintKeeper: makeCoreMintKeeper,
    extentOpsName: 'natExtentOps',
    extentOpsArgs: [],
    ...partialConfig,
  };
}

test('makeMint with specific makePaymentTrait config', t => {
  t.plan(2);

  function makePaymentTrait(_makeMintContext) {
    return _corePayment => ({
      get37: () => 37,
    });
  }

  const mint = makeMint('test', completeConfig({ makePaymentTrait }));
  const purse = mint.mint(12);
  const payment = purse.withdrawAll();

  t.equals(payment.getBalance().extent, 12);
  t.equals(payment.get37(), 37);
});

test('makeMint with specific makePurseTrait config', t => {
  t.plan(2);

  function makePurseTrait(_makeMintContext) {
    return _corePurse => ({
      get37: () => 37,
    });
  }

  const mint = makeMint('test', completeConfig({ makePurseTrait }));
  const purse = mint.mint(13);

  t.equals(purse.getBalance().extent, 13);
  t.equals(purse.get37(), 37);
});

test('makeMint with specific makeMintTrait config', t => {
  t.plan(2);

  function makeMintTrait(_makeMintContext) {
    return _coreMint => ({
      get37: () => 37,
    });
  }

  const mint = makeMint('test bloublou', completeConfig({ makeMintTrait }));

  t.equals(mint.getAssay().getLabel().allegedName, 'test bloublou');
  t.equals(mint.get37(), 37);
});

test('makeMint with specific makeAssayTrait config', t => {
  t.plan(2);

  function makeAssayTrait(_makeMintContext) {
    return _coreAssay => ({
      get37: () => 37,
    });
  }

  const mint = makeMint('test bloublou', completeConfig({ makeAssayTrait }));
  const assay = mint.getAssay();

  t.equals(assay.getLabel().allegedName, 'test bloublou');
  t.equals(assay.get37(), 37);
});

test('makeMint with alternative mintKeeper', t => {
  // This mint will stop making tokens once a cap is reached (aka,
  // when currentSupply === supplyCap)
  const makeCappedSupplyMintKeeper = unitOps => {
    let currentSupply = unitOps.empty();
    const supplyCap = unitOps.make(3);

    function makeAssetKeeper() {
      // asset to units
      const units = makeStore();
      return harden({
        updateUnits(asset, newUnits) {
          const oldBalance = units.get(asset);
          let newSupply;

          // we are decreasing supply
          if (unitOps.includes(oldBalance, newUnits)) {
            const difference = unitOps.without(oldBalance, newUnits);
            newSupply = unitOps.without(currentSupply, difference);
            // we are increasing supply
          } else if (unitOps.includes(newUnits, oldBalance)) {
            const difference = unitOps.without(newUnits, oldBalance);
            newSupply = unitOps.with(currentSupply, difference);
          }
          if (unitOps.includes(newSupply, supplyCap)) {
            throw new Error(
              'We have reached the supply cap and cannot create new assets',
            );
          }
          currentSupply = newSupply;
          units.set(asset, newUnits);
        },
        recordNew(asset, initialUnits) {
          const newSupply = unitOps.with(currentSupply, initialUnits);
          // Have we passed the supply cap?
          if (unitOps.includes(newSupply, supplyCap)) {
            throw new Error(
              'We have reached the supply cap and cannot create new assets',
            );
          }
          currentSupply = newSupply;
          units.init(asset, initialUnits);
        },
        getUnits(asset) {
          return units.get(asset);
        },
        has(asset) {
          return units.has(asset);
        },
        remove(asset) {
          const balance = units.get(asset);
          currentSupply = unitOps.without(currentSupply, balance);
          units.delete(asset);
        },
      });
    }

    const purseKeeper = makeAssetKeeper();
    const paymentKeeper = makeAssetKeeper();

    const mintKeeper = harden({
      purseKeeper,
      paymentKeeper,
      isPurse(asset) {
        return purseKeeper.has(asset);
      },
      isPayment(asset) {
        return paymentKeeper.has(asset);
      },
    });
    return mintKeeper;
  };

  const mint = makeMint(
    'test capped supply',
    completeConfig({ makeMintKeeper: makeCappedSupplyMintKeeper }),
  );
  const assay = mint.getAssay();

  t.equals(assay.getLabel().allegedName, 'test capped supply');
  const purse1 = mint.mint(1);
  t.equals(purse1.getBalance().extent, 1);
  const purse2 = mint.mint(1);
  t.equals(purse2.getBalance().extent, 1);
  t.throws(
    () => mint.mint(1),
    /We have reached the supply cap and cannot create new assets/,
  );

  // TODO: we do not yet conserve currency over each call, so the
  // following will fail. We need to rewrite the operations such that
  // if a payment is created from a purse, the two updated amounts are
  // done in one call.
  // const payment1 = purse1.withdrawAll();
  // assay.burnAll(payment1);
  // const purse3 = mint.mint(1);
  // t.equals(purse3.getBalance().extent, 1);
  t.end();
});

// regression test against https://github.com/Agoric/agoric-sdk/issues/390
test('payment created from call to combine contains payment trait methods', t => {
  t.plan(2);

  function makePaymentTrait(_makeMintContext) {
    return _corePayment => ({
      get37: () => 37,
    });
  }

  const mint = makeMint('test', completeConfig({ makePaymentTrait }));
  const assay = mint.getAssay();
  const purse = mint.mint(1000);
  const threeUnits = assay.makeUnits(3);

  const fivePaymentsOf3 = Array(5)
    .fill()
    .map(() => purse.withdraw(threeUnits));
  const combinedPayment = assay.combine(fivePaymentsOf3);

  t.equals(combinedPayment.getBalance().extent, 15);
  t.equals(combinedPayment.get37(), 37);
});
