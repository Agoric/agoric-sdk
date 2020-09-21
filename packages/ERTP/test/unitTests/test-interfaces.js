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
} from '../../src';

test('makeAssertAllegedIssuerWhen - issuer', async t => {
  const assertAllegedIssuerWhen = makeAssertAllegedIssuerWhen(getInterfaceOf);
  const { issuer } = makeIssuerKit('fungible');
  await t.notThrowsAsync(() => assertAllegedIssuerWhen(issuer));
});

test('makeAssertAllegedIssuerWhen - not issuer', async t => {
  const assertAllegedIssuerWhen = makeAssertAllegedIssuerWhen(getInterfaceOf);
  const { brand } = makeIssuerKit('fungible');
  await t.throwsAsync(() => assertAllegedIssuerWhen(brand), {
    message: `(an object) must be "an issuer" or a promise for "an issuer"\nSee console for error data.`,
  });
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
  await t.throwsAsync(() => assertAllegedBrandWhen(issuer), {
    message: `(an object) must be "a brand" or a promise for "a brand"\nSee console for error data.`,
  });
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
  await t.throwsAsync(() => assertAllegedPurseWhen(issuer), {
    message: `(an object) must be "a purse" or a promise for "a purse"\nSee console for error data.`,
  });
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
  await t.throwsAsync(() => assertAllegedMintWhen(issuer), {
    message: `(an object) must be "a mint" or a promise for "a mint"\nSee console for error data.`,
  });
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
  await t.throwsAsync(() => assertAllegedPaymentWhen(mint), {
    message: `(an object) must be "a payment" or a promise for "a payment"\nSee console for error data.`,
  });
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
