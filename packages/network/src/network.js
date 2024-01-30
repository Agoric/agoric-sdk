// @ts-check

import { E } from '@endo/far';
import { Fail } from '@agoric/assert';
import { whileTrue } from '@agoric/internal';
import { toBytes } from './bytes.js';

import '@agoric/store/exported.js';
/// <reference path="./types.js" />

/**
 * Compatibility note: this must match what our peers use, so don't change it
 * casually.
 */
export const ENDPOINT_SEPARATOR = '/';

/** @param {unknown} err */
export const rethrowUnlessMissing = err => {
  // Ugly hack rather than being able to determine if the function
  // exists.
  if (
    !(err instanceof TypeError) ||
    !err.message.match(/target has no method|is not a function$/)
  ) {
    throw err;
  }
  return undefined;
};

/**
 * Get the list of prefixes from longest to shortest.
 *
 * @param {string} addr
 */
export function getPrefixes(addr) {
  const parts = addr.split(ENDPOINT_SEPARATOR);

  /** @type {string[]} */
  const ret = [];
  for (let i = parts.length; i > 0; i -= 1) {
    // Try most specific match.
    const prefix = parts.slice(0, i).join(ENDPOINT_SEPARATOR);
    ret.push(prefix);
  }
  return ret;
}

/**
 * @typedef {object} ConnectionOpts
 * @property {Endpoint[]} addrs
 * @property {ConnectionHandler[]} handlers
 * @property {MapStore<number, Connection>} conns
 * @property {WeakSetStore<Closable>} current
 * @property {0|1} l
 * @property {0|1} r
 */

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {ReturnType<import('@agoric/whenable').prepareWhenableModule>} powers
 */
const prepareHalfConnection = (zone, { when }) => {
  const makeHalfConnection = zone.exoClass(
    'Connection',
    undefined,
    /** @param {ConnectionOpts} opts */
    ({ addrs, handlers, conns, current, l, r }) => {
      /** @type {Error | undefined} */
      let closed;

      return {
        addrs,
        handlers,
        conns,
        current,
        l,
        r,
        closed,
      };
    },
    {
      getLocalAddress() {
        return this.state.addrs[this.state.l];
      },
      getRemoteAddress() {
        return this.state.addrs[this.state.r];
      },
      /** @param {Data} packetBytes */
      async send(packetBytes) {
        const { closed, handlers, r, conns } = this.state;
        if (closed) {
          throw closed;
        }

        const ack = await when(
          E(handlers[r])
            .onReceive(conns.get(r), toBytes(packetBytes), handlers[r])
            .catch(rethrowUnlessMissing),
        );

        return toBytes(ack || '');
      },
      async close() {
        const { closed, current, conns, l, handlers } = this.state;
        if (closed) {
          throw closed;
        }
        this.state.closed = Error('Connection closed');
        current.delete(conns.get(l));
        await E(this.state.handlers[l])
          .onClose(conns.get(l), undefined, handlers[l])
          .catch(rethrowUnlessMissing);
      },
    },
  );

  return makeHalfConnection;
};

/**
 * @param {import('@agoric/zone').Zone} zone
 * @param {ConnectionHandler} handler0
 * @param {Endpoint} addr0
 * @param {ConnectionHandler} handler1
 * @param {Endpoint} addr1
 * @param {(opts: ConnectionOpts) => Connection} makeConnection
 * @param {WeakSetStore<Closable>} current
 */
export const crossoverConnection = (
  zone,
  handler0,
  addr0,
  handler1,
  addr1,
  makeConnection,
  current = zone.detached().weakSetStore('crossoverCurrentConnections'),
) => {
  const detached = zone.detached();

  /** @type {MapStore<number, Connection>} */
  const conns = detached.mapStore('addrToConnections');

  /** @type {ConnectionHandler[]} */
  const handlers = harden([handler0, handler1]);
  /** @type {Endpoint[]} */
  const addrs = harden([addr0, addr1]);

  /**
   * @param {0|1} l
   * @param {0|1} r
   */
  const makeHalfConnection = (l, r) => {
    conns.init(l, makeConnection({ addrs, handlers, conns, current, l, r }));
  };

  /**
   * @param {number} l local side of the connection
   * @param {number} r remote side of the connection
   */
  const openHalfConnection = (l, r) => {
    current.add(conns.get(l));
    E(handlers[l])
      .onOpen(conns.get(l), addrs[l], addrs[r], handlers[l])
      .catch(rethrowUnlessMissing);
  };

  makeHalfConnection(0, 1);
  makeHalfConnection(1, 0);

  openHalfConnection(0, 1);
  openHalfConnection(1, 0);

  return [conns.get(0), conns.get(1)];
};

/**
 * @param {import('@agoric/zone').Zone} zone
 * @param {(opts: ConnectionOpts) => Connection} makeConnection
 */
const prepareInboundAttempt = (zone, makeConnection) => {
  const makeInboundAttempt = zone.exoClass(
    'InboundAttempt',
    undefined,
    /**
     * @param {object} opts
     * @param {string} opts.localAddr
     * @param {string} opts.remoteAddr
     * @param { MapStore<Port, SetStore<Closable>> } opts.currentConnections
     * @param {string} opts.listenPrefix
     * @param {MapStore<Endpoint, [Port, ListenHandler]>} opts.listening
     */
    ({
      localAddr,
      remoteAddr,
      currentConnections,
      listenPrefix,
      listening,
    }) => {
      /** @type {Error | undefined} */
      let consummated;

      return {
        localAddr,
        remoteAddr,
        consummated,
        currentConnections,
        listenPrefix,
        listening,
      };
    },
    {
      getLocalAddress() {
        // Return address metadata.
        return this.state.localAddr;
      },
      getRemoteAddress() {
        return this.state.remoteAddr;
      },
      async close() {
        if (this.state.consummated) {
          throw this.state.consummated;
        }
        this.state.consummated = Error(`Already closed`);

        const [port, listener] = this.state.listening.get(
          this.state.listenPrefix,
        );

        const current = this.state.currentConnections.get(port);
        current.delete(this.self);

        await E(listener)
          .onReject(port, this.state.localAddr, this.state.remoteAddr, listener)
          .catch(rethrowUnlessMissing);
      },
      /**
       * @param {object} opts
       * @param {string} [opts.localAddress]
       * @param {string} [opts.remoteAddress]
       * @param {ConnectionHandler} opts.handler
       */
      async accept({ localAddress, remoteAddress, handler: rchandler }) {
        const { consummated, localAddr, remoteAddr } = this.state;
        const { listening, listenPrefix, currentConnections } = this.state;
        if (consummated) {
          throw consummated;
        }
        this.state.consummated = Error(`Already accepted`);

        if (localAddress === undefined) {
          localAddress = localAddr;
        }

        if (remoteAddress === undefined) {
          remoteAddress = remoteAddr;
        }

        const [port, listener] = listening.get(listenPrefix);
        const current = currentConnections.get(port);

        current.delete(this.self);

        const lchandler = await E(listener).onAccept(
          port,
          localAddress,
          remoteAddress,
          listener,
        );

        return crossoverConnection(
          zone,
          lchandler,
          localAddress,
          rchandler,
          remoteAddress,
          makeConnection,
          current,
        )[1];
      },
    },
  );

  return makeInboundAttempt;
};

/** @enum {number} */
const RevokeState = /** @type {const} */ ({
  NOT_REVOKED: 0,
  REVOKING: 1,
  REVOKED: 2,
});

/** @param {import('@agoric/zone').Zone} zone */
const preparePort = zone => {
  const makePort = zone.exoClass(
    'Port',
    undefined,
    /**
     * @param {object} opts
     * @param {Endpoint} opts.localAddr
     * @param {MapStore<Endpoint, [Port, ListenHandler]>} opts.listening
     * @param {SetStore<Connection>} opts.openConnections
     * @param {MapStore<Port, SetStore<Closable>>} opts.currentConnections
     * @param {MapStore<string, Port>} opts.boundPorts
     * @param {ProtocolHandler} opts.protocolHandler
     * @param {ProtocolImpl} opts.protocolImpl
     */
    ({
      localAddr,
      listening,
      openConnections,
      currentConnections,
      boundPorts,
      protocolHandler,
      protocolImpl,
    }) => {
      return {
        listening,
        openConnections,
        currentConnections,
        boundPorts,
        localAddr,
        protocolHandler,
        protocolImpl,
        /** @type {RevokeState | undefined} */
        revoked: undefined,
      };
    },
    {
      getLocalAddress() {
        // Works even after revoke().
        return this.state.localAddr;
      },
      /** @param {ListenHandler} listenHandler */
      async addListener(listenHandler) {
        const { revoked, listening, localAddr, protocolHandler } = this.state;

        !revoked || Fail`Port ${this.state.localAddr} is revoked`;
        listenHandler || Fail`listenHandler is not defined`;

        if (listening.has(localAddr)) {
          // Last one wins.
          const [lport, lhandler] = listening.get(localAddr);
          if (lhandler === listenHandler) {
            return;
          }
          listening.set(localAddr, [this.self, listenHandler]);
          E(lhandler).onRemove(lport, lhandler).catch(rethrowUnlessMissing);
        } else {
          listening.init(localAddr, harden([this.self, listenHandler]));
        }

        // TODO: Check that the listener defines onAccept.

        await E(protocolHandler).onListen(
          this.self,
          localAddr,
          listenHandler,
          protocolHandler,
        );
        await E(listenHandler)
          .onListen(this.self, listenHandler)
          .catch(rethrowUnlessMissing);
      },
      /** @param {ListenHandler} listenHandler */
      async removeListener(listenHandler) {
        const { listening, localAddr, protocolHandler } = this.state;
        listening.has(localAddr) || Fail`Port ${localAddr} is not listening`;
        listening.get(localAddr)[1] === listenHandler ||
          Fail`Port ${localAddr} handler to remove is not listening`;
        listening.delete(localAddr);
        await E(protocolHandler).onListenRemove(
          this.self,
          localAddr,
          listenHandler,
          protocolHandler,
        );
        await E(listenHandler)
          .onRemove(this.self, listenHandler)
          .catch(rethrowUnlessMissing);
      },
      /**
       * @param {Endpoint} remotePort
       * @param {ConnectionHandler} connectionHandler
       */
      async connect(remotePort, connectionHandler = {}) {
        const revoked = this.state.revoked;

        !revoked || Fail`Port ${this.state.localAddr} is revoked`;
        /** @type {Endpoint} */
        const dst = harden(remotePort);
        // eslint-disable-next-line no-use-before-define
        const conn = await this.state.protocolImpl.outbound(
          this.self,
          dst,
          connectionHandler,
        );
        if (revoked) {
          void E(conn).close();
        } else {
          this.state.openConnections.add(conn);
        }
        return conn;
      },
      async revoke() {
        this.state.revoked !== RevokeState.REVOKED ||
          Fail`Port ${this.state.localAddr} is already revoked`;
        this.state.revoked = RevokeState.REVOKING;
        await E(this.state.protocolHandler).onRevoke(
          this.self,
          this.state.localAddr,
          this.state.protocolHandler,
        );
        this.state.revoked = RevokeState.REVOKED;

        // Clean up everything we did.
        const values = [
          ...this.state.currentConnections.get(this.self).values(),
        ];
        const ps = values.map(conn =>
          E(conn)
            .close()
            .catch(_ => {}),
        );
        if (this.state.listening.has(this.state.localAddr)) {
          const listener = this.state.listening.get(this.state.localAddr)[1];
          ps.push(this.self.removeListener(listener));
        }
        await Promise.all(ps);
        this.state.currentConnections.delete(this.self);
        this.state.boundPorts.delete(this.state.localAddr);
        return `Port ${this.state.localAddr} revoked`;
      },
    },
  );

  return makePort;
};

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {ReturnType<import('@agoric/whenable').prepareWhenableModule>} powers
 */
const prepareBinder = (zone, powers) => {
  const makeConnection = prepareHalfConnection(zone, powers);
  const makeInboundAttempt = prepareInboundAttempt(zone, makeConnection);
  const makePort = preparePort(zone);
  const detached = zone.detached();
  const { when } = powers;

  const makeBinderKit = zone.exoClassKit(
    'binder',
    undefined,
    /**
     * @param {object} opts
     * @param { MapStore<Port, SetStore<Closable>> } opts.currentConnections
     * @param {MapStore<string, Port>} opts.boundPorts
     * @param {MapStore<Endpoint, [Port, ListenHandler]>} opts.listening
     * @param {ProtocolHandler} opts.protocolHandler
     */
    ({ currentConnections, boundPorts, listening, protocolHandler }) => {
      /** @type {SetStore<Connection>} */
      const openConnections = detached.setStore('openConnections');

      return {
        currentConnections,
        boundPorts,
        listening,
        revoked: RevokeState.NOT_REVOKED,
        openConnections,
        protocolHandler,
        /** @type {Endpoint | undefined} */
        localAddr: undefined,
      };
    },
    {
      protocolImpl: {
        /**
         * @param {Endpoint} listenAddr
         * @param {Endpoint} remoteAddr
         */
        async inbound(listenAddr, remoteAddr) {
          let lastFailure = Error(`No listeners for ${listenAddr}`);
          for await (const listenPrefix of getPrefixes(listenAddr)) {
            if (!this.state.listening.has(listenPrefix)) {
              continue;
            }
            const [port, _] = this.state.listening.get(listenPrefix);
            let localAddr;

            await (async () => {
              // See if our protocol is willing to receive this connection.
              const localInstance = await E(this.state.protocolHandler)
                .onInstantiate(
                  port,
                  listenPrefix,
                  remoteAddr,
                  this.state.protocolHandler,
                )
                .catch(rethrowUnlessMissing);
              localAddr = localInstance
                ? `${listenAddr}/${localInstance}`
                : listenAddr;
            })().catch(e => {
              lastFailure = e;
            });
            if (!localAddr) {
              continue;
            }
            // We have a legitimate inbound attempt.
            const current = this.state.currentConnections.get(port);
            const inboundAttempt = makeInboundAttempt({
              localAddr,
              remoteAddr,
              currentConnections: this.state.currentConnections,
              listenPrefix,
              listening: this.state.listening,
            });

            current.add(inboundAttempt);
            return inboundAttempt;
          }
          throw lastFailure;
        },
        /**
         * @param {Port} port
         * @param {Endpoint} remoteAddr
         * @param {ConnectionHandler} lchandler
         */
        async outbound(port, remoteAddr, lchandler) {
          const localAddr = await E(port).getLocalAddress();

          // Allocate a local address.
          const initialLocalInstance = await E(this.state.protocolHandler)
            .onInstantiate(
              port,
              localAddr,
              remoteAddr,
              this.state.protocolHandler,
            )
            .catch(rethrowUnlessMissing);
          const initialLocalAddr = initialLocalInstance
            ? `${localAddr}/${initialLocalInstance}`
            : localAddr;

          let lastFailure;
          let accepted;
          await (async () => {
            // Attempt the loopback connection.
            const attempt = await this.facets.protocolImpl.inbound(
              remoteAddr,
              initialLocalAddr,
            );
            accepted = await attempt.accept({ handler: lchandler });
          })().catch(e => {
            lastFailure = e;
          });
          if (accepted) {
            return accepted;
          }

          const {
            remoteAddress = remoteAddr,
            handler: rchandler,
            localAddress = localAddr,
          } =
            /** @type {Partial<AttemptDescription>} */
            (
              await when(
                E(this.state.protocolHandler).onConnect(
                  port,
                  initialLocalAddr,
                  remoteAddr,
                  lchandler,
                  this.state.protocolHandler,
                ),
              )
            );

          if (!rchandler) {
            throw lastFailure;
          }

          const current = this.state.currentConnections.get(port);
          return crossoverConnection(
            zone,
            lchandler,
            localAddress,
            rchandler,
            remoteAddress,
            makeConnection,
            current,
          )[0];
        },
      },
      binder: {
        /** @param {string} localAddr */
        async bind(localAddr) {
          // Check if we are underspecified (ends in slash)
          const underspecified = localAddr.endsWith(ENDPOINT_SEPARATOR);
          for await (const _ of whileTrue(() => underspecified)) {
            const portID = await E(this.state.protocolHandler).generatePortID(
              localAddr,
              this.state.protocolHandler,
            );
            const newAddr = `${localAddr}${portID}`;
            if (!this.state.boundPorts.has(newAddr)) {
              localAddr = newAddr;
              break;
            }
          }

          this.state.localAddr = localAddr;

          if (this.state.boundPorts.has(localAddr)) {
            return this.state.boundPorts.get(localAddr);
          }

          const port = makePort({
            localAddr,
            listening: this.state.listening,
            openConnections: this.state.openConnections,
            currentConnections: this.state.currentConnections,
            boundPorts: this.state.boundPorts,
            protocolHandler: this.state.protocolHandler,
            protocolImpl: this.facets.protocolImpl,
          });

          await E(this.state.protocolHandler).onBind(
            port,
            localAddr,
            this.state.protocolHandler,
          );
          this.state.boundPorts.init(localAddr, harden(port));
          this.state.currentConnections.init(
            port,
            detached.setStore('connections'),
          );
          return port;
        },
      },
    },
  );

  return makeBinderKit;
};

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {ReturnType<import('@agoric/whenable').prepareWhenableModule>} powers
 */
export const prepareNetworkProtocol = (zone, powers) => {
  const makeBinderKit = prepareBinder(zone, powers);

  /**
   * @param {ProtocolHandler} protocolHandler
   * @returns {Protocol}
   */
  const makeNetworkProtocol = protocolHandler => {
    const detached = zone.detached();

    /** @type {MapStore<Port, SetStore<Closable>>} */
    const currentConnections = detached.mapStore('portToCurrentConnections');

    /** @type {MapStore<string, Port>} */
    const boundPorts = detached.mapStore('addrToPort');

    /** @type {MapStore<Endpoint, [Port, ListenHandler]>} */
    const listening = detached.mapStore('listening');

    const { binder, protocolImpl } = makeBinderKit({
      currentConnections,
      boundPorts,
      listening,
      protocolHandler,
    });

    // Wire up the local protocol to the handler.
    void E(protocolHandler).onCreate(protocolImpl, protocolHandler);
    return harden(binder);
  };

  return makeNetworkProtocol;
};

/**
 * Create a ConnectionHandler that just echoes its packets.
 *
 * @param {import('@agoric/base-zone').Zone} zone
 */
export const prepareEchoConnectionHandler = zone => {
  const makeEchoConnectionHandler = zone.exoClass(
    'ConnectionHandler',
    undefined,
    () => {
      /** @type {Error | undefined} */
      let closed;
      return {
        closed,
      };
    },
    {
      /**
       * @param {Connection} _connection
       * @param {Bytes} bytes
       * @param {ConnectionHandler} _connectionHandler
       */
      async onReceive(_connection, bytes, _connectionHandler) {
        if (this.state.closed) {
          throw this.state.closed;
        }
        return bytes;
      },
      /**
       * @param {Connection} _connection
       * @param {CloseReason} [_reason]
       * @param {ConnectionHandler} [_connectionHandler]
       */
      async onClose(_connection, _reason, _connectionHandler) {
        if (this.state.closed) {
          throw this.state.closed;
        }
        this.state.closed = Error('Connection closed');
      },
    },
  );

  return makeEchoConnectionHandler;
};

/**
 *
 * @param {import('@agoric/base-zone').Zone} zone
 */
export const prepareNonceMaker = zone => {
  const makeNonceMaker = zone.exoClass(
    'NonceMaker',
    undefined,
    (prefix = '', suffix = '') => {
      return {
        prefix,
        suffix,
        nonce: 0,
      };
    },
    {
      async get() {
        this.state.nonce += 1;
        return `${this.state.prefix}${this.state.nonce}${this.state.suffix}`;
      },
    },
  );

  return makeNonceMaker;
};

/**
 * Create a protocol handler that just connects to itself.
 *
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {ReturnType<typeof prepareNonceMaker>} makeNonceMaker
 */
export function prepareLoopbackProtocolHandler(zone, makeNonceMaker) {
  const detached = zone.detached();

  const makeLoopbackProtocolHandler = zone.exoClass(
    'ProtocolHandler',
    undefined,
    (nonceMaker = makeNonceMaker('nonce/')) => {
      /** @type {MapStore<string, [Port, ListenHandler]>} */
      const listeners = detached.mapStore('localAddr');

      return {
        listeners,
        nonceMaker,
      };
    },
    {
      async onCreate(_impl, _protocolHandler) {
        // TODO
      },
      async generatePortID(_protocolHandler) {
        return makeNonceMaker('port').get();
      },
      async onBind(_port, _localAddr, _protocolHandler) {
        // TODO: Maybe handle a bind?
      },
      async onConnect(
        _port,
        localAddr,
        remoteAddr,
        _chandler,
        protocolHandler,
      ) {
        const [lport, lhandler] = this.state.listeners.get(remoteAddr);
        const rchandler =
          /** @type {ConnectionHandler} */
          (await E(lhandler).onAccept(lport, remoteAddr, localAddr, lhandler));
        // console.log(`rchandler is`, rchandler);
        const remoteInstance = await E(protocolHandler)
          .onInstantiate(lport, remoteAddr, localAddr, protocolHandler)
          .catch(rethrowUnlessMissing);
        return {
          remoteInstance,
          handler: rchandler,
        };
      },
      async onInstantiate(_port, _localAddr, _remote, _protocol) {
        return this.state.nonceMaker.get();
      },
      async onListen(port, localAddr, listenHandler, _protocolHandler) {
        // TODO: Implement other listener replacement policies.
        if (this.state.listeners.has(localAddr)) {
          const lhandler = this.state.listeners.get(localAddr)[1];
          if (lhandler !== listenHandler) {
            // Last-one-wins.
            this.state.listeners.set(localAddr, [port, listenHandler]);
          }
        } else {
          this.state.listeners.init(localAddr, harden([port, listenHandler]));
        }
      },
      /**
       * @param {Port} port
       * @param {Endpoint} localAddr
       * @param {ListenHandler} listenHandler
       * @param {*} _protocolHandler
       */
      async onListenRemove(port, localAddr, listenHandler, _protocolHandler) {
        const [lport, lhandler] = this.state.listeners.get(localAddr);
        lport === port || Fail`Port does not match listener on ${localAddr}`;
        lhandler === listenHandler ||
          Fail`Listen handler does not match listener on ${localAddr}`;
        this.state.listeners.delete(localAddr);
      },
      async onRevoke(_port, _localAddr, _protocolHandler) {
        // TODO: maybe clean up?
      },
    },
  );

  return makeLoopbackProtocolHandler;
}
