import { makeScalarMapStore, makeLegacyMap } from '@agoric/store';
import { makePromiseKit } from '@endo/promise-kit';
import { assert, details as X, Fail } from '@agoric/assert';
import { E, Far } from '@endo/far';

import { makeWithQueue } from '@agoric/internal/src/queue.js';
import { dataToBase64, base64ToBytes } from '@agoric/network';

import '@agoric/store/exported.js';
import '@agoric/network/exported.js';

// CAVEAT: IBC acks cannot be empty, as the Cosmos IAVL tree cannot represent
// empty acknowledgements as distinct from unacknowledged packets.
const DEFAULT_ACKNOWLEDGEMENT = '\x00';

// Default timeout after 10 minutes.
const DEFAULT_PACKET_TIMEOUT_NS = 10n * 60n * 1_000_000_000n;

/** @typedef {import('./types.js').BridgeHandler} BridgeHandler */

/**
 * @typedef {string} IBCPortID
 *
 * @typedef {string} IBCChannelID
 *
 * @typedef {string} IBCConnectionID
 */

/**
 * @typedef {object} IBCPacket
 * @property {Bytes} [data]
 * @property {IBCChannelID} source_channel
 * @property {IBCPortID} source_port
 * @property {IBCChannelID} destination_channel
 * @property {IBCPortID} destination_port
 */

/** @param {import('@agoric/base-zone').Zone} zone */
const prepareAckWatcher = zone => {
  const makeAckWatcher = zone.exoClass(
    'AckWatcher',
    undefined,
    (ibcdev, packet) => ({ ibcdev, packet }),
    {
      onFulfilled(ack) {
        const realAck = ack || DEFAULT_ACKNOWLEDGEMENT;
        const ack64 = dataToBase64(realAck);
        E(this.state.ibcdev)
          .downcall('receiveExecuted', {
            packet: this.state.packet,
            ack: ack64,
          })
          .catch(e => this.self.onRejected(e));
      },
      onRejected(e) {
        console.error(e);
      },
    },
  );
  return makeAckWatcher;
};

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {ReturnType<import('@agoric/whenable').prepareWhenableModule>} powers
 */
export const prepareIBCProtocolHandler = (zone, { makeWhenableKit, when }) => {
  const makeAckWatcher = prepareAckWatcher(zone);

  /**
   * Create a handler for the IBC protocol, both from the network and from the
   * bridge.
   *
   * @param {{ downcall: (method: string, params: any) => Promise<any> }} ibcdev
   * @returns {ProtocolHandler & BridgeHandler} Protocol/Bridge handler
   */
  function makeIBCProtocolHandler(ibcdev) {
    // Nonce for creating port identifiers.
    let lastPortID = 0;

    /** @type {MapStore<string, Promise<Connection>>} */
    const channelKeyToConnP = makeScalarMapStore('CHANNEL:PORT');

    /**
     * @typedef {object} Counterparty
     * @property {string} port_id
     * @property {string} channel_id
     *
     * @typedef {object} ConnectingInfo
     * @property {'ORDERED' | 'UNORDERED'} order
     * @property {string[]} connectionHops
     * @property {string} portID
     * @property {string} channelID
     * @property {Counterparty} counterparty
     * @property {string} version
     *
     * @typedef {PromiseRecord<AttemptDescription>} OnConnectP
     *
     * @typedef {Omit<ConnectingInfo, 'counterparty' | 'channelID'> & {
     *   localAddr: Endpoint;
     *   onConnectP: OnConnectP;
     *   counterparty: { port_id: string };
     * }} Outbound
     */

    /** @type {LegacyMap<string, Outbound[]>} */
    // Legacy because it holds a mutable Javascript Array
    const srcPortToOutbounds = makeLegacyMap('SRC-PORT');

    /** @type {MapStore<string, ConnectingInfo>} */
    const channelKeyToInfo = makeScalarMapStore('CHANNEL:PORT');

    /** @type {MapStore<string, InboundAttempt>} */
    const channelKeyToAttempt = makeScalarMapStore('CHANNEL:PORT');

    /**
     * @type {LegacyMap<
     *   string,
     *   LegacyMap<number, import('@agoric/whenable').WhenableKit<Bytes>>
     * >}
     */
    // Legacy because it holds a LegacyMap
    const channelKeyToSeqAck = makeLegacyMap('CHANNEL:PORT');

    const findAckKit = (channelID, portID, sequence) => {
      const channelKey = `${channelID}:${portID}`;
      const seqToAck = channelKeyToSeqAck.get(channelKey);
      if (seqToAck.has(sequence)) {
        return seqToAck.get(sequence);
      }
      const ackKit = makeWhenableKit();
      seqToAck.init(sequence, ackKit);
      return ackKit;
    };

    /**
     * Send a packet out via the IBC device.
     *
     * @param {IBCPacket} packet
     * @param {bigint} [relativeTimeoutNs]
     * @returns {PromiseWhenable<Bytes>} Acknowledgement data
     */
    async function ibcSendPacket(
      packet,
      relativeTimeoutNs = DEFAULT_PACKET_TIMEOUT_NS,
    ) {
      // Make a kernel call to do the send.
      const fullPacket = await E(ibcdev).downcall('sendPacket', {
        packet,
        relativeTimeoutNs,
      });

      // Extract the actual sequence number from the return.
      const {
        sequence,
        source_channel: channelID,
        source_port: portID,
      } = fullPacket;

      /** @type {import('@agoric/whenable').WhenableKit<Bytes>} */
      const { whenable } = findAckKit(channelID, portID, sequence);
      return whenable;
    }

    /**
     * @param {string} channelID
     * @param {string} portID
     * @param {string} rChannelID
     * @param {string} rPortID
     * @param {'ORDERED' | 'UNORDERED'} order
     * @returns {ConnectionHandler}
     */
    function makeIBCConnectionHandler(
      channelID,
      portID,
      rChannelID,
      rPortID,
      order,
    ) {
      const channelKey = `${channelID}:${portID}`;
      // Legacy because it holds a PromiseRecord
      const seqToAck = makeLegacyMap('SEQUENCE');
      channelKeyToSeqAck.init(channelKey, seqToAck);

      /**
       * @param {Connection} _conn
       * @param {Bytes} packetBytes
       * @param {ConnectionHandler} _handler
       * @param {object} root0
       * @param {bigint} [root0.relativeTimeoutNs]
       * @returns {PromiseWhenable<Bytes>} Acknowledgement data
       */
      let onReceive = async (
        _conn,
        packetBytes,
        _handler,
        { relativeTimeoutNs } = {},
      ) => {
        // console.error(`Remote IBC Handler ${portID} ${channelID}`);
        const packet = {
          source_port: portID,
          source_channel: channelID,
          destination_port: rPortID,
          destination_channel: rChannelID,
          data: dataToBase64(packetBytes),
        };
        return ibcSendPacket(packet, relativeTimeoutNs);
      };

      if (order === 'ORDERED') {
        // We set up a queue on the receiver to enforce ordering.
        const withChannelReceiveQueue = makeWithQueue();
        onReceive = withChannelReceiveQueue(onReceive);
      }

      return Far('IBCConnectionHandler', {
        async onOpen(conn, localAddr, remoteAddr, _handler) {
          console.debug(
            'onOpen Remote IBC Connection',
            channelID,
            portID,
            localAddr,
            remoteAddr,
          );
          const connP = E.resolve(conn);
          channelKeyToConnP.init(channelKey, connP);
        },
        onReceive,
        async onClose(_conn, _reason, _handler) {
          const packet = {
            source_port: portID,
            source_channel: channelID,
          };
          await E(ibcdev).downcall('startChannelCloseInit', { packet });
          const rejectReason = Error('Connection closed');
          for (const ackKit of seqToAck.values()) {
            ackKit.settler.reject(rejectReason);
          }
          channelKeyToSeqAck.delete(channelKey);
        },
      });
    }

    /** @param {string} localAddr */
    const localAddrToPortID = localAddr => {
      const m = localAddr.match(/^\/ibc-port\/([-a-zA-Z0-9._+#[\]<>]+)$/);
      if (!m) {
        throw TypeError(
          `Invalid port specification ${localAddr}; expected "/ibc-port/PORT"`,
        );
      }
      return m[1];
    };

    /** @type {ProtocolImpl} */
    let protocolImpl;

    /**
     * @typedef {object} OutboundCircuitRecord
     * @property {IBCConnectionID} dst
     * @property {'ORDERED' | 'UNORDERED'} order
     * @property {string} version
     * @property {IBCPacket} packet
     * @property {PromiseRecord<ConnectionHandler>} deferredHandler
     */

    /** @type {LegacyMap<Port, Set<PromiseRecord<ConnectionHandler>>>} */
    // Legacy because it holds a raw JavaScript Set
    const portToPendingConns = makeLegacyMap('Port');

    /** @type {ProtocolHandler} */
    const protocol = Far('IBCProtocolHandler', {
      async onCreate(impl, _protocolHandler) {
        console.debug('IBC onCreate');
        protocolImpl = impl;
      },
      async onInstantiate() {
        // The IBC channel is not known until after handshake.
        return '';
      },
      async generatePortID(_localAddr, _protocolHandler) {
        lastPortID += 1;
        return `port-${lastPortID}`;
      },
      async onBind(port, localAddr, _protocolHandler) {
        const portID = localAddrToPortID(localAddr);
        portToPendingConns.init(port, new Set());
        const packet = {
          source_port: portID,
        };
        return E(ibcdev).downcall('bindPort', { packet });
      },
      async onConnect(
        port,
        localAddr,
        remoteAddr,
        _chandler,
        _protocolHandler,
      ) {
        console.debug('IBC onConnect', localAddr, remoteAddr);
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
              `internal: ${JSON.stringify(
                h,
              )} did not begin with "/ibc-hop/XXX"`,
            );
          }
          h = h.substr(m[0].length);
          hops.push(m[1]);
        }

        // Generate a circuit.
        const rPortID = match[2];
        const order = match[3] === 'ordered' ? 'ORDERED' : 'UNORDERED';
        const version = match[4];

        const onConnectP = makePromiseKit();

        pendingConns.add(onConnectP);
        /** @type {Outbound[]} */
        let outbounds;
        if (srcPortToOutbounds.has(portID)) {
          outbounds = [...srcPortToOutbounds.get(portID)];
        } else {
          outbounds = [];
          srcPortToOutbounds.init(portID, outbounds);
        }
        outbounds.push({
          portID,
          counterparty: { port_id: rPortID },
          connectionHops: hops,
          order,
          version,
          onConnectP,
          localAddr,
        });

        // Initialise the channel, which automatic relayers should pick up.
        const packet = {
          source_port: portID,
          destination_port: rPortID,
        };

        await E(ibcdev).downcall('startChannelOpenInit', {
          packet,
          order,
          hops,
          version,
        });

        return onConnectP.promise;
      },
      async onListen(_port, localAddr, _listenHandler) {
        console.debug('IBC onListen', localAddr);
      },
      async onListenRemove(_port, localAddr, _listenHandler) {
        console.debug('IBC onListenRemove', localAddr);
      },
      async onRevoke(port, localAddr, _protocolHandler) {
        console.debug('IBC onRevoke', localAddr);
        const pendingConns = portToPendingConns.get(port);
        portToPendingConns.delete(port);
        const revoked = Error(`Port ${localAddr} revoked`);
        for (const onConnectP of pendingConns.values()) {
          onConnectP.reject(revoked);
        }
      },
    });

    return Far('IBCProtocolHandler', {
      ...protocol,
      async fromBridge(obj) {
        console.info('IBC fromBridge', obj);
        await null;
        switch (obj.event) {
          case 'channelOpenTry': {
            // They're (more or less politely) asking if we are listening, so make an attempt.
            const {
              channelID,
              portID,
              counterparty: { port_id: rPortID, channel_id: rChannelID },
              connectionHops: hops,
              order,
              version,
              counterpartyVersion: rVersion,
            } = obj;

            const localAddr = `/ibc-port/${portID}/${order.toLowerCase()}/${version}`;
            const ibcHops = hops.map(hop => `/ibc-hop/${hop}`).join('/');
            const remoteAddr = `${ibcHops}/ibc-port/${rPortID}/${order.toLowerCase()}/${rVersion}/ibc-channel/${rChannelID}`;

            // See if we allow an inbound attempt for this address pair (without
            // rejecting).
            const attempt = await when(
              E(protocolImpl).inbound(localAddr, remoteAddr),
            );

            // Tell what version string we negotiated.
            const attemptedLocal = await E(attempt).getLocalAddress();
            const match = attemptedLocal.match(
              // Match:  ... /ORDER/VERSION ...
              new RegExp('^(/[^/]+/[^/]+)*/(ordered|unordered)/([^/]+)(/|$)'),
            );

            const channelKey = `${channelID}:${portID}`;
            if (!match) {
              throw Error(
                `${channelKey}: cannot determine version from attempted local address ${attemptedLocal}`,
              );
            }
            const negotiatedVersion = match[3];

            channelKeyToAttempt.init(channelKey, attempt);
            channelKeyToInfo.init(channelKey, obj);

            try {
              if (negotiatedVersion !== version) {
                // Too late; the relayer gave us a version we didn't like.
                throw Error(
                  `${channelKey}: negotiated version was ${negotiatedVersion}; rejecting ${version}`,
                );
              }
            } catch (e) {
              // Clean up after our failed attempt.
              channelKeyToAttempt.delete(channelKey);
              channelKeyToInfo.delete(channelKey);
              void E(attempt).close();
              throw e;
            }
            break;
          }

          case 'channelOpenAck': {
            // Complete the pending outbound connection.
            const {
              portID,
              channelID,
              counterparty: { port_id: rPortID, channel_id: rChannelID },
              counterpartyVersion: rVersion,
              connectionHops: rHops,
            } = obj;
            const outbounds = srcPortToOutbounds.has(portID)
              ? srcPortToOutbounds.get(portID)
              : [];
            const oidx = outbounds.findIndex(
              ({
                counterparty: { port_id: iPortID },
                connectionHops: iHops,
              }) => {
                if (iPortID !== rPortID) {
                  return false;
                }
                if (iHops.length !== rHops.length) {
                  return false;
                }
                for (let i = 0; i < iHops.length; i += 1) {
                  if (iHops[i] !== rHops[i]) {
                    return false;
                  }
                }
                return true;
              },
            );
            oidx >= 0 || Fail`${portID}: did not expect channelOpenAck`;
            const { onConnectP, localAddr, ...chanInfo } = outbounds[oidx];
            outbounds.splice(oidx, 1);
            if (outbounds.length === 0) {
              srcPortToOutbounds.delete(portID);
            }

            // Finish the outbound connection.
            const ibcHops = rHops.map(hop => `/ibc-hop/${hop}`).join('/');
            const remoteAddress = `${ibcHops}/ibc-port/${rPortID}/${chanInfo.order.toLowerCase()}/${rVersion}/ibc-channel/${rChannelID}`;
            const localAddress = `${localAddr}/ibc-channel/${channelID}`;
            const rchandler = makeIBCConnectionHandler(
              channelID,
              portID,
              rChannelID,
              rPortID,
              chanInfo.order,
            );
            onConnectP.resolve({
              localAddress,
              remoteAddress,
              handler: rchandler,
            });
            break;
          }

          case 'channelOpenConfirm': {
            const { portID, channelID } = obj;
            const channelKey = `${channelID}:${portID}`;
            channelKeyToAttempt.has(channelKey) ||
              Fail`${channelKey}: did not expect channelOpenConfirm`;
            const attemptP = channelKeyToAttempt.get(channelKey);
            channelKeyToAttempt.delete(channelKey);

            // We have the information from our inbound connection, so complete it.
            const {
              order,
              counterparty: { port_id: rPortID, channel_id: rChannelID },
            } = channelKeyToInfo.get(channelKey);
            channelKeyToInfo.delete(channelKey);

            // Accept the attempt.
            const rchandler = makeIBCConnectionHandler(
              channelID,
              portID,
              rChannelID,
              rPortID,
              order,
            );
            const localAddr = await E(attemptP).getLocalAddress();
            void E(attemptP).accept({
              localAddress: `${localAddr}/ibc-channel/${channelID}`,
              handler: rchandler,
            });
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

            await when(E(connP).send(data), makeAckWatcher(ibcdev, packet));
            break;
          }

          case 'acknowledgementPacket': {
            const { packet, acknowledgement } = obj;
            const {
              sequence,
              source_channel: channelID,
              source_port: portID,
            } = packet;
            const ackKit = findAckKit(channelID, portID, sequence);
            ackKit.settler.resolve(base64ToBytes(acknowledgement));
            break;
          }

          case 'timeoutPacket': {
            const { packet } = obj;
            const {
              sequence,
              source_channel: channelID,
              source_port: portID,
            } = packet;
            const ackKit = findAckKit(channelID, portID, sequence);
            ackKit.settler.reject(Error(`Packet timed out`));
            break;
          }

          case 'channelCloseInit':
          case 'channelCloseConfirm': {
            const { portID, channelID } = obj;
            const channelKey = `${channelID}:${portID}`;
            if (channelKeyToConnP.has(channelKey)) {
              const connP = channelKeyToConnP.get(channelKey);
              channelKeyToConnP.delete(channelKey);
              void E(connP).close();
            }
            break;
          }

          case 'sendPacket': {
            const { packet, relativeTimeoutNs } = obj;
            ibcSendPacket(packet, relativeTimeoutNs).then(
              ack => console.info('Manual packet', packet, 'acked:', ack),
              e => console.warn('Manual packet', packet, 'failed:', e),
            );
            break;
          }

          default:
            console.error('Unexpected IBC_EVENT', obj.event);
            assert.fail(X`unrecognized method ${obj.event}`, TypeError);
        }
      },
    });
  }

  return makeIBCProtocolHandler;
};

harden(prepareIBCProtocolHandler);
