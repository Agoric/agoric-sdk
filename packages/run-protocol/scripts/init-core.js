/* global process */
import { makeHelpers } from '@agoric/deploy-script-support';

export const makeCoreProposalBuilder =
  ({ ROLE = 'chain' } = {}) =>
  async ({ publishRef, install }) =>
    harden({
      sourceSpec: '../src/core-proposal.js',
      getManifestCall: [
        'getManifestForRunProtocol',
        {
          ROLE,
          installKeys: {
            runStake: publishRef(
              install(
                '../src/runStake/runStake.js',
                '../bundles/bundle-runStake.js',
              ),
            ),
            amm: publishRef(
              install(
                '../src/vpool-xyk-amm/multipoolMarketMaker.js',
                '../bundles/bundle-amm.js',
              ),
            ),
            vaultFactory: publishRef(
              install(
                '../src/vaultFactory/vaultFactory.js',
                '../bundles/bundle-vaultFactory.js',
              ),
            ),
            liquidate: publishRef(
              install(
                '../src/vaultFactory/liquidateMinimum.js',
                '../bundles/bundle-liquidateMinimum.js',
              ),
            ),
            reserve: publishRef(
              install(
                '../src/reserve/assetReserve.js',
                '../bundles/bundle-reserve.js',
              ),
            ),
            psm: publishRef(
              install('../src/psm/psm.js', '../bundles/bundle-psm.js'),
            ),
            contractGovernor: publishRef(
              install(
                '@agoric/governance/src/contractGovernor.js',
                '../bundles/bundle-contractGovernor.js',
              ),
            ),
            committee: publishRef(
              install(
                '@agoric/governance/src/committee.js',
                '../bundles/bundle-committee.js',
              ),
            ),
            binaryVoteCounter: publishRef(
              install(
                '@agoric/governance/src/binaryVoteCounter.js',
                '../bundles/bundle-binaryVoteCounter.js',
              ),
            ),
          },
        },
      ],
    });

export const initBehaviors = async (homeP, endowments) => {
  const { ROLE = 'chain' } = process.env;

  const { writeCoreProposal } = await makeHelpers(homeP, endowments);

  const proposalBuilder = makeCoreProposalBuilder({ ROLE });
  await writeCoreProposal('gov-run-protocol', proposalBuilder); // gov-price-feed.js gov-price-feed-permit.json
};

export default initBehaviors;
