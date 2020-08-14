// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';
import { test } from 'tape-promise/tape';

import makeStore from '@agoric/weak-store';
import { makeIssuerKit } from '@agoric/ertp';
import { areRightsConserved } from '../../src/contractFacet/rightsConservation';

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

const makeAmountMatrix = (amountMathArray, valueMatrix) =>
  valueMatrix.map(row => row.map((value, i) => amountMathArray[i].make(value)));

// rights are conserved for amount with Nat values
test(`areRightsConserved - true for amount with nat values`, t => {
  t.plan(1);
  try {
    const { amountMathArray, getAmountMathForBrand } = setupAmountMaths();
    const previousValues = [
      [0, 1, 0],
      [4, 1, 0],
      [6, 3, 0],
    ];
    const newValues = [
      [1, 2, 0],
      [3, 1, 0],
      [6, 2, 0],
    ];

    const previousAmounts = makeAmountMatrix(
      amountMathArray,
      previousValues,
    ).flat();
    const newAmounts = makeAmountMatrix(amountMathArray, newValues).flat();

    t.ok(
      areRightsConserved(getAmountMathForBrand, previousAmounts, newAmounts),
    );
  } catch (e) {
    t.assert(false, e);
  }
});

// rights are *not* conserved for amount with Nat values
test(`areRightsConserved - false for amount with Nat values`, t => {
  t.plan(1);
  try {
    const { amountMathArray, getAmountMathForBrand } = setupAmountMaths();
    const oldValues = [
      [0, 1, 4],
      [4, 1, 0],
      [6, 3, 0],
    ];
    const newValues = [
      [1, 2, 0],
      [3, 1, 0],
      [6, 2, 0],
    ];

    const oldAmounts = makeAmountMatrix(amountMathArray, oldValues).flat();
    const newAmounts = makeAmountMatrix(amountMathArray, newValues).flat();

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

// TODO: add tests for non-Nat values
