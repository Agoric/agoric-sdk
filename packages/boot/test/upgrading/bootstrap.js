import { E, Far } from '@endo/far';
import { makePromiseKit } from '@endo/promise-kit';
import { feeIssuerConfig } from '@agoric/vats/src/core/utils.js';

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
      const zoeKit = await E(vats.zoe).buildZoe(
        vatAdmin,
        feeIssuerConfig,
        zcfBundleName,
      );

      const { zoeService: zoe } = zoeKit;
      const bundleId = await E(vatAdmin).getBundleIDByName(bundles.mintHolder);
      assert(bundleId, 'bundleId must not be empty');
      const installation = await E(zoe).installBundleID(bundleId);

      bootKit.resolve({ installation, vatAdmin, zoe, bundleId });
    },

    startV1: async () => {
      const { zoe, installation } = await bootKit.promise;
      const facets = await E(zoe).startInstance(installation, {}, terms);

      const { publicFacet: issuer } = facets;
      const brand = await E(issuer).getBrand();
      v1Kit.resolve({ facets, brand });
      return true;
    },

    // null upgrade
    upgradeV1: async () => {
      const [{ bundleId }, { facets, brand: expectedBrand }] =
        await Promise.all([bootKit.promise, v1Kit.promise]);

      const upgradeResult = await E(facets.adminFacet).upgradeContract(
        bundleId,
      );
      assert.equal(upgradeResult.incarnationNumber, 1);

      const { publicFacet: issuer } = facets;
      const actualBrand = await E(issuer).getBrand();
      assert.equal(expectedBrand, actualBrand);

      return true;
    },
  });
};

harden(buildRootObject);
