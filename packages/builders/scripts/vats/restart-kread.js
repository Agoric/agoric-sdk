import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').ProposalBuilder} */
export const defaultProposalBuilder = async () => {
    return harden({
        sourceSpec: '@agoric/packages/vats/src/proposals/restart-kread-proposal.js',
        getManifestCall: ['getManifestForRestart', harden({ skip })],
    });
};

export default async (homeP, endowments) => {
    const { writeCoreProposal } = await makeHelpers(homeP, endowments);
    await writeCoreProposal('restart-kread', defaultProposalBuilder);
};
