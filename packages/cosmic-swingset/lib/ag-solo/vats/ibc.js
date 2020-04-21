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
   * @property {string|undefined} counterpartyVersion
   */

  /**
   * @type {Store<string, ConnectingInfo>}
   */
  const channelKeyToConnectingInfo = makeStore('CHANNEL:PORT');

  seed += 1;
  const sparseInts = generateSparseInts(seed);

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

    const ckey = `${channelID}:${portID}`;
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

  const goodLetters = 'abcdefghijklmnopqrstuvwxyz';

  // We delegate to a loopback protocol, too, to connect locally.
  const protocol = extendLoopbackProtocolHandler({
    async onCreate(impl, _protocolHandler) {
      console.info('IBC onCreate');
      protocolImpl = impl;
    },
    async generatePortID(_localAddr, _protocolHandler) {
      let n = /** @type {number} */ (sparseInts.next().value);
      let nonceLetters = '';
      do {
        nonceLetters += goodLetters[n % goodLetters.length];
        n = Math.floor(n / goodLetters.length);
      } while (n > 0);
      return `port${nonceLetters}`;
    },
    async onBind(_port, localAddr, _protocolHandler) {
      const portID = localAddrToPortID(localAddr);
      return callIBCDevice('bindPort', { portID });
    },
    async onConnect(_port, localAddr, remoteAddr, _protocolHandler) {
      console.warn('IBC onConnect', localAddr, remoteAddr);
      // return makeIBCConnectionHandler('FIXME', localAddr, remoteAddr, true);
      return undefined;
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

  // FIXME: Actually implement!
  return harden({
    ...protocol,
    async fromBridge(srcID, obj) {
      console.warn('IBC fromBridge', srcID, obj);
      switch (obj.event) {
        case 'channelOpenTry':
        case 'channelOpenInit': {
          const { channelID, portID } = obj;

          await E(protocolImpl).isListening([`/ibc-port/${portID}`]);
          const channelKey = `${channelID}:${portID}`;
          channelKeyToConnectingInfo.init(channelKey, obj);
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
              callIBCDevice('packetExecuted', { packet, ack: ack64 });
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
