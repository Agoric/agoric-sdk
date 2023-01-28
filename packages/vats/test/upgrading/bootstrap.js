import { E, Far } from '@endo/far';
import { makePromiseKit } from '@endo/promise-kit';
import { feeIssuerConfig } from '../../src/core/utils.js';

const bundles = {
  mintHolder: 'mintHolder',
};

const terms = { keyword: 'A' /* , assetKind, displayInfo */ };

export const buildRootObject = () => {
  const zcfBundleName = 'zcf';
  const bootKit = makePromiseKit();
  const v1Kit = makePromiseKit();

  return Far('B', {
    bootstrap: async (vats, devices) => {
      const vatAdmin = await E(vats.vatAdmin).createVatAdminService(
        devices.vatAdmin,
      );
      const [zoeKit, ertpService] = await Promise.all([
        E(vats.zoe).buildZoe(vatAdmin, feeIssuerConfig, zcfBundleName),
        E(vats.ertp).getErtpService(),
      ]);

      const { zoeService: zoe } = zoeKit;
      const bundleId = await E(vatAdmin).getBundleIDByName(bundles.mintHolder);
      assert(bundleId, 'bundleId must not be empty');
      const installation = await E(zoe).installBundleID(bundleId);

      bootKit.resolve({ ertpService, installation, vatAdmin, zoe });
    },

    buildV1: async () => {
      console.log(`BOOT starting buildV1`);

      const { zoe, installation } = await bootKit.promise;
      // Complete round-trip without upgrade
      const facets = await E(zoe).startInstance(installation, {}, terms);

      const { publicFacet: issuer } = facets;
      const brand = await E(issuer).getBrand();
      v1Kit.resolve({ facets, brand });
      return true;
    },

    // null upgrade
    upgradeV1: async () => {
      const [{ zoe, vatAdmin }, { facets, brand: expectedBrand }] =
        await Promise.all([bootKit.promise, v1Kit.promise]);
      const bundleId = await E(vatAdmin).getBundleIDByName(bundles.mintHolder);

      const upgradeResult = await E(facets.adminFacet).upgradeContract(
        bundleId,
      );
      // move to test assertion?
      assert.equal(upgradeResult.incarnationNumber, 2);
      console.log('Boot starting upgrade V2');

      console.log('Boot starting post-upgrade contract');
      const installation = await E(zoe).installBundleID(bundleId);
      const facets3 = await E(zoe).startInstance(installation, {}, terms);

      const { publicFacet: issuer } = facets3;
      const actualBrand = await E(issuer).getBrand();
      assert.equal(expectedBrand, actualBrand);

      console.log('Boot finished test');
      return true;
    },
  });
};

harden(buildRootObject);
