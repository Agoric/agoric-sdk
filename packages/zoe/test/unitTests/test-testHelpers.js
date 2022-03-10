// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { assertAmountsEqual } from '../zoeTestHelpers.js';
import { setup } from './setupBasicMints.js';
import { setupNonFungible } from './setupNonFungibleMints.js';

function makeFakeT() {
  let error;
  return harden({
    fail: msg => (error = msg),
    truthy: () => {},
    getError: () => error,
  });
}

test('assertAmountsEqual - Nat dup', t => {
  const { moola } = setup();

  const fakeT = makeFakeT();
  assertAmountsEqual(fakeT, moola(0n), moola(0n));
  t.falsy(fakeT.getError());
});

test('assertAmountsEqual - Nat manual', t => {
  const {
    moola,
    moolaR: { brand: moolaBrand },
  } = setup();

  const fakeT = makeFakeT();
  assertAmountsEqual(
    fakeT,
    moola(0n),
    harden({ value: 0n, brand: moolaBrand }),
  );
  t.falsy(fakeT.getError());
});

test('assertAmountsEqual - false Nat', t => {
  const { moola } = setup();
  const fakeT = makeFakeT();

  assertAmountsEqual(fakeT, moola(0n), moola(1n));
  t.is(fakeT.getError(), 'value ("[0n]") expected to equal "[1n]"');
});

test('assertAmountsEqual - Set', t => {
  const { createRpgItem, rpgItems } = setupNonFungible();

  const shinyHat = createRpgItem('hat', 'shiny');
  const shinyAmount = rpgItems(shinyHat);
  const fakeT = makeFakeT();
  assertAmountsEqual(fakeT, shinyAmount, shinyAmount);
  t.falsy(fakeT.getError());
});

test('assertAmountsEqual - false Set', t => {
  const { createRpgItem, rpgItems } = setupNonFungible();

  const shinyHat = createRpgItem('hat', 'shiny');
  const shinyAmount = rpgItems(shinyHat);
  const sparklyHat = createRpgItem('hat', 'sparkly');
  const sparklyAmount = rpgItems(sparklyHat);
  const fakeT = makeFakeT();
  assertAmountsEqual(fakeT, shinyAmount, sparklyAmount);
  t.is(
    fakeT.getError(),
    'value ([{"name":"hat","description":"hat","power":"shiny"}]) expected to equal [{"name":"hat","description":"hat","power":"sparkly"}]',
  );
});

test('assertAmountsEqual - StrSet dupe', t => {
  const { cryptoCats } = setupNonFungible();

  const felix = cryptoCats(harden(['Felix']));
  const fakeT = makeFakeT();
  assertAmountsEqual(fakeT, felix, felix);
  t.falsy(fakeT.getError());
});

test('assertAmountsEqual - StrSet copy', t => {
  const { cryptoCats } = setupNonFungible();

  const felix = cryptoCats(harden(['Felix']));
  const felixAgain = cryptoCats(harden(['Felix']));
  const fakeT = makeFakeT();
  assertAmountsEqual(fakeT, felix, felixAgain);
  t.falsy(fakeT.getError());
});

test('assertAmountsEqual - false StrSet', t => {
  const { cryptoCats } = setupNonFungible();

  const felix = cryptoCats(harden(['Felix']));
  const sylvester = cryptoCats(harden(['Sylvester']));
  const fakeT = makeFakeT();
  assertAmountsEqual(fakeT, felix, sylvester);
  t.is(fakeT.getError(), 'value (["Felix"]) expected to equal ["Sylvester"]');
});

test('assertAmountsEqual - brand mismatch', t => {
  const { moola, bucks } = setup();
  const fakeT = makeFakeT();
  assertAmountsEqual(fakeT, moola(0n), bucks(0n));
  t.is(
    fakeT.getError(),
    'brand ([object Alleged: moola brand]) expected to equal [object Alleged: bucks brand]',
  );
});

test('assertAmountsEqual - both mismatch', t => {
  const { moola } = setup();
  const { cryptoCats } = setupNonFungible();

  const fakeT = makeFakeT();
  assertAmountsEqual(fakeT, moola(0n), cryptoCats(harden(['Garfield'])));
  t.is(fakeT.getError(), 'Must be the same asset kind: 0 vs Garfield');
});
