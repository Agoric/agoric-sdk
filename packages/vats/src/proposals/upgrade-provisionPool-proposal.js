import { E } from '@endo/far';
import { deeplyFulfilled } from '@endo/marshal';
import { makeTracer } from '@agoric/internal';

const tracer = makeTracer('UpgradeProvisionPool');

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
  tracer(`PROVISION POOL BUNDLE ID: `, provisionPoolRef);

  const [
    provisionPoolStartResult,
    instancePrivateArgs,
    namesByAddressAdmin,
    walletFactoryStartResult,
    provisionWalletBridgeManager,
  ] = await Promise.all([
    provisionPoolStartResultP,
    instancePrivateArgsP,
    namesByAddressAdminP,
    walletFactoryStartResultP,
    provisionWalletBridgeManagerP,
  ]);
  const {
    adminFacet,
    instance,
    creatorFacet: ppCreatorFacet,
  } = provisionPoolStartResult;
  const { creatorFacet: wfCreatorFacet } = walletFactoryStartResult;

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

  const upgradeResult = await E(adminFacet).upgradeContract(
    provisionPoolRef.bundleID,
    newPrivateArgs,
  );

  tracer('ProvisionPool upgraded: ', upgradeResult);

  const references = {
    bankManager,
    namesByAddressAdmin,
    walletFactory: wfCreatorFacet,
  };

  tracer('Calling setReferences with: ', references);
  await E(ppCreatorFacet).setReferences(references);

  tracer('Creating bridgeHandler...');
  const bridgeHandler = await E(ppCreatorFacet).makeHandler();

  tracer('Setting new bridgeHandler...');
  // @ts-expect-error casting
  await E(provisionWalletBridgeManager).setHandler(bridgeHandler);

  tracer('Done.');
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
        bankManager: true,
        namesByAddressAdmin: true,
        walletFactoryStartResult: true,
        provisionWalletBridgeManager: true,
      },
      produce: {},
    },
  },
  options: { provisionPoolRef },
});
