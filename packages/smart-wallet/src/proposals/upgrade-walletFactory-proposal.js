// @ts-check
import { E } from '@endo/far';
import { makeMarshal } from '@endo/marshal';
import { allValues } from '@agoric/internal';

console.warn('upgrade-walletFactory-proposal.js module evaluating');

const { Fail } = assert;

// vstorage paths under published.*
const BOARD_AUX = 'boardAux';

const marshalData = makeMarshal(_val => Fail`data only`);

/**
 * @param { BootstrapPowers } powers
 *
 * @param {object} config
 * @param {{ walletFactoryRef: VatSourceRef & { bundleID: string } }} config.options
 */
export const upgradeWalletFactory = async (
  {
    consume: { contractKits: kitsP, instancePrivateArgs: argsP },
    instance: {
      consume: { walletFactory: wfInstanceP },
    },
  },
  config,
) => {
  console.log('upgradeWalletFactory: config', config);
  const { walletFactoryRef } = config.options;

  console.log('upgradeWalletFactory: awaiting instance');
  const wfInstance = await wfInstanceP;
  console.log('upgradeWalletFactory: awaiting contract kits');
  const { contractKits, instancePrivateArgs } = await allValues({
    contractKits: kitsP,
    instancePrivateArgs: argsP,
  });
  const { adminFacet } = contractKits.get(wfInstance);
  /** @type {Parameters<typeof import('../walletFactory').prepare>[1]} */
  // @ts-expect-error cast
  const unsettledArgs = instancePrivateArgs.get(wfInstance);
  const privateArgs = await allValues(unsettledArgs);
  console.log('upgradeWalletFactory: upgrading with privateArgs', privateArgs);
  await E(adminFacet).upgradeContract(walletFactoryRef.bundleID, privateArgs);
  console.log('upgradeWalletFactory: done');
};
harden(upgradeWalletFactory);

/**
 * @param { BootstrapPowers } powers
 */
export const publishAgoricBrandsDisplayInfo = async ({
  consume: { agoricNames, board, chainStorage },
}) => {
  // chainStorage type includes undefined, which doesn't apply here.
  // @ts-expect-error UNTIL https://github.com/Agoric/agoric-sdk/issues/8247
  const boardAux = E(chainStorage).makeChildNode(BOARD_AUX);
  const publishBrandInfo = async brand => {
    const [id, displayInfo, allegedName] = await Promise.all([
      E(board).getId(brand),
      E(brand).getDisplayInfo(),
      E(brand).getAllegedName(),
    ]);
    const node = E(boardAux).makeChildNode(id);
    const aux = marshalData.toCapData(harden({ allegedName, displayInfo }));
    await E(node).setValue(JSON.stringify(aux));
  };

  /** @type {ERef<NameHub>} */
  const brandHub = E(agoricNames).lookup('brand');
  const brands = await E(brandHub).values();
  // tolerate failure; in particular, for the timer brand
  await Promise.allSettled(brands.map(publishBrandInfo));
};
harden(publishAgoricBrandsDisplayInfo);

/** @type { import("@agoric/vats/src/core/lib-boot").BootstrapManifest } */
const manifest = {
  [upgradeWalletFactory.name]: {
    // include rationale for closely-held, high authority capabilities
    consume: {
      contractKits: `to upgrade walletFactory using its adminFacet`,
      instancePrivateArgs: `to get privateArgs for walletFactory`,
    },
    // widely-shared, low authority instance handles need no rationale
    instance: {
      consume: { walletFactory: true, provisionPool: true },
    },
  },
  [publishAgoricBrandsDisplayInfo.name]: {
    consume: { agoricNames: true, board: true, chainStorage: true },
  },
};
harden(manifest);

export const getManifestForUpgrade = (_powers, { walletFactoryRef }) => {
  return harden({
    manifest,
    options: { walletFactoryRef },
  });
};
