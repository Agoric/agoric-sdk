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
 *   produce: {
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
    produce: { reserveKit: reserveKitWriter },
  },
  options,
) => {
  const { assetReserveRef } = options.options;

  assert(assetReserveRef.bundleID);
  tracer(`ASSET RESERVE BUNDLE ID: `, assetReserveRef);

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

  // We need to reset the kit and produce a new adminFacet because the
  // original contract is producing an admin facet that is for the
  // governor, not the reserve.
  reserveKitWriter.reset();
  reserveKitWriter.resolve(
    harden({
      ...reserveKit,
      adminFacet,
    }),
  );

  const upgradeResult = await E(adminFacet).upgradeContract(
    assetReserveRef.bundleID,
    newPrivateArgs,
  );

  tracer('AssetReserve upgraded: ', upgradeResult);
  tracer('Done.');
};

export const getManifestForUpgradingAssetReserve = (
  { restoreRef },
  { assetReserveRef },
) => ({
  manifest: {
    [upgradeAssetReserve.name]: {
      consume: {
        economicCommitteeCreatorFacet: true,
        instancePrivateArgs: true,
        reserveKit: true,
      },
      produce: {
        reserveKit: true,
      },
    },
  },
  installations: { reserve: restoreRef(assetReserveRef) },
  options: { assetReserveRef },
});
