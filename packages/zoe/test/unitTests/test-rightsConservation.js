// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';
import { test } from 'tape-promise/tape';

import makeStore from '@agoric/weak-store';
import makeIssuerKit from '@agoric/ertp';
import { areRightsConserved } from '../../src/rightsConservation';

const setupAmountMaths = () => {
  const moolaIssuerResults = makeIssuerKit('moola');
  const simoleanIssuerResults = makeIssuerKit('simoleans');
  const bucksIssuerResults = makeIssuerKit('bucks');

  const all = [moolaIssuerResults, simoleanIssuerResults, bucksIssuerResults];
  const amountMathArray = all.map(objs => objs.amountMath);
  const brandToAmountMath = makeStore('brand');
  all.forEach(bundle =>
    brandToAmountMath.init(bundle.brand, bundle.amountMath),
  );
  const getAmountMathForBrand = brandToAmountMath.get;
  return {
    amountMathArray,
    getAmountMathForBrand,
  };
};

const makeAmountMatrix = (amountMathArray, extentMatrix) =>
  extentMatrix.map(row =>
    row.map((extent, i) => amountMathArray[i].make(extent)),
  );

// rights are conserved for amount with Nat extents
test(`areRightsConserved - true for amount with nat extents`, t => {
  t.plan(1);
  try {
    const { amountMathArray, getAmountMathForBrand } = setupAmountMaths();
    const previousExtents = [
      [0, 1, 0],
      [4, 1, 0],
      [6, 3, 0],
    ];
    const newExtents = [
      [1, 2, 0],
      [3, 1, 0],
      [6, 2, 0],
    ];

    const previousAmounts = makeAmountMatrix(
      amountMathArray,
      previousExtents,
    ).flat();
    const newAmounts = makeAmountMatrix(amountMathArray, newExtents).flat();

    t.ok(
      areRightsConserved(getAmountMathForBrand, previousAmounts, newAmounts),
    );
  } catch (e) {
    t.assert(false, e);
  }
});

// rights are *not* conserved for amount with Nat extents
test(`areRightsConserved - false for amount with Nat extents`, t => {
  t.plan(1);
  try {
    const { amountMathArray, getAmountMathForBrand } = setupAmountMaths();
    const oldExtents = [
      [0, 1, 4],
      [4, 1, 0],
      [6, 3, 0],
    ];
    const newExtents = [
      [1, 2, 0],
      [3, 1, 0],
      [6, 2, 0],
    ];

    const oldAmounts = makeAmountMatrix(amountMathArray, oldExtents).flat();
    const newAmounts = makeAmountMatrix(amountMathArray, newExtents).flat();

    t.notOk(areRightsConserved(getAmountMathForBrand, oldAmounts, newAmounts));
  } catch (e) {
    t.assert(false, e);
  }
});

test(`areRightsConserved - empty arrays`, t => {
  t.plan(1);
  try {
    const { getAmountMathForBrand } = setupAmountMaths();
    const oldAmounts = [];
    const newAmounts = [];

    t.ok(areRightsConserved(getAmountMathForBrand, oldAmounts, newAmounts));
  } catch (e) {
    t.assert(false, e);
  }
});

// TODO: add tests for non-Nat extents
