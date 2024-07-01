import { VowTools } from '@agoric/vow';
import {
  prepareEchoConnectionKit,
  prepareLoopbackProtocolHandler,
  preparePortAllocator,
  prepareRouterProtocol,
} from '@agoric/network';
import type { Zone } from '@agoric/zone';
import type {
  IBCChannelID,
  IBCMethod,
  IBCEvent,
  ScopedBridgeManager,
} from '@agoric/vats';
import {
  prepareCallbacks as prepareIBCCallbacks,
  prepareIBCProtocol,
} from '@agoric/vats/src/ibc.js';
import { BridgeId } from '@agoric/internal';
import { E, Far } from '@endo/far';
import { defaultMockAck } from './ibc-mocks.js';

/**
 * Mimic IBC Channel Version Negotation
 *
 * As part of the IBC Channel Initialization, the version field is negotiated
 * with the host. Version fields are strings and can also be a string of JSON.
 *
 * @param version requested version string
 * @param params mock parameters to add to version string
 * @param params.address for ICS-27, the bech32 address provided by the host
 */
const addParamsIfJsonVersion = (
  version: string,
  params: { address: string },
): string => {
  try {
    const parsed = JSON.parse(version);
    return JSON.stringify({
      ...parsed,
      ...params,
    });
  } catch {
    return version;
  }
};

type ImplementedIBCEvents = 'channelOpenAck' | 'acknowledgementPacket';

export const ibcBridgeMocks: {
  [T in ImplementedIBCEvents]: T extends 'channelOpenAck'
    ? (
        obj: IBCMethod<'startChannelOpenInit'>,
        sequence: number,
      ) => IBCEvent<'channelOpenAck'>
    : T extends 'acknowledgementPacket'
      ? (
          obj: IBCMethod<'sendPacket'>,
          sequence: number,
          acknowledgement: string,
        ) => IBCEvent<'acknowledgementPacket'>
      : never;
} = {
  channelOpenAck: (
    obj: IBCMethod<'startChannelOpenInit'>,
    sequence: number,
  ): IBCEvent<'channelOpenAck'> => {
    const mocklID = Number(obj.packet.source_port.split('-').at(-1));
    const mockLocalChannelID: IBCChannelID = `channel-${mocklID}`;
    const mockRemoteChannelID: IBCChannelID = `channel-${mocklID}`;

    return {
      type: 'IBC_EVENT',
      blockHeight: 99,
      blockTime: 1711571357,
      event: 'channelOpenAck',
      portID: obj.packet.source_port,
      channelID: mockLocalChannelID,
      counterparty: {
        port_id: obj.packet.destination_port,
        channel_id: mockRemoteChannelID,
      },
      counterpartyVersion: addParamsIfJsonVersion(obj.version, {
        address: sequence === 0 ? 'cosmos1test' : `cosmos1test${sequence}`,
      }),
      connectionHops: obj.hops,
      order: obj.order,
      version: obj.version,
    };
  },

  acknowledgementPacket: (
    obj: IBCMethod<'sendPacket'>,
    sequence: number,
    acknowledgement: string,
  ): IBCEvent<'acknowledgementPacket'> => {
    return {
      acknowledgement,
      blockHeight: 289,
      blockTime: 1712180320,
      event: 'acknowledgementPacket',
      packet: {
        data: obj.packet.data,
        destination_channel: obj.packet.destination_channel,
        destination_port: obj.packet.destination_port,
        sequence,
        source_channel: obj.packet.source_channel,
        source_port: obj.packet.source_port,
        timeout_height: 0,
        timeout_timestamp: 1712183910866313000,
      },
      relayer: 'agoric1gtkg0g6x8lqc734ht3qe2sdkrfugpdp2h7fuu0',
      type: 'IBC_EVENT',
    };
  },
};

export const makeFakeIBCBridge = (zone: Zone): ScopedBridgeManager<'dibc'> => {
  let bridgeHandler: any;
  // TODO teach this about IBCConnections and store sequence on a
  // per-connection basis
  // Intended to mock a sequence
  let ibcSequenceNonce = 0;
  let channelCount = 0;

  return zone.exo('Fake IBC Bridge Manager', undefined, {
    getBridgeId: () => BridgeId.DIBC,
    toBridge: async obj => {
      if (obj.type === 'IBC_METHOD') {
        switch (obj.method) {
          case 'startChannelOpenInit':
            bridgeHandler?.fromBridge(
              ibcBridgeMocks.channelOpenAck(obj, channelCount),
            );
            channelCount += 1;
            return undefined;
          case 'sendPacket': {
            const ackEvent = ibcBridgeMocks.acknowledgementPacket(
              obj,
              ibcSequenceNonce,
              defaultMockAck(obj.packet.data),
            );
            ibcSequenceNonce += 1;
            bridgeHandler?.fromBridge(ackEvent);
            return ackEvent.packet;
          }
          default:
            return undefined;
        }
      }
      return undefined;
    },
    fromBridge: async obj => {
      if (!bridgeHandler) throw Error('no handler!');
      return bridgeHandler.fromBridge(obj);
    },
    initHandler: handler => {
      if (bridgeHandler) throw Error('already init');
      bridgeHandler = handler;
    },
    setHandler: handler => {
      if (!bridgeHandler) throw Error('must init first');
      bridgeHandler = handler;
    },
  });
};

export const setupFakeNetwork = (
  zone: Zone,
  { vowTools }: { vowTools: VowTools },
) => {
  const makeRouterProtocol = prepareRouterProtocol(zone, vowTools);
  const makePortAllocator = preparePortAllocator(zone, vowTools);
  const makeLoopbackProtocolHandler = prepareLoopbackProtocolHandler(
    zone,
    vowTools,
  );
  const makeEchoConnectionKit = prepareEchoConnectionKit(zone);
  const makeIBCProtocolHandler = prepareIBCProtocol(zone, vowTools);

  const protocol = makeRouterProtocol();
  const portAllocator = makePortAllocator({ protocol });
  const ibcBridge = makeFakeIBCBridge(zone);

  const networkVat = Far('vat-network', {
    registerProtocolHandler: (prefixes, handler) =>
      protocol.registerProtocolHandler(prefixes, handler),
    makeLoopbackProtocolHandler,
    makeEchoConnectionKit,
    unregisterProtocolHandler: (prefix, handler) =>
      protocol.unregisterProtocolHandler(prefix, handler),
    getPortAllocator: () => portAllocator,
  });

  const ibcVat = Far('vat-ibc', {
    makeCallbacks: prepareIBCCallbacks(zone),
    createHandlers(callbacks) {
      const ibcHandler = makeIBCProtocolHandler(callbacks);
      return harden(ibcHandler);
    },
  });

  const setupIBCProtocol = async () => {
    const callbacks = await E(ibcVat).makeCallbacks(ibcBridge);
    const { protocolHandler, bridgeHandler } =
      await E(ibcVat).createHandlers(callbacks);
    await E(ibcBridge).initHandler(bridgeHandler);
    await E(networkVat).registerProtocolHandler(
      ['/ibc-port', '/ibc-hop'],
      protocolHandler,
    );
  };

  return {
    portAllocator,
    protocol,
    ibcBridge,
    networkVat,
    ibcVat,
    setupIBCProtocol,
  };
};
