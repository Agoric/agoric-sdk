// @ts-check
import harden from '@agoric/harden';
import {
  rethrowUnlessMissing,
  dataToBase64,
  base64ToBytes,
  toBytes,
  getPrefixes,
} from '@agoric/swingset-vat/src/vats/network';
import makeStore from '@agoric/store';
import { producePromise } from '@agoric/produce-promise';
import { generateSparseInts } from '@agoric/sparse-ints';

import { makeWithQueue } from './queue';

const DEFAULT_PACKET_TIMEOUT = 1000;

// FIXME: this constitutes a security flaw, but is currently the
// only way to create channels.
const FIXME_ALLOW_NAIVE_RELAYS = true;

/**
 * @typedef {import('@agoric/swingset-vat/src/vats/network').ProtocolHandler} ProtocolHandler
 * @typedef {import('@agoric/swingset-vat/src/vats/network').ProtocolImpl} ProtocolImpl
 * @typedef {import('@agoric/swingset-vat/src/vats/network').ConnectionHandler} ConnectionHandler
 * @typedef {import('@agoric/swingset-vat/src/vats/network').Connection} Connection
 * @typedef {import('@agoric/swingset-vat/src/vats/network').Port} Port
 * @typedef {import('@agoric/swingset-vat/src/vats/network').Endpoint} Endpoint
 * @typedef {import('@agoric/swingset-vat/src/vats/network').Bytes} Bytes
 * @typedef {import('@agoric/swingset-vat/src/vats/network').Bytes} Data
 * @typedef {import('./bridge').BridgeHandler} BridgeHandler
 */

/**
 * @template U,V
 * @typedef {import('@agoric/produce-promise').PromiseRecord<U, V>} PromiseRecord
 */

/**
 * @template K,V
 * @typedef {import('@agoric/store').Store<K, V>} Store
 */

/**
 * @typedef {string} IBCPortID
 * @typedef {string} IBCChannelID
 * @typedef {string} IBCConnectionID
 */

/**
 * @typedef {Object} IBCPacket
 * @property {Bytes} [data]
 * @property {IBCChannelID} source_channel
 * @property {IBCPortID} source_port
 * @property {IBCChannelID} destination_channel
 * @property {IBCPortID} destination_port
 */

const goodLetters = 'abcdefghijklmnopqrstuvwxyz';
/**
 * Get a sequence of letters chosen from `goodLetters`.
 * @param {number} n
 */
function getGoodLetters(n) {
  let gl = '';
  do {
    gl += goodLetters[n % goodLetters.length];
    n = Math.floor(n / goodLetters.length);
  } while (n > 0);
  return gl;
}

let seed = 0;

/**
 * Create a handler for the IBC protocol, both from the network
 * and from the bridge.
 *
 * @param {import('@agoric/eventual-send').EProxy} E
 * @param {(method: string, params: any) => Promise<any>} callIBCDevice
 * @param {string[]} [packetSendersWhitelist=[]]
 * @returns {ProtocolHandler & BridgeHandler} Protocol/Bridge handler
 */
export function makeIBCProtocolHandler(
  E,
  callIBCDevice,
  packetSendersWhitelist = [],
) {
  /**
   * @type {Store<string, Promise<Connection>>}
   */
  const channelKeyToConnP = makeStore('CHANNEL:PORT');

  /**
   * @typedef {Object} Counterparty
   * @property {string} port_id
   * @property {string} channel_id
   *
   * @typedef {Object} ConnectingInfo
   * @property {'ORDERED'|'UNORDERED'} order
   * @property {string[]} connectionHops
   * @property {string} portID
   * @property {string} channelID
   * @property {Counterparty} counterparty
   * @property {string} version
   * @property {string} [counterpartyVersion]
   */

  /**
   * @type {Store<string, ConnectingInfo>}
   */
  const channelKeyToInfo = makeStore('CHANNEL:PORT');

  /**
   * @type {Set<string>}
   */
  const usedChannels = new Set();

  seed += 1;
  const portSparseInts = generateSparseInts(seed);
  const channelSparseInts = generateSparseInts(seed * 2);

  function generateChannelID() {
    let channelID;
    for (;;) {
      const n = channelSparseInts.next().value;
      if (typeof n !== 'number') {
        throw Error(`internal: channelSparseInts is out of ints`);
      }

      // Need to begin with ten letters, or we get rejected.
      // FIXME: Onerous identifier constraints.
      channelID = `channelto${getGoodLetters(n)}`;
      if (!usedChannels.has(channelID)) {
        usedChannels.add(channelID);
        return channelID;
      }
    }
  }

  /**
   * @type {Store<string, Store<number, PromiseRecord<Bytes, any>>>}
   */
  const channelKeyToSeqAck = makeStore('CHANNEL:PORT');

  /**
   * @param {string} channelID
   * @param {string} portID
   * @param {string} rChannelID
   * @param {string} rPortID
   * @param {boolean} ordered
   * @returns {ConnectionHandler}
   */
  function makeIBCConnectionHandler(
    channelID,
    portID,
    rChannelID,
    rPortID,
    ordered,
  ) {
    const channelKey = `${channelID}:${portID}`;
    const seqToAck = makeStore('SEQUENCE');
    channelKeyToSeqAck.init(channelKey, seqToAck);
    /**
     * @param {Connection} _conn
     * @param {Bytes} packetBytes
     * @param {ConnectionHandler} _handler
     * @returns {Promise<Bytes>} Acknowledgement data
     */
    let onReceive = async (_conn, packetBytes, _handler) => {
      const packet = {
        source_port: portID,
        source_channel: channelID,
        destination_port: rPortID,
        destination_channel: rChannelID,
        data: dataToBase64(packetBytes),
      };
      const fullPacket = await callIBCDevice('sendPacket', {
        packet,
        relativeTimeout: DEFAULT_PACKET_TIMEOUT,
      });
      const { sequence } = fullPacket;
      /**
       * @type {PromiseRecord<Bytes, any>}
       */
      const ackDeferred = producePromise();
      seqToAck.init(sequence, ackDeferred);
      return ackDeferred.promise;
    };

    if (ordered) {
      // Set up a queue on the receiver.
      const withChannelReceiveQueue = makeWithQueue();
      onReceive = withChannelReceiveQueue(onReceive);
    }

    return harden({
      async onOpen(conn, handler) {
        console.info('onOpen Remote IBC Connection', channelID, portID);
        /**
         * @param {Data} data
         * @returns {Promise<Bytes>} acknowledgement
         */
        let sender = data =>
          /** @type {Promise<Bytes>} */
          (E(handler)
            .onReceive(conn, toBytes(data), handler)
            .catch(rethrowUnlessMissing));
        if (ordered) {
          // Set up a queue on the sender.
          const withChannelSendQueue = makeWithQueue();
          sender = withChannelSendQueue(sender);
        }
        const boundSender = sender;
        sender = data => {
          return boundSender(data);
        };
      },
      onReceive,
      async onClose(_conn, _reason, _handler) {
        const packet = {
          source_port: portID,
          source_channel: channelID,
        };
        await callIBCDevice('channelCloseInit', { packet });
        const rejectReason = Error('Connection closed');
        for (const ackDeferred of seqToAck.values()) {
          ackDeferred.reject(rejectReason);
        }
        channelKeyToSeqAck.delete(channelKey);

        // TODO: Let's look carefully at this
        // There's a danger of the two sides disagreeing about whether
        // the channel is closed or not, and reusing channelIDs could
        // be a security hole.
        //
        // FIXME: Maybe check whether channelCloseConfirm is done.
        usedChannels.delete(channelID);
        usedChannels.delete(rChannelID);
      },
    });
  }

  /**
   * @param {string} localAddr
   */
  const localAddrToPortID = localAddr => {
    const m = localAddr.match(/^\/ibc-port\/(\w+)$/);
    if (!m) {
      throw TypeError(
        `Invalid port specification ${localAddr}; expected "/ibc-port/PORT"`,
      );
    }
    return m[1];
  };

  /**
   * @type {ProtocolImpl}
   */
  let protocolImpl;

  /**
   * @typedef {Object} ConnectedRecord
   * @property {string} channelID
   * @property {string} rChannelID
   * @property {typeof makeIBCConnectionHandler} connected
   */

  /**
   * @typedef {Object} OutboundCircuitRecord
   * @property {IBCConnectionID} dst
   * @property {'ORDERED'|'UNORDERED'} order
   * @property {string} version
   * @property {IBCPacket} packet
   * @property {PromiseRecord<ConnectionHandler, any>} deferredHandler
   */

  /**
   * @type {Store<Port, OutboundCircuitRecord[]>}
   */
  const portToCircuits = makeStore('Port');

  /**
   * @type {Store<string, Store<string, ConnectedRecord[]>>}
   */
  const outboundWaiters = makeStore('destination');

  /**
   * @type {Store<Port, Set<PromiseRecord<ConnectionHandler,any>>>}
   */
  const portToPendingConns = makeStore('Port');

  /**
   * @type {ProtocolHandler}
   */
  const protocol = harden({
    async onCreate(impl, _protocolHandler) {
      console.info('IBC onCreate');
      protocolImpl = impl;
    },
    async generatePortID(_localAddr, _protocolHandler) {
      const n = portSparseInts.next().value;
      if (!n) {
        throw Error(`internal: portSparseInts is out of ints`);
      }
      return `port${getGoodLetters(n)}`;
    },
    async onBind(port, localAddr, _protocolHandler) {
      const portID = localAddrToPortID(localAddr);
      portToCircuits.init(port, []);
      portToPendingConns.init(port, new Set());
      const packet = {
        source_port: portID,
      };
      return callIBCDevice('bindPort', { packet });
    },
    async onConnect(port, localAddr, remoteAddr, chandler, _protocolHandler) {
      console.warn('IBC onConnect', localAddr, remoteAddr);
      const portID = localAddrToPortID(localAddr);
      const pendingConns = portToPendingConns.get(port);

      const match = remoteAddr.match(
        /^(\/ibc-hop\/[^/]+)*\/ibc-port\/([^/]+)\/(ordered|unordered)\/([^/]+)$/s,
      );
      if (!match) {
        throw TypeError(
          `Remote address ${remoteAddr} must be '(/ibc-hop/CONNECTION)*/ibc-port/PORT/(ordered|unordered)/VERSION'`,
        );
      }

      const hops = [];
      let h = match[1];
      while (h) {
        const m = h.match(/^\/ibc-hop\/([^/]+)/);
        if (!m) {
          throw Error(
            `internal: ${JSON.stringify(h)} did not begin with "/ibc-hop/XXX"`,
          );
        }
        h = h.substr(m[0].length);
        hops.push(m[1]);
      }

      // Generate a circuit.
      const rPortID = match[2];
      const order = match[3] === 'ordered' ? 'ORDERED' : 'UNORDERED';
      const version = match[4];

      const channelID = generateChannelID();

      // FIXME: The destination should be able to choose this channelID.
      const rChannelID = generateChannelID();

      const rchandler = producePromise();
      pendingConns.add(rchandler);

      /**
       * @type {typeof makeIBCConnectionHandler}
       */
      function connected(cID, pID, rCID, rPID, ord) {
        const ch = makeIBCConnectionHandler(cID, pID, rCID, rPID, ord);
        rchandler.resolve(ch);
        pendingConns.delete(rchandler);
        return ch;
      }

      for (let i = 0; i <= hops.length; i += 1) {
        // Add most specific to least specific outbound connections.
        const ibcHops = hops
          .slice(0, hops.length - i)
          .map(hop => `/ibc-hop/${hop}`)
          .join('/');
        const them = `${ibcHops}/ibc-port/${rPortID}`;
        let waiters;
        if (outboundWaiters.has(them)) {
          waiters = outboundWaiters.get(them);
        } else {
          waiters = makeStore('source');
          outboundWaiters.init(them, waiters);
        }
        let waiterList;
        if (waiters.has(portID)) {
          waiterList = waiters.get(portID);
        } else {
          waiterList = [];
          waiters.init(portID, waiterList);
        }
        waiterList.push({ channelID, rChannelID, connected });
      }

      // TODO: Will need to change to dispatch (without sending)
      // a ChanOpenInit to get a passive relayer flowing.
      if (false) {
        const packet = {
          source_channel: channelID,
          source_port: portID,
          destination_channel: rChannelID,
          destination_port: rPortID,
        };

        await callIBCDevice('channelOpenInit', {
          packet,
          order,
          hops,
          version,
        });
      }

      /**
       * @type {ConnectingInfo}
       */
      const obj = {
        channelID,
        portID,
        counterparty: { channel_id: rChannelID, port_id: rPortID },
        connectionHops: hops,
        order,
        version,
      };
      const channelKey = `${channelID}:${portID}`;
      channelKeyToInfo.init(channelKey, obj);

      if (!FIXME_ALLOW_NAIVE_RELAYS || !chandler) {
        // Just wait until the connection handler resolves.
        return rchandler.promise;
      }

      // We explain to the user how to configure a naive relayer.
      E(chandler)
        .infoMessage(
          `\
# Set up the relayer for this path:
paths:
  XXX-PATH-ID:
    src:
      chain-id: XXX-SRC-CHAIN
      client-id: YYY-DST-CLIENT
      connection-id: ${hops[0]}
      channel-id: ${channelID}
      port-id: ${portID}
      order: ${order}
    dst:
      chain-id: YYY-DST-CHAIN
      client-id: XXX-SRC-CLIENT
      connection-id: XXX-SRC-CONNECTION
      channel-id: ${rChannelID}
      port-id: ${rPortID}
      order: ${order}
    strategy:
      type: naive
# then your connection will try to proceed.
`,
        )
        .catch(rethrowUnlessMissing);
      return rchandler.promise;
    },
    async onListen(_port, localAddr, _listenHandler) {
      console.warn('IBC onListen', localAddr);
    },
    async onListenRemove(_port, localAddr, _listenHandler) {
      console.warn('IBC onListenRemove', localAddr);
    },
    async onRevoke(port, localAddr, _protocolHandler) {
      console.warn('IBC onRevoke', localAddr);
      const pendingConns = portToPendingConns.get(port);
      portToPendingConns.delete(port);
      portToCircuits.delete(port);
      const revoked = Error(`Port ${localAddr} revoked`);
      for (const rchandler of pendingConns.values()) {
        rchandler.reject(revoked);
      }
    },
  });

  /**
   * @param {string[]} hops
   * @param {string} channelID
   * @param {string} portID
   * @param {string} rChannelID
   * @param {string} rPortID
   * @param {boolean} [removeMatching=false]
   * @returns {ConnectedRecord|undefined}
   */
  function getWaiter(
    hops,
    channelID,
    portID,
    rChannelID,
    rPortID,
    removeMatching = false,
  ) {
    // FIXME: Leaves garbage behind in the less specific outboundWaiters.
    for (let i = 0; i <= hops.length; i += 1) {
      // Try most specific to least specific outbound connections.
      const ibcHops = hops
        .slice(0, hops.length - i)
        .map(hop => `/ibc-hop/${hop}`)
        .join('/');
      const them = `${ibcHops}/ibc-port/${rPortID}`;
      if (outboundWaiters.has(them)) {
        const waiters = outboundWaiters.get(them);
        if (waiters.has(portID)) {
          const waiterList = waiters.get(portID);
          // Find the best waiter.
          let bestWaiter = -1;
          for (let j = 0; j < waiterList.length; j += 1) {
            if (
              waiterList[j].channelID === channelID &&
              waiterList[j].rChannelID === rChannelID
            ) {
              bestWaiter = j;
              break;
            }
          }

          if (bestWaiter < 0) {
            return undefined;
          }
          const waiter = waiterList[bestWaiter];
          if (!removeMatching) {
            return waiter;
          }

          // Clean up the maps.
          waiterList.splice(bestWaiter, 1);
          if (waiterList.length === 0) {
            waiters.delete(portID);
          }
          if (waiters.keys().length === 0) {
            outboundWaiters.delete(them);
          }
          return waiter;
        }
      }
    }
    return undefined;
  }

  return harden({
    ...protocol,
    async fromBridge(srcID, obj) {
      console.warn('IBC fromBridge', srcID, obj);
      switch (obj.event) {
        case 'channelOpenTry':
        case 'channelOpenInit': {
          const {
            channelID,
            portID,
            counterparty: { channel_id: rChannelID, port_id: rPortID },
            connectionHops: hops,
          } = obj;

          const channelKey = `${channelID}:${portID}`;
          const waiter = getWaiter(
            hops,
            channelID,
            portID,
            rChannelID,
            rPortID,
            false,
          );
          if (!waiter) {
            await E(protocolImpl).isListening([`/ibc-port/${portID}`]);
            channelKeyToInfo.init(channelKey, obj);
          } else {
            // We have more specific information.
            channelKeyToInfo.set(channelKey, obj);
          }
          break;
        }

        case 'channelOpenAck':
        case 'channelOpenConfirm': {
          const {
            portID,
            channelID,
            counterpartyVersion: updatedVersion,
          } = obj;
          const channelKey = `${channelID}:${portID}`;
          const {
            order,
            version,
            connectionHops: hops,
            counterparty: { port_id: rPortID, channel_id: rChannelID },
            counterpartyVersion: storedVersion,
          } = channelKeyToInfo.get(channelKey);
          channelKeyToInfo.delete(channelKey);

          const rVersion = updatedVersion || storedVersion;
          const localAddr = `/ibc-port/${portID}/${order.toLowerCase()}/${version}`;
          const ibcHops = hops.map(hop => `/ibc-hop/${hop}`).join('/');
          const remoteAddr = `${ibcHops}/ibc-port/${rPortID}/${order.toLowerCase()}/${rVersion}`;
          const waiter = getWaiter(
            hops,
            channelID,
            portID,
            rChannelID,
            rPortID,
            true,
          );
          if (waiter) {
            // An outbound connection wants to use this channel.
            waiter.connected(
              channelID,
              portID,
              rChannelID,
              rPortID,
              order === 'ORDERED',
            );
            break;
          }

          // Check for a listener for this subprotocol.
          const listenSearch = getPrefixes(localAddr);
          const rchandler = makeIBCConnectionHandler(
            channelID,
            portID,
            rChannelID,
            rPortID,
            order === 'ORDERED',
          );

          // Actually connect.
          // eslint-disable-next-line prettier/prettier
          const pr = E(protocolImpl).inbound(listenSearch, localAddr, remoteAddr, rchandler);
          const connP = /** @type {Promise<Connection>} */ (pr);

          /* Stash it for later use. */
          channelKeyToConnP.init(channelKey, connP);
          break;
        }

        case 'receivePacket': {
          const { packet } = obj;
          const {
            data: data64,
            destination_port: portID,
            destination_channel: channelID,
          } = packet;
          const channelKey = `${channelID}:${portID}`;

          const connP = channelKeyToConnP.get(channelKey);
          const data = base64ToBytes(data64);

          E(connP)
            .send(data)
            .then(ack => {
              const ack64 = dataToBase64(/** @type {Bytes} */ (ack));
              return callIBCDevice('packetExecuted', { packet, ack: ack64 });
            })
            .catch(e => console.error(e));
          break;
        }

        case 'acknowledgementPacket': {
          const { packet, acknowledgement } = obj;
          const {
            sequence,
            source_channel: channelID,
            source_port: portID,
          } = packet;
          const channelKey = `${channelID}:${portID}`;
          const seqToAck = channelKeyToSeqAck.get(channelKey);
          const ackDeferred = seqToAck.get(sequence);
          ackDeferred.resolve(base64ToBytes(acknowledgement));
          seqToAck.delete(sequence);
          break;
        }

        case 'timeoutPacket': {
          const { packet } = obj;
          const {
            sequence,
            source_channel: channelID,
            source_port: portID,
          } = packet;
          const channelKey = `${channelID}:${portID}`;
          const seqToAck = channelKeyToSeqAck.get(channelKey);
          const ackDeferred = seqToAck.get(sequence);
          ackDeferred.reject(Error(`Packet timed out`));
          seqToAck.delete(sequence);
          break;
        }

        case 'channelCloseInit':
        case 'channelCloseConfirm': {
          const { portID, channelID } = obj;
          const channelKey = `${channelID}:${portID}`;
          if (channelKeyToConnP.has(channelKey)) {
            const connP = channelKeyToConnP.get(channelKey);
            channelKeyToConnP.delete(channelKey);
            E(connP).close();
          }
          break;
        }

        case 'sendPacket': {
          const { packet, sender } = obj;
          if (!packetSendersWhitelist.includes(sender)) {
            console.error(
              sender,
              'does not appear in the sendPacket whitelist',
              packetSendersWhitelist,
            );
            throw Error(
              `${sender} does not appear in the sendPacket whitelist`,
            );
          }

          const { source_port: portID, source_channel: channelID } = packet;

          const fullPacket = await callIBCDevice('sendPacket', { packet });

          const { sequence } = fullPacket;
          /**
           * @type {PromiseRecord<Bytes, any>}
           */
          const ackDeferred = producePromise();
          const channelKey = `${channelID}:${portID}`;
          const seqToAck = channelKeyToSeqAck.get(channelKey);
          seqToAck.init(sequence, ackDeferred);
          ackDeferred.promise.then(
            ack => console.info('Manual packet', fullPacket, 'acked:', ack),
            e => console.warn('Manual packet', fullPacket, 'timed out:', e),
          );
          break;
        }

        default:
          console.error('Unexpected IBC_EVENT', obj.event);
          // eslint-disable-next-line no-throw-literal
          throw TypeError(`unrecognized method ${obj.event}`);
      }
    },
  });
}
