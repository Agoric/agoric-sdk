// @ts-check

import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import '@agoric/zoe/exported.js';
import { AmountMath, AssetKind, makeIssuerKit } from '@agoric/ertp';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';

import { makeHandle } from '@agoric/zoe/src/makeHandle.js';
import { makeParamChangePositions } from '../../src/paramGovernance/governParam.js';

const positive = (name, val) => {
  return { changeParam: name, proposedValue: val };
};

const negative = name => {
  return { noChange: name };
};

test('positions amount', t => {
  const amountSpec = { parameterName: 'amount', key: 'something' };
  const { brand } = makeIssuerKit('roses', AssetKind.SET);
  const amount = AmountMath.makeEmpty(brand);

  const positions = makeParamChangePositions(amountSpec, amount);
  t.deepEqual(positions.positive, positive(amountSpec, amount));
  t.deepEqual(positions.negative, negative(amountSpec));
  t.notDeepEqual(
    positions.positive,
    positive(AmountMath.make(brand, harden([1]))),
  );
});

test('positions brand', t => {
  const brandSpec = { parameterName: 'brand', key: 'params' };
  const { brand: roseBrand } = makeIssuerKit('roses', AssetKind.SET);
  const { brand: thornBrand } = makeIssuerKit('thorns', AssetKind.SET);

  const positions = makeParamChangePositions(brandSpec, roseBrand);
  t.deepEqual(positions.positive, positive(brandSpec, roseBrand));
  t.deepEqual(positions.negative, negative(brandSpec));
  t.not(positions.positive, positive(brandSpec, thornBrand));
});

test('positions instance', t => {
  const instanceSpec = { parameterName: 'instance', key: 'something' };
  // this is sufficient for the current type check. When we add
  // isInstallation() (#3344), we'll need to make a mockZoe.
  const instanceHandle = makeHandle('Instance');

  const positions = makeParamChangePositions(instanceSpec, instanceHandle);
  t.deepEqual(positions.positive, positive(instanceSpec, instanceHandle));
  t.deepEqual(positions.negative, negative(instanceSpec));
  t.not(positions.positive, positive(instanceSpec, makeHandle('Instance')));
});

test('positions Installation', t => {
  const installationSpec = { parameterName: 'installation', key: 'something' };
  // this is sufficient for the current type check. When we add
  // isInstallation() (#3344), we'll need to make a mockZoe.
  const installationHandle = makeHandle('Installation');

  const positions = makeParamChangePositions(
    installationSpec,
    installationHandle,
  );
  t.deepEqual(
    positions.positive,
    positive(installationSpec, installationHandle),
  );
  t.deepEqual(positions.negative, negative(installationSpec));
  t.not(
    positions.positive,
    positive(installationSpec, makeHandle('Installation')),
  );
});

test('positions Nat', t => {
  const natSpec = { parameterName: 'nat', key: 'something' };
  const nat = 3n;

  const positions = makeParamChangePositions(natSpec, nat);
  t.deepEqual(positions.positive, positive(natSpec, nat));
  t.deepEqual(positions.negative, negative(natSpec));
  t.notDeepEqual(positions.positive, positive(natSpec, 4n));
});

test('positions Ratio', t => {
  const ratioSpec = { parameterName: 'ratio', key: 'something' };
  const { brand } = makeIssuerKit('elo', AssetKind.NAT);
  const ratio = makeRatio(2500n, brand, 2400n);

  const positions = makeParamChangePositions(ratioSpec, ratio);
  t.deepEqual(positions.positive, positive(ratioSpec, ratio));
  t.deepEqual(positions.negative, negative(ratioSpec));
  t.notDeepEqual(
    positions.positive,
    positive(ratioSpec, makeRatio(2500n, brand, 2200n)),
  );
});

test('positions string', t => {
  const stringSpec = { parameterName: 'string', key: 'something' };
  const string = 'When in the course';

  const positions = makeParamChangePositions(stringSpec, string);
  t.deepEqual(positions.positive, positive(stringSpec, string));
  t.deepEqual(positions.negative, negative(stringSpec));
  t.notDeepEqual(
    positions.positive,
    positive(stringSpec, 'We hold these truths'),
  );
});
