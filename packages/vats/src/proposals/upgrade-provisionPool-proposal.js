import { E } from '@endo/far';
import { deeplyFulfilled } from '@endo/marshal';
import { makeTracer } from '@agoric/internal';

const trace = makeTracer('UpgradeProvisionPool');

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
      economicCommitteeCreatorFacet: electorateCreatorFacetP,
      instancePrivateArgs: instancePrivateArgsP,
      provisionPoolStartResult: provisionPoolStartResultP,
      bankManager,
      namesByAddressAdmin: namesByAddressAdminP,
      walletFactoryStartResult: walletFactoryStartResultP,
      provisionWalletBridgeManager: provisionWalletBridgeManagerP,
    },
  },
  options,
) => {
  const { provisionPoolRef } = options.options;

  assert(provisionPoolRef.bundleID);
  trace(`PROVISION POOL BUNDLE ID: `, provisionPoolRef);

  const [
    provisionPoolStartResult,
    instancePrivateArgs,
    namesByAddressAdmin,
    walletFactoryStartResult,
    provisionWalletBridgeManager,
    electorateCreatorFacet,
  ] = await Promise.all([
    provisionPoolStartResultP,
    instancePrivateArgsP,
    namesByAddressAdminP,
    walletFactoryStartResultP,
    provisionWalletBridgeManagerP,
    electorateCreatorFacetP,
  ]);
  const {
    adminFacet,
    instance,
    creatorFacet: ppCreatorFacet,
    publicFacet: ppPublicFacet,
    governorAdminFacet,
  } = provisionPoolStartResult;
  const { creatorFacet: wfCreatorFacet } = walletFactoryStartResult;

  const [originalPrivateArgs, poserInvitation] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore Local tsc sees this as an error but typedoc does not
    deeplyFulfilled(instancePrivateArgs.get(instance)),
    E(electorateCreatorFacet).getPoserInvitation(),
  ]);

  const params = await E(ppPublicFacet).getGovernedParams();
  const governedParamOverrides = harden({
    PerAccountInitialAmount: params.PerAccountInitialAmount.value,
  });
  trace('governedParamOverrides: ', { governedParamOverrides });

  const newPrivateArgs = harden({
    ...originalPrivateArgs,
    initialPoserInvitation: poserInvitation,
    governedParamOverrides,
  });

  const upgradeResult = await E(adminFacet).upgradeContract(
    provisionPoolRef.bundleID,
    newPrivateArgs,
  );

  trace('ProvisionPool upgraded: ', upgradeResult);

  const references = {
    bankManager,
    namesByAddressAdmin,
    walletFactory: wfCreatorFacet,
  };

  trace('Calling setReferences with: ', references);
  await E(ppCreatorFacet).setReferences(references);

  trace('Creating bridgeHandler...');
  const bridgeHandler = await E(ppCreatorFacet).makeHandler();

  trace('Setting new bridgeHandler...');
  // @ts-expect-error casting
  await E(provisionWalletBridgeManager).setHandler(bridgeHandler);

  trace('Null upgrading governor...', {
    economicCommitteeCreatorFacet: electorateCreatorFacet,
    governed: newPrivateArgs,
  });
  await E(governorAdminFacet).restartContract({
    economicCommitteeCreatorFacet: electorateCreatorFacet,
    governed: newPrivateArgs,
  });

  trace('Done.');
};

export const getManifestForUpgradingProvisionPool = (
  { restoreRef },
  { provisionPoolRef },
) => ({
  manifest: {
    [upgradeProvisionPool.name]: {
      consume: {
        economicCommitteeCreatorFacet: true,
        instancePrivateArgs: true,
        provisionPoolStartResult: true,
        bankManager: true,
        namesByAddressAdmin: true,
        walletFactoryStartResult: true,
        provisionWalletBridgeManager: true,
      },
      produce: {},
    },
  },
  installations: { provisionPool: restoreRef(provisionPoolRef) },
  options: { provisionPoolRef },
});
