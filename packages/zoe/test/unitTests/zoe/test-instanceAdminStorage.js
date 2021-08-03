// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import { Far } from '@agoric/marshal';

import { makeInstanceAdminStorage } from '../../../src/zoeService/instanceAdminStorage.js';

test('makeInstanceAdminStorage', async t => {
  const {
    getPublicFacet,
    getBrands,
    getIssuers,
    getTerms,
    getInstanceAdmin,
    initInstanceAdmin,
    deleteInstanceAdmin,
  } = makeInstanceAdminStorage();

  const mockInstance1 = Far('mockInstance1', {});
  const mockInstance2 = Far('mockInstance2', {});
  const mockInstanceAdmin1 = Far('mockInstanceAdmin1', {
    getPublicFacet: () => 'publicFacet1',
    getBrands: () => 'brands1',
    getIssuers: () => 'issuers1',
    getTerms: () => 'terms1',
  });
  const mockInstanceAdmin2 = Far('mockInstanceAdmin2', {
    getPublicFacet: () => 'publicFacet2',
    getBrands: () => 'brands2',
    getIssuers: () => 'issuers2',
    getTerms: () => 'terms2',
  });

  // @ts-ignore instance is mocked
  initInstanceAdmin(mockInstance1, mockInstanceAdmin1);

  // @ts-ignore instance is mocked
  initInstanceAdmin(mockInstance2, mockInstanceAdmin2);

  // @ts-ignore instance is mocked
  t.is(getInstanceAdmin(mockInstance1), mockInstanceAdmin1);

  // @ts-ignore instance is mocked
  t.is(getPublicFacet(mockInstance1), 'publicFacet1');

  // @ts-ignore instance is mocked
  t.is(getBrands(mockInstance2), 'brands2');

  // @ts-ignore instance is mocked
  t.is(getIssuers(mockInstance1), 'issuers1');

  // @ts-ignore instance is mocked
  t.is(getTerms(mockInstance1), 'terms1');

  // @ts-ignore instance is mocked
  deleteInstanceAdmin(mockInstance2);

  // @ts-ignore instance is mocked
  t.throws(() => getInstanceAdmin(mockInstance2), {
    message: '"instance" not found: "[Alleged: mockInstance2]"',
  });

  // @ts-ignore instance is mocked
  t.throws(() => getPublicFacet(mockInstance2), {
    message: '"instance" not found: "[Alleged: mockInstance2]"',
  });
});

test('add another instance admin for same instance', async t => {
  const { initInstanceAdmin } = makeInstanceAdminStorage();

  const mockInstance1 = Far('mockInstance1', {});
  const mockInstanceAdmin1 = Far('mockInstanceAdmin1', {});
  const mockInstanceAdmin2 = Far('mockInstanceAdmin2', {});

  // @ts-ignore instance is mocked
  initInstanceAdmin(mockInstance1, mockInstanceAdmin1);

  // @ts-ignore instance is mocked
  t.throws(() => initInstanceAdmin(mockInstance1, mockInstanceAdmin2), {
    message: '"instance" already registered: "[Alleged: mockInstance1]"',
  });
});
