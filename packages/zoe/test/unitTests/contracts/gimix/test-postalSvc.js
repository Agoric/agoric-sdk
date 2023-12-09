// @ts-check
// eslint-disable-next-line import/order
import { test as anyTest } from '../../../../tools/prepare-test-env-ava.js';

import { E, Far } from '@endo/far';
import { makeNodeBundleCache } from '@endo/bundle-source/cache.js';
import { makeNameHubKit } from '@agoric/vats';
import { AmountMath } from '@agoric/ertp/src/amountMath.js';
import { makeZoeKitForTest } from '../../../../tools/setup-zoe.js';
import { startPostalSvc } from '../../../../src/contracts/gimix/start-postalSvc.js';
import { makeTestBootPowers } from './boot-tools.js';

/** @type {import('ava').TestFn<Awaited<ReturnType<makeTestContext>>>} */
const test = anyTest;

const makeTestContext = async t => {
  const bundleCache = await makeNodeBundleCache('bundles/', {}, s => import(s));
  const { zoeService } = makeZoeKitForTest();
  const { bundles, powers } = await makeTestBootPowers(
    t,
    zoeService,
    bundleCache,
  );

  return { bundles, powers };
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

  const {
    powers,
    bundles: { postalSvc: bundle },
  } = t.context;
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
