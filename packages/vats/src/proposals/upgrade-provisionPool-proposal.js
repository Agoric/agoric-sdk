import { E } from '@endo/far';
import { deeplyFulfilled } from '@endo/marshal';

/**
 * @param {BootstrapPowers & {
 *   consume: {
 *     economicCommitteeCreatorFacet: any;
 *   };
 * }} powers
 * @param {object} options
 * @param {{ provisionPoolRef: VatSourceRef }} options.options
 */
export const upgradeProvisionPool = async (
  {
    consume: {
      economicCommitteeCreatorFacet: electorateCreatorFacet,
      instancePrivateArgs: instancePrivateArgsP,
      provisionPoolStartResult: provisionPoolStartResultP,
    },
  },
  options,
) => {
  const { provisionPoolRef } = options.options;

  assert(provisionPoolRef.bundleID);
  console.log(`PROVISION POOL BUNDLE ID: `, provisionPoolRef.bundleID);

  const [provisionPoolStartResult, instancePrivateArgs] = await Promise.all([
    provisionPoolStartResultP,
    instancePrivateArgsP,
  ]);
  const { adminFacet, instance } = provisionPoolStartResult;

  const [originalPrivateArgs, poserInvitation] = await Promise.all([
    deeplyFulfilled(instancePrivateArgs.get(instance)),
    E(electorateCreatorFacet).getPoserInvitation(),
  ]);

  const newPrivateArgs = harden({
    ...originalPrivateArgs,
    initialPoserInvitation: poserInvitation,
  });

  const upgradeResult = await E(adminFacet).upgradeContract(
    provisionPoolRef.bundleID,
    newPrivateArgs,
  );

  console.log('ProvisionPool upgraded: ', upgradeResult);
};

export const getManifestForUpgradingProvisionPool = (
  _powers,
  { provisionPoolRef },
) => ({
  manifest: {
    [upgradeProvisionPool.name]: {
      consume: {
        economicCommitteeCreatorFacet: true,
        instancePrivateArgs: true,
        provisionPoolStartResult: true,
      },
      produce: {},
    },
  },
  options: { provisionPoolRef },
});
