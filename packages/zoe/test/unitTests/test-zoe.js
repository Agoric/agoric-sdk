/* global __dirname */
// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import { E } from '@agoric/eventual-send';
import { makePromiseKit } from '@agoric/promise-kit';
import { passStyleOf } from '@agoric/marshal';
import { AmountMath } from '@agoric/ertp';

// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';

import { setupZCFTest } from './zcf/setupZcfTest';
import { setup } from './setupBasicMints';

test(`E(zoe).getInvitationIssuer`, async t => {
  const { zoe, zcf } = await setupZCFTest();
  const invitationIssuer = await E(zoe).getInvitationIssuer();
  const invitation = zcf.makeInvitation(undefined, 'invite');

  // A few basic tests that the invitation issuer acts like an issuer.
  // Not exhaustive.
  const brand = await E(invitationIssuer).getBrand();
  const amount = await E(invitationIssuer).getAmountOf(invitation);
  t.is(amount.brand, brand);
  t.truthy(await E(invitationIssuer).isLive(invitation));
  await E(invitationIssuer).burn(invitation);
  t.falsy(await E(invitationIssuer).isLive(invitation));
});

test(`E(zoe).install bad bundle`, async t => {
  const { zoe } = setup();
  // @ts-ignore deliberate invalid arguments for testing
  await t.throwsAsync(() => E(zoe).install(), {
    message: 'a bundle must be provided',
  });
});

test(`E(zoe).install`, async t => {
  const { zoe } = setup();
  const contractPath = `${__dirname}/../../src/contracts/atomicSwap`;
  const bundle = await bundleSource(contractPath);
  t.truthy(bundle.source.includes('start'));
  const installation = await E(zoe).install(bundle);
  t.is(await E(installation).getBundle(), bundle);
});

test(`E(zoe).startInstance bad installation`, async t => {
  const { zoe } = setup();
  // @ts-ignore deliberate invalid arguments for testing
  await t.throwsAsync(() => E(zoe).startInstance(), {
    message:
      // Should be able to use more informative error once SES double
      // disclosure bug is fixed. See
      // https://github.com/endojs/endo/pull/640
      //
      // /"\[undefined\]" was not a valid installation/,
      /.* was not a valid installation/,
  });
});

function isEmptyFacet(t, facet) {
  t.is(passStyleOf(facet), 'remotable');
  t.deepEqual(Object.getOwnPropertyNames(facet), []);
}

test(`E(zoe).startInstance no issuerKeywordRecord, no terms`, async t => {
  const { zoe, installation } = await setupZCFTest();
  const result = await E(zoe).startInstance(installation);
  // Note that deepEqual treats all empty objects (handles) as interchangeable.
  t.deepEqual(Object.getOwnPropertyNames(result).sort(), [
    'adminFacet',
    'creatorFacet',
    'creatorInvitation',
    'instance',
    'publicFacet',
  ]);
  isEmptyFacet(t, result.creatorFacet);
  t.deepEqual(result.creatorInvitation, undefined);
  isEmptyFacet(t, result.publicFacet);
  t.deepEqual(Object.getOwnPropertyNames(result.adminFacet).sort(), [
    'getVatShutdownPromise',
  ]);
});

test(`E(zoe).startInstance promise for installation`, async t => {
  const { zoe, installation } = await setupZCFTest();
  const {
    promise: installationP,
    resolve: installationPResolve,
  } = makePromiseKit();

  const resultP = E(zoe).startInstance(installationP);
  installationPResolve(installation);

  const result = await resultP;
  // Note that deepEqual treats all empty objects (handles) as interchangeable.
  t.deepEqual(Object.getOwnPropertyNames(result).sort(), [
    'adminFacet',
    'creatorFacet',
    'creatorInvitation',
    'instance',
    'publicFacet',
  ]);
  isEmptyFacet(t, result.creatorFacet);
  t.deepEqual(result.creatorInvitation, undefined);
  isEmptyFacet(t, result.publicFacet);
  t.deepEqual(Object.getOwnPropertyNames(result.adminFacet).sort(), [
    'getVatShutdownPromise',
  ]);
});

test(`E(zoe).startInstance - terms, issuerKeywordRecord switched`, async t => {
  const { zoe, installation } = await setupZCFTest();
  const { moolaKit } = setup();
  await t.throwsAsync(
    () =>
      E(zoe).startInstance(
        installation,
        // @ts-ignore deliberate invalid arguments for testing
        { something: 2 },
        { Moola: moolaKit.issuer },
      ),
    {
      message:
        // Should be able to use more informative error once SES double
        // disclosure bug is fixed. See
        // https://github.com/endojs/endo/pull/640
        //
        // /keyword "something" must be ascii and must start with a capital letter./
        /keyword .* must be ascii and must start with a capital letter./,
    },
  );
});

test(`E(zoe).offer`, async t => {
  const { zoe, zcf } = await setupZCFTest();
  const invitation = zcf.makeInvitation(() => 'result', 'invitation');
  const userSeat = E(zoe).offer(invitation);
  t.is(await E(userSeat).getOfferResult(), 'result');
});

test(`E(zoe).offer - no invitation`, async t => {
  const { zoe } = await setupZCFTest();
  // @ts-ignore deliberate invalid arguments for testing
  await t.throwsAsync(() => E(zoe).offer(), {
    message: /A Zoe invitation is required, not "\[undefined\]"/,
  });
});

test(`E(zoe).getPublicFacet`, async t => {
  const { zoe } = setup();
  const contractPath = `${__dirname}/../../src/contracts/automaticRefund`;
  const bundle = await bundleSource(contractPath);
  const installation = await E(zoe).install(bundle);
  const { publicFacet, instance } = await E(zoe).startInstance(installation);
  const offersCount = await E(publicFacet).getOffersCount();
  t.is(offersCount, 0n);
  t.is(await E(zoe).getPublicFacet(instance), publicFacet);
});

test(`E(zoe).getPublicFacet - no instance`, async t => {
  const { zoe } = setup();
  // @ts-ignore deliberate invalid arguments for testing
  await t.throwsAsync(() => E(zoe).getPublicFacet(), {
    message:
      // Should be able to use more informative error once SES double
      // disclosure bug is fixed. See
      // https://github.com/endojs/endo/pull/640
      //
      // /"instance" not found: "\[undefined\]"/,
      /.* not found: "\[undefined\]"/,
  });
});

test(`E(zoe).getIssuers`, async t => {
  const { zoe, moolaKit } = setup();
  const contractPath = `${__dirname}/../../src/contracts/automaticRefund`;
  const bundle = await bundleSource(contractPath);
  const installation = await E(zoe).install(bundle);
  const { instance } = await E(zoe).startInstance(installation, {
    Moola: moolaKit.issuer,
  });
  t.deepEqual(await E(zoe).getIssuers(instance), { Moola: moolaKit.issuer });
});

test(`E(zoe).getIssuers - none`, async t => {
  const { zoe } = setup();
  const contractPath = `${__dirname}/../../src/contracts/automaticRefund`;
  const bundle = await bundleSource(contractPath);
  const installation = await E(zoe).install(bundle);
  const { instance } = await E(zoe).startInstance(installation);
  t.deepEqual(await E(zoe).getIssuers(instance), {});
});

test(`E(zoe).getIssuers - no instance`, async t => {
  const { zoe } = setup();
  // @ts-ignore invalid arguments for testing
  await t.throwsAsync(() => E(zoe).getIssuers(), {
    message:
      // Should be able to use more informative error once SES double
      // disclosure bug is fixed. See
      // https://github.com/endojs/endo/pull/640
      //
      // /"instance" not found: "\[undefined\]"/,
      /.* not found: "\[undefined\]"/,
  });
});

test(`E(zoe).getBrands`, async t => {
  const { zoe, moolaKit } = setup();
  const contractPath = `${__dirname}/../../src/contracts/automaticRefund`;
  const bundle = await bundleSource(contractPath);
  const installation = await E(zoe).install(bundle);
  const { instance } = await E(zoe).startInstance(installation, {
    Moola: moolaKit.issuer,
  });
  t.deepEqual(await E(zoe).getBrands(instance), { Moola: moolaKit.brand });
});

test(`E(zoe).getBrands - none`, async t => {
  const { zoe } = setup();
  const contractPath = `${__dirname}/../../src/contracts/automaticRefund`;
  const bundle = await bundleSource(contractPath);
  const installation = await E(zoe).install(bundle);
  const { instance } = await E(zoe).startInstance(installation);
  t.deepEqual(await E(zoe).getBrands(instance), {});
});

test(`E(zoe).getBrands - no instance`, async t => {
  const { zoe } = setup();
  // @ts-ignore invalid arguments for testing
  await t.throwsAsync(() => E(zoe).getBrands(), {
    message:
      // Should be able to use more informative error once SES double
      // disclosure bug is fixed. See
      // https://github.com/endojs/endo/pull/640
      //
      // /"instance" not found: "\[undefined\]"/,
      /.* not found: "\[undefined\]"/,
  });
});

test(`E(zoe).getTerms - none`, async t => {
  const { zoe } = setup();
  const contractPath = `${__dirname}/../../src/contracts/automaticRefund`;
  const bundle = await bundleSource(contractPath);
  const installation = await E(zoe).install(bundle);
  const { instance } = await E(zoe).startInstance(installation);
  t.deepEqual(await E(zoe).getTerms(instance), {
    brands: {},
    issuers: {},
  });
});

test(`E(zoe).getTerms`, async t => {
  const { zoe, moolaKit } = setup();
  const contractPath = `${__dirname}/../../src/contracts/automaticRefund`;
  const bundle = await bundleSource(contractPath);
  const installation = await E(zoe).install(bundle);
  const { instance } = await E(zoe).startInstance(
    installation,
    {
      Moola: moolaKit.issuer,
    },
    {
      someTerm: 2,
    },
  );

  const zoeTerms = await E(zoe).getTerms(instance);

  const expected = {
    issuers: {
      Moola: moolaKit.issuer,
    },
    brands: {
      Moola: moolaKit.brand,
    },
    someTerm: 2,
  };

  t.deepEqual(zoeTerms, expected);
});

test(`E(zoe).getTerms - no instance`, async t => {
  const { zoe } = setup();
  // @ts-ignore invalid arguments for testing
  await t.throwsAsync(() => E(zoe).getTerms(), {
    message:
      // Should be able to use more informative error once SES double
      // disclosure bug is fixed. See
      // https://github.com/endojs/endo/pull/640
      //
      // /"instance" not found: "\[undefined\]"/,
      /.* not found: "\[undefined\]"/,
  });
});

test(`E(zoe).getInstance`, async t => {
  const { zoe, zcf, instance } = await setupZCFTest();
  const invitation = await E(zcf).makeInvitation(undefined, 'invitation');
  const actualInstance = await E(zoe).getInstance(invitation);
  t.is(actualInstance, instance);
});

test(`E(zoe).getInstance - no invitation`, async t => {
  const { zoe } = await setupZCFTest();
  // @ts-ignore invalid arguments for testing
  await t.throwsAsync(() => E(zoe).getInstance(), {
    message: /A Zoe invitation is required, not "\[undefined\]"/,
  });
});

test(`E(zoe).getInstallation`, async t => {
  const { zoe, zcf, installation } = await setupZCFTest();
  const invitation = await E(zcf).makeInvitation(undefined, 'invitation');
  const actualInstallation = await E(zoe).getInstallation(invitation);
  t.is(actualInstallation, installation);
});

test(`E(zoe).getInstallation - no invitation`, async t => {
  const { zoe } = await setupZCFTest();
  // @ts-ignore invalid arguments for testing
  await t.throwsAsync(() => E(zoe).getInstallation(), {
    message: /A Zoe invitation is required, not "\[undefined\]"/,
  });
});

test(`E(zoe).getInvitationDetails`, async t => {
  const { zoe, zcf, installation, instance } = await setupZCFTest();
  const invitation = await E(zcf).makeInvitation(undefined, 'invitation');
  const details = await E(zoe).getInvitationDetails(invitation);
  t.deepEqual(details, {
    description: 'invitation',
    handle: details.handle,
    installation,
    instance,
  });
});

test(`E(zoe).getInvitationDetails - no invitation`, async t => {
  const { zoe } = await setupZCFTest();
  // @ts-ignore invalid arguments for testing
  await t.throwsAsync(() => E(zoe).getInvitationDetails(), {
    message: /A Zoe invitation is required, not "\[undefined\]"/,
  });
});

test(`E(zoe).makeChargeAccount`, async t => {
  const { zoe, feeIssuerKit } = await setupZCFTest();

  const chargeAccount = E(zoe).makeChargeAccount();
  const feeIssuer = E(zoe).getFeeIssuer();
  const feeBrand = await E(feeIssuer).getBrand();

  const fee1000 = AmountMath.make(feeBrand, 1000n);
  const payment = feeIssuerKit.mint.mintPayment(fee1000);
  E(chargeAccount).deposit(payment);

  t.true(
    AmountMath.isEqual(await E(chargeAccount).getCurrentAmount(), fee1000),
  );

  E(chargeAccount).withdraw(fee1000);

  t.true(AmountMath.isEmpty(await E(chargeAccount).getCurrentAmount()));
});
