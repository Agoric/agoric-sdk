// @ts-check
import test from 'ava';

import { createRPCQueryClient } from '../dist/codegen/ibc/rpc.query.js';
import { QueryConnectionsResponse } from '../dist/codegen/ibc/core/connection/v1/query.js';
import { QueryConnectionChannelsResponse } from '../dist/codegen/ibc/core/channel/v1/query.js';
import { ClientState } from '../dist/codegen/ibc/lightclients/tendermint/v1/tendermint.js';
import { State } from '../dist/codegen/ibc/core/channel/v1/channel.js';

/**
 * @import { IdentifiedConnection } from '../src/codegen/ibc/core/connection/v1/connection.js';
 * @import { IdentifiedChannel } from '../src/codegen/ibc/core/channel/v1/channel.js';
 */

const LOCAL_RPC_ENDPOINT = 'http://localhost:26657/'; // agoriclocal connected to osmosis-test
const TRANSFER_PORT = 'transfer';

test('IBC Connections and Channels - Local Perspective', async t => {
  const client = await createRPCQueryClient({
    rpcEndpoint: LOCAL_RPC_ENDPOINT,
  });

  // Query all connections
  // TODO pagination support
  const connectionsResponse = await client.ibc.core.connection.v1.connections();
  const connections = /** @type { QueryConnectionsResponse } */ (
    QueryConnectionsResponse.toJSON(connectionsResponse)
  ).connections;

  /**
   * @type {{
   *  connectionInfo: IdentifiedConnection;
   *  clientState: ClientState;
   *  transferChannel: IdentifiedChannel;
   * }[]}
   */
  const connectionsDetails = [];
  for (const connection of connections) {
    // Query client state for each connection
    const clientStateResponse = await client.ibc.core.client.v1.clientState({
      clientId: connection.clientId,
    });
    if (!clientStateResponse?.clientState?.value)
      throw new Error('No client state');
    const clientState = ClientState.decode(
      clientStateResponse?.clientState?.value,
    );

    // Query channels for each connection
    const channelsResponse =
      await client.ibc.core.channel.v1.connectionChannels({
        connection: connection.id,
        // seemingly no way to request by portId + connId :(
      });
    const channels = /** @type { QueryConnectionChannelsResponse } */ (
      QueryConnectionChannelsResponse.toJSON(channelsResponse)
    ).channels;
    // we only care about the transfer port channels
    // XXX there can be multiple, account for this (.filter())
    const transferChannel = channels.find(
      x => x.portId === TRANSFER_PORT && x.state === State.STATE_OPEN,
    );
    if (!transferChannel) throw Error('transfer port channel not found');
    connectionsDetails.push({
      connectionInfo: connection,
      clientState,
      transferChannel,
    });
  }

  t.snapshot(connectionsDetails, 'Connections Details');

  const minimal = connectionsDetails.map(c => {
    const { connectionInfo, clientState, transferChannel } = c;
    return {
      // XXX not a proposed schema
      chainId: clientState.chainId,
      ica: {
        controllerConnectionId: connectionInfo.id,
        hostConnectionId: connectionInfo.counterparty.connectionId,
      },
      transfer: {
        counterpartyChannelId: transferChannel.counterparty.channelId,
        counterpartyPortId: transferChannel.counterparty.portId,
        ordering: transferChannel.ordering,
        sourcePortId: transferChannel.portId,
        sourceChannelId: transferChannel.channelId,
        version: transferChannel.version,
      },
      // other potentially useful info:
      // - connection clientId (`07-tendermint-1`) (host + remote)
      // - client unbondingPeriod + trustingPeriod (seconds: 172800n, seconds: 86400n)
      // others that are dynamic:
      // - `state` of the connection and channel (`STATE_OPEN`)
      // - latestHeight (revisionHeight: 72592n)
    };
  });
  t.log(minimal);
  t.snapshot(minimal, 'Connections Details Minimal');
});
