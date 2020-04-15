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
 * @typedef {string} Bytes
 */

/**
 * @typedef {string} Endpoint A local or remote address
 * See multiaddr.js for an opinionated router implementation
 */

/**
 * @typedef {Object} Peer The local peer
 * @property {(prefix: Endpoint) => Promise<Port>} bind Claim a port, or if ending in '/', a fresh name
 */

/**
 * @typedef {Object} Port A port that has been bound to a Peer
 * @property {() => Endpoint} getLocalAddress Get the locally bound name of this port
 * @property {(acceptHandler: ListenHandler) => Promise<void>} addListener Begin accepting incoming connections
 * @property {(remote: Endpoint, connectionHandler: ConnectionHandler = {}) => Promise<Connection>} connect Make an outbound connection
 * @property {(acceptHandler: ListenHandler) => Promise<void>} removeListener Remove the currently-bound listener
 * @property {() => void} revoke Deallocate the port entirely, removing all listeners and closing all active connections
 */

/**
 * @typedef {Object} ListenHandler A handler for incoming connections
 * @property {(port: Port, l: ListenHandler) => Promise<void>} [onListen] The listener has been registered
 * @property {(port: Port, local: Endpoint, remote: Endpoint, l: ListenHandler) => Promise<ConnectionHandler>} [onAccept] A new connection is incoming
 * @property {(port: Port, rej: any, l: ListenHandler) => Promise<void>} [onError] There was an error while listening
 * @property {(port: Port, l: ListenHandler) => Promise<void>} [onRemove] The listener has been removed
 */

/**
 * @typedef {Object} Connection
 * @property {(packetBytes: Data) => Promise<Bytes>} send Send a packet on the connection
 * @property {() => void} close Close both ends of the connection
 */

/**
 * @typedef {Object} ConnectionHandler A handler for a given Connection
 * @property {(connection: Connection, c: ConnectionHandler) => void} [onOpen] The connection has been opened
 * @property {(connection: Connection, packetBytes: Bytes, c: ConnectionHandler) => Promise<Data>} [onReceive] The connection received a packet
 * @property {(connection: Connection, reason?: CloseReason, c: ConnectionHandler) => Promise<void>} [onClose] The connection has been closed
 *
 * @typedef {any?} CloseReason The reason a connection was closed
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
 * @property {(port: Port, localAddr: Endpoint, remote: Endpoint, p: PeerHandler) => Promise<ConnectionHandler>} onConnect A port initiates an outbound connection
 * @property {(port: Port, localAddr: Endpoint, p: PeerHandler) => Promise<void>} onRevoke The port is being completely destroyed
 *
 * @typedef {Object} PeerImpl Things the peer can do for us
 * @property {(port: Port, remote: Endpoint, connectionHandler: ConnectionHandler) => Promise<Connection>} connect Establish a connection from this peer to an endpoint
 */

/*
 * Convert some data to bytes.
 *
 * @param {Data} data
 * @returns {Bytes}
 */
export function toBytes(data) {
  // We really need marshallable TypedArrays.
  if (typeof data === 'string') {
    // eslint-disable-next-line no-bitwise
    data = data.split('').map(c => c.charCodeAt(0));
  }

  // We return the raw characters in the lower half of
  // the String's representation.
  const buf = new Uint8Array(data);
  return String.fromCharCode.apply(null, buf);
}

/**
 * Convert bytes to a String.
 *
 * @param {Bytes} bytes
 * @return {string}
 */
export function bytesToString(bytes) {
  return bytes;
}

const rethrowIfUnset = err => {
  // Ugly hack rather than being able to determine if the function
  // exists.
  if (
    !(err instanceof TypeError) ||
    !err.message.match(/target\[.*\] does not exist|is not a function$/)
  ) {
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
  /** @type {Store<Port, Set<Connection>>} */
  const currentConnections = makeStore('port');

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

      const current = currentConnections.get(port);

      /**
       * Create half of a connection pair.
       *
       * @param {ConnectionHandler} local
       * @param {ConnectionHandler} remote
       * @returns {[Connection, () => void]}
       */
      const makeConnection = (local, remote) => {
        const pending = [];
        let queue = [];
        let closed;
        /**
         * @type {Connection}
         */
        const connection = harden({
          async close() {
            if (closed) {
              throw closed;
            }
            current.delete(connection);
            closed = Error('Connection closed');
            await Promise.all([
              E(local)
                .onClose(connection, undefined, local)
                .catch(rethrowIfUnset),
              E(remote)
                .onClose(connection, undefined, remote)
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
              .onReceive(connection, bytes, remote)
              .catch(err => rethrowIfUnset(err) || '');
            return toBytes(ack);
          },
        });
        const flush = () => {
          const q = queue;
          queue = undefined;
          while (q && q.length) {
            const [data, deferred] = q.shift();
            connection
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
        current.add(connection);
        return [connection, flush];
      };

      const [srcConnection, srcFlush] = makeConnection(srcHandler, dstHandler);
      const [dstConnection, dstFlush] = makeConnection(dstHandler, srcHandler);

      E(srcHandler)
        .onOpen(srcConnection, srcHandler)
        .catch(rethrowIfUnset);
      E(dstHandler)
        .onOpen(dstConnection, dstHandler)
        .catch(rethrowIfUnset);

      srcFlush();
      dstFlush();

      return srcConnection;
    },
  });

  /**
   * @type {Store<string, Port>}
   */
  const boundPorts = makeStore('localAddr');
  let nonce = 0;

  // Wire up the local peer to the handler.
  E(peerHandler).onCreate(peerImpl, peerHandler);

  /**
   * @param {Endpoint} localAddr
   */
  const bind = async localAddr => {
    // Check if we are underspecified (ends in slash)
    if (localAddr.endsWith('/')) {
      for (;;) {
        nonce += 1;
        const newAddr = `${localAddr}${nonce}`;
        if (!boundPorts.has(newAddr)) {
          localAddr = newAddr;
          break;
        }
      }
    }

    /**
     * Currently must be a single listenHandler.
     * TODO: Do something sensible with multiple handlers?
     * @type {ListenHandler}
     */
    let listening;

    /**
     * @enum {number}
     */
    const RevokeState = {
      NOT_REVOKED: 0,
      REVOKING: 1,
      REVOKED: 2,
    };

    /**
     * @type {RevokeState}
     */
    let revoked = RevokeState.NOT_REVOKED;
    const openConnections = new Set();

    /**
     * @type {Port}
     */
    const port = harden({
      getLocalAddress() {
        // Works even after revoke().
        return localAddr;
      },
      async addListener(listenHandler) {
        if (revoked) {
          throw Error(`Port ${localAddr} is revoked`);
        }
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
        // TODO: Handle the race between revoke() and open connections.
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
      async connect(remotePort, connectionHandler = {}) {
        if (revoked) {
          throw Error(`Port ${localAddr} is revoked`);
        }
        /**
         * @type {Endpoint}
         */
        const dst = harden(remotePort);
        const conn = await peerImpl.connect(port, dst, connectionHandler);
        if (revoked) {
          E(conn).close();
        } else {
          openConnections.add(conn);
        }
        return conn;
      },
      async revoke() {
        if (revoked === RevokeState.REVOKED) {
          throw Error(`Port ${localAddr} is already revoked`);
        }
        revoked = RevokeState.REVOKING;
        await E(peerHandler).onRevoke(port, localAddr, peerHandler);
        revoked = RevokeState.REVOKED;

        // Clean up everything we did.
        const ps = [...currentConnections.get(port)].map(conn =>
          E(conn)
            .close()
            .catch(_ => {}),
        );
        if (listening) {
          ps.push(port.removeListener(listening));
        }
        await Promise.all(ps);
        currentConnections.delete(port);
        boundPorts.delete(localAddr);
        return `Port ${localAddr} revoked`;
      },
    });

    boundPorts.init(localAddr, port);
    currentConnections.init(port, new Set());
    return port;
  };

  return harden({ bind });
}

/**
 * Create a ConnectionHandler that just echoes its packets.
 *
 * @returns {ConnectionHandler}
 */
export function makeEchoConnectionHandler() {
  /**
   * @type {Connection}
   */
  return harden({
    async onReceive(_connection, bytes, _connectionHandler) {
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
    async onCreate(_peer, _peerHandler) {},
    async onConnect(_port, localAddr, remoteAddr, _peerHandler) {
      const [lport, lhandler] = listeners.get(remoteAddr);
      return E(lhandler)
        .onAccept(lport, remoteAddr, localAddr, lhandler)
        .catch(rethrowIfUnset);
    },
    async onListen(port, localAddr, listenHandler, _peerHandler) {
      listeners.init(localAddr, [port, listenHandler]);
    },
    async onListenRemove(port, localAddr, listenHandler, _peerHandler) {
      const [lport, lhandler] = listeners.get(localAddr);
      if (lport !== port) {
        throw Error(`Port does not match listener on ${localAddr}`);
      }
      if (lhandler !== listenHandler) {
        throw Error(`Listen handler does not match listener on ${localAddr}`);
      }
      listeners.delete(localAddr);
    },
    async onRevoke(_port, _localAddr, _peerHandler) {
      // TODO: maybe clean up!
    },
  });
}
