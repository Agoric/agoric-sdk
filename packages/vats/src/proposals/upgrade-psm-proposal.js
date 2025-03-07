import { E } from '@endo/far';
import { deeplyFulfilled } from '@endo/marshal';
import { makeTracer } from '@agoric/internal';

const trace = makeTracer('UpgradePSM');

/**
 * @param {BootstrapPowers & {
 *   consume: {
 *     economicCommitteeCreatorFacet: any;
 *     psmKit: any;
 *   };
 * }} powers
 * @param {object} options
 * @param {{
 *   psmRef: VatSourceRef;
 * }} options.options
 */
export const upgradePSMProposal = async (
  {
    consume: {
      psmKit: psmKitP,
      economicCommitteeCreatorFacet: electorateCreatorFacet,
      instancePrivateArgs: instancePrivateArgsP,
    },
  },
  options,
) => {
  const { psmRef } = options.options;

  trace(`PSM BUNDLE ID: `, psmRef);

  const [psmKitMap, instancePrivateArgs] = await Promise.all([
    psmKitP,
    instancePrivateArgsP,
  ]);

  for (const { psm, psmAdminFacet, label } of psmKitMap.values()) {
    const [originalPrivateArgs, poserInvitation] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore Local tsc sees this as an error but typedoc does not
      deeplyFulfilled(instancePrivateArgs.get(psm)),
      E(electorateCreatorFacet).getPoserInvitation(),
    ]);

    const newPrivateArgs = harden({
      ...originalPrivateArgs,
      initialPoserInvitation: poserInvitation,
    });

    const upgradeResult = await E(psmAdminFacet).upgradeContract(
      psmRef.bundleID,
      newPrivateArgs,
    );

    trace(`PSM ${label} upgraded: `, upgradeResult);
  }

  trace('Done.');
};

export const getManifestForUpgradingPSM = ({ restoreRef }, { psmRef }) => ({
  manifest: {
    [upgradePSMProposal.name]: {
      consume: {
        psmKit: true,
        economicCommitteeCreatorFacet: true,
        instancePrivateArgs: true,
      },
      produce: {},
    },
  },
  options: { psmRef },
  installations: { psm: restoreRef(psmRef) },
});
