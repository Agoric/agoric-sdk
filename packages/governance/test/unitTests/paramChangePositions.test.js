import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath, AssetKind, makeIssuerKit } from '@agoric/ertp';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';

import { makeHandle } from '@agoric/zoe/src/makeHandle.js';
import { makeParamChangePositions } from '../../src/index.js';

const positive = (name, val) => {
  return { changes: { [name]: val } };
};

const negative = name => {
  return { noChange: [name] };
};

const makeOneParamChangeDesc = (name, value) => {
  return harden({ [name]: value });
};

test('positions amount', t => {
  const { brand } = makeIssuerKit('roses', AssetKind.SET);
  const amount = AmountMath.makeEmpty(brand);

  const desc = makeOneParamChangeDesc('Amount', amount);
  const positions = makeParamChangePositions(desc);
  t.deepEqual(positions.positive, positive('Amount', amount));
  t.deepEqual(positions.negative, negative('Amount'));
  t.notDeepEqual(
    positions.positive,
    positive(AmountMath.make(brand, harden([1]))),
  );
});

test('positions brand', t => {
  const { brand: roseBrand } = makeIssuerKit('roses', AssetKind.SET);
  const { brand: thornBrand } = makeIssuerKit('thorns', AssetKind.SET);

  const paramName = 'Brand';
  const desc = makeOneParamChangeDesc(paramName, roseBrand);
  const positions = makeParamChangePositions(desc);
  t.deepEqual(positions.positive, positive(paramName, roseBrand));
  t.deepEqual(positions.negative, negative(paramName));
  t.not(positions.positive, positive(paramName, thornBrand));
});

test('positions instance', t => {
  // this is sufficient for the current type check. When we add
  // isInstallation() (#3344), we'll need to make a mockZoe.
  const instanceHandle = makeHandle('Instance');

  const paramName = 'Instance';
  const desc = makeOneParamChangeDesc(paramName, instanceHandle);
  const positions = makeParamChangePositions(desc);
  t.deepEqual(positions.positive, positive(paramName, instanceHandle));
  t.deepEqual(positions.negative, negative(paramName));
  t.not(positions.positive, positive(paramName, makeHandle('Instance')));
});

test('positions Installation', t => {
  // this is sufficient for the current type check. When we add
  // isInstallation() (#3344), we'll need to make a mockZoe.
  const installationHandle = makeHandle('Installation');

  const paramName = 'Installation';
  const desc = makeOneParamChangeDesc(paramName, installationHandle);
  const positions = makeParamChangePositions(desc);
  t.deepEqual(positions.positive, positive(paramName, installationHandle));
  t.deepEqual(positions.negative, negative(paramName));
  t.not(positions.positive, positive(paramName, makeHandle('Installation')));
});

test('positions Nat', t => {
  const nat = 3n;

  const paramName = 'Nat';
  const desc = makeOneParamChangeDesc(paramName, nat);
  const positions = makeParamChangePositions(desc);
  t.deepEqual(positions.positive, positive(paramName, nat));
  t.deepEqual(positions.negative, negative(paramName));
  t.notDeepEqual(positions.positive, positive(paramName, 4n));
});

test('positions Ratio', t => {
  const { brand } = makeIssuerKit('elo', AssetKind.NAT);
  const ratio = makeRatio(2500n, brand, 2400n);

  const paramName = 'Ratio';
  const desc = makeOneParamChangeDesc(paramName, ratio);
  const positions = makeParamChangePositions(desc);
  t.deepEqual(positions.positive, positive(paramName, ratio));
  t.deepEqual(positions.negative, negative(paramName));
  t.notDeepEqual(
    positions.positive,
    positive(paramName, makeRatio(2500n, brand, 2200n)),
  );
});

test('positions string', t => {
  const string = 'When in the course';

  const paramName = 'String';
  const desc = makeOneParamChangeDesc(paramName, string);
  const positions = makeParamChangePositions(desc);
  t.deepEqual(positions.positive, positive(paramName, string));
  t.deepEqual(positions.negative, negative(paramName));
  t.notDeepEqual(
    positions.positive,
    positive(paramName, 'We hold these truths'),
  );
});
