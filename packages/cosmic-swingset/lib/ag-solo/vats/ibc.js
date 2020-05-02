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

// FIXME: We need to delay to a later block to work around
// a relayer race condition (no sendPacket too soon after
// a channelOpenAck).
//
// I[2020-05-01|15:32:43.721] - listening to tx events from ibc0...
// I[2020-05-01|15:32:43.721] - listening to block events from ibc0...
// Error: no transactions returned with query
// no transactions returned with query
// [exits]
const FIXME_SENDPACKET_DELAY_S = 10; // fail <=3, work >=4

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
 * @param {*} timerService
 * @returns {ProtocolHandler & BridgeHandler} Protocol/Bridge handler
 */
export function makeIBCProtocolHandler(
  E,
  callIBCDevice,
  packetSendersWhitelist = [],
  { timerService },
) {
  /**
   * @type {Store<string, [ConnectionHandler, Promise<Connection>]>}
   */
  const channelKeyToHandler = makeStore('CHANNEL:PORT');

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
   * @type {Store<string, PromiseRecord<Bytes, any>>}
   */
  const seqChannelKeyToAck = makeStore('SEQ:CHANNEL:PORT');

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
      const sck = `${sequence}:${channelID}:${portID}`;
      seqChannelKeyToAck.init(sck, ackDeferred);
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
          console.error(`Would send data`, data);
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
      const packet = {
        source_port: portID,
      };
      return callIBCDevice('bindPort', { packet });
    },
    async onConnect(_port, localAddr, remoteAddr, chandler, _protocolHandler) {
      console.warn('IBC onConnect', localAddr, remoteAddr);
      const portID = localAddrToPortID(localAddr);

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

      /**
       * @type {typeof makeIBCConnectionHandler}
       */
      function connected(cID, pID, rCID, rPID, ord) {
        const ch = makeIBCConnectionHandler(cID, pID, rCID, rPID, ord);
        rchandler.resolve(ch);
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

      if (false) {
        // TODO: Try sending a ChanOpenInit to get a passive relayer flowing.
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

      // We explain to the user how to configure an naive relayer.
      E(chandler)
        .infoMessage(
          `\
# Set up the relayer for this path:
paths:
  XXX-PATH-ID:
    src:
      chain-id: XXX-THIS-CHAIN
      client-id: XXX-THIS-CLIENT
      connection-id: XXX-THIS-CONNECTION
      channel-id: ${channelID}
      port-id: ${portID}
      order: ${order}
    dst:
      chain-id: YYY-OTHER-CHAIN
      client-id: YYY-OTHER-CLIENT
      connection-id: ${hops[0]}
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
      portToCircuits.delete(port);
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

          // Try to see hops from my perspective.
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
            const finishConnection = () => {
              waiter.connected(
                channelID,
                portID,
                rChannelID,
                rPortID,
                order === 'ORDERED',
              );
            };

            if (FIXME_SENDPACKET_DELAY_S) {
              E(timerService).setWakeup(
                FIXME_SENDPACKET_DELAY_S,
                harden({
                  wake: finishConnection,
                }),
              );
            } else {
              finishConnection();
            }
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
          const connP = /** @type {Promise<Connection>} */
            (E(protocolImpl).inbound(listenSearch, localAddr, remoteAddr, rchandler))
            .then(conn => {
              console.info(`FIGME: got connection`, conn);
              return conn;
            });

          /* Stash it for later use. */
          console.info(`FIGME: Stashing ${channelKey}`, rchandler);
          channelKeyToHandler.init(channelKey, [rchandler, connP]);
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

          const [chandler, connP] = channelKeyToHandler.get(channelKey);
          const data = base64ToBytes(data64);

          connP
            .then(conn => E(chandler).onReceive(conn, data, chandler))
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
          const sck = `${sequence}:${channelID}:${portID}`;
          const ackDeferred = seqChannelKeyToAck.get(sck);
          ackDeferred.resolve(base64ToBytes(acknowledgement));
          seqChannelKeyToAck.delete(sck);
          break;
        }

        case 'timeoutPacket': {
          const { packet } = obj;
          const {
            sequence,
            source_channel: channelID,
            source_port: portID,
          } = packet;
          const sck = `${sequence}:${channelID}:${portID}`;
          const ackDeferred = seqChannelKeyToAck.get(sck);
          ackDeferred.reject(Error(`Packet timed out`));
          seqChannelKeyToAck.delete(sck);
          break;
        }

        case 'channelCloseInit':
        case 'channelCloseConfirm': {
          const { portID, channelID } = obj;
          const channelKey = `${channelID}:${portID}`;
          if (channelKeyToHandler.has(channelKey)) {
            const [chandler, connP] = channelKeyToHandler.get(channelKey);
            channelKeyToHandler.delete(channelKey);
            connP.then(conn => E(chandler).onClose(conn, undefined, chandler));
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
          const sck = `${sequence}:${channelID}:${portID}`;
          seqChannelKeyToAck.init(sck, ackDeferred);
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
