// @ts-check
import makeStore from '@agoric/store';
import rawHarden from '@agoric/harden';
import { producePromise } from '@agoric/produce-promise';
import { E as defaultE } from '@agoric/eventual-send';

const harden = /** @type {<T>(x: T) => T} */ (rawHarden);

/**
 * @template T,U
 * @typedef {import('@agoric/store').Store<T,U>} Store
 */

/**
 * @typedef {string|Buffer|ArrayBuffer} Data
 * @typedef {ArrayBuffer} Bytes
 */

/**
 * @typedef {string} Endpoint A local or remote address
 * See multiaddr.js for an opinionated router implementation
 */

/**
 * @typedef {Object} Peer The local peer
 * @property {(localAddr: Endpoint) => Promise<Port>} bind Claim a port
 */

/**
 * @typedef {Object} Port A port that has been bound to a Peer
 * @property {() => Endpoint} getLocalAddress Get the locally bound name of this port
 * @property {(acceptHandler: ListenHandler) => void} addListener Begin accepting incoming channels
 * @property {(remote: Endpoint, channelHandler: ChannelHandler) => Promise<Channel>} connect Make an outbound channel
 * @property {(acceptHandler: ListenHandler) => void} removeListener Remove the currently-bound listener
 */

/**
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
 */

/**
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
 * @property {(port: Port, localAddr: Endpoint, listenHandler: ListenHandler, p: PeerHandler) => Promise<void>} onListen A port was listening
 * @property {(port: Port, localAddr: Endpoint, listenHandler: ListenHandler, p: PeerHandler) => Promise<void>} onListenRemove A port listener has been reset
 * @property {(port: Port, localAddr: Endpoint, remote: Endpoint, p: PeerHandler) => Promise<ChannelHandler>} onConnect A port initiates an outbound connection
 *
 * @typedef {Object} PeerImpl Things the peer can do for us
 * @property {(port: Port, remote: Endpoint, channelHandler: ChannelHandler) => Promise<Channel>} connect Establish a channel from this peer to an endpoint
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
  const buf = new Uint8Array(data);
  const toString = () => String.fromCharCode.apply(null, buf);
  Object.defineProperties(buf, {
    toString: {
      writable: false,
      value: toString,
    },
  });
  return buf;
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

const rethrowIfUnset = err => {
  if (!(err instanceof TypeError) || !err.message.match(/is not a function$/)) {
    throw err;
  }
  return true;
};

/**
 * Create a Peer that has a handler.
 *
 * @param {PeerHandler} peerHandler
 * @param {typeof defaultE} [E=defaultE] Eventual send function
 * @returns {Peer} the local capability for connecting and listening
 */
export function makeNetworkPeer(peerHandler, E = defaultE) {
  /**
   * @type {PeerImpl}
   */
  const peerImpl = harden({
    async connect(port, dst, srcHandler) {
      const localAddr = await E(port).getLocalAddress();
      const dstHandler = await E(peerHandler).onConnect(
        port,
        localAddr,
        dst,
        peerHandler,
      );

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
            await Promise.all([
              E(local)
                .onClose(channel, undefined, local)
                .catch(rethrowIfUnset),
              E(remote)
                .onClose(channel, undefined, remote)
                .catch(rethrowIfUnset),
            ]);
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
            const bytes = toBytes(data);
            const ack = await E(remote)
              .onReceive(channel, bytes, remote)
              .catch(err => rethrowIfUnset(err) || '');
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

      E(srcHandler)
        .onOpen(srcChannel, srcHandler)
        .catch(rethrowIfUnset);
      E(dstHandler)
        .onOpen(dstChannel, dstHandler)
        .catch(rethrowIfUnset);

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
  E(peerHandler).onCreate(peerImpl, peerHandler);

  /**
   * @param {Endpoint} localAddr
   */
  const bind = async localAddr => {
    /**
     * @type {ListenHandler}
     */
    let listening;

    /**
     * @type {Port}
     */
    const port = harden({
      getLocalAddress() {
        return localAddr;
      },
      async addListener(listenHandler) {
        if (!listenHandler) {
          throw TypeError(`listenHandler is not defined`);
        }
        if (listening) {
          throw Error(`Port ${localAddr} is already listening`);
        }
        await E(peerHandler).onListen(
          port,
          localAddr,
          listenHandler,
          peerHandler,
        );
        listening = listenHandler;
        await E(listenHandler)
          .onListen(port, listenHandler)
          .catch(rethrowIfUnset);
      },
      async removeListener(listenHandler) {
        if (!listening) {
          throw Error(`Port ${localAddr} is not listening`);
        }
        if (listening !== listenHandler) {
          throw Error(`Port ${localAddr} handler to remove is not listening`);
        }
        await E(peerHandler).onListenRemove(
          port,
          localAddr,
          listenHandler,
          peerHandler,
        );
        listening = undefined;
        await E(listenHandler)
          .onRemove(port, listenHandler)
          .catch(rethrowIfUnset);
      },
      async connect(remotePort, channelHandler) {
        /**
         * @type {Endpoint}
         */
        const dst = harden(remotePort);
        return peerImpl.connect(port, dst, channelHandler);
      },
    });

    boundPorts.init(localAddr, port);
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

/**
 * Create a peer handler that just connects to itself.
 *
 * @param {defaultE} E Eventual sender
 * @returns {PeerHandler} The localhost handler
 */
export function makeLoopbackPeerHandler(E = defaultE) {
  /**
   * @type {Store<string, [Port, ListenHandler]>}
   */
  const listeners = makeStore('localAddr');

  return harden({
    // eslint-disable-next-line no-empty-function
    async onCreate(_peer, _impl) {},
    async onConnect(_port, localAddr, remoteAddr) {
      const [lport, lhandler] = listeners.get(localAddr);
      return E(lhandler).onAccept(lport, remoteAddr, lhandler);
    },
    async onListen(port, localAddr, listenHandler) {
      listeners.init(localAddr, [port, listenHandler]);
    },
    async onListenRemove(port, localAddr, listenHandler) {
      const [lport, lhandler] = listeners.get(localAddr);
      if (lport !== port) {
        throw Error(`Port does not match listener on ${localAddr}`);
      }
      if (lhandler !== listenHandler) {
        throw Error(`Listen handler does not match listener on ${localAddr}`);
      }
      listeners.delete(localAddr);
    },
  });
}
