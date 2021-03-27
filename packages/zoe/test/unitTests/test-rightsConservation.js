// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import { amountMath, makeIssuerKit } from '@agoric/ertp';
import { assertRightsConserved } from '../../src/contractFacet/rightsConservation';

const setupBrands = () => {
  const moolaIssuerResults = makeIssuerKit('moola');
  const simoleanIssuerResults = makeIssuerKit('simoleans');
  const bucksIssuerResults = makeIssuerKit('bucks');

  const all = [moolaIssuerResults, simoleanIssuerResults, bucksIssuerResults];
  const brands = all.map(record => record.brand);
  return brands;
};

const makeAmountMatrix = (brands, valueMatrix) =>
  valueMatrix.map(row =>
    row.map((value, i) => amountMath.make(value, brands[i])),
  );

// rights are conserved for amount with Nat values
test(`assertRightsConserved - true for amount with nat values`, t => {
  const brands = setupBrands();
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

  const previousAmounts = makeAmountMatrix(brands, previousValues).flat();
  const newAmounts = makeAmountMatrix(brands, newValues).flat();

  t.notThrows(() => assertRightsConserved(previousAmounts, newAmounts));
});

// rights are *not* conserved for amount with Nat values
test(`assertRightsConserved - false for amount with Nat values`, t => {
  const brands = setupBrands();
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

  const oldAmounts = makeAmountMatrix(brands, oldValues).flat();
  const newAmounts = makeAmountMatrix(brands, newValues).flat();

  console.log('ERROR EXPECTED: rights were not conserved for brand >>>');
  t.throws(
    () => assertRightsConserved(oldAmounts, newAmounts),
    { message: /rights were not conserved for brand/ },
    `should throw if rights aren't conserved`,
  );
});

test(`assertRightsConserved - empty arrays`, t => {
  const oldAmounts = [];
  const newAmounts = [];

  t.notThrows(() => assertRightsConserved(oldAmounts, newAmounts));
});

// TODO: add tests for non-Nat values
