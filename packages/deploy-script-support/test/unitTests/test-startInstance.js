// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeZoeKit } from '@agoric/zoe';
import fakeVatAdmin from '@agoric/zoe/tools/fakeVatAdmin.js';
import bundleSource from '@endo/bundle-source';
import { makeIssuerKit } from '@agoric/ertp';
import { resolve as importMetaResolve } from 'import-meta-resolve';
import { E } from '@agoric/eventual-send';

import '../../exported.js';

import { makeStartInstance } from '../../src/startInstance.js';

test('startInstance', async t => {
  const MOOLA_BRAND_PETNAME = 'moola';
  const USD_BRAND_PETNAME = 'usd';

  const moolaKit = makeIssuerKit('moola');
  const usdKit = makeIssuerKit('usd');

  const { zoeService: zoe } = makeZoeKit(fakeVatAdmin);

  const bundleUrl = new URL(
    await importMetaResolve(
      '@agoric/zoe/src/contracts/automaticRefund.js',
      import.meta.url,
    ),
  );
  t.is(bundleUrl.protocol, 'file:');
  const bundlePath = bundleUrl.pathname;
  const bundle = await bundleSource(bundlePath);
  const installation = E(zoe).install(bundle);

  const zoeInvitationIssuer = E(zoe).getInvitationIssuer();
  const zoeInvitationPurse = E(zoeInvitationIssuer).makeEmptyPurse();

  const issuerManager = {
    get: petname => {
      if (petname === MOOLA_BRAND_PETNAME) {
        return moolaKit.issuer;
      }
      if (petname === USD_BRAND_PETNAME) {
        return usdKit.issuer;
      }
      throw Error('not found');
    },
  };

  let addedPetname;

  const instanceManager = {
    add: (petname, _instance) => (addedPetname = petname),
  };

  const startInstance = makeStartInstance(
    issuerManager,
    instanceManager,
    zoe,
    zoeInvitationPurse,
  );

  const startInstanceConfig = {
    instancePetname: 'automaticRefund',
    installation,
    issuerPetnameKeywordRecord: {
      Collateral: MOOLA_BRAND_PETNAME,
      Loan: USD_BRAND_PETNAME,
    },
  };

  const {
    creatorFacet,
    publicFacet,
    instance,
    creatorInvitationDetails,
  } = await startInstance(startInstanceConfig);

  t.is(addedPetname, 'automaticRefund');
  t.truthy(creatorFacet);
  t.is(await E(zoe).getPublicFacet(instance), publicFacet);
  t.is(creatorInvitationDetails.description, 'getRefund');
});
