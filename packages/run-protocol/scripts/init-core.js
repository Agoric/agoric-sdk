/* global process */
import { makeHelpers } from '@agoric/deploy-script-support';

export const defaultProposalBuilder = async ({ publishRef, install }) => {
  const { ROLE = 'chain', VAULT_FACTORY_CONTROLLER_ADDR } = process.env;

  return harden({
    sourceSpec: '../src/core-proposal.js',
    getManifestCall: [
      'getManifestForRunProtocol',
      {
        ROLE,
        vaultFactoryControllerAddress: VAULT_FACTORY_CONTROLLER_ADDR,
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
};

export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);
  await writeCoreProposal('gov-run-protocol', defaultProposalBuilder);
};
