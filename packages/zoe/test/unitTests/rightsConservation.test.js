import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { assertRightsConserved } from '../../src/contractFacet/rightsConservation.js';

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
    row.map((value, i) => AmountMath.make(brands[i], value)),
  );

// rights are conserved for amount with Nat values
test(`assertRightsConserved - true for amount with nat values`, t => {
  const brands = setupBrands();
  const previousValues = [
    [0n, 1n, 0n],
    [4n, 1n, 0n],
    [6n, 3n, 0n],
  ];
  const newValues = [
    [1n, 2n, 0n],
    [3n, 1n, 0n],
    [6n, 2n, 0n],
  ];

  const previousAmounts = makeAmountMatrix(brands, previousValues).flat();
  const newAmounts = makeAmountMatrix(brands, newValues).flat();

  t.notThrows(() => assertRightsConserved(previousAmounts, newAmounts));
});

// rights are *not* conserved for amount with Nat values
test(`assertRightsConserved - false for amount with Nat values`, t => {
  const brands = setupBrands();
  const oldValues = [
    [0n, 1n, 4n],
    [4n, 1n, 0n],
    [6n, 3n, 0n],
  ];
  const newValues = [
    [1n, 2n, 0n],
    [3n, 1n, 0n],
    [6n, 2n, 0n],
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
