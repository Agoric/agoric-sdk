// @ts-nocheck

import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import path from 'path';

import { makeIssuerKit, AssetKind } from '@agoric/ertp';
import bundleSource from '@endo/bundle-source';
import { Far } from '@endo/marshal';
import { makeScalarBigMapStore } from '@agoric/vat-data';

import { makeInstanceRecordStorage } from '../../src/instanceRecordStorage.js';
import { makeIssuerRecord } from '../../src/issuerRecord.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const root = `${dirname}/bounty.js`;

const setupIssuersForTest = () => {
  const stableKit = makeIssuerKit(
    'stable',
    AssetKind.NAT,
    harden({ decimalPlaces: 18 }),
  );

  const ticketKit = makeIssuerKit('tickets', AssetKind.SET);

  return { stableKit, ticketKit };
};

test('makeInstanceRecordStorage', async t => {
  const { stableKit, ticketKit } = setupIssuersForTest();
  const bundle = await bundleSource(root);
  const fakeInstallation = Far('fakeInstallation', { getBundle: () => bundle });
  const fakeInstance = /** @type {Instance} */ (
    Far('fakeInstance', { a: () => 0 })
  );
  const issuers = harden({
    Stable: stableKit.issuer,
    Ticket: ticketKit.issuer,
  });
  const brands = harden({
    Stable: stableKit.brand,
    Ticket: ticketKit.brand,
  });
  const makeInstanceRecord = makeInstanceRecordStorage(
    makeScalarBigMapStore('instanceBaggage', {
      durable: true,
    }),
  );
  const instanceRecord = makeInstanceRecord(
    harden({
      installation: fakeInstallation,
      instance: fakeInstance,
      terms: { time: 2n, issuers, brands },
    }),
  );

  t.deepEqual(instanceRecord.getInstanceRecord(), {
    installation: fakeInstallation,
    instance: fakeInstance,
    terms: { time: 2n, issuers, brands },
  });

  t.deepEqual(instanceRecord.getTerms(), { time: 2n, issuers, brands });
  t.deepEqual(instanceRecord.getIssuers(), issuers);
  t.deepEqual(instanceRecord.getBrands(), brands);

  t.throws(() => instanceRecord.assertUniqueKeyword('Stable'), {
    message: 'keyword "Stable" must be unique',
  });
  t.notThrows(() => instanceRecord.assertUniqueKeyword('Something'));

  // Add stable again, but call it "money"
  instanceRecord.addIssuer(
    'Money',
    makeIssuerRecord(
      stableKit.brand,
      stableKit.issuer,
      harden({
        assetKind: AssetKind.NAT,
        decimalPlaces: 18,
      }),
    ),
  );

  t.deepEqual(instanceRecord.getIssuers(), {
    ...issuers,
    Money: stableKit.issuer,
  });
});
