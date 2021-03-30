/* global require */
// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import { makeZoe } from '@agoric/zoe';
import fakeVatAdmin from '@agoric/zoe/src/contractFacet/fakeVatAdmin';
import bundleSource from '@agoric/bundle-source';
import { makeIssuerKit } from '@agoric/ertp';

import '../../exported';

import { E } from '@agoric/eventual-send';
import { makeStartInstance } from '../../src/startInstance';

test('startInstance', async t => {
  const MOOLA_BRAND_PETNAME = 'moola';
  const USD_BRAND_PETNAME = 'usd';

  const moolaKit = makeIssuerKit('moola');
  const usdKit = makeIssuerKit('usd');

  const zoe = makeZoe(fakeVatAdmin);

  const bundle = await bundleSource(
    require.resolve('@agoric/zoe/src/contracts/automaticRefund'),
  );
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
    adminFacet,
    creatorInvitationDetails,
  } = await startInstance(startInstanceConfig);

  t.is(addedPetname, 'automaticRefund');
  t.truthy(creatorFacet);
  t.is(await E(zoe).getPublicFacet(instance), publicFacet);
  t.is(creatorInvitationDetails.description, 'getRefund');
  t.is(await E(adminFacet).getVatStats(), undefined);
});
