import '@agoric/zoe/exported.js';
import '@agoric/zoe/src/contractFacet/types-ambient.js';
import { prepareCrowdfundingKit } from './crowdfundingKit.js';

/**
 *
 * @param {ZCF<{
 *   feeBrand: Brand<'nat'>;
 * }>} zcf
 * @param {{
 *   storageNode: StorageNode;
 *   marshaller: Marshaller;
}} privateArgs
 * @param {*} baggage
 */
export const start = async (zcf, privateArgs, baggage) => {
  const { feeBrand } = zcf.getTerms();

  const makeCrowdfundingKit = await prepareCrowdfundingKit(baggage, zcf, {
    feeBrand,
    storageNode: privateArgs.storageNode,
    marshaller: privateArgs.marshaller,
  });
  const lbKit = makeCrowdfundingKit();
  return { creatorFacet: lbKit.creator, publicFacet: lbKit.public };
};
