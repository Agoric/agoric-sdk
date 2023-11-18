// @ts-check
// eslint-disable-next-line import/order
import { test as anyTest } from '../../../../tools/prepare-test-env-ava.js';

import { createRequire } from 'module';

import { E, Far } from '@endo/far';
import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import { makeNameHubKit, makePromiseSpace } from '@agoric/vats';
import { makeWellKnownSpaces } from '@agoric/vats/src/core/utils.js';
import { AmountMath } from '@agoric/ertp/src/amountMath.js';
import { makeZoeKitForTest } from '../../../../tools/setup-zoe.js';
import { startPostalSvc } from '../../../../src/contracts/gimix/start-postalSvc.js';

/** @type {import('ava').TestFn<Awaited<ReturnType<makeTestContext>>>} */
const test = anyTest;

const myRequire = createRequire(import.meta.url);
/** @param {string} specifier */
const asset = specifier => myRequire.resolve(specifier);

/**
 * Wrap Zoe exo in a record so that we can override methods.
 *
 * Roughly equivalent to {@link bindAllMethods}
 * in @agoric/internal, but that's a private API and
 * this contract should perhaps not be in agoric-sdk.
 *
 * @param {ZoeService} zoeExo
 */
const wrapZoe = zoeExo => {
  /** @type {ZoeService} */
  // @ts-expect-error mock
  const mock = {
    // XXX all the methods used in this test; there may be others.
    getFeeIssuer: () => zoeExo.getFeeIssuer(),
    getInvitationIssuer: () => zoeExo.getInvitationIssuer(),
    installBundleID: (...args) => zoeExo.installBundleID(...args),
    startInstance: (...args) => zoeExo.startInstance(...args),
    getTerms: (...args) => zoeExo.getTerms(...args),
    getPublicFacet: (...args) => zoeExo.getPublicFacet(...args),
    offer: (...args) => zoeExo.offer(...args),
  };
  return mock;
};

const makeTestContext = async t => {
  const bundleCache = await unsafeMakeBundleCache('bundles/');
  const bundle = await bundleCache.load(
    asset('../../../../src/contracts/gimix/postalSvc.js'),
    'gimix',
  );

  const bootstrap = async () => {
    const { produce, consume } = makePromiseSpace();

    const { zoeService } = makeZoeKitForTest();
    /** @param {string} bID */
    const install1BundleID = bID => {
      assert.equal(bID, `b1-${bundle.endoZipBase64Sha512}`);
      return zoeService.install(bundle);
    };
    const zoe = Far('ZoeService', {
      ...wrapZoe(zoeService),
      installBundleID: install1BundleID,
    });
    produce.zoe.resolve(zoe);

    const { nameHub: agoricNames, nameAdmin: agoricNamesAdmin } =
      makeNameHubKit();
    const spaces = await makeWellKnownSpaces(agoricNamesAdmin, t.log, [
      'installation',
      'instance',
    ]);

    produce.agoricNames.resolve(agoricNames);

    const { nameAdmin: namesByAddressAdmin } = makeNameHubKit();
    produce.namesByAddressAdmin.resolve(namesByAddressAdmin);

    /** @type {BootstrapPowers}}  */
    // @ts-expect-error mock
    const powers = { produce, consume, ...spaces };

    return powers;
  };

  const powers = await bootstrap();
  return { bundle, powers };
};

test.before(async t => (t.context = await makeTestContext(t)));

test('deliver payment using address', async t => {
  const addr1 = 'agoric1receiver';

  const rxd = [];
  const depositFacet = Far('DepositFacet', {
    /** @param {Payment} pmt */
    receive: async pmt => {
      rxd.push(pmt);
      // XXX should return amount of pmt
    },
  });

  const { powers, bundle } = t.context;
  const { agoricNames, zoe, namesByAddressAdmin } = powers.consume;

  await startPostalSvc(powers, {
    options: { postalSvc: { bundleID: `b1-${bundle.endoZipBase64Sha512}` } },
  });

  const instance = await E(agoricNames).lookup('instance', 'postalSvc');

  const my = makeNameHubKit();
  my.nameAdmin.update('depositFacet', depositFacet);
  await E(namesByAddressAdmin).update(addr1, my.nameHub, my.nameAdmin);

  const { issuers, brands } = await E(zoe).getTerms(instance);
  const postalSvc = E(zoe).getPublicFacet(instance);
  const purse = await E(issuers.IST).makeEmptyPurse();

  const pmt1 = await E(purse).withdraw(AmountMath.make(brands.IST, 0n));

  // XXX should test that return value is amount
  t.log('send IST with public facet to', addr1);
  await E(postalSvc).sendTo(addr1, pmt1);
  t.deepEqual(rxd, [pmt1]);

  {
    const Payment = AmountMath.make(brands.IST, 0n);
    const pmt2 = await E(purse).withdraw(Payment);
    const pmt3 = await E(postalSvc).makeSendInvitation(addr1);
    const Invitation = await E(issuers.Invitation).getAmountOf(pmt3);
    const proposal = { give: { Payment, Invitation } };
    t.log('make offer to send IST, Invitation to', addr1);
    const seat = E(zoe).offer(
      E(postalSvc).makeSendInvitation(addr1),
      proposal,
      { Payment: pmt2, Invitation: pmt3 },
    );
    const result = await E(seat).getOfferResult();
    t.deepEqual(rxd, [pmt1, pmt2, pmt3]);
    t.is(result, 'sent Payment, Invitation');
  }
});

test.todo('partial failure: send N+1 payments where >= 1 delivery fails');
