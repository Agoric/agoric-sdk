// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { Far } from '@endo/marshal';
import { makeScalarBigMapStore } from '@agoric/vat-data';

import { makeInstanceAdminStorage } from '../../../src/zoeService/instanceAdminStorage.js';

test('makeInstanceAdminStorage', async t => {
  const ias = makeInstanceAdminStorage(
    makeScalarBigMapStore('zoe baggage', { durable: true }),
  );

  const mockInstallation1 = Far('mockInstallation', {});
  const mockInstance1 = Far('mockInstance', {});
  const mockInstanceAdmin = Far('mockInstanceAdmin', {
    getInstallationForInstance: () => mockInstallation1,
    getBrands: () => 'brands',
    getPublicFacet: () => 'publicFacet',
    getIssuers: () => 'issuers',
    getTerms: () => 'terms',
    getOfferFilter: () => 'filter',
  });

  ias.updater.initInstanceAdmin(mockInstance1, mockInstanceAdmin);
  t.is(
    await ias.accessor.getInstallationForInstance(mockInstance1),
    mockInstallation1,
  );
  t.is(await ias.accessor.getBrands(mockInstance1), 'brands');
  t.is(await ias.accessor.getPublicFacet(mockInstance1), 'publicFacet');
  t.is(await ias.accessor.getIssuers(mockInstance1), 'issuers');
  t.is(await ias.accessor.getTerms(mockInstance1), 'terms');
});

test('add another instance admin for same instance', async t => {
  const ias = makeInstanceAdminStorage(
    makeScalarBigMapStore('zoe baggage', { durable: true }),
  );

  const mockInstallation1 = Far('mockInstallation', {});
  const mockInstance1 = Far('mockInstance', {});
  const mockInstanceAdmin1 = Far('mockInstanceAdmin', {
    getInstallationForInstance: () => mockInstallation1,
    getBrands: () => 'brands',
    getPublicFacet: () => 'publicFacet',
    getIssuers: () => 'issuers',
    getTerms: () => 'terms',
    getOfferFilter: () => 'filter',
  });

  ias.updater.initInstanceAdmin(mockInstance1, mockInstanceAdmin1);
  t.is(
    await ias.accessor.getInstallationForInstance(mockInstance1),
    mockInstallation1,
  );

  const mockInstanceAdmin2 = Far('mockInstanceAdmin', {});
  await t.throwsAsync(
    () => ias.updater.initInstanceAdmin(mockInstance1, mockInstanceAdmin2),
    { message: /"\[Alleged: mockInstance\]" already registered/ },
  );
});
