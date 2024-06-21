// import '@endo/init';
import { makeHelpers } from '@agoric/deploy-script-support';
// import { agd } from '@agoric/synthetic-chain';
import { getFundStarsManifest } from "./fund-STARS.js";

export const fundStarsProposalBuilder = async () => {
  const fundAccounts = ["agoric1p2aqakv3ulz4qfy2nut86j9gx0dx0yw09h96md"];

  return harden({
    sourceSpec: './fund-STARS.js',
    getManifestCall: [
      getFundStarsManifest.name,
      {
        fundAccounts,
      },
    ],
  });
};

export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);
  console.log('writeCoreProposal')
  await writeCoreProposal('fund-stars-prop', fundStarsProposalBuilder);
};