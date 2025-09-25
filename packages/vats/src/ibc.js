// @ts-check

import { assert, X, Fail } from '@endo/errors';
import { E } from '@endo/far';

import { byteSourceToBase64, base64ToBytes } from '@agoric/network';

import { makeTracer, NonNullish } from '@agoric/internal';
import {
  localAddrToPortID,
  decodeRemoteIbcAddress,
  encodeLocalIbcAddress,
  encodeRemoteIbcAddress,
  decodeIbcEndpoint,
  encodeIbcEndpoint,
} from '../tools/ibc-utils.js';

const trace = makeTracer('IBC', false);

/**
 * @import {LocalIbcAddress, RemoteIbcAddress} from '../tools/ibc-utils.js';
 * @import {AttemptDescription} from '@agoric/network';
 */

// CAVEAT: IBC acks cannot be empty, as the Cosmos IAVL tree cannot represent
// empty acknowledgements as distinct from unacknowledged packets.
const DEFAULT_ACKNOWLEDGEMENT = '\x00';

// Default timeout after 60 minutes.
const DEFAULT_PACKET_TIMEOUT_NS = 60n * 60n * 1_000_000_000n;

/**
 * @import {Endpoint, Connection, ConnectionHandler, InboundAttempt, Bytes, ProtocolHandler, ProtocolImpl} from '@agoric/network';
 * @import {BridgeHandler, ScopedBridgeManager, ConnectingInfo, IBCChannelID, IBCChannelOrdering, IBCEvent, IBCPacket, IBCPortID, IBCDowncallPacket, IBCDowncallMethod, IBCDowncallReturn, IBCDowncall, IBCBridgeEvent} from './types.js';
 * @import {Zone} from '@agoric/base-zone';
 * @import {PromiseVow, Remote, VowKit, VowResolver, VowTools} from '@agoric/vow';
 */

/** @typedef {VowKit<AttemptDescription>} OnConnectP */

/**
 * @typedef {Omit<
 *   ConnectingInfo,
 *   'counterparty' | 'channelID' | 'counterpartyVersion'
 * > & {
 *   localAddr: Endpoint;
 *   onConnectP: OnConnectP;
 *   counterparty: { port_id: string };
 * }} Outbound
 */

// FIXME(TS9006) remove 'any'
/**
 * @param {Zone} zone
 * @returns {any}
 */
export const prepareIBCConnectionHandler = zone => {
  /**
   * @param {IBCChannelID} channelID
   * @param {IBCPortID} portID
   * @param {IBCChannelID} rChannelID
   * @param {IBCPortID} rPortID
   * @param {IBCChannelOrdering} order
   * @returns {ConnectionHandler}
   */
  const makeIBCConnectionHandler = zone.exoClass(
    'IBCConnectionHandler',
    undefined,
    /**
     * @param {{
     *   protocolUtils: any;
     *   channelKeyToConnP: MapStore<
     *     string,
     *     import('@agoric/vow').Remote<Connection>
     *   >;
     *   channelKeyToSeqAck: MapStore<
     *     string,
     *     MapStore<
     *       bigint | number,
     *       Partial<import('@agoric/vow').VowKit<Bytes>>
     *     >
     *   >;
     * }} param0
     * @param {{
     *   channelID: IBCChannelID;
     *   portID: string;
     *   rChannelID: IBCChannelID;
     *   rPortID: string;
     *   order: 'ORDERED' | 'UNORDERED';
     * }} param1
     */
    (
      { protocolUtils, channelKeyToConnP, channelKeyToSeqAck },
      { channelID, portID, rChannelID, rPortID, order },
    ) => {
      const channelKey = `${channelID}:${portID}`;
      const seqToAck = zone.detached().mapStore('seqToAck');
      channelKeyToSeqAck.init(channelKey, seqToAck);

      return {
        protocolUtils,
        channelID,
        portID,
        rChannelID,
        rPortID,
        order,
        channelKeyToConnP,
        channelKeyToSeqAck,
      };
    },
    {
      /** @type {Required<ConnectionHandler>['onOpen']} */
      async onOpen(conn, localAddr, remoteAddr, _handler) {
        const { channelID, portID, channelKeyToConnP } = this.state;

        trace(
          'onOpen Remote IBC Connection',
          channelID,
          portID,
          localAddr,
          remoteAddr,
        );
        const channelKey = `${channelID}:${portID}`;

        channelKeyToConnP.init(channelKey, conn);
      },
      /** @type {Required<ConnectionHandler>['onReceive']} */
      async onReceive(
        _conn,
        packetBytes,
        _handler,
        { relativeTimeoutNs } = {},
      ) {
        const { portID, channelID, rPortID, rChannelID } = this.state;
        const { protocolUtils } = this.state;
        // console.error(`Remote IBC Handler ${portID} ${channelID}`);
        /** @type {IBCPacket} */
        const packet = {
          source_port: portID,
          source_channel: channelID,
          destination_port: rPortID,
          destination_channel: rChannelID,
          data: byteSourceToBase64(packetBytes),
        };
        return protocolUtils.ibcSendPacket(packet, relativeTimeoutNs);
      },
      /** @type {Required<ConnectionHandler>['onClose']} */
      onClose(_conn, _reason) {
        const { portID, channelID } = this.state;
        const { protocolUtils, channelKeyToSeqAck, channelKeyToConnP } =
          this.state;

        const packet = {
          source_port: portID,
          source_channel: channelID,
        };
        const channelKey = `${channelID}:${portID}`;
        const rejectReason = Error('Connection closed');
        const seqToAck = channelKeyToSeqAck.get(channelKey);

        for (const { resolver } of seqToAck.values()) {
          if (resolver) {
            resolver.reject(rejectReason);
          }
        }
        channelKeyToSeqAck.delete(channelKey);

        // This Connection object is initiating the close event
        if (channelKeyToConnP.has(channelKey)) {
          channelKeyToConnP.delete(channelKey);
          return protocolUtils.downcall('startChannelCloseInit', {
            packet,
          });
        }
        return Promise.resolve();
      },
    },
  );

  return makeIBCConnectionHandler;
};

/**
 * @param {Zone} zone
 * @param {VowTools} powers
 */
export const prepareIBCProtocol = (zone, powers) => {
  const { makeVowKit, watch } = powers;

  const makeIBCConnectionHandler = prepareIBCConnectionHandler(zone);

  /**
   * @typedef {object} IBCDevice
   * @property {(method: string, args: object) => Promise<any>} downcall
   */

  /**
   * @type {WeakMapStore<
   *   IBCDevice,
   *   {
   *     protocolHandler: ProtocolHandler;
   *     bridgeHandler: BridgeHandler;
   *   }
   * >} Map
   *   from IBC device to existing handler
   */
  const ibcdevToKit = zone.weakMapStore('ibcdevToHandler');

  const detached = zone.detached();

  /**
   * Create a handler for the IBC protocol, both from the network and from the
   * bridge.
   */
  const makeIBCProtocolKit = zone.exoClassKit(
    'IBCProtocolHandler',
    undefined,
    /** @param {IBCDevice} ibcdev */
    ibcdev => {
      /** @type {MapStore<string, Remote<Connection>>} */
      const channelKeyToConnP = detached.mapStore('channelKeyToConnP');

      /** @type {MapStore<string, ConnectingInfo>} */
      const channelKeyToInfo = detached.mapStore('channelKeyToInfo');

      /** @type {MapStore<string, Remote<InboundAttempt>>} */
      const channelKeyToAttempt = detached.mapStore('channelKeyToAttempt');

      /** @type {MapStore<string, Outbound[]>} */
      const srcPortToOutbounds = detached.mapStore('srcPortToOutbounds');

      /**
       * @type {MapStore<
       *   string,
       *   MapStore<bigint | number, Partial<VowKit<Bytes>>>
       * >}
       */
      const channelKeyToSeqAck = detached.mapStore('channelKeyToSeqAck');

      /** @type {MapStore<string, SetStore<VowResolver>>} */
      const portToPendingConns = detached.mapStore('portToPendingConns');

      return {
        ibcdev,
        channelKeyToConnP,
        channelKeyToInfo,
        channelKeyToAttempt,
        srcPortToOutbounds,
        channelKeyToSeqAck,
        portToPendingConns,
        lastPortID: 0n, // Nonce for creating port identifiers.
        /** @type {Remote<ProtocolImpl> | null} */
        protocolImpl: null,
      };
    },
    {
      protocolHandler: {
        /** @type {Required<ProtocolHandler>['onCreate']} */
        async onCreate(impl) {
          trace('onCreate');
          this.state.protocolImpl = impl;
        },
        /** @type {Required<ProtocolHandler>['onInstantiate']} */
        async onInstantiate() {
          // The IBC channel is not known until after handshake.
          return '';
        },
        /** @type {Required<ProtocolHandler>['generatePortID']} */
        async generatePortID() {
          this.state.lastPortID += 1n;
          return `port-${this.state.lastPortID}`;
        },
        /** @type {Required<ProtocolHandler>['onBind']} */
        async onBind(_port, localAddr) {
          const { util } = this.facets;
          const { portToPendingConns } = this.state;

          // @ts-expect-error may not be LocalIbcAddress
          const portID = localAddrToPortID(localAddr);
          portToPendingConns.init(portID, detached.setStore('pendingConns'));
          const packet = {
            source_port: portID,
          };
          return util.downcall('bindPort', { packet });
        },
        /** @type {Required<ProtocolHandler>['onConnect']} */
        async onConnect(_port, localAddr, remoteAddr) {
          const { util } = this.facets;
          const { portToPendingConns, srcPortToOutbounds } = this.state;

          trace('onConnect', localAddr, remoteAddr);
          // @ts-expect-error may not be LocalIbcAddress
          const portID = localAddrToPortID(localAddr);
          const pendingConns = portToPendingConns.get(portID);

          const { rPortID, hops, order, version } =
            decodeRemoteIbcAddress(remoteAddr);

          const kit = makeVowKit();

          pendingConns.add(kit.resolver);
          /** @type {Outbound} */
          const ob = {
            portID,
            counterparty: { port_id: rPortID },
            connectionHops: hops,
            order,
            version,
            onConnectP: kit,
            localAddr,
          };
          if (srcPortToOutbounds.has(portID)) {
            const outbounds = srcPortToOutbounds.get(portID);
            srcPortToOutbounds.set(portID, harden([...outbounds, ob]));
          } else {
            srcPortToOutbounds.init(portID, harden([ob]));
          }

          // Initialise the channel, which a listening relayer should pick up.
          /** @type {IBCDowncallPacket<'startChannelOpenInit'>} */
          const packet = {
            source_port: portID,
            destination_port: rPortID,
          };

          await util.downcall('startChannelOpenInit', {
            packet,
            order,
            hops,
            version,
          });

          return kit.vow;
        },
        /** @type {Required<ProtocolHandler>['onListen']} */
        async onListen(_port, localAddr) {
          trace('onListen', localAddr);
        },
        /** @type {Required<ProtocolHandler>['onListenRemove']} */
        async onListenRemove(_port, localAddr) {
          trace('onListenRemove', localAddr);
        },
        /** @type {Required<ProtocolHandler>['onRevoke']} */
        async onRevoke(_port, localAddr) {
          const { portToPendingConns } = this.state;
          trace('onRevoke', localAddr);
          // @ts-expect-error may not be LocalIbcAddress
          const portID = localAddrToPortID(localAddr);

          const pendingConns = portToPendingConns.get(portID);
          portToPendingConns.delete(portID);
          const revoked = Error(`Port ${localAddr} revoked`);
          for (const resolver of pendingConns.values()) {
            resolver.reject(revoked);
          }
        },
      },
      bridgeHandler: {
        /** @param {IBCEvent<IBCBridgeEvent>} obj */
        async fromBridge(obj) {
          const {
            protocolImpl,
            channelKeyToAttempt,
            channelKeyToInfo,
            srcPortToOutbounds,
            channelKeyToConnP,
            channelKeyToSeqAck,
          } = this.state;

          const { util } = this.facets;

          console.info('IBC fromBridge', obj);
          await null;
          switch (obj.event) {
            case 'channelOpenInit': {
              const {
                channelID,
                portID,
                counterparty: { port_id: rPortID, channel_id: rChannelID },
                connectionHops: hops,
                order,
                version,
                asyncVersions,
              } = /** @type {IBCEvent<'channelOpenInit'>} */ (obj);
              if (!asyncVersions) {
                // Synchronous versions have already been negotiated.
                break;
              }

              // We have async version negotiation, so we must call back before the
              // channel can make progress.
              // We just use the provided version without failing.
              await util.downcall('initOpenExecuted', {
                packet: {
                  source_port: portID,
                  source_channel: channelID,
                  destination_port: rPortID,
                  destination_channel: rChannelID,
                },
                order,
                version,
                hops,
              });
              break;
            }
            case 'channelOpenTry': {
              // They're (more or less politely) asking if we are listening, so make an attempt.
              const {
                portID,
                counterparty: { port_id: rPortID, channel_id: rChannelID },
                connectionHops: hops,
                order,
                version,
                counterpartyVersion: rVersion,
              } = /** @type {IBCEvent<'channelOpenTry'>} */ (obj);

              const localAddr = encodeLocalIbcAddress(portID, order, version);
              const remoteAddr = encodeRemoteIbcAddress(
                hops,
                rPortID,
                order,
                rVersion,
                rChannelID,
              );

              // See if we allow an inbound attempt for this address pair (without
              // rejecting).
              // const attempt = await this.state.protocolImpl
              //   ?.inbound(localAddr, remoteAddr)
              //   .then(
              //     ack => console.info('Manual packet', ack, 'acked:', ack),
              //     e => console.warn('Manual packet', e, 'failed:', e),
              //   );

              assert(protocolImpl);

              return watch(
                E(protocolImpl).inbound(localAddr, remoteAddr),
                this.facets.protocolImplInboundWatcher,
                {
                  obj,
                  rPortID,
                  rChannelID,
                  hops,
                },
              );
            }

            case 'channelOpenAck': {
              // Complete the pending outbound connection.
              const {
                portID,
                channelID,
                counterparty: { port_id: rPortID, channel_id: rChannelID },
                counterpartyVersion: rVersion,
                connectionHops: rHops,
              } = /** @type {IBCEvent<'channelOpenAck'>} */ (obj);

              const readonlyOutbounds = this.state.srcPortToOutbounds.has(
                portID,
              )
                ? this.state.srcPortToOutbounds.get(portID)
                : [];
              const oidx = readonlyOutbounds.findIndex(
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
              const { onConnectP, localAddr, ...chanInfo } =
                readonlyOutbounds[oidx];
              const outbounds = readonlyOutbounds
                .slice(0, oidx)
                .concat(readonlyOutbounds.slice(oidx + 1));
              if (outbounds.length === 0) {
                srcPortToOutbounds.delete(portID);
              } else {
                srcPortToOutbounds.set(portID, harden(outbounds));
              }

              // Finish the outbound connection.
              const remoteAddress = encodeRemoteIbcAddress(
                rHops,
                rPortID,
                chanInfo.order,
                rVersion,
                rChannelID,
              );
              const decodedLocal = decodeIbcEndpoint(localAddr);
              const localAddress = encodeIbcEndpoint({
                ...decodedLocal,
                order: chanInfo.order,
                version: rVersion,
                channelID,
              });
              const rchandler = makeIBCConnectionHandler(
                {
                  protocolUtils: util,
                  channelKeyToConnP,
                  channelKeyToSeqAck,
                },
                {
                  channelID,
                  portID,
                  rChannelID,
                  rPortID,
                  order: chanInfo.order,
                },
              );
              onConnectP.resolver.resolve({
                localAddress,
                remoteAddress,
                handler: rchandler,
              });
              break;
            }

            case 'channelOpenConfirm': {
              const { portID, channelID } =
                /** @type {IBCEvent<'channelOpenConfirm'>} */ (obj);

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
                {
                  protocolUtils: util,
                  channelKeyToConnP,
                  channelKeyToSeqAck,
                },
                {
                  channelID,
                  portID,
                  rChannelID,
                  rPortID,
                  order,
                },
              );
              const localAddr = await E(attemptP).getLocalAddress();
              void E(attemptP).accept({
                localAddress: `${localAddr}/ibc-channel/${channelID}`,
                handler: rchandler,
              });
              break;
            }

            case 'receivePacket': {
              const { packet } = /** @type {IBCEvent<'receivePacket'>} */ (obj);
              const {
                data: data64,
                destination_port: portID,
                destination_channel: channelID,
              } = packet;
              const channelKey = `${channelID}:${portID}`;
              const conn = channelKeyToConnP.get(channelKey);
              const data = base64ToBytes(data64);

              return watch(E(conn).send(data), this.facets.ackWatcher, {
                packet,
              });
            }

            case 'acknowledgementPacket': {
              const { packet, acknowledgement } =
                /** @type {IBCEvent<'acknowledgementPacket'>} */ (obj);
              const {
                sequence,
                source_channel: channelID,
                source_port: portID,
              } = packet;
              if (sequence === undefined)
                throw TypeError('acknowledgementPacket without sequence');
              const resolver = util.extractFromAckKit(
                channelID,
                portID,
                BigInt(sequence),
                'resolver',
              );
              resolver && resolver.resolve(base64ToBytes(acknowledgement));
              break;
            }

            case 'timeoutPacket': {
              const { packet } = /** @type {IBCEvent<'timeoutPacket'>} */ (obj);
              const {
                sequence,
                source_channel: channelID,
                source_port: portID,
              } = packet;
              if (sequence === undefined)
                throw TypeError('timeoutPacket without sequence');

              const resolver = util.extractFromAckKit(
                channelID,
                portID,
                BigInt(sequence),
                'resolver',
              );
              resolver && resolver.reject(Error(`Packet timed out`));
              break;
            }

            // We ignore the close init tx message, since any decision to
            // close should be left to the VM...
            case 'channelCloseInit': {
              break;
            }

            // ... or received from the other side.
            case 'channelCloseConfirm': {
              const { portID, channelID } =
                /** @type {IBCEvent<'channelCloseConfirm'>} */ (obj);
              const channelKey = `${channelID}:${portID}`;
              if (channelKeyToConnP.has(channelKey)) {
                const conn = channelKeyToConnP.get(channelKey);
                channelKeyToConnP.delete(channelKey);
                void E(conn).close();
              }
              break;
            }

            case 'sendPacket': {
              const { packet, relativeTimeoutNs } =
                /** @type {IBCEvent<'sendPacket'>} */ (obj);
              util.ibcSendPacket(packet, relativeTimeoutNs).then(
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
      },
      util: {
        /**
         * @template {IBCDowncallMethod} M
         * @param {M} method
         * @param {IBCDowncall<M>} args
         * @returns {Promise<IBCDowncallReturn<M>>}
         */
        downcall(method, args) {
          return E(this.state.ibcdev).downcall(method, args);
        },
        /**
         * Send a packet out via the IBC device.
         *
         * @param {IBCPacket} packet
         * @param {bigint} [relativeTimeoutNs]
         * @returns {PromiseVow<Bytes>} Acknowledgement data
         */
        async ibcSendPacket(
          packet,
          relativeTimeoutNs = DEFAULT_PACKET_TIMEOUT_NS,
        ) {
          const { util } = this.facets;
          // Make a kernel call to do the send.
          const fullPacket = await util.downcall('sendPacket', {
            packet,
            relativeTimeoutNs,
          });

          // Extract the actual sequence number from the return.
          const {
            sequence,
            source_channel: channelID,
            source_port: portID,
          } = fullPacket;

          const vow = util.extractFromAckKit(
            channelID,
            portID,
            BigInt(sequence),
            'vow',
          );
          return NonNullish(vow);
        },

        /**
         * Find an acknowledgment kit for the specified (channelID, portID,
         * sequence), creating it if not found, and then extract the specified
         * key and perform any necessary cleanup.
         *
         * @template {'resolver' | 'vow'} K
         * @param {IBCChannelID} channelID
         * @param {IBCPortID} portID
         * @param {bigint} sequence
         * @param {K} key
         * @returns {VowKit<Bytes>[K] | undefined}
         */
        extractFromAckKit(channelID, portID, sequence, key) {
          const { channelKeyToSeqAck } = this.state;
          const channelKey = `${channelID}:${portID}`;
          const seqToAck = channelKeyToSeqAck.get(channelKey);

          // Try also looking up the sequence as a number in case it was added
          // to the map before the upgrade to bigints.
          for (const seq of [sequence, Number(sequence)]) {
            if (!seqToAck.has(seq)) {
              continue;
            }

            const { [key]: extracted, ...rest } = seqToAck.get(seq);
            if (Reflect.has(rest, 'resolver') || Reflect.has(rest, 'vow')) {
              // We have some other stuff in the kit, so just update it.
              seqToAck.set(seq, harden(rest));
            } else {
              // We emptied everything from the kit, so now delete it.  It
              // shan't be resurrected, by the rules that 'vow' is used only by
              // sendPacket, and 'resolver' is used only by one of
              // onAcknowledgement or onTimeout.
              seqToAck.delete(seq);
            }
            return extracted;
          }

          /**
           * We don't have a kit for this sequence yet, so create one.
           *
           * @type {VowKit<Bytes>}
           */
          const { [key]: extracted, ...rest } = makeVowKit();
          seqToAck.init(sequence, harden(rest));
          return extracted;
        },
      },
      ackWatcher: {
        /**
         * @param {string} ack
         * @param {{ packet: any }} watcherContext
         */
        onFulfilled(ack, watcherContext) {
          const { packet } = watcherContext;

          const realAck = ack || DEFAULT_ACKNOWLEDGEMENT;
          const ack64 = byteSourceToBase64(realAck);
          this.facets.util
            .downcall('receiveExecuted', {
              packet,
              ack: ack64,
            })
            .catch(e => this.facets.ackWatcher.onRejected(e));
        },
        onRejected(e) {
          console.log(e);
        },
      },
      protocolImplAttemptWatcher: {
        /**
         * @param {string} attemptedLocal
         * @param {{
         *   channelID: IBCChannelID;
         *   portID: string;
         *   attempt: any;
         *   obj: any;
         *   asyncVersions: any;
         *   rPortID: string;
         *   rChannelID: IBCChannelID;
         *   order: IBCChannelOrdering;
         *   hops: any;
         *   version: string;
         * }} watcherContext
         */
        onFulfilled(attemptedLocal, watcherContext) {
          const {
            channelID,
            portID,
            attempt,
            obj,
            asyncVersions,
            rPortID,
            rChannelID,
            order,
            hops,
            version,
          } = watcherContext;
          const { channelKeyToAttempt, channelKeyToInfo } = this.state;

          const al = decodeIbcEndpoint(attemptedLocal);
          const channelKey = `${channelID}:${portID}`;
          if (!al.version) {
            throw Error(
              `${channelKey}: cannot determine version from attempted local address ${attemptedLocal}`,
            );
          }

          channelKeyToAttempt.init(channelKey, attempt);
          channelKeyToInfo.init(channelKey, obj);

          const negotiatedVersion = al.version;

          try {
            if (asyncVersions) {
              // We have async version negotiation, so we must call back now.
              return this.facets.util.downcall('tryOpenExecuted', {
                packet: {
                  source_port: rPortID,
                  source_channel: rChannelID,
                  destination_port: portID,
                  destination_channel: channelID,
                },
                order,
                version: negotiatedVersion,
                hops,
              });
            } else if (negotiatedVersion !== version) {
              // Too late; the other side gave us a version we didn't like.
              throw Error(
                `${channelKey}: async negotiated version was ${negotiatedVersion} but synchronous version was ${version}`,
              );
            }
          } catch (e) {
            // Clean up after our failed attempt.
            channelKeyToAttempt.delete(channelKey);
            channelKeyToInfo.delete(channelKey);
            void E(attempt).close();
            throw e;
          }
        },
      },
      protocolImplInboundWatcher: {
        /**
         * @param {any} attempt
         * @param {Record<string, any>} watchContext
         */
        onFulfilled(attempt, watchContext) {
          const { obj } = watchContext;

          // Tell what version string we negotiated.
          return watch(
            E(attempt).getLocalAddress(),
            this.facets.protocolImplAttemptWatcher,
            {
              ...obj,
              ...watchContext,
              attempt,
            },
          );
        },
      },
    },
  );

  /** @param {IBCDevice} ibcdev */
  const makeIBCProtocolHandlerKit = ibcdev => {
    const { protocolHandler, bridgeHandler } = makeIBCProtocolKit(ibcdev);
    return harden({ protocolHandler, bridgeHandler });
  };

  /** @param {IBCDevice} ibcdev */
  const provideIBCProtocolHandlerKit = ibcdev => {
    if (ibcdevToKit.has(ibcdev)) {
      return ibcdevToKit.get(ibcdev);
    }
    const kit = makeIBCProtocolHandlerKit(ibcdev);
    ibcdevToKit.init(ibcdev, kit);
    return kit;
  };
  return provideIBCProtocolHandlerKit;
};
harden(prepareIBCProtocol);

/** @param {Zone} zone */
export const prepareCallbacks = zone => {
  return zone.exoClass(
    'callbacks',
    undefined,
    /** @param {ScopedBridgeManager<'dibc'>} dibcBridgeManager */
    dibcBridgeManager => ({ dibcBridgeManager }),
    {
      /**
       * @param {string} method
       * @param {any} obj
       */
      downcall(method, obj) {
        const { dibcBridgeManager } = this.state;
        return E(dibcBridgeManager).toBridge({
          ...obj,
          type: 'IBC_METHOD',
          method,
        });
      },
    },
  );
};
