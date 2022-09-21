// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { Far } from '@endo/marshal';
import { makeScalarBigMapStore } from '@agoric/vat-data';

import { makeInstanceAdminStorage } from '../../../src/zoeService/instanceAdminStorage.js';

test('makeInstanceAdminStorage', async t => {
  const {
    getPublicFacet,
    getBrands,
    getIssuers,
    getTerms,
    getInstallationForInstance,
    getInstanceAdmin,
    initInstanceAdmin,
    deleteInstanceAdmin,
  } = makeInstanceAdminStorage(
    makeScalarBigMapStore('zoe baggage', { durable: true }),
  );

  const mockInstance1 = Far('mockInstance1', {});
  const mockInstance2 = Far('mockInstance2', {});
  const mockInstanceAdmin1 = Far('mockInstanceAdmin1', {
    getPublicFacet: () => 'publicFacet1',
    getBrands: () => 'brands1',
    getIssuers: () => 'issuers1',
    getTerms: () => 'terms1',
    getInstallationForInstance: () => 'installation1',
  });
  const mockInstanceAdmin2 = Far('mockInstanceAdmin2', {
    getPublicFacet: () => 'publicFacet2',
    getBrands: () => 'brands2',
    getIssuers: () => 'issuers2',
    getTerms: () => 'terms2',
    getInstallationForInstance: () => 'installation2',
  });

  initInstanceAdmin(mockInstance1, mockInstanceAdmin1);

  initInstanceAdmin(mockInstance2, mockInstanceAdmin2);

  // @ts-expect-error instance is mocked
  t.is(getInstanceAdmin(mockInstance1), mockInstanceAdmin1);

  // @ts-expect-error instance is mocked
  t.is(await getPublicFacet(mockInstance1), 'publicFacet1');

  // @ts-expect-error instance is mocked
  t.is(await getBrands(mockInstance2), 'brands2');

  // @ts-expect-error instance is mocked
  t.is(await getIssuers(mockInstance1), 'issuers1');

  // @ts-expect-error instance is mocked
  t.is(await getTerms(mockInstance1), 'terms1');

  // @ts-expect-error instance is mocked
  t.is(await getInstallationForInstance(mockInstance1), 'installation1');

  // @ts-expect-error instance is mocked
  deleteInstanceAdmin(mockInstance2);

  // @ts-expect-error instance is mocked
  t.throws(() => getInstanceAdmin(mockInstance2), {
    message: 'no ordinal for "[Alleged: mockInstance2]"',
  });

  // @ts-expect-error instance is mocked
  await t.throwsAsync(() => getPublicFacet(mockInstance2), {
    message: 'no ordinal for "[Alleged: mockInstance2]"',
  });
});

test('add another instance admin for same instance', async t => {
  const { initInstanceAdmin } = makeInstanceAdminStorage(
    makeScalarBigMapStore('zoe baggage', { durable: true }),
  );

  const mockInstance1 = Far('mockInstance1', {});
  const mockInstanceAdmin1 = Far('mockInstanceAdmin1', {});
  const mockInstanceAdmin2 = Far('mockInstanceAdmin2', {});

  initInstanceAdmin(mockInstance1, mockInstanceAdmin1);

  await t.throwsAsync(
    () => initInstanceAdmin(mockInstance1, mockInstanceAdmin2),
    { message: /"\[Alleged: mockInstance1\]" already registered/ },
  );
});
