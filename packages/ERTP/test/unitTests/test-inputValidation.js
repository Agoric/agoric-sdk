// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { AssetKind, makeIssuerKit, AmountMath } from '../../src/index.js';

test('makeIssuerKit bad allegedName', async t => {
  // @ts-ignore Intentional wrong type for testing
  t.throws(() => makeIssuerKit({}), { message: `{} must be a string` });
});

test('makeIssuerKit bad assetKind', async t => {
  // @ts-ignore Intentional wrong type for testing
  t.throws(() => makeIssuerKit('myTokens', 'somethingWrong'), {
    message: `The assetKind "somethingWrong" must be either AssetKind.NAT or AssetKind.SET`,
  });
});

test('makeIssuerKit bad displayInfo.decimalPlaces', async t => {
  t.throws(
    () =>
      makeIssuerKit(
        'myTokens',
        AssetKind.NAT,
        // @ts-ignore Intentional wrong type for testing
        harden({ decimalPlaces: 'hello' }),
      ),
    {
      message: `"hello" must be a number`,
    },
  );
});

test('makeIssuerKit bad displayInfo.assetKind', async t => {
  t.throws(
    () =>
      makeIssuerKit(
        'myTokens',
        AssetKind.NAT,
        // @ts-ignore Intentional wrong type for testing
        harden({
          assetKind: 'something',
        }),
      ),
    {
      message:
        'displayInfo.assetKind was present ("something") and did not match the assetKind argument ("nat")',
    },
  );
});

test('makeIssuerKit bad displayInfo.whatever', async t => {
  t.throws(
    () =>
      makeIssuerKit(
        'myTokens',
        AssetKind.NAT,
        // @ts-ignore Intentional wrong type for testing
        harden({
          whatever: 'something',
        }),
      ),
    {
      message:
        'key "whatever" was not one of the expected keys ["decimalPlaces","assetKind"]',
    },
  );
});

test('makeIssuerKit malicious displayInfo', async t => {
  t.throws(
    () =>
      makeIssuerKit(
        'myTokens',
        AssetKind.NAT,
        // @ts-ignore Intentional wrong type for testing
        Far('malicious', { doesSomething: () => {} }),
      ),
    {
      message:
        '"displayInfo" "[Alleged: malicious]" must be a pass-by-copy record, not "remotable"',
    },
  );
});

// Note: because optShutdownWithFailure should never be able to be
// reached, we can't easily test that pathway.
test('makeIssuerKit bad optShutdownWithFailure', async t => {
  t.throws(
    // @ts-ignore Intentional wrong type for testing
    () => makeIssuerKit('myTokens', AssetKind.NAT, undefined, 'not a function'),
    {
      message: '"not a function" must be a function',
    },
  );
});

test('brand.isMyIssuer bad issuer', async t => {
  const { brand } = makeIssuerKit('myTokens');
  // @ts-ignore Intentional wrong type for testing
  const result = await brand.isMyIssuer('not an issuer');
  t.false(result);
});

// Tested in the context of an issuer.claim call, as assertLivePayment is not
// exported
test('assertLivePayment', async t => {
  const { issuer, mint, brand } = makeIssuerKit('fungible');
  const { mint: mintB, brand: brandB } = makeIssuerKit('fungibleB');

  const paymentB = E(mintB).mintPayment(AmountMath.make(brandB, 837n));

  // payment is of the wrong brand
  await t.throwsAsync(() => E(issuer).claim(paymentB), {
    message:
      '"[Alleged: fungibleB payment]" was not a live payment for brand "[Alleged: fungible brand]". It could be a used-up payment, a payment for another brand, or it might not be a payment at all.',
  });

  // payment is used up
  const payment = E(mint).mintPayment(AmountMath.make(brand, 10n));
  // use up payment
  await E(issuer).claim(payment);

  await t.throwsAsync(() => E(issuer).claim(payment), {
    message:
      '"[Alleged: fungible payment]" was not a live payment for brand "[Alleged: fungible brand]". It could be a used-up payment, a payment for another brand, or it might not be a payment at all.',
  });
});

test('issuer.combine bad payments array', async t => {
  const { issuer } = makeIssuerKit('fungible');
  const notAnArray = {
    length: 2,
    split: () => {},
  };
  // @ts-ignore Intentional wrong type for testing
  await t.throwsAsync(() => E(issuer).combine(notAnArray), {
    message:
      'Cannot pass non-frozen objects like {"length":2,"split":"[Function split]"}. Use harden()',
  });

  const notAnArray2 = Far('notAnArray2', {
    length: () => 2,
    split: () => {},
  });
  // @ts-ignore Intentional wrong type for testing
  await t.throwsAsync(() => E(issuer).combine(notAnArray2), {
    message:
      '"fromPaymentsArray" "[Alleged: notAnArray2]" must be a pass-by-copy array, not "remotable"',
  });
});

test('amount with accessor properties', async t => {
  const { brand } = makeIssuerKit('token');
  const makeAmount = () => {
    const amount = { brand };
    let checked = false;
    // Create an amount where the first time `value` is accessed, 1 is
    // returned, but afterwards 1 million is returned. Might be a nice
    // attack to withdraw a lot more than allowed.
    Object.defineProperty(amount, 'value', {
      get() {
        if (checked) {
          return 1_000_000n;
        } else {
          checked = true;
          return 1n;
        }
      },
    });
    return harden(amount);
  };

  const amount = makeAmount();

  t.throws(() => AmountMath.coerce(brand, /** @type {Amount} */ (amount)), {
    message: /"value" must not be an accessor property/,
  });
});
