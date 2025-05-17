import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { assertAmountsEqual } from '../zoeTestHelpers.js';
import { setup } from './setupBasicMints.js';
import { setupNonFungible } from './setupNonFungibleMints.js';

function makeFakeT() {
  let error;
  return harden({
    // Fake successful passing assertions to prompt backup `t.fail(...)`.
    deepEqual: (_actual, _expected, _msg) => true,
    is: (_actual, _expected, _msg) => true,

    fail: msg => (error = msg),
    truthy: () => {},
    getError: () => error,
  });
}

test('assertAmountsEqual - Nat dup', async t => {
  const { moola } = setup();

  const fakeT = makeFakeT();
  await assertAmountsEqual(fakeT, moola(0n), moola(0n));
  t.falsy(fakeT.getError());
});

test('assertAmountsEqual - Nat manual', async t => {
  const {
    moola,
    moolaKit: { brand: moolaBrand },
  } = setup();

  const fakeT = makeFakeT();
  await assertAmountsEqual(
    fakeT,
    moola(0n),
    harden({ value: 0n, brand: moolaBrand }),
  );
  t.falsy(fakeT.getError());
});

test('assertAmountsEqual - false Nat', async t => {
  const { moola } = setup();
  const fakeT = makeFakeT();

  const resultP = assertAmountsEqual(fakeT, moola(0n), moola(1n));
  const message = 'Values must match: got "[0n]", expected "[1n]"';
  t.is(fakeT.getError(), message);
  await t.throwsAsync(resultP, { message });
});

test('assertAmountsEqual - Set', async t => {
  const { createRpgItem, rpgItems } = setupNonFungible();

  const shinyHat = createRpgItem('hat', 'shiny');
  const shinyAmount = rpgItems(shinyHat);
  const fakeT = makeFakeT();
  await assertAmountsEqual(fakeT, shinyAmount, shinyAmount);
  t.falsy(fakeT.getError());
});

test('assertAmountsEqual - Nat vs. Set', async t => {
  const { createRpgItem, rpgItems } = setupNonFungible();

  const shinyHat = createRpgItem('hat', 'shiny');
  const shinyAmount = rpgItems(shinyHat);
  const fakeT = makeFakeT();
  const resultP = assertAmountsEqual(
    fakeT,
    shinyAmount,
    harden({ brand: shinyAmount.brand, value: 0n }),
  );
  const message =
    // TODO The pattern is here only as a temporary measure to tolerate
    // the property order being sorted and not.
    /Asset kinds must match: got \[\{("description":"hat"|,|"name":"hat"|,|"power":"shiny"){5}\}\], expected "\[0n\]"/;
  t.assert(message.test(fakeT.getError()));
  await t.throwsAsync(resultP, { message });
});

test('assertAmountsEqual - false Set', async t => {
  const { createRpgItem, rpgItems } = setupNonFungible();

  const shinyHat = createRpgItem('hat', 'shiny');
  const shinyAmount = rpgItems(shinyHat);
  const sparklyHat = createRpgItem('hat', 'sparkly');
  const sparklyAmount = rpgItems(sparklyHat);
  const fakeT = makeFakeT();
  const resultP = assertAmountsEqual(fakeT, shinyAmount, sparklyAmount);
  const message =
    // TODO The pattern is here only as a temporary measure to tolerate
    // the property order being sorted and not.
    /Values must match: got \[\{("description":"hat"|,|"name":"hat"|,|"power":"shiny"){5}\}\], expected \[\{("description":"hat"|,|"name":"hat"|,|"power":"sparkly){5}"\}\]/;
  t.assert(message.test(fakeT.getError()));
  await t.throwsAsync(resultP, { message });
});

test('assertAmountsEqual - StrSet dupe', async t => {
  const { cryptoCats } = setupNonFungible();

  const felix = cryptoCats(harden(['Felix']));
  const fakeT = makeFakeT();
  await assertAmountsEqual(fakeT, felix, felix);
  t.falsy(fakeT.getError());
});

test('assertAmountsEqual - StrSet copy', async t => {
  const { cryptoCats } = setupNonFungible();

  const felix = cryptoCats(harden(['Felix']));
  const felixAgain = cryptoCats(harden(['Felix']));
  const fakeT = makeFakeT();
  await assertAmountsEqual(fakeT, felix, felixAgain);
  t.falsy(fakeT.getError());
});

test('assertAmountsEqual - false StrSet', async t => {
  const { cryptoCats } = setupNonFungible();

  const felix = cryptoCats(harden(['Felix']));
  const sylvester = cryptoCats(harden(['Sylvester']));
  const fakeT = makeFakeT();
  const resultP = assertAmountsEqual(fakeT, felix, sylvester);
  const message = 'Values must match: got ["Felix"], expected ["Sylvester"]';
  t.is(fakeT.getError(), message);
  await t.throwsAsync(resultP, { message });
});

test('assertAmountsEqual - brand mismatch', async t => {
  const { moola, bucks } = setup();
  const fakeT = makeFakeT();
  const resultP = assertAmountsEqual(fakeT, moola(0n), bucks(0n));
  const message =
    'Brands must match: got [object Alleged: moola brand], expected [object Alleged: bucks brand]';
  t.is(fakeT.getError(), message);
  await t.throwsAsync(resultP, { message });
});

test('assertAmountsEqual - both mismatch', async t => {
  const { moola } = setup();
  const { cryptoCats } = setupNonFungible();

  const fakeT = makeFakeT();
  const resultP = assertAmountsEqual(
    fakeT,
    moola(0n),
    cryptoCats(harden(['Garfield'])),
  );
  const message =
    'Brands and values must match: got {"brand":"[Alleged: moola brand]","value":"[0n]"}, expected {"brand":"[Alleged: CryptoCats brand]","value":["Garfield"]}';
  t.is(fakeT.getError(), message);
  await t.throwsAsync(resultP, { message });
});
