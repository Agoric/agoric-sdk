import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').ProposalBuilder} */
export const defaultProposalBuilder = async (
  { publishRef, install },
  options = {},
) => {
  const {
    hostConnectionId = 'connection-1',
    controllerConnectionId = 'connection-1',
    bondDenom = 'uatom',
    bondDenomLocal = 'ibc/C4CFF46FD6DE35CA4CF4CE031E643C8FDC9BA4B99AE598E9B0ED98FE3A2319F9',
    transferChannel = {
      counterpartyChannelId: 'channel-1',
      counterpartyPortId: 'transfer',
      sourceChannelId: 'channel-1',
      sourcePortId: 'transfer',
    },
    icqEnabled = true,
  } = options;
  return harden({
    sourceSpec: '@agoric/orchestration/src/proposals/start-stakeAtom.js',
    getManifestCall: [
      'getManifestForStakeAtom',
      {
        installKeys: {
          stakeAtom: publishRef(
            install('@agoric/orchestration/src/examples/stakeAtom.contract.js'),
          ),
        },
        hostConnectionId,
        controllerConnectionId,
        bondDenom,
        bondDenomLocal,
        transferChannel,
        icqEnabled,
      },
    ],
  });
};

export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);
  await writeCoreProposal('start-stakeAtom', defaultProposalBuilder);
};
