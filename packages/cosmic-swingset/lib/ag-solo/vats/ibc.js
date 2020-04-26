// @ts-check
import harden from '@agoric/harden';
import {
  extendLoopbackProtocolHandler,
  rethrowUnlessMissing,
  dataToBase64,
  base64ToBytes,
  toBytes,
} from '@agoric/swingset-vat/src/vats/network';
import makeStore from '@agoric/store';
import { producePromise } from '@agoric/produce-promise';
import { generateSparseInts } from '@agoric/sparse-ints';

import { makeWithQueue } from './queue';

const DEFAULT_PACKET_TIMEOUT = 1000;

// FIXME: this constitutes a security flaw, but is currently the
// only way to create channels.
const ALLOW_NAIVE_RELAYS = true;

/**
 * @typedef {import('@agoric/swingset-vat/src/vats/network').ProtocolHandler} ProtocolHandler
 * @typedef {import('@agoric/swingset-vat/src/vats/network').ProtocolImpl} ProtocolImpl
 * @typedef {import('@agoric/swingset-vat/src/vats/network').ConnectionHandler} ConnectionHandler
 * @typedef {import('@agoric/swingset-vat/src/vats/network').Connection} Connection
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

const goodLetters = 'abcdefghijklmnopqrstuvwxyz';
/**
 * Get a sequence of letters chosen from `goodLetters`.
 * @param {number} n
 */
const getGoodLetters = n => {
  let gl = '';
  do {
    gl += goodLetters[n % goodLetters.length];
    n = Math.floor(n / goodLetters.length);
  } while (n > 0);
  return gl;
};

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
  const channelKeyToConnectingInfo = makeStore('CHANNEL:PORT');

  /**
   * @type {Set<string>}
   */
  const usedChannels = new Set();

  seed += 1;
  const portSparseInts = generateSparseInts(seed);
  const channelSparseInts = generateSparseInts(seed * 2);

  const generateChannelID = () => {
    let channelID;
    for (;;) {
      const n = channelSparseInts.next().value;
      if (typeof n !== 'number') {
        throw Error(`internal: channelSparseInts is out of ints`);
      }

      channelID = `chan${getGoodLetters(n)}`;
      if (!usedChannels.has(channelID)) {
        usedChannels.add(channelID);
        return channelID;
      }
    }
  };

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
        await callIBCDevice('channelCloseInit', { channelID, portID });
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
   * @type {Store<string, Store<string, ConnectedRecord[]>>}
   */
  const outboundWaiters = makeStore('destination');

  // We delegate to a loopback protocol, too, to connect locally.
  const protocol = extendLoopbackProtocolHandler({
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
    async onBind(_port, localAddr, _protocolHandler) {
      const portID = localAddrToPortID(localAddr);
      return callIBCDevice('bindPort', { portID });
    },
    async onConnect(_port, localAddr, remoteAddr, _protocolHandler) {
      console.warn('IBC onConnect', localAddr, remoteAddr);
      const portID = localAddrToPortID(localAddr);
      const match = remoteAddr.match(
        /^(\/ibc-hop\/[^/]+)*\/ibc-port\/([^/]+)\/(ordered|unordered)\/([^/]+)$/,
      );
      if (!match) {
        throw TypeError(
          `Remote address ${remoteAddr} must be '(/ibc-hop/HOP...)*/ibc-port/PORT/(ordered|unordered)/VERSION'`,
        );
      }

      const hops = [];
      let h = match[1];
      while (h !== '') {
        const m = h.match(/^\/ibc-hop\/([^/]+)/);
        h = h.substr(m[0].length);
        hops.push(m[1]);
      }
      const rPortID = match[2];
      /**
       * @type {'ORDERED'|'UNORDERED'}
       */
      const order = match[4] === 'ordered' ? 'ORDERED' : 'UNORDERED';
      const version = match[5];

      const rChannelID = generateChannelID();
      const channelID = generateChannelID();

      /** @type {PromiseRecord<ConnectionHandler,any>} */
      const chandler = producePromise();

      /**
       * @type {typeof makeIBCConnectionHandler}
       */
      const connected = (cID, pID, rCID, rPID, ord) => {
        const ch = makeIBCConnectionHandler(cID, pID, rCID, rPID, ord);
        chandler.resolve(ch);
        return ch;
      };
      let waiters;
      if (outboundWaiters.has(remoteAddr)) {
        waiters = outboundWaiters.get(remoteAddr);
      } else {
        waiters = makeStore('source');
        outboundWaiters.init(remoteAddr, waiters);
      }
      let waiterList;
      if (waiters.has(portID)) {
        waiterList = waiters.get(portID);
      } else {
        waiterList = [];
        waiters.init(portID, waiterList);
      }
      waiterList.push({ channelID, rChannelID, connected });

      // Try sending a ChanOpenInit to get a passive relayer flowing.
      const packet = {
        source_channel: channelID,
        source_port: portID,
        destination_channel: rChannelID,
        destination_port: rPortID,
      };

      const obj = {
        channelID,
        portID,
        counterparty: { channel_id: rChannelID, port_id: rPortID },
        connectionHops: hops,
        order,
        version,
      };
      const channelKey = `${channelID}:${portID}`;
      channelKeyToConnectingInfo.init(channelKey, obj);

      await callIBCDevice('channelOpenInit', {
        packet,
        order,
        hops,
        version,
      });
      return chandler.promise;
    },
    async onListen(_port, localAddr, _listenHandler) {
      console.warn('IBC onListen', localAddr);
    },
    async onListenRemove(_port, localAddr, _listenHandler) {
      console.warn('IBC onListenRemove', localAddr);
    },
    async onRevoke(_port, localAddr, _protocolHandler) {
      console.warn('IBC onRevoke', localAddr);
    },
  });

  /**
   *
   * @param {string[]} hops
   * @param {string} channelID,
   * @param {string} portID
   * @param {string} rPortID
   * @param {'ORDERED'|'UNORDERED'} order
   * @param {string} version
   * @param {boolean} [removeMatching=false]
   * @param {boolean} [defaultMatchFirst=false]
   * @returns {ConnectedRecord|undefined}
   */
  function getWaiter(
    hops,
    channelID,
    portID,
    rPortID,
    order,
    version,
    removeMatching = false,
    defaultMatchFirst = false,
  ) {
    const us = `/ibc-port/${portID}/${order.toLowerCase()}/${version}`;
    for (let i = 0; i <= hops.length; i += 1) {
      // Try most specific to least specific outbound connections.
      const ibcHops = hops
        .slice(0, hops.length - i)
        .map(hop => `/ibc-hop/${hop}`)
        .join('/');
      const them = `${ibcHops}/ibc-port/${rPortID}`;
      if (outboundWaiters.has(them)) {
        const waiters = outboundWaiters.get(them);
        if (waiters.has(us)) {
          const waiterList = waiters.get(us);
          // Find the best waiter.
          let bestWaiter = defaultMatchFirst ? 0 : -1;
          for (let j = 0; i < waiterList.length; j += 1) {
            if (waiterList[j].channelID === channelID) {
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
            waiters.delete(us);
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
            order,
            version,
          } = obj;

          const channelKey = `${channelID}:${portID}`;
          const waiter = getWaiter(
            hops,
            portID,
            channelID,
            rPortID,
            order,
            version,
            false,
            ALLOW_NAIVE_RELAYS,
          );
          if (waiter) {
            if (ALLOW_NAIVE_RELAYS) {
              // Update the used map if the relayer actively created the channel
              // for us.
              // This is the case with the "naive" relay strategy.
              if (waiter.channelID !== channelID) {
                usedChannels.delete(waiter.channelID);
                usedChannels.add(channelID);
              }
              if (waiter.rChannelID !== rChannelID) {
                usedChannels.delete(waiter.rChannelID);
              }
            }
            channelKeyToConnectingInfo.set(channelKey, obj);
          } else {
            await E(protocolImpl).isListening([`/ibc-port/${portID}`]);
            channelKeyToConnectingInfo.init(channelKey, obj);
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
          } = channelKeyToConnectingInfo.get(channelKey);
          channelKeyToConnectingInfo.delete(channelKey);

          const rVersion = updatedVersion || storedVersion;
          const localAddr = `/ibc-port/${portID}/${order.toLowerCase()}/${version}`;
          const ibcHops = hops.map(hop => `/ibc-hop/${hop}`).join('/');
          const remoteAddr = `${ibcHops}/ibc-port/${rPortID}/${order.toLowerCase()}/${rVersion}`;
          const waiter = getWaiter(
            hops,
            channelID,
            portID,
            rPortID,
            order,
            version,
            true,
            ALLOW_NAIVE_RELAYS,
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

          // Check for a listener for this channel.
          const listenSearch = [`/ibc-port/${portID}`];
          const rchandler = makeIBCConnectionHandler(
            channelID,
            portID,
            rChannelID,
            rPortID,
            order === 'ORDERED',
          );

          // Actually connect.
          const connP =
            /** @type {Promise<Connection>} */
            (E(protocolImpl).inbound(
              listenSearch,
              localAddr,
              remoteAddr,
              rchandler,
            ));

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
