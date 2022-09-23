// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import path from 'path';

import { AmountMath, AssetKind, makeIssuerKit } from '@agoric/ertp';
import { E } from '@endo/eventual-send';
import { passStyleOf, Far } from '@endo/marshal';
import { getMethodNames } from '@agoric/internal';

// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@endo/bundle-source';

import { setupZCFTest } from './zcf/setupZcfTest.js';
import { setup } from './setupBasicMints.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

test(`zoe.getInvitationIssuer`, async t => {
  const { zoe, zcf } = await setupZCFTest();
  const invitationIssuer = await E(zoe).getInvitationIssuer();
  // @ts-expect-error
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
  // @ts-expect-error deliberate invalid arguments for testing
  await t.throwsAsync(() => E(zoe).install(), {
    message: /expected 1 arguments/,
  });
});

test(`E(zoe).install(bundle)`, async t => {
  const { zoe } = setup();
  const contractPath = `${dirname}/../../src/contracts/atomicSwap`;
  const bundle = await bundleSource(contractPath);
  const installation = await E(zoe).install(bundle);
  t.is(passStyleOf(installation), 'remotable');
});

test(`E(zoe).installBundleID bad id`, async t => {
  const { zoe } = setup();
  // @ts-expect-error deliberate invalid arguments for testing
  await t.throwsAsync(() => E(zoe).installBundleID(), {
    message: /expected 1 arguments/,
  });
});

test(`E(zoe).installBundleID(bundleID)`, async t => {
  const { zoe, vatAdminState } = setup();
  const contractPath = `${dirname}/../../src/contracts/atomicSwap`;
  const bundle = await bundleSource(contractPath);
  vatAdminState.installBundle('b1-atomic', bundle);
  const installation = await E(zoe).installBundleID('b1-atomic');
  // TODO Check the integrity of the installation by its hash.
  // https://github.com/Agoric/agoric-sdk/issues/3859
  // const hash = await E(installation).getHash();
  // assert.is(hash, 'XXX');
  // NOTE: the bundle ID is now the hash
  t.is(await E(zoe).getBundleIDFromInstallation(installation), 'b1-atomic');
});

test(`E(zoe).startInstance bad installation`, async t => {
  const { zoe } = setup();
  // @ts-expect-error deliberate invalid arguments for testing
  await t.throwsAsync(() => E(zoe).startInstance(), {
    message: /expected 1 arguments/,
  });
});

function isEmptyFacet(t, facet) {
  t.is(passStyleOf(facet), 'remotable');
  t.deepEqual(Object.getOwnPropertyNames(facet), []);
}

function facetHasMethods(t, facet, names) {
  t.is(passStyleOf(facet), 'remotable');
  t.deepEqual(Object.getOwnPropertyNames(facet), names);
}

test(`E(zoe).startInstance no issuerKeywordRecord, no terms`, async t => {
  const result = await setupZCFTest();
  // Note that deepEqual treats all empty objects (handles) as interchangeable.
  t.deepEqual(Object.getOwnPropertyNames(result.startInstanceResult).sort(), [
    'adminFacet',
    'creatorFacet',
    'creatorInvitation',
    'instance',
    'publicFacet',
  ]);
  isEmptyFacet(t, result.creatorFacet);
  t.deepEqual(result.creatorInvitation, undefined);
  facetHasMethods(t, result.startInstanceResult.publicFacet, [
    'makeInvitation',
  ]);
  t.deepEqual(
    Object.getOwnPropertyNames(result.startInstanceResult.adminFacet).sort(),
    ['getVatShutdownPromise', 'restartContract', 'upgradeContract'],
  );
});

test(`E(zoe).startInstance promise for installation`, async t => {
  const { startInstanceResult } = await setupZCFTest();

  const result = await startInstanceResult;
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
  facetHasMethods(t, result.publicFacet, ['makeInvitation']);
  t.deepEqual(getMethodNames(result.adminFacet), [
    'getVatShutdownPromise',
    'restartContract',
    'upgradeContract',
  ]);
});

test(`E(zoe).startInstance - terms, issuerKeywordRecord switched`, async t => {
  const { zoe } = setup();
  const installation = await E(zoe).installBundleID('b1-contract');
  const { moolaKit } = setup();
  await t.throwsAsync(
    () =>
      E(zoe).startInstance(
        installation,
        { something: 2 },
        { Moola: moolaKit.issuer },
      ),
    {
      message:
        /In "startInstance" method of \(ZoeService zoeService\) arg 1: something: \[1\]: number 2/,
    },
  );
});

test(`E(zoe).startInstance - bad issuer, makeEmptyPurse throws`, async t => {
  const { zoe } = setup();
  const installation = await E(zoe).installBundleID('b1-contract');
  const brand = Far('brand', {
    // eslint-disable-next-line no-use-before-define
    isMyIssuer: i => i === badIssuer,
    getDisplayInfo: () => ({ decimalPlaces: 6, assetKind: AssetKind.NAT }),
  });
  const badIssuer = Far('issuer', {
    makeEmptyPurse: async () => {
      throw Error('bad issuer');
    },
    getBrand: () => brand,
  });
  await t.throwsAsync(
    () => E(zoe).startInstance(installation, { Money: badIssuer }),
    {
      message:
        'A purse could not be created for brand "[Alleged: brand]" because: "[Error: bad issuer]"',
    },
  );
});

test(`E(zoe).offer`, async t => {
  const { zoe, zcf } = await setupZCFTest();
  const invitation = zcf.makeInvitation(() => 'result', 'invitation');
  const userSeat = E(zoe).offer(invitation);
  t.is(await E(userSeat).getOfferResult(), 'result');
});

test(`E(zoe).offer - payment instead of paymentKeywordRecord`, async t => {
  const { zoe, zcf } = await setupZCFTest();
  const { mint, brand, issuer } = makeIssuerKit('Token');
  await zcf.saveIssuer(issuer, 'Keyword');
  const amount = AmountMath.make(brand, 10n);
  const proposal = harden({ give: { Keyword: amount } });
  const payment = mint.mintPayment(amount);
  const invitation = zcf.makeInvitation(() => {}, 'noop');
  // @ts-expect-error deliberate invalid arguments for testing
  await t.throwsAsync(() => E(zoe).offer(invitation, proposal, payment), {
    message:
      'In "offer" method of (ZoeService zoeService) arg 2: remotable "[Alleged: Token payment]" - Must be a copyRecord',
  });
});

test(`E(zoe).getPublicFacet`, async t => {
  const { zoe, vatAdminState } = setup();
  const contractPath = `${dirname}/../../src/contracts/automaticRefund`;
  const bundle = await bundleSource(contractPath);
  vatAdminState.installBundle('b1-refund', bundle);
  const installation = await E(zoe).installBundleID('b1-refund');
  const { publicFacet, instance } = await E(zoe).startInstance(installation);
  const offersCount = await E(publicFacet).getOffersCount();
  t.is(offersCount, 0n);
  t.is(await E(zoe).getPublicFacet(instance), publicFacet);
});

test(`E(zoe).getPublicFacet promise for instance`, async t => {
  const { zoe, vatAdminState } = setup();
  const contractPath = `${dirname}/../../src/contracts/automaticRefund`;
  const bundle = await bundleSource(contractPath);
  vatAdminState.installBundle('b1-refund', bundle);
  const installationP = E(zoe).installBundleID('b1-refund');
  // Note that E.get does not currently pipeline
  const { publicFacet: publicFacetP, instance: instanceP } = E.get(
    E(zoe).startInstance(installationP),
  );
  const pfp = E(zoe).getPublicFacet(instanceP);
  const offersCountP = E(publicFacetP).getOffersCount();
  const [offersCount, publicFacet, pf] = await Promise.all([
    offersCountP,
    publicFacetP,
    pfp,
  ]);
  t.is(offersCount, 0n);
  t.is(pf, publicFacet);
});

test(`E(zoe).getPublicFacet - no instance`, async t => {
  const { zoe } = setup();
  // @ts-expect-error deliberate invalid arguments for testing
  await t.throwsAsync(() => E(zoe).getPublicFacet(), {
    message: /expected 1 arguments/,
  });
});

test(`zoe.getIssuers`, async t => {
  const { zoe, moolaKit, vatAdminState } = setup();
  const contractPath = `${dirname}/../../src/contracts/automaticRefund`;
  const bundle = await bundleSource(contractPath);
  vatAdminState.installBundle('b1-refund', bundle);
  const installation = await E(zoe).installBundleID('b1-refund');
  const { instance } = await E(zoe).startInstance(installation, {
    Moola: moolaKit.issuer,
  });
  t.deepEqual(await E(zoe).getIssuers(instance), { Moola: moolaKit.issuer });
});

test(`zoe.getIssuers - none`, async t => {
  const { zoe, vatAdminState } = setup();
  const contractPath = `${dirname}/../../src/contracts/automaticRefund`;
  const bundle = await bundleSource(contractPath);
  vatAdminState.installBundle('b1-refund', bundle);
  const installation = await E(zoe).installBundleID('b1-refund');
  const { instance } = await E(zoe).startInstance(installation);
  t.deepEqual(await E(zoe).getIssuers(instance), {});
});

test(`zoe.getIssuers - no instance`, async t => {
  const { zoe } = setup();
  // @ts-expect-error invalid arguments for testing
  await t.throwsAsync(() => E(zoe).getIssuers(), {
    message: /expected 1 arguments/,
  });
});

test(`zoe.getBrands`, async t => {
  const { zoe, moolaKit, vatAdminState } = setup();
  const contractPath = `${dirname}/../../src/contracts/automaticRefund`;
  const bundle = await bundleSource(contractPath);
  vatAdminState.installBundle('b1-refund', bundle);
  const installation = await E(zoe).installBundleID('b1-refund');
  const { instance } = await E(zoe).startInstance(installation, {
    Moola: moolaKit.issuer,
  });
  t.deepEqual(await E(zoe).getBrands(instance), { Moola: moolaKit.brand });
});

test(`zoe.getBrands - none`, async t => {
  const { zoe, vatAdminState } = setup();
  const contractPath = `${dirname}/../../src/contracts/automaticRefund`;
  const bundle = await bundleSource(contractPath);
  vatAdminState.installBundle('b1-refund', bundle);
  const installation = await E(zoe).installBundleID('b1-refund');
  const { instance } = await E(zoe).startInstance(installation);
  t.deepEqual(await E(zoe).getBrands(instance), {});
});

test(`zoe.getBrands - no instance`, async t => {
  const { zoe } = setup();
  // @ts-expect-error invalid arguments for testing
  await t.throwsAsync(() => E(zoe).getBrands(), {
    message: /expected 1 arguments/,
  });
});

test(`zoe.getTerms - none`, async t => {
  const { zoe, vatAdminState } = setup();
  const contractPath = `${dirname}/../../src/contracts/automaticRefund`;
  const bundle = await bundleSource(contractPath);
  vatAdminState.installBundle('b1-refund', bundle);
  const installation = await E(zoe).installBundleID('b1-refund');
  const { instance } = await E(zoe).startInstance(installation);
  t.deepEqual(await E(zoe).getTerms(instance), {
    brands: {},
    issuers: {},
  });
});

test(`zoe.getTerms`, async t => {
  const { zoe, moolaKit, vatAdminState } = setup();
  const contractPath = `${dirname}/../../src/contracts/automaticRefund`;
  const bundle = await bundleSource(contractPath);
  vatAdminState.installBundle('b1-refund', bundle);
  const installation = await E(zoe).installBundleID('b1-refund');
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

test(`zoe.getTerms - no instance`, async t => {
  const { zoe } = setup();
  // @ts-expect-error invalid arguments for testing
  await t.throwsAsync(() => E(zoe).getTerms(), {
    message: /expected 1 arguments/,
  });
});

test(`zoe.getInstallationForInstance`, async t => {
  const { zoe, moolaKit, vatAdminState } = setup();
  const contractPath = `${dirname}/../../src/contracts/automaticRefund`;
  const bundle = await bundleSource(contractPath);
  vatAdminState.installBundle('b1-refund', bundle);
  const installation = await E(zoe).installBundleID('b1-refund');
  const { instance } = await E(zoe).startInstance(
    installation,
    {
      Moola: moolaKit.issuer,
    },
    {
      someTerm: 2,
    },
  );

  const installationReturned = await E(zoe).getInstallationForInstance(
    instance,
  );
  t.is(installation, installationReturned);
});

test(`zoe.getInstance`, async t => {
  const { zoe, zcf, instance } = await setupZCFTest();
  // @ts-expect-error
  const invitation = await E(zcf).makeInvitation(undefined, 'invitation');
  const actualInstance = await E(zoe).getInstance(invitation);
  t.is(actualInstance, instance);
});

test(`zoe.getInstance - no invitation`, async t => {
  const { zoe } = await setupZCFTest();
  await t.throwsAsync(() => E(zoe).getInstance(), {
    message: /expected 1 arguments/,
  });
});

test(`zoe.getInstallation`, async t => {
  const { zoe, zcf, installation } = await setupZCFTest();
  // @ts-expect-error
  const invitation = await E(zcf).makeInvitation(undefined, 'invitation');
  const actualInstallation = await E(zoe).getInstallation(invitation);
  t.is(actualInstallation, installation);
});

test(`zoe.getInstallation - no invitation`, async t => {
  const { zoe } = await setupZCFTest();
  // @ts-expect-error invalid arguments for testing
  await t.throwsAsync(() => E(zoe).getInstallation(), {
    message: /expected 1 arguments/,
  });
});

test(`zoe.getInvitationDetails`, async t => {
  const { zoe, zcf, installation, instance } = await setupZCFTest();
  // @ts-expect-error
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
  // @ts-expect-error invalid arguments for testing
  await t.throwsAsync(() => E(zoe).getInvitationDetails(), {
    message: /expected 1 arguments/,
  });
});

test.todo(`zcf.registerFeeMint twice in different contracts`);

test(`zoe.getConfiguration`, async t => {
  const { zoe } = await setupZCFTest();
  const config = await E(zoe).getConfiguration();
  t.deepEqual(config, {
    feeIssuerConfig: {
      assetKind: 'nat',
      displayInfo: {
        assetKind: 'nat',
        decimalPlaces: 6,
      },
      name: 'ZDEFAULT',
    },
  });
});
