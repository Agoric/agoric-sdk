import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { AssetKind } from '@agoric/ertp';
/* eslint-disable import/extensions, import/no-unresolved */
import refillMeterBundle from './bundle-refillMeterContract.js';
/* eslint-enable import/extensions, import/no-unresolved */

export function buildRootObject(vatPowers) {
  const log = vatPowers.testLog;
  return Far('root', {
    async bootstrap(vats, devices) {
      const vatAdminSvc = await E(vats.vatAdmin).createVatAdminService(
        devices.vatAdmin,
      );

      const feeIssuerConfig = {
        name: 'RUN',
        assetKind: AssetKind.NAT,
        displayInfo: { decimalPlaces: 6, assetKind: AssetKind.NAT },
        initialFunds: 5_275_000n,
      };
      const zoeFeesConfig = {
        getPublicFacetFee: 0n,
        installFee: 65_000n,
        startInstanceFee: 5_000_000n,
        offerFee: 0n,
      };
      const meteringConfig = {
        incrementBy: 70_000n,
        initial: 4_396_000n, // startInstance seems to take around this much
        threshold: 70_000,
        price: {
          feeNumerator: 1n,
          computronDenominator: 1n, // default is just one-to-one
        },
      };

      const { zoe, feePurse } = await E(vats.zoe).buildZoe(
        vatAdminSvc,
        feeIssuerConfig,
        zoeFeesConfig,
        meteringConfig,
      );

      const preInstallationAmount = await E(feePurse).getCurrentAmount();
      let expected = feeIssuerConfig.initialFunds;
      log(
        'pre-installation ',
        preInstallationAmount.value,
        '. Equals expected: ',
        preInstallationAmount.value === expected,
      );

      const installation = await E(zoe).install(refillMeterBundle.bundle);

      const postInstallationAmount = await E(feePurse).getCurrentAmount();
      expected -= zoeFeesConfig.installFee;

      log(
        'post-installation ',
        postInstallationAmount.value,
        '. Equals expected: ',
        postInstallationAmount.value === expected,
      );

      const { publicFacet } = await E(zoe).startInstance(installation);

      const postStartInstanceAmount = await E(feePurse).getCurrentAmount();
      expected -= zoeFeesConfig.startInstanceFee;

      // Meter was refilled
      // Meter down to 48873. Refilling to 118873
      expected -= meteringConfig.incrementBy;

      log(
        'post-startInstance ',
        postStartInstanceAmount.value,
        '. Equals expected: ',
        postStartInstanceAmount.value === expected,
      );

      log('if the above is true, meter was refilled once');

      // 1
      await E(publicFacet).smallComputation();

      const postSmallComputation1 = await E(feePurse).getCurrentAmount();

      log(
        'post-smallComputation1 ',
        postSmallComputation1.value,
        '. Equals expected: ',
        postSmallComputation1.value === expected,
      );

      // Note meter does not refill here
      log('meter does not refill here');

      // 2
      await E(publicFacet).smallComputation();

      const postSmallComputation2 = await E(feePurse).getCurrentAmount();
      expected -= meteringConfig.incrementBy;

      log(
        'post-smallComputation2 ',
        postSmallComputation2.value,
        '. Equals expected: ',
        postSmallComputation2.value === expected,
      );

      // 3
      await E(publicFacet).smallComputation();

      const postSmallComputation3 = await E(feePurse).getCurrentAmount();
      expected -= meteringConfig.incrementBy;

      log(
        'post-smallComputation3 ',
        postSmallComputation3.value,
        '. Equals expected: ',
        postSmallComputation3.value === expected,
      );

      // 4 + 5
      // Note: a fifth time should kill the vat due to lack of funds
      // in the fee purse
      await E(publicFacet).smallComputation();
      await E(publicFacet)
        .smallComputation()
        .catch(e => {
          log(`error: ${e}`);
        });
    },
  });
}
