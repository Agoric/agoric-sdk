/* global __dirname */
// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import { E } from '@agoric/eventual-send';
import { makePromiseKit } from '@agoric/promise-kit';
import { passStyleOf, REMOTE_STYLE } from '@agoric/marshal';

// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';

import { setupZCFTest } from './zcf/setupZcfTest';
import { setup } from './setupBasicMints';

test(`zoe.getInvitationIssuer`, async t => {
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

test(`zoe.install bad bundle`, async t => {
  const { zoe } = setup();
  // @ts-ignore deliberate invalid arguments for testing
  await t.throwsAsync(() => E(zoe).install(), {
    message: 'a bundle must be provided',
  });
});

test(`zoe.install`, async t => {
  const { zoe } = setup();
  const contractPath = `${__dirname}/../../src/contracts/atomicSwap`;
  const bundle = await bundleSource(contractPath);
  t.truthy(bundle.source.includes('start'));
  const installation = await E(zoe).install(bundle);
  t.is(await E(installation).getBundle(), bundle);
});

test(`zoe.startInstance bad installation`, async t => {
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
  t.is(passStyleOf(facet), REMOTE_STYLE);
  t.deepEqual(Object.getOwnPropertyNames(facet), []);
}

test(`zoe.startInstance no issuerKeywordRecord, no terms`, async t => {
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
    'getVatStats',
  ]);
});

test(`zoe.startInstance promise for installation`, async t => {
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
    'getVatStats',
  ]);
});

test(`zoe.startInstance - terms, issuerKeywordRecord switched`, async t => {
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

test(`zoe.offer`, async t => {
  const { zoe, zcf } = await setupZCFTest();
  const invitation = zcf.makeInvitation(() => 'result', 'invitation');
  const userSeat = E(zoe).offer(invitation);
  t.is(await E(userSeat).getOfferResult(), 'result');
});

test(`zoe.offer - no invitation`, async t => {
  const { zoe } = await setupZCFTest();
  // @ts-ignore deliberate invalid arguments for testing
  await t.throwsAsync(() => E(zoe).offer(), {
    message: /A Zoe invitation is required, not "\[undefined\]"/,
  });
});

test(`zoe.getPublicFacet`, async t => {
  const { zoe } = setup();
  const contractPath = `${__dirname}/../../src/contracts/automaticRefund`;
  const bundle = await bundleSource(contractPath);
  const installation = await E(zoe).install(bundle);
  const { publicFacet, instance } = await E(zoe).startInstance(installation);
  const offersCount = await E(publicFacet).getOffersCount();
  t.is(offersCount, 0n);
  t.is(await E(zoe).getPublicFacet(instance), publicFacet);
});

test(`zoe.getPublicFacet - no instance`, async t => {
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

test(`zoe.getIssuers`, async t => {
  const { zoe, moolaKit } = setup();
  const contractPath = `${__dirname}/../../src/contracts/automaticRefund`;
  const bundle = await bundleSource(contractPath);
  const installation = await E(zoe).install(bundle);
  const { instance } = await E(zoe).startInstance(installation, {
    Moola: moolaKit.issuer,
  });
  t.deepEqual(await E(zoe).getIssuers(instance), { Moola: moolaKit.issuer });
});

test(`zoe.getIssuers - none`, async t => {
  const { zoe } = setup();
  const contractPath = `${__dirname}/../../src/contracts/automaticRefund`;
  const bundle = await bundleSource(contractPath);
  const installation = await E(zoe).install(bundle);
  const { instance } = await E(zoe).startInstance(installation);
  t.deepEqual(await E(zoe).getIssuers(instance), {});
});

test(`zoe.getIssuers - no instance`, async t => {
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

test(`zoe.getBrands`, async t => {
  const { zoe, moolaKit } = setup();
  const contractPath = `${__dirname}/../../src/contracts/automaticRefund`;
  const bundle = await bundleSource(contractPath);
  const installation = await E(zoe).install(bundle);
  const { instance } = await E(zoe).startInstance(installation, {
    Moola: moolaKit.issuer,
  });
  t.deepEqual(await E(zoe).getBrands(instance), { Moola: moolaKit.brand });
});

test(`zoe.getBrands - none`, async t => {
  const { zoe } = setup();
  const contractPath = `${__dirname}/../../src/contracts/automaticRefund`;
  const bundle = await bundleSource(contractPath);
  const installation = await E(zoe).install(bundle);
  const { instance } = await E(zoe).startInstance(installation);
  t.deepEqual(await E(zoe).getBrands(instance), {});
});

test(`zoe.getBrands - no instance`, async t => {
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

test(`zoe.getTerms - none`, async t => {
  const { zoe } = setup();
  const contractPath = `${__dirname}/../../src/contracts/automaticRefund`;
  const bundle = await bundleSource(contractPath);
  const installation = await E(zoe).install(bundle);
  const { instance } = await E(zoe).startInstance(installation);
  t.deepEqual(await E(zoe).getTerms(instance), {
    brands: {},
    issuers: {},
    maths: {},
  });
});

test(`zoe.getTerms`, async t => {
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
    maths: { Moola: moolaKit.amountMath },
    someTerm: 2,
  };

  t.deepEqual({ ...zoeTerms, maths: {} }, { ...expected, maths: {} });
  t.is(
    zoeTerms.maths.Moola.getAmountMathKind(),
    moolaKit.amountMath.getAmountMathKind(),
  );
  t.is(zoeTerms.maths.Moola.getBrand(), moolaKit.amountMath.getBrand());
});

test(`zoe.getTerms - no instance`, async t => {
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

test(`zoe.getInstance`, async t => {
  const { zoe, zcf, instance } = await setupZCFTest();
  const invitation = await E(zcf).makeInvitation(undefined, 'invitation');
  const actualInstance = await E(zoe).getInstance(invitation);
  t.is(actualInstance, instance);
});

test(`zoe.getInstance - no invitation`, async t => {
  const { zoe } = await setupZCFTest();
  // @ts-ignore invalid arguments for testing
  await t.throwsAsync(() => E(zoe).getInstance(), {
    message: /A Zoe invitation is required, not "\[undefined\]"/,
  });
});

test(`zoe.getInstallation`, async t => {
  const { zoe, zcf, installation } = await setupZCFTest();
  const invitation = await E(zcf).makeInvitation(undefined, 'invitation');
  const actualInstallation = await E(zoe).getInstallation(invitation);
  t.is(actualInstallation, installation);
});

test(`zoe.getInstallation - no invitation`, async t => {
  const { zoe } = await setupZCFTest();
  // @ts-ignore invalid arguments for testing
  await t.throwsAsync(() => E(zoe).getInstallation(), {
    message: /A Zoe invitation is required, not "\[undefined\]"/,
  });
});

test(`zoe.getInvitationDetails`, async t => {
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

test(`zoe.getInvitationDetails - no invitation`, async t => {
  const { zoe } = await setupZCFTest();
  // @ts-ignore invalid arguments for testing
  await t.throwsAsync(() => E(zoe).getInvitationDetails(), {
    message: /A Zoe invitation is required, not "\[undefined\]"/,
  });
});
