// @ts-check
import makeStore from '@agoric/store';
import rawHarden from '@agoric/harden';
import { producePromise } from '@agoric/produce-promise';

const harden = /** @type {<T>(x: T) => T} */ (rawHarden);

/**
 * @template T,U
 * @typedef {import('@agoric/store').Store<T,U>} Store
 */

/**
 * @typedef {string|Buffer|ArrayBuffer} Data
 * @typedef {ArrayBuffer} Bytes
 */

/*
 * Convert some data to bytes.
 *
 * @param {Data} data
 * @returns {Bytes}
 */
export function toBytes(data) {
  if (typeof data === 'string') {
    data = Buffer.from(data, 'utf-8');
  }
  return new Uint8Array(data).buffer;
}

/**
 * Convert bytes to a String.
 *
 * @param {Bytes} bytes
 * @return {string}
 */
export function bytesToString(bytes) {
  return Buffer.from(bytes).toString('utf-8');
}

/**
 * @typedef {string} Endpoint A local or remote address
 * See multiaddr.js for an opinionated router implementation
 *
 * @typedef {Object} Peer The local peer
 * @property {(localAddr: Endpoint) => Promise<Port>} bind Claim a port
 */

/**
 * @typedef {Object} Port A port that has been bound to a Peer
 * @property {() => Endpoint} getLocalAddress Get the locally bound name of this port
 * @property {(acceptHandler: ListenHandler) => void} addListener Begin accepting incoming channels
 * @property {(remote: Endpoint, channelHandler: ChannelHandler) => Promise<Channel>} connect Make an outbound channel
 * @property {(acceptHandler: ListenHandler) => void} removeListener Remove the currently-bound listener
 *
 * @typedef {Object} ListenHandler A handler for incoming channels
 * @property {(port: Port, l: ListenHandler) => Promise<void>} [onListen] The listener has been registered
 * @property {(port: Port, remote: Endpoint, l: ListenHandler) => Promise<ChannelHandler>} onAccept A new channel is incoming
 * @property {(port: Port, rej: any, l: ListenHandler) => Promise<void>} [onError] There was an error while listening
 * @property {(port: Port, l: ListenHandler) => Promise<void>} [onRemove] The listener has been removed
 */

/**
 * @typedef {Object} Channel
 * @property {(packetBytes: Data) => Promise<Bytes>} send Send a packet on the channel
 * @property {() => void} close Close both ends of the channel
 *
 * @typedef {Object} ChannelHandler A handler for a given Channel
 * @property {(channel: Channel, c: ChannelHandler) => void} [onOpen] The channel has been opened
 * @property {(channel: Channel, packetBytes: Bytes, c: ChannelHandler) => Promise<Data>} [onReceive] The channel received a packet
 * @property {(channel: Channel, reason?: CloseReason, c: ChannelHandler) => Promise<void>} [onClose] The channel has been closed
 *
 * @typedef {any?} CloseReason The reason a channel was closed
 */

/**
 * @typedef {Object} Packet
 * @property {Endpoint} src Source of the packet
 * @property {Endpoint} dst Destination of the packet
 * @property {Bytes} bytes Bytes in the packet
 * @property {import('@agoric/produce-promise').PromiseRecord<Bytes>} deferredAck The deferred to resolve the result
 *
 * @typedef {number} TTL A time-to-live for a packet
 */

/**
 * @typedef {Object} PeerHandler A handler for things the peer implementation will invoke
 * @property {(peer: PeerImpl, p: PeerHandler) => Promise<void>} onCreate This peer is created
 * @property {(port: Port, listenHandler: ListenHandler, p: PeerHandler) => Promise<void>} onListen A port was listening
 * @property {(port: Port, listenHandler: ListenHandler, p: PeerHandler) => Promise<void>} onListenRemove A port listener has been reset
 * @property {(port: Port, remote: Endpoint, p: PeerHandler) => Promise<ChannelHandler>} onConnect A port initiates an outbound connection
 *
 * @typedef {Object} PeerImpl Things the peer can do for us
 * @property {(port: Port, remote: Endpoint, channelHandler: ChannelHandler) => Promise<Channel>} connect Establish a channel from this peer to an endpoint
 */

/**
 * Create a Peer that has a handler.
 *
 * @param {PeerHandler} peerHandler
 * @returns {Peer} the local capability for connecting and listening
 */
export function makeNetworkPeer(peerHandler) {
  /**
   * @type {PeerImpl}
   */
  const peerImpl = harden({
    async connect(port, dst, srcHandler) {
      const dstHandler = await peerHandler.onConnect(port, dst, peerHandler);

      /**
       * Create half of a channel pair.
       *
       * @param {ChannelHandler} local
       * @param {ChannelHandler} remote
       * @returns {[Channel, () => void]}
       */
      const makeChannel = (local, remote) => {
        const pending = [];
        let queue = [];
        let closed;
        /**
         * @type {Channel}
         */
        const channel = harden({
          async close() {
            if (closed) {
              throw closed;
            }
            closed = Error('Channel closed');
            if (local.onClose) {
              await local.onClose(channel, undefined, local);
            }
            if (remote.onClose) {
              await remote.onClose(channel, undefined, remote);
            }
            while (pending.length) {
              const deferred = pending.shift();
              deferred.reject(closed);
            }
          },
          async send(data) {
            // console.log('send', data, local === srcHandler);
            if (closed) {
              throw closed;
            }
            const deferred = producePromise();
            if (queue) {
              queue.push([data, deferred]);
              pending.push(deferred);
              return deferred.promise;
            }
            if (!remote.onReceive) {
              return toBytes('');
            }
            const bytes = toBytes(data);
            const ack = await remote.onReceive(channel, bytes, remote);
            return toBytes(ack);
          },
        });
        const flush = () => {
          const q = queue;
          queue = undefined;
          while (q && q.length) {
            const [data, deferred] = q.shift();
            channel
              .send(data)
              .then(deferred.resolve, deferred.reject)
              .finally(() => {
                const i = pending.indexOf(deferred);
                if (i >= 0) {
                  pending.splice(i, 1);
                }
              });
          }
        };
        return [channel, flush];
      };

      const [srcChannel, srcFlush] = makeChannel(srcHandler, dstHandler);
      const [dstChannel, dstFlush] = makeChannel(dstHandler, srcHandler);

      if (srcHandler.onOpen) {
        srcHandler.onOpen(srcChannel, srcHandler);
      }
      if (dstHandler.onOpen) {
        dstHandler.onOpen(dstChannel, dstHandler);
      }

      srcFlush();
      dstFlush();

      return srcChannel;
    },
  });

  /**
   * @type {Store<string, Port>}
   */
  const boundPorts = makeStore();

  // Wire up the local peer to the handler.
  peerHandler.onCreate(peerImpl, peerHandler);

  /**
   * @param {Endpoint} localPort
   */
  const bind = async localPort => {
    /**
     * @type {ListenHandler}
     */
    let listening;

    /**
     * @type {Port}
     */
    const port = harden({
      getLocalAddress() {
        return localPort;
      },
      async addListener(listenHandler) {
        if (!listenHandler) {
          throw TypeError(`listenHandler is not defined`);
        }
        if (listening) {
          throw Error(`Port ${localPort} is already listening`);
        }
        await peerHandler.onListen(port, listenHandler, peerHandler);
        listening = listenHandler;
        await listenHandler.onListen(port, listenHandler);
      },
      async removeListener(listenHandler) {
        if (!listening) {
          throw Error(`Port ${localPort} is not listening`);
        }
        if (listening !== listenHandler) {
          throw Error(`Port ${localPort} handler to remove is not listening`);
        }
        await peerHandler.onListenRemove(port, listenHandler, peerHandler);
        listening = undefined;
        if (listenHandler.onRemove) {
          await listenHandler.onRemove(port, listenHandler);
        }
      },
      async connect(remotePort, channelHandler) {
        /**
         * @type {Endpoint}
         */
        const dst = harden(remotePort);
        return peerImpl.connect(port, dst, channelHandler);
      },
    });

    boundPorts.init(localPort, port);
    return port;
  };

  return harden({ bind });
}

/**
 * Create a ChannelHandler that just echoes its packets.
 *
 * @returns {ChannelHandler}
 */
export function makeEchoChannelHandler() {
  /**
   * @type {Channel}
   */
  return harden({
    async onReceive(_channel, bytes, _channelHandler) {
      return bytes;
    },
  });
}
