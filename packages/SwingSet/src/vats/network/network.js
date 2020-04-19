// @ts-check
import makeStore from '@agoric/store';
import rawHarden from '@agoric/harden';
import { producePromise } from '@agoric/produce-promise';
import { E as defaultE } from '@agoric/eventual-send';
import { toBytes } from './bytes';

const harden = /** @type {<T>(x: T) => T} */ (rawHarden);

/**
 * @template T,U
 * @typedef {import('@agoric/store').Store<T,U>} Store
 */

/**
 * @typedef {import('./bytes').Bytes} Bytes
 * @typedef {import('./bytes').Data} Data
 */

/**
 * @typedef {string} Endpoint A local or remote address
 * See multiaddr.js for an opinionated router implementation
 */

/**
 * @typedef {Object} Interface The network Interface
 * @property {(prefix: Endpoint) => Promise<Port>} bind Claim a port, or if ending in '/', a fresh name
 */

/**
 * @typedef {Object} Port A port that has been bound to an Interface
 * @property {() => Endpoint} getLocalAddress Get the locally bound name of this port
 * @property {(acceptHandler: ListenHandler) => Promise<void>} addListener Begin accepting incoming connections
 * @property {(remote: Endpoint, connectionHandler: ConnectionHandler = {}) => Promise<Connection>} connect Make an outbound connection
 * @property {(acceptHandler: ListenHandler) => Promise<void>} removeListener Remove the currently-bound listener
 * @property {() => void} revoke Deallocate the port entirely, removing all listeners and closing all active connections
 */

/**
 * @typedef {Object} ListenHandler A handler for incoming connections
 * @property {(port: Port, l: ListenHandler) => Promise<void>} [onListen] The listener has been registered
 * @property {(port: Port, localAddr: Endpoint, remoteAddr: Endpoint, l: ListenHandler) => Promise<ConnectionHandler>} [onAccept] A new connection is incoming
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
 * @typedef {Object} InterfaceHandler A handler for things the interface implementation will invoke
 * @property {(interface: InterfaceImpl, p: InterfaceHandler) => Promise<void>} onCreate This interface is created
 * @property {(port: Port, localAddr: Endpoint, p: InterfaceHandler) => Promise<void>} onBind A port will be bound
 * @property {(port: Port, localAddr: Endpoint, listenHandler: ListenHandler, p: InterfaceHandler) => Promise<void>} onListen A port was listening
 * @property {(port: Port, localAddr: Endpoint, listenHandler: ListenHandler, p: InterfaceHandler) => Promise<void>} onListenRemove A port listener has been reset
 * @property {(port: Port, localAddr: Endpoint, remote: Endpoint, p: InterfaceHandler) => Promise<ConnectionHandler>} onConnect A port initiates an outbound connection
 * @property {(port: Port, localAddr: Endpoint, p: InterfaceHandler) => Promise<void>} onRevoke The port is being completely destroyed
 *
 * @typedef {Object} InterfaceImpl Things the interface can do for us
 * @property {(port: Port, remoteAddr: Endpoint, connectionHandler: ConnectionHandler) => Promise<Connection>} outbound Establish a connection out of this interface
 * @property {(listenSearch: Endpoint[], localAddr: Endpoint, remoteAddr: Endpoint, connectionHandler: ConnectionHandler) => Promise<Connection>} inbound Establish a connection into this interface
 */

export const rethrowIfUnset = err => {
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
 * Create half of a connection pair.
 *
 * @param {ConnectionHandler} local
 * @param {ConnectionHandler} remote
 * @param {WeakSet<Connection>} [current=new WeakSet()]
 * @param {typeof defaultE} [E=defaultE] Eventual send function
 * @returns {[Connection, () => void]}
 */
export const makeConnection = (
  local,
  remote,
  current = new WeakSet(),
  E = defaultE,
) => {
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

/**
 * Connect a pair of handlers.
 *
 * @param {ConnectionHandler} handler0 one connection handler
 * @param {ConnectionHandler} handler1 the other connection handler
 * @param {WeakSet<Connection>} [current=new WeakSet()]
 * @param {typeof defaultE} [E=defaultE] Eventual send function
 * @returns {Connection & { confirm: () => Promise<void> }} a connection for handler0 and confirmation function
 */
export function makeConnectionPair(handler0, handler1, current, E) {
  const [connection0, lflush] = makeConnection(handler0, handler1, current, E);
  const [connection1, rflush] = makeConnection(handler1, handler0, current, E);

  const confirm = async () => {
    E(handler0)
      .onOpen(connection0, handler0)
      .catch(rethrowIfUnset);
    E(handler1)
      .onOpen(connection1, handler1)
      .catch(rethrowIfUnset);

    lflush();
    rflush();
  };

  return { ...connection0, confirm };
}

/**
 * Create an Interface that has a handler.
 *
 * @param {InterfaceHandler} interfaceHandler
 * @param {typeof defaultE} [E=defaultE] Eventual send function
 * @returns {Interface} the local capability for connecting and listening
 */
export function makeNetworkInterface(interfaceHandler, E = defaultE) {
  /** @type {Store<Port, Set<Connection>>} */
  const currentConnections = makeStore('port');

  /**
   * Currently must be a single listenHandler.
   * TODO: Do something sensible with multiple handlers?
   * @type {Store<Endpoint, [Port, ListenHandler]>}
   */
  const listening = makeStore('localAddr');

  /**
   * @type {InterfaceImpl}
   */
  const interfaceImpl = harden({
    async outbound(port, remoteAddr, lchandler) {
      const localAddr = await E(port).getLocalAddress();
      const rchandler = await E(interfaceHandler).onConnect(
        port,
        localAddr,
        remoteAddr,
        interfaceHandler,
      );
      const current = currentConnections.get(port);
      return makeConnectionPair(lchandler, rchandler, current, E);
    },

    async inbound(listenSearch, localAddr, remoteAddr, rchandler) {
      const listenAddr = listenSearch.find(addr => listening.has(addr));
      if (!listenAddr) {
        throw Error(`Connection refused`);
      }
      const [port, listener] = listening.get(listenAddr);
      const lchandler = await E(listener)
        .onAccept(port, localAddr, remoteAddr, listener)
        .catch(rethrowIfUnset);
      const current = currentConnections.get(port);
      return makeConnectionPair(rchandler, lchandler, current, E);
    },
  });

  /**
   * @type {Store<string, Port>}
   */
  const boundPorts = makeStore('localAddr');
  let nonce = 0;

  // Wire up the local interface to the handler.
  E(interfaceHandler).onCreate(interfaceImpl, interfaceHandler);

  /**
   * @param {Endpoint} localAddr
   */
  const bind = async localAddr => {
    // Check if we are underspecified (ends in slash)
    if (localAddr.endsWith('/')) {
      for (;;) {
        nonce += 1;
        const newAddr = `${localAddr}port${nonce}`;
        if (!boundPorts.has(newAddr)) {
          localAddr = newAddr;
          break;
        }
      }
    }

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
        if (listening.has(localAddr)) {
          throw Error(`Port ${localAddr} is already listening`);
        }
        await E(interfaceHandler).onListen(
          port,
          localAddr,
          listenHandler,
          interfaceHandler,
        );
        // TODO: Handle the race between revoke() and open connections.
        listening.init(localAddr, [port, listenHandler]);
        await E(listenHandler)
          .onListen(port, listenHandler)
          .catch(rethrowIfUnset);
      },
      async removeListener(listenHandler) {
        if (!listening.has(localAddr)) {
          throw Error(`Port ${localAddr} is not listening`);
        }
        if (listening.get(localAddr)[1] !== listenHandler) {
          throw Error(`Port ${localAddr} handler to remove is not listening`);
        }
        await E(interfaceHandler).onListenRemove(
          port,
          localAddr,
          listenHandler,
          interfaceHandler,
        );
        listening.delete(localAddr);
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
        const conn = await interfaceImpl.outbound(port, dst, connectionHandler);
        if (revoked) {
          E(conn).close();
        } else {
          openConnections.add(conn);
          E(conn).confirm();
        }
        return conn;
      },
      async revoke() {
        if (revoked === RevokeState.REVOKED) {
          throw Error(`Port ${localAddr} is already revoked`);
        }
        revoked = RevokeState.REVOKING;
        await E(interfaceHandler).onRevoke(port, localAddr, interfaceHandler);
        revoked = RevokeState.REVOKED;

        // Clean up everything we did.
        const ps = [...currentConnections.get(port)].map(conn =>
          E(conn)
            .close()
            .catch(_ => {}),
        );
        if (listening.has(localAddr)) {
          const listener = listening.get(localAddr)[1];
          ps.push(port.removeListener(listener));
        }
        await Promise.all(ps);
        currentConnections.delete(port);
        boundPorts.delete(localAddr);
        return `Port ${localAddr} revoked`;
      },
    });

    await E(interfaceHandler).onBind(port, localAddr, interfaceHandler);
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
 * Create a interface handler that just connects to itself.
 *
 * @param {defaultE} E Eventual sender
 * @returns {InterfaceHandler} The localhost handler
 */
export function makeLoopbackInterfaceHandler(E = defaultE) {
  /**
   * @type {Store<string, [Port, ListenHandler]>}
   */
  const listeners = makeStore('localAddr');

  return harden({
    // eslint-disable-next-line no-empty-function
    async onCreate(_interface, _interfaceHandler) {
      // TODO: Maybe do something on creation?
    },
    async onBind(_port, _localAddr, _interfaceHandler) {
      // TODO: Maybe handle a bind?
    },
    async onConnect(_port, localAddr, remoteAddr, _interfaceHandler) {
      const [lport, lhandler] = listeners.get(remoteAddr);
      return E(lhandler)
        .onAccept(lport, remoteAddr, localAddr, lhandler)
        .catch(rethrowIfUnset);
    },
    async onListen(port, localAddr, listenHandler, _interfaceHandler) {
      listeners.init(localAddr, [port, listenHandler]);
    },
    async onListenRemove(port, localAddr, listenHandler, _interfaceHandler) {
      const [lport, lhandler] = listeners.get(localAddr);
      if (lport !== port) {
        throw Error(`Port does not match listener on ${localAddr}`);
      }
      if (lhandler !== listenHandler) {
        throw Error(`Listen handler does not match listener on ${localAddr}`);
      }
      listeners.delete(localAddr);
    },
    async onRevoke(_port, _localAddr, _interfaceHandler) {
      // TODO: maybe clean up?
    },
  });
}

/**
 * Create an interface that combines the subinterface
 * with a loopback interface.
 *
 * @param {InterfaceHandler} subi the handler to delegate non-loopback connections
 * @returns {InterfaceHandler} the extended interface
 */
export function extendLoopbackInterfaceHandler(subi) {
  const loopback = makeLoopbackInterfaceHandler();
  return harden({
    async onCreate(impl, _interfaceHandler) {
      await subi.onCreate(impl, subi);
      await loopback.onCreate(impl, loopback);
    },
    async onBind(port, localAddr, _interfaceHandler) {
      await subi.onBind(port, localAddr, subi);
      await loopback.onBind(port, localAddr, loopback);
    },
    async onConnect(port, localAddr, remoteAddr, _interfaceHandler) {
      // Try loopback connection first.
      try {
        const c = await loopback.onConnect(
          port,
          localAddr,
          remoteAddr,
          loopback,
        );
        return c;
      } catch (e) {
        // A loopback error, so keep going.
      }
      return subi.onConnect(port, localAddr, remoteAddr, subi);
    },
    async onListen(port, localAddr, listenHandler) {
      await subi.onListen(port, localAddr, listenHandler, subi);
      await loopback.onListen(port, localAddr, listenHandler, loopback);
    },
    async onListenRemove(port, localAddr, listenHandler) {
      await subi.onListenRemove(port, localAddr, listenHandler, subi);
      await loopback.onListenRemove(port, localAddr, listenHandler, loopback);
    },
    async onRevoke(port, localAddr) {
      await subi.onRevoke(port, localAddr, subi);
      await loopback.onRevoke(port, localAddr, loopback);
    },
  });
}
