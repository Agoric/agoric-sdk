import { E } from '@endo/far';
import { deeplyFulfilled } from '@endo/marshal';
import { makeTracer } from '@agoric/internal';

const tracer = makeTracer('UpgradeAssetReserve');

/**
 * @param {BootstrapPowers & {
 *   consume: {
 *     economicCommitteeCreatorFacet: any;
 *     reserveKit: any;
 *   };
 * }} powers
 * @param {object} options
 * @param {{ assetReserveRef: VatSourceRef }} options.options
 */
export const upgradeAssetReserve = async (
  {
    consume: {
      economicCommitteeCreatorFacet: electorateCreatorFacet,
      reserveKit: reserveKitP,
      instancePrivateArgs: instancePrivateArgsP,
    },
  },
  options,
) => {
  const { assetReserveRef } = options.options;

  assert(assetReserveRef.bundleID);
  tracer(`ASSET RESERBE BUNDLE ID: `, assetReserveRef);

  const [reserveKit, instancePrivateArgs] = await Promise.all([
    reserveKitP,
    instancePrivateArgsP,
  ]);
  const { governorCreatorFacet, instance } = reserveKit;

  const [originalPrivateArgs, poserInvitation] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore Local tsc sees this as an error but typedoc does not
    deeplyFulfilled(instancePrivateArgs.get(instance)),
    E(electorateCreatorFacet).getPoserInvitation(),
  ]);

  const newPrivateArgs = harden({
    ...originalPrivateArgs,
    initialPoserInvitation: poserInvitation,
  });

  const adminFacet = await E(governorCreatorFacet).getAdminFacet();

  const upgradeResult = await E(adminFacet).upgradeContract(
    assetReserveRef.bundleID,
    newPrivateArgs,
  );

  tracer('AssetReserve upgraded: ', upgradeResult);
  tracer('Done.');
};

export const getManifestForUpgradingAssetReserve = (
  _powers,
  { assetReserveRef },
) => ({
  manifest: {
    [upgradeAssetReserve.name]: {
      consume: {
        economicCommitteeCreatorFacet: true,
        instancePrivateArgs: true,
        reserveKit: true,
      },
      produce: {},
    },
  },
  options: { assetReserveRef },
});
