import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').ProposalBuilder} */
export const defaultProposalBuilder = async (
  { publishRef, install },
  options = {},
) => {
  const {
    hostConnectionId = 'connection-1',
    controllerConnectionId = 'connection-0',
  } = options;
  return harden({
    sourceSpec: '@agoric/orchestration/src/proposals/start-stakeAtom.js',
    getManifestCall: [
      'getManifestForStakeAtom',
      {
        installKeys: {
          stakeAtom: publishRef(
            install(
              '@agoric/orchestration/src/contracts/stakeAtom.contract.js',
            ),
          ),
        },
        hostConnectionId,
        controllerConnectionId,
      },
    ],
  });
};

export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);
  await writeCoreProposal('start-stakeAtom', defaultProposalBuilder);
};
