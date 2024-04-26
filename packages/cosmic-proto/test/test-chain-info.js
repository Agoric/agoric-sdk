// @ts-check
import test from 'ava';

import crypto from 'crypto';
import { createRPCQueryClient as createCosmosRPCQueryClient } from '../dist/codegen/cosmos/rpc.query.js';
import { createRPCQueryClient as createIBCRPCQueryClient } from '../dist/codegen/ibc/rpc.query.js';
import { createRPCQueryClient as createICQRPCQueryClient } from '../dist/codegen/icq/rpc.query.js';
import { QueryConnectionsResponse } from '../dist/codegen/ibc/core/connection/v1/query.js';
import { QueryConnectionChannelsResponse } from '../dist/codegen/ibc/core/channel/v1/query.js';
import { ClientState } from '../dist/codegen/ibc/lightclients/tendermint/v1/tendermint.js';

/**
 * @import { IdentifiedConnection } from '../dist/codegen/ibc/core/connection/v1/connection.js';
 * @import { IdentifiedChannel } from '../dist/codegen/ibc/core/channel/v1/channel.js';
 */

// NOTE: requires chains to be running...
const RPC_ENDPOINTS = {
  agoric: 'http://localhost:26657/',
  cosmos: 'http://localhost:26654/',
  osmosis: 'http://localhost:26655/',
};

const TRANSFER_PORT = 'transfer';

/** @param {string} txt */
const sha256 = txt => crypto.createHash('sha256').update(txt).digest('hex');

/**
 * List of queries used:
 * - /ibc.core.connection.v1.Query/Connections
 * - /ibc.core.client.v1.Query/ClientState
 * - /ibc.core.channel.v1.Query/ConnectionChannels
 * - /cosmos.staking.v1beta1.Query/Params
 * - /ibc.applications.transfer.v1.Query/DenomTraces
 * - /cosmos.bank.v1beta1.Query/TotalSupply
 *
 * if `allow_queries` on a host includes these, this could be run
 * from a smart contract
 */

test('IBC Connections and Channels', async t => {
  const formatted = {};
  for (const [name, endpoint] of Object.entries(RPC_ENDPOINTS)) {
    const { ibc } = await createIBCRPCQueryClient({
      rpcEndpoint: endpoint,
    });

    // Query all connections
    // TODO pagination support
    const connectionsResponse = await ibc.core.connection.v1.connections();
    const connections = /** @type { QueryConnectionsResponse } */ (
      QueryConnectionsResponse.toJSON(connectionsResponse)
    ).connections;

    /**
     * @type {{
     *  connectionInfo: IdentifiedConnection;
     *  clientState: ClientState;
     *  transferChannels: IdentifiedChannel[] | undefined;
     * }[]}
     */
    const connectionsDetails = [];
    for (const connection of connections) {
      // Query client state for each connection
      const clientStateResponse = await ibc.core.client.v1.clientState({
        clientId: connection.clientId,
      });
      if (!clientStateResponse?.clientState?.value)
        throw new Error('No client state');
      const clientState = ClientState.decode(
        clientStateResponse?.clientState?.value,
      );

      // Query channels for each connection
      const channelsResponse = await ibc.core.channel.v1.connectionChannels({
        connection: connection.id,
        // seemingly no way to request by portId + connId :(
      });
      const channels = /** @type { QueryConnectionChannelsResponse } */ (
        QueryConnectionChannelsResponse.toJSON(channelsResponse)
      ).channels;
      // we only care about the transfer port channels
      // TODO should only be one active channel, but technically there could be multiple
      const transferChannels = channels.filter(
        // @ts-expect-error x.state is string, not an enum State.STATE_OPEN
        x => x.portId === TRANSFER_PORT && x.state === 'STATE_OPEN',
      );
      if (!transferChannels.length)
        console.debug(
          `Transfer port channel(s) not found for ${connection.id}.`,
        );
      connectionsDetails.push({
        connectionInfo: connection,
        clientState,
        transferChannels,
      });
    }

    if (name === 'agoric') {
      t.snapshot(
        connectionsDetails[0],
        '`IdentifiedConnection` Full (1 example of many)',
      );
    }

    const minimal = connectionsDetails.map(c => {
      const { connectionInfo, clientState, transferChannels } = c;
      return {
        chainId: clientState.chainId,
        lastUpdated: clientState.latestHeight,
        connectionInfo: {
          clientId: connectionInfo.clientId,
          counterparty: {
            clientId: connectionInfo.counterparty.clientId,
            connectionId: connectionInfo.counterparty.connectionId,
          },
          id: connectionInfo.id,
          state: connectionInfo.state,
        },
        transferChannels: transferChannels?.map(x => ({
          counterpartyChannelId: x.counterparty.channelId,
          counterpartyPortId: x.counterparty.portId,
          ordering: x.ordering,
          sourcePortId: x.portId,
          sourceChannelId: x.channelId,
          version: x.version,
          state: x.state,
        })),
        // other potentially useful info:
        // - client unbondingPeriod + trustingPeriod (seconds: 172800n, seconds: 86400n)
        // dynamic:
        // - `state` of the connection and channel (`STATE_OPEN`)
        // - latestHeight (revisionHeight: 72592n)
      };
    });
    formatted[name] = minimal;
  }
  t.snapshot(formatted, 'IBC Connections and Channels');

  const cosmosChain = formatted.agoric.find(x => x.chainId === 'gaia-test');

  const stakeAtomParams = {
    // ICA + ICQ Channel params
    controllerConnectionId: cosmosChain.connectionInfo.id,
    hostConnectionId: cosmosChain.connectionInfo.counterparty.connectionId,
    // ibc/MsgTransfer params (to cosmos, from agoric)
    sourcePortId: cosmosChain.transferChannels[0].sourcePortId,
    sourceChannelId: cosmosChain.transferChannels[0].sourceChannelId,
    // ibc/MsgTransfer params (to agoric, from cosmos)
    counterpartyChannelId:
      cosmosChain.transferChannels[0].counterpartyChannelId,
    counterpartyPortId: cosmosChain.transferChannels[0].counterpartyPortId,
  };

  t.deepEqual(stakeAtomParams, {
    controllerConnectionId: 'connection-1',
    counterpartyChannelId: 'channel-1',
    counterpartyPortId: 'transfer',
    hostConnectionId: 'connection-1',
    sourceChannelId: 'channel-1',
    sourcePortId: 'transfer',
  });
  t.snapshot(stakeAtomParams, 'stakeAtomParams');
});

test('Denom Info', async t => {
  const chainInfo = {};
  for (const [name, endpoint] of Object.entries(RPC_ENDPOINTS)) {
    const { cosmos } = await createCosmosRPCQueryClient({
      rpcEndpoint: endpoint,
    });
    const { ibc } = await createIBCRPCQueryClient({
      rpcEndpoint: endpoint,
    });
    // Query staking parameters to get the native token denom
    const {
      params: { bondDenom },
    } = await cosmos.staking.v1beta1.params();

    // Query bank to get a list of denom metadata
    const { denomTraces } = await ibc.applications.transfer.v1.denomTraces();
    const denomTracesWithHashes = denomTraces.map(x => ({
      ...x,
      denom: `ibc/${sha256(`${x.path}/${x.baseDenom}`).toUpperCase()}`,
    }));

    const { supply } = await cosmos.bank.v1beta1.totalSupply();
    for (const { denom } of denomTracesWithHashes) {
      t.true(
        !!supply.find(x => x.denom === denom),
        `${denom} not found in supply. check sha256 coversion`,
      );
    }

    // filter out values so we get a list of native tokens that are not in `denomTraces`, nor are the `bondDenom`
    const nativeTokens = supply
      // XXX account for cw20 and other non-native tokens
      .filter(x => !x.denom.startsWith('ibc/'))
      .map(x => ({ denom: x.denom, native: true }));

    const denoms = [...nativeTokens, ...denomTracesWithHashes];

    chainInfo[name] = {
      bondDenom,
      denoms,
    };
  }

  t.snapshot(chainInfo, 'Chain Info');
});

test('Allow Queries and Messages', async t => {
  const allowInfo = {};
  for (const [name, endpoint] of Object.entries(RPC_ENDPOINTS)) {
    const { icq } = await createICQRPCQueryClient({
      rpcEndpoint: endpoint,
    });
    const { ibc } = await createIBCRPCQueryClient({
      rpcEndpoint: endpoint,
    });

    // Query allowed queries + host enabled (ICQ)
    let interchainQueryParams;
    try {
      const { params } = await icq.v1.params();
      interchainQueryParams = params;
    } catch (e) {
      if (e.message.includes('unknown query path')) {
        interchainQueryParams = {
          hostEnabled: false,
        };
      } else {
        throw e;
      }
    }

    // Query allowed messages + host enabled (ICA)
    let interchainAccountsParams;
    try {
      const { params } =
        await ibc.applications.interchain_accounts.host.v1.params();
      interchainAccountsParams = params;
    } catch (e) {
      if (e.message.includes('unknown query path')) {
        interchainAccountsParams = {
          hostEnabled: false,
        };
      } else {
        throw e;
      }
    }

    allowInfo[name] = {
      interchainQueryParams,
      interchainAccountsParams,
    };
  }

  t.snapshot(allowInfo, 'Allow Queries and Messages');
});
