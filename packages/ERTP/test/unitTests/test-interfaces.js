// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import { getInterfaceOf } from '@agoric/marshal';
import {
  MathKind,
  makeIssuerKit,
  makeAssertAllegedIssuerWhen,
  makeAssertAllegedBrandWhen,
  makeAssertAllegedPurseWhen,
  makeAssertAllegedPaymentWhen,
  makeAssertAllegedMintWhen,
  makeIssuerInterface,
  makeBrandInterface,
  makePurseInterface,
  makePaymentInterface,
  makeMintInterface,
  makeDepositFacetInterface,
  makeAssertAllegedDepositFacetWhen,
} from '../../src';

test('interfaces - abstracted implementation', t => {
  const allegedName = 'bucks';
  const { issuer, brand, mint, amountMath } = makeIssuerKit(allegedName);
  t.is(getInterfaceOf(issuer), makeIssuerInterface(allegedName));
  t.is(getInterfaceOf(brand), makeBrandInterface(allegedName));
  t.is(getInterfaceOf(mint), makeMintInterface(allegedName));
  const purse = issuer.makeEmptyPurse();
  t.is(getInterfaceOf(purse), makePurseInterface(allegedName));
  const depositFacet = purse.getDepositFacet();
  t.is(getInterfaceOf(depositFacet), makeDepositFacetInterface(allegedName));
  const payment = mint.mintPayment(amountMath.make(2));
  t.is(getInterfaceOf(payment), makePaymentInterface(allegedName));
});

test('interfaces - particular implementation', t => {
  const allegedName = 'bucks';
  const { issuer, brand, mint, amountMath } = makeIssuerKit(allegedName);
  t.is(getInterfaceOf(issuer), 'Alleged: bucks issuer');
  t.is(getInterfaceOf(brand), 'Alleged: bucks brand');
  t.is(getInterfaceOf(mint), 'Alleged: bucks mint');
  const purse = issuer.makeEmptyPurse();
  t.is(getInterfaceOf(purse), 'Alleged: bucks purse');
  const depositFacet = purse.getDepositFacet();
  t.is(getInterfaceOf(depositFacet), 'Alleged: bucks depositFacet');
  const payment = mint.mintPayment(amountMath.make(2));
  t.is(getInterfaceOf(payment), 'Alleged: bucks payment');
});

test('makeAssertAllegedIssuerWhen - issuer', async t => {
  const assertAllegedIssuerWhen = makeAssertAllegedIssuerWhen(getInterfaceOf);
  const { issuer } = makeIssuerKit('fungible');
  await t.notThrowsAsync(() => assertAllegedIssuerWhen(issuer));
});

test('makeAssertAllegedIssuerWhen - not issuer', async t => {
  const assertAllegedIssuerWhen = makeAssertAllegedIssuerWhen(getInterfaceOf);
  const { brand } = makeIssuerKit('fungible');
  // @ts-ignore
  await t.throwsAsync(() => assertAllegedIssuerWhen(brand), {
    message: `(an object) must be "an issuer" or a promise for "an issuer"\nSee console for error data.`,
  });
  // @ts-ignore
  await t.throwsAsync(() => assertAllegedIssuerWhen('a string'), {
    message: `(a string) must be "an issuer" or a promise for "an issuer"\nSee console for error data.`,
  });
});

test('makeAssertAllegedIssuerWhen - promise for issuer', async t => {
  const assertAllegedIssuerWhen = makeAssertAllegedIssuerWhen(getInterfaceOf);
  const { issuer } = makeIssuerKit('fungible');
  await t.notThrowsAsync(() =>
    assertAllegedIssuerWhen(Promise.resolve(issuer)),
  );
});

test('makeAssertAllegedBrandWhen - brand', async t => {
  const assertAllegedBrandWhen = makeAssertAllegedBrandWhen(getInterfaceOf);
  const { brand } = makeIssuerKit('tokens', MathKind.STRING_SET);
  await t.notThrowsAsync(() => assertAllegedBrandWhen(brand));
});

test('makeAssertAllegedBrandWhen - not brand', async t => {
  const assertAllegedBrandWhen = makeAssertAllegedBrandWhen(getInterfaceOf);
  const { issuer } = makeIssuerKit('tokens', MathKind.STRING_SET);
  // @ts-ignore
  await t.throwsAsync(() => assertAllegedBrandWhen(issuer), {
    message: `(an object) must be "a brand" or a promise for "a brand"\nSee console for error data.`,
  });
  // @ts-ignore
  await t.throwsAsync(() => assertAllegedBrandWhen('a string'), {
    message: `(a string) must be "a brand" or a promise for "a brand"\nSee console for error data.`,
  });
});

test('makeAssertAllegedBrandWhen - promise for brand', async t => {
  const assertAllegedBrandWhen = makeAssertAllegedBrandWhen(getInterfaceOf);
  const { brand } = makeIssuerKit('tokens', MathKind.STRING_SET);
  await t.notThrowsAsync(() => assertAllegedBrandWhen(Promise.resolve(brand)));
});

test('makeAssertAllegedPurseWhen - purse', async t => {
  const assertAllegedPurseWhen = makeAssertAllegedPurseWhen(getInterfaceOf);
  const { issuer } = makeIssuerKit('tokens', MathKind.STRING_SET);
  const purse = issuer.makeEmptyPurse();
  await t.notThrowsAsync(() => assertAllegedPurseWhen(purse));
});

test('makeAssertAllegedPurseWhen - not purse', async t => {
  const assertAllegedPurseWhen = makeAssertAllegedPurseWhen(getInterfaceOf);
  const { issuer } = makeIssuerKit('tokens', MathKind.STRING_SET);
  // @ts-ignore
  await t.throwsAsync(() => assertAllegedPurseWhen(issuer), {
    message: `(an object) must be "a purse" or a promise for "a purse"\nSee console for error data.`,
  });
  // @ts-ignore
  await t.throwsAsync(() => assertAllegedPurseWhen('a string'), {
    message: `(a string) must be "a purse" or a promise for "a purse"\nSee console for error data.`,
  });
});

test('makeAssertAllegedPurseWhen - promise for purse', async t => {
  const assertAllegedPurseWhen = makeAssertAllegedPurseWhen(getInterfaceOf);
  const { issuer } = makeIssuerKit('tokens', MathKind.STRING_SET);
  const purse = issuer.makeEmptyPurse();
  await t.notThrowsAsync(() => assertAllegedPurseWhen(Promise.resolve(purse)));
});

test('makeAssertAllegedMintWhen - mint', async t => {
  const assertAllegedMintWhen = makeAssertAllegedMintWhen(getInterfaceOf);
  const { mint } = makeIssuerKit('fungible');
  await t.notThrowsAsync(() => assertAllegedMintWhen(mint));
});

test('makeAssertAllegedMintWhen - not mint', async t => {
  const assertAllegedMintWhen = makeAssertAllegedMintWhen(getInterfaceOf);
  const { issuer } = makeIssuerKit('fungible');
  // @ts-ignore
  await t.throwsAsync(() => assertAllegedMintWhen(issuer), {
    message: `(an object) must be "a mint" or a promise for "a mint"\nSee console for error data.`,
  });
  // @ts-ignore
  await t.throwsAsync(() => assertAllegedMintWhen('a string'), {
    message: `(a string) must be "a mint" or a promise for "a mint"\nSee console for error data.`,
  });
});

test('makeAssertAllegedMintWhen - promise for mint', async t => {
  const assertAllegedMintWhen = makeAssertAllegedMintWhen(getInterfaceOf);
  const { mint } = makeIssuerKit('fungible');
  await t.notThrowsAsync(() => assertAllegedMintWhen(Promise.resolve(mint)));
});

test('makeAssertAllegedPaymentWhen - payment', async t => {
  const assertAllegedPaymentWhen = makeAssertAllegedPaymentWhen(getInterfaceOf);
  const { mint, amountMath } = makeIssuerKit('fungible');
  const myPayment = mint.mintPayment(amountMath.make(5));
  await t.notThrowsAsync(() => assertAllegedPaymentWhen(myPayment));
});

test('makeAssertAllegedPaymentWhen - not payment', async t => {
  const assertAllegedPaymentWhen = makeAssertAllegedPaymentWhen(getInterfaceOf);
  const { mint } = makeIssuerKit('fungible');
  // @ts-ignore
  await t.throwsAsync(() => assertAllegedPaymentWhen(mint), {
    message: `(an object) must be "a payment" or a promise for "a payment"\nSee console for error data.`,
  });
  // @ts-ignore
  await t.throwsAsync(() => assertAllegedPaymentWhen('a string'), {
    message: `(a string) must be "a payment" or a promise for "a payment"\nSee console for error data.`,
  });
});

test('makeAssertAllegedPaymentWhen - promise for payment', async t => {
  const { mint, amountMath } = makeIssuerKit('fungible');
  const assertAllegedPaymentWhen = makeAssertAllegedPaymentWhen(getInterfaceOf);
  const myPayment = mint.mintPayment(amountMath.make(5));
  await t.notThrowsAsync(() =>
    assertAllegedPaymentWhen(Promise.resolve(myPayment)),
  );
});

test('makeAssertAllegedDepositFacetWhen - depositFacet', async t => {
  const assertAllegedDepositFacetWhen = makeAssertAllegedDepositFacetWhen(
    getInterfaceOf,
  );
  const { issuer } = makeIssuerKit('fungible');
  const purse = issuer.makeEmptyPurse();
  const depositFacet = purse.getDepositFacet();
  await t.notThrowsAsync(() => assertAllegedDepositFacetWhen(depositFacet));
});

test('makeAssertAllegedDepositFacetWhen - not depositFacet', async t => {
  const assertAllegedDepositFacetWhen = makeAssertAllegedDepositFacetWhen(
    getInterfaceOf,
  );
  const { issuer } = makeIssuerKit('fungible');
  // @ts-ignore
  await t.throwsAsync(() => assertAllegedDepositFacetWhen(issuer), {
    message: `(an object) must be "a depositFacet" or a promise for "a depositFacet"\nSee console for error data.`,
  });
  // @ts-ignore
  await t.throwsAsync(() => assertAllegedDepositFacetWhen('a string'), {
    message: `(a string) must be "a depositFacet" or a promise for "a depositFacet"\nSee console for error data.`,
  });
});

test('makeAssertAllegedDepositFacetWhen - promise for depositFacet', async t => {
  const assertAllegedDepositFacetWhen = makeAssertAllegedDepositFacetWhen(
    getInterfaceOf,
  );
  const { issuer } = makeIssuerKit('fungible');
  const purse = issuer.makeEmptyPurse();
  const depositFacet = purse.getDepositFacet();
  await t.notThrowsAsync(() =>
    assertAllegedDepositFacetWhen(Promise.resolve(depositFacet)),
  );
});
