// @ts-nocheck

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import path from 'path';

import { makeIssuerKit, AssetKind } from '@agoric/ertp';
import bundleSource from '@endo/bundle-source';

import {
  makeAndStoreInstanceRecord,
  makeInstanceRecordStorage,
} from '../../src/instanceRecordStorage.js';
import { makeIssuerRecord } from '../../src/issuerRecord.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const root = `${dirname}/bounty.js`;

const setupIssuersForTest = () => {
  const currencyKit = makeIssuerKit(
    'currency',
    AssetKind.NAT,
    harden({ decimalPlaces: 18 }),
  );

  const ticketKit = makeIssuerKit('tickets', AssetKind.SET);

  return { currencyKit, ticketKit };
};

test('makeAndStoreInstanceRecord', async t => {
  const { currencyKit, ticketKit } = setupIssuersForTest();
  const bundle = await bundleSource(root);
  const fakeInstallation = { getBundle: () => bundle };
  const fakeInstance = /** @type {Instance} */ ({});
  const customTerms = harden({ time: 2n });
  const issuers = harden({
    Currency: currencyKit.issuer,
    Ticket: ticketKit.issuer,
  });
  const brands = harden({
    Currency: currencyKit.brand,
    Ticket: ticketKit.brand,
  });
  const {
    addIssuerToInstanceRecord,
    getInstanceRecord,
    getTerms,
    getInstallationForInstance,
    getIssuers,
    getBrands,
    assertUniqueKeyword,
  } = makeAndStoreInstanceRecord(
    fakeInstallation,
    fakeInstance,
    customTerms,
    issuers,
    brands,
  );

  t.deepEqual(getInstanceRecord(), {
    installation: fakeInstallation,
    instance: fakeInstance,
    terms: { time: 2n, issuers, brands },
  });

  t.deepEqual(getTerms(), { time: 2n, issuers, brands });
  t.deepEqual(getIssuers(), issuers);
  t.deepEqual(getBrands(), brands);
  t.is(getInstallationForInstance(), fakeInstallation);

  t.throws(() => assertUniqueKeyword('Currency'), {
    message: 'keyword "Currency" must be unique',
  });
  t.notThrows(() => assertUniqueKeyword('Something'));

  // Add currency again, but call it "money"
  addIssuerToInstanceRecord(
    'Money',
    makeIssuerRecord(
      currencyKit.brand,
      currencyKit.issuer,
      harden({
        assetKind: AssetKind.NAT,
        decimalPlaces: 18,
      }),
    ),
  );

  t.deepEqual(getIssuers(), { ...issuers, Money: currencyKit.issuer });
});

test('makeInstanceRecordStorage', async t => {
  const { currencyKit, ticketKit } = setupIssuersForTest();
  const bundle = await bundleSource(root);
  const fakeInstallation = { getBundle: () => bundle };
  const fakeInstance = /** @type {Instance} */ ({});
  const issuers = harden({
    Currency: currencyKit.issuer,
    Ticket: ticketKit.issuer,
  });
  const brands = harden({
    Currency: currencyKit.brand,
    Ticket: ticketKit.brand,
  });
  const {
    addIssuerToInstanceRecord,
    getInstanceRecord,
    getTerms,
    getIssuers,
    getBrands,
    assertUniqueKeyword,
    instantiate,
  } = makeInstanceRecordStorage();
  instantiate({
    installation: fakeInstallation,
    instance: fakeInstance,
    terms: { time: 2n, issuers, brands },
  });

  t.deepEqual(getInstanceRecord(), {
    installation: fakeInstallation,
    instance: fakeInstance,
    terms: { time: 2n, issuers, brands },
  });

  t.deepEqual(getTerms(), { time: 2n, issuers, brands });
  t.deepEqual(getIssuers(), issuers);
  t.deepEqual(getBrands(), brands);

  t.throws(() => assertUniqueKeyword('Currency'), {
    message: 'keyword "Currency" must be unique',
  });
  t.notThrows(() => assertUniqueKeyword('Something'));

  // Add currency again, but call it "money"
  addIssuerToInstanceRecord(
    'Money',
    makeIssuerRecord(
      currencyKit.brand,
      currencyKit.issuer,
      harden({
        assetKind: AssetKind.NAT,
        decimalPlaces: 18,
      }),
    ),
  );

  t.deepEqual(getIssuers(), { ...issuers, Money: currencyKit.issuer });
});
