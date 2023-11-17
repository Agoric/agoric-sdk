import '@agoric/zoe/exported.js';
import '@agoric/zoe/src/contractFacet/types-ambient.js';
import { AssetKind } from '@agoric/ertp';
import { provideAll } from '@agoric/zoe/src/contractSupport/durability.js';
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
  const { storageNode, marshaller } = privateArgs;

  const { contributionTokenMint } = await provideAll(baggage, {
    contributionTokenMint: () =>
      zcf.makeZCFMint('CrowdfundContributionToken', AssetKind.COPY_SET),
  });
  const makeCrowdfundingKit = await prepareCrowdfundingKit(baggage, zcf, {
    contributionTokenMint,
    feeBrand,
    storageNode,
    marshaller,
  });
  const { public: publicFacet } = makeCrowdfundingKit();
  return { publicFacet };
};
