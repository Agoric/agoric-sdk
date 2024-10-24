/// <reference types="ses" />
import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {Record<string, import('@agoric/orchestration/src/chain-info.js').ChainInfo>} */
const chainInfo = {
  hot: {
    allegedName: 'Hot New Chain',
    chainId: 'hot-1',
    connections: {
      'cosmoshub-4': {
        id: 'connection-99',
        clientId: '07-tendermint-3',
        counterpartyClientId: '07-tendermint-2',
        counterpartyConnectionId: 'connection-1',
        state: 3 /* IBCConnectionState.STATE_OPEN */,
        transferChannel: {
          portId: 'transfer',
          channelId: 'channel-1',
          counterpartyChannelId: 'channel-1',
          counterpartyPortId: 'transfer',
          ordering: 1 /* Order.ORDER_UNORDERED */,
          state: 3 /* IBCConnectionState.STATE_OPEN */,
          version: 'ics20-1',
        },
      },
    },
  },
};

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async () =>
  harden({
    sourceSpec: '@agoric/orchestration/src/proposals/revise-chain-info.js',
    getManifestCall: [
      'getManifestForReviseChains',
      {
        chainInfo,
      },
    ],
  });

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('revise-chain-info', defaultProposalBuilder);
};
