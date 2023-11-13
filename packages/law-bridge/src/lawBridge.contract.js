import '@agoric/zoe/exported.js';
import '@agoric/zoe/src/contractFacet/types-ambient.js';
import { provideAll } from '@agoric/zoe/src/contractSupport/index.js';
import { prepareLawBridgeKit } from './lawBridgeKit.js';

/**
 *
 * @param {ZCF} zcf
 * @param {{
 *   feeMintAccess?: FeeMintAccess;
 *   storageNode: StorageNode;
 *   marshaller: Marshaller;
 *   stableBrand: Brand<'nat'>;
}} privateArgs
 * @param {*} baggage
 */
export const start = async (zcf, privateArgs, baggage) => {
  // const { stableMint } = await provideAll(baggage, {
  //   stableMint: () => zcf.registerFeeMint('Binding', privateArgs.feeMintAccess),
  // });
  // const { brand: stableBrand } = stableMint.getIssuerRecord();

  const { stableBrand } = privateArgs;

  const makeLawBridgeKit = await prepareLawBridgeKit(baggage, zcf, {
    stableBrand,
    storageNode: privateArgs.storageNode,
    marshaller: privateArgs.marshaller,
  });
  const lbKit = makeLawBridgeKit();
  return { creatorFacet: lbKit.creator, publicFacet: lbKit.public };
};
