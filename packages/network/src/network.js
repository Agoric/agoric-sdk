// @ts-check

import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { Fail } from '@agoric/assert';
import { whileTrue } from '@agoric/internal';
import { toBytes } from './bytes.js';
import { Shape } from './shapes.js';

import '@agoric/store/exported.js';
/// <reference path="./types.js" />

/**
 * Compatibility note: this must match what our peers use, so don't change it
 * casually.
 */
export const ENDPOINT_SEPARATOR = '/';

const sink = harden(() => {});

/** @param {unknown} err */
export const rethrowUnlessMissing = err => {
  // Ugly hack rather than being able to use eventual optional chaining.
  if (
    !(err instanceof TypeError) ||
    !String(err.message).match(/target has no method|is not a function$/)
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
 * @property {Remote<Required<ConnectionHandler>>[]} handlers
 * @property {MapStore<number, Connection>} conns
 * @property {WeakSetStore<Closable>} current
 * @property {0|1} l
 * @property {0|1} r
 */

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {ReturnType<import('@agoric/vow').prepareVowTools>} powers
 */
const prepareHalfConnection = (zone, { when }) => {
  const makeHalfConnection = zone.exoClass(
    'Connection',
    Shape.ConnectionI,
    /** @param {ConnectionOpts} opts */
    ({ addrs, handlers, conns, current, l, r }) => ({
      addrs,
      handlers,
      conns,
      current,
      l,
      r,
      /** @type {string | undefined} */
      closed: undefined,
    }),
    {
      getLocalAddress() {
        const { addrs, l } = this.state;
        return addrs[l];
      },
      getRemoteAddress() {
        const { addrs, r } = this.state;
        return addrs[r];
      },
      /** @param {Data} packetBytes */
      async send(packetBytes) {
        const { closed, handlers, r, conns } = this.state;
        if (closed) {
          throw Error(closed);
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
          throw Error(closed);
        }
        this.state.closed = 'Connection closed';
        current.delete(conns.get(l));
        await when(
          E(this.state.handlers[l]).onClose(
            conns.get(l),
            undefined,
            handlers[l],
          ),
        ).catch(rethrowUnlessMissing);
      },
    },
  );

  return makeHalfConnection;
};

/**
 * @param {import('@agoric/zone').Zone} zone
 * @param {Remote<Required<ConnectionHandler>>} handler0
 * @param {Endpoint} addr0
 * @param {Remote<Required<ConnectionHandler>>} handler1
 * @param {Endpoint} addr1
 * @param {(opts: ConnectionOpts) => Connection} makeConnection
 * @param {WeakSetStore<Closable>} [current]
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

  /** @type {Remote<Required<ConnectionHandler>>[]} */
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
 * @param {ReturnType<import('@agoric/vow').prepareVowTools>} powers
 */
const prepareInboundAttempt = (zone, makeConnection, { when }) => {
  const makeInboundAttempt = zone.exoClass(
    'InboundAttempt',
    Shape.InboundAttemptI,
    /**
     * @param {object} opts
     * @param {string} opts.localAddr
     * @param {string} opts.remoteAddr
     * @param {MapStore<Port, SetStore<Closable>>} opts.currentConnections
     * @param {string} opts.listenPrefix
     * @param {MapStore<Endpoint, [Port, Remote<Required<ListenHandler>>]>} opts.listening
     */
    ({
      localAddr,
      remoteAddr,
      currentConnections,
      listenPrefix,
      listening,
    }) => {
      /** @type {string | undefined} */
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
        const { consummated, localAddr, remoteAddr } = this.state;
        const { listening, listenPrefix, currentConnections } = this.state;

        if (consummated) {
          throw Error(consummated);
        }
        this.state.consummated = 'Already closed';

        const [port, listener] = listening.get(listenPrefix);

        const current = currentConnections.get(port);
        current.delete(this.self);

        await when(
          E(listener).onReject(port, localAddr, remoteAddr, listener),
        ).catch(rethrowUnlessMissing);
      },
      /**
       * @param {object} opts
       * @param {string} [opts.localAddress]
       * @param {string} [opts.remoteAddress]
       * @param {Remote<ConnectionHandler>} opts.handler
       */
      async accept({ localAddress, remoteAddress, handler: rchandler }) {
        const { consummated, localAddr, remoteAddr } = this.state;
        const { listening, listenPrefix, currentConnections } = this.state;
        if (consummated) {
          throw Error(consummated);
        }
        this.state.consummated = 'Already accepted';

        if (localAddress === undefined) {
          localAddress = localAddr;
        }

        if (remoteAddress === undefined) {
          remoteAddress = remoteAddr;
        }

        const [port, listener] = listening.get(listenPrefix);
        const current = currentConnections.get(port);

        current.delete(this.self);

        const lchandler = await when(
          E(listener).onAccept(port, localAddress, remoteAddress, listener),
        );
        const lch = /** @type {Remote<Required<ConnectionHandler>>} */ (
          lchandler
        );

        const rch = /** @type {Remote<Required<ConnectionHandler>>} */ (
          rchandler
        );

        return crossoverConnection(
          zone,
          lch,
          localAddress,
          rch,
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

/**
 * @param {import('@agoric/zone').Zone} zone
 * @param {ReturnType<import('@agoric/vow').prepareVowTools>} powers
 */
const preparePort = (zone, { when }) => {
  const makeIncapable = zone.exoClass('Incapable', undefined, () => ({}), {});

  /**
   * @param {object} opts
   * @param {Endpoint} opts.localAddr
   * @param {MapStore<Endpoint, [Port, Remote<Required<ListenHandler>>]>} opts.listening
   * @param {SetStore<Remote<Connection>>} opts.openConnections
   * @param {MapStore<Port, SetStore<Closable>>} opts.currentConnections
   * @param {MapStore<string, Port>} opts.boundPorts
   * @param {Remote<ProtocolHandler>} opts.protocolHandler
   * @param {ProtocolImpl} opts.protocolImpl
   */
  const initPort = ({
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
  };

  const makePort = zone.exoClass(
    'Port',
    Shape.PortI,
    initPort,
    /** @type {ExoClassMethods<Port, typeof initPort>} */ ({
      getLocalAddress() {
        // Works even after revoke().
        return this.state.localAddr;
      },
      /** @param {Remote<ListenHandler>} listenHandler */
      async addListener(listenHandler) {
        const { revoked, listening, localAddr, protocolHandler } = this.state;

        !revoked || Fail`Port ${this.state.localAddr} is revoked`;
        listenHandler || Fail`listenHandler is not defined`;

        const lh = /** @type {Remote<Required<ListenHandler>>} */ (
          listenHandler
        );

        if (listening.has(localAddr)) {
          // Last one wins.
          const [lport, lhandler] = listening.get(localAddr);
          if (lhandler === listenHandler) {
            return;
          }
          listening.set(localAddr, [this.self, lh]);
          E(lhandler).onRemove(lport, lhandler).catch(rethrowUnlessMissing);
        } else {
          listening.init(localAddr, harden([this.self, lh]));
        }

        // ASSUME: that the listener defines onAccept.

        await when(
          E(protocolHandler).onListen(
            this.self,
            localAddr,
            listenHandler,
            protocolHandler,
          ),
        );
        await when(E(lh).onListen(this.self, listenHandler)).catch(
          rethrowUnlessMissing,
        );
      },
      /** @param {Remote<ListenHandler>} listenHandler */
      async removeListener(listenHandler) {
        const { listening, localAddr, protocolHandler } = this.state;
        listening.has(localAddr) || Fail`Port ${localAddr} is not listening`;
        const lh = listening.get(localAddr)[1];
        lh === listenHandler ||
          Fail`Port ${localAddr} handler to remove is not listening`;
        listening.delete(localAddr);
        await when(
          E(protocolHandler).onListenRemove(
            this.self,
            localAddr,
            listenHandler,
            protocolHandler,
          ),
        );
        await when(E(lh).onRemove(this.self, listenHandler)).catch(
          rethrowUnlessMissing,
        );
      },
      /**
       * @param {Endpoint} remotePort
       * @param {Remote<ConnectionHandler>} [connectionHandler]
       */
      async connect(
        remotePort,
        connectionHandler = /** @type {Remote<ConnectionHandler>} */ (
          makeIncapable()
        ),
      ) {
        const { revoked, localAddr, protocolImpl, openConnections } =
          this.state;

        !revoked || Fail`Port ${localAddr} is revoked`;
        /** @type {Endpoint} */
        const dst = harden(remotePort);
        // eslint-disable-next-line no-use-before-define
        const conn = await when(
          E(protocolImpl).outbound(this.self, dst, connectionHandler),
        );
        if (revoked) {
          void E(conn).close();
        } else {
          openConnections.add(conn);
        }
        return conn;
      },
      async revoke() {
        const { revoked, localAddr } = this.state;
        const { protocolHandler, currentConnections, listening, boundPorts } =
          this.state;

        revoked !== RevokeState.REVOKED ||
          Fail`Port ${localAddr} is already revoked`;
        this.state.revoked = RevokeState.REVOKING;
        await when(
          E(protocolHandler).onRevoke(this.self, localAddr, protocolHandler),
        );
        this.state.revoked = RevokeState.REVOKED;

        // Clean up everything we did.
        const values = [...currentConnections.get(this.self).values()];
        const ps = values.map(conn => when(E(conn).close()).catch(sink));
        if (listening.has(localAddr)) {
          const listener = listening.get(localAddr)[1];
          ps.push(when(this.self.removeListener(listener)).catch(sink));
        }
        await Promise.all(ps);
        currentConnections.delete(this.self);
        boundPorts.delete(localAddr);
      },
    }),
  );

  return makePort;
};

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {ReturnType<import('@agoric/vow').prepareVowTools>} powers
 */
const prepareBinder = (zone, powers) => {
  const makeConnection = prepareHalfConnection(zone, powers);
  const { when } = powers;
  const makeInboundAttempt = prepareInboundAttempt(
    zone,
    makeConnection,
    powers,
  );
  const makePort = preparePort(zone, powers);
  const detached = zone.detached();

  const makeBinderKit = zone.exoClassKit(
    'binder',
    {
      protocolImpl: Shape.ProtocolImplI,
      binder: M.interface('Binder', {
        bind: M.callWhen(Shape.Endpoint).returns(Shape.Port),
      }),
    },
    /**
     * @param {object} opts
     * @param {MapStore<Port, SetStore<Closable>>} opts.currentConnections
     * @param {MapStore<string, Port>} opts.boundPorts
     * @param {MapStore<Endpoint, [Port, Remote<Required<ListenHandler>>]>} opts.listening
     * @param {Remote<ProtocolHandler>} opts.protocolHandler
     */
    ({ currentConnections, boundPorts, listening, protocolHandler: ph }) => {
      /** @type {SetStore<Connection>} */
      const openConnections = detached.setStore('openConnections');

      const protocolHandler = /** @type {Remote<Required<ProtocolHandler>>} */ (
        ph
      );
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
          const { listening, protocolHandler, currentConnections } = this.state;

          let lastFailure = Error(`No listeners for ${listenAddr}`);
          for await (const listenPrefix of getPrefixes(listenAddr)) {
            if (!listening.has(listenPrefix)) {
              continue;
            }
            const [port, _] = listening.get(listenPrefix);
            let localAddr;

            await (async () => {
              // See if our protocol is willing to receive this connection.
              const localInstance = await when(
                E(protocolHandler).onInstantiate(
                  port,
                  listenPrefix,
                  remoteAddr,
                  protocolHandler,
                ),
              ).catch(rethrowUnlessMissing);
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
            const current = currentConnections.get(port);
            const inboundAttempt = makeInboundAttempt({
              localAddr,
              remoteAddr,
              currentConnections,
              listenPrefix,
              listening,
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
          const { protocolHandler, currentConnections } = this.state;

          const localAddr = await E(port).getLocalAddress();

          // Allocate a local address.
          const initialLocalInstance = await when(
            E(protocolHandler).onInstantiate(
              port,
              localAddr,
              remoteAddr,
              protocolHandler,
            ),
          ).catch(rethrowUnlessMissing);
          const initialLocalAddr = initialLocalInstance
            ? `${localAddr}/${initialLocalInstance}`
            : localAddr;

          let lastFailure;
          let accepted;
          await (async () => {
            // Attempt the loopback connection.
            const attempt = await when(
              this.facets.protocolImpl.inbound(remoteAddr, initialLocalAddr),
            );
            accepted = await when(E(attempt).accept({ handler: lchandler }));
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
                E(protocolHandler).onConnect(
                  port,
                  initialLocalAddr,
                  remoteAddr,
                  lchandler,
                  protocolHandler,
                ),
              )
            );

          if (!rchandler) {
            throw lastFailure;
          }

          const lch = /** @type {Remote<Required<ConnectionHandler>>} */ (
            lchandler
          );

          const rch = /** @type {Remote<Required<ConnectionHandler>>} */ (
            rchandler
          );

          const current = currentConnections.get(port);
          return crossoverConnection(
            zone,
            lch,
            localAddress,
            rch,
            remoteAddress,
            makeConnection,
            current,
          )[0];
        },
        async bind(localAddr) {
          return this.facets.binder.bind(localAddr);
        },
      },
      binder: {
        /** @param {string} localAddr */
        async bind(localAddr) {
          const {
            protocolHandler,
            boundPorts,
            listening,
            openConnections,
            currentConnections,
          } = this.state;

          // Check if we are underspecified (ends in slash)
          const underspecified = localAddr.endsWith(ENDPOINT_SEPARATOR);
          for await (const _ of whileTrue(() => underspecified)) {
            const portID = await when(
              E(protocolHandler).generatePortID(localAddr, protocolHandler),
            );
            const newAddr = `${localAddr}${portID}`;
            if (!boundPorts.has(newAddr)) {
              localAddr = newAddr;
              break;
            }
          }

          this.state.localAddr = localAddr;

          if (boundPorts.has(localAddr)) {
            return boundPorts.get(localAddr);
          }

          const port = makePort({
            localAddr,
            listening,
            openConnections,
            currentConnections,
            boundPorts,
            protocolHandler,
            protocolImpl: this.facets.protocolImpl,
          });

          await when(
            E(protocolHandler).onBind(port, localAddr, protocolHandler),
          );
          boundPorts.init(localAddr, port);
          currentConnections.init(port, detached.setStore('connections'));
          return port;
        },
      },
    },
  );

  return makeBinderKit;
};

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {ReturnType<import('@agoric/vow').prepareVowTools>} powers
 */
export const prepareNetworkProtocol = (zone, powers) => {
  const makeBinderKit = prepareBinder(zone, powers);

  /**
   * @param {Remote<ProtocolHandler>} protocolHandler
   * @returns {Protocol}
   */
  const makeNetworkProtocol = protocolHandler => {
    const detached = zone.detached();

    /** @type {MapStore<Port, SetStore<Closable>>} */
    const currentConnections = detached.mapStore('portToCurrentConnections');

    /** @type {MapStore<string, Port>} */
    const boundPorts = detached.mapStore('addrToPort');

    /** @type {MapStore<Endpoint, [Port, Remote<Required<ListenHandler>>]>} */
    const listening = detached.mapStore('listening');

    const { binder, protocolImpl } = makeBinderKit({
      currentConnections,
      boundPorts,
      listening,
      protocolHandler,
    });

    // Wire up the local protocol to the handler.
    void E(protocolHandler).onCreate(protocolImpl, protocolHandler);
    return binder;
  };

  return makeNetworkProtocol;
};

/**
 * Create a ConnectionHandler that just echoes its packets.
 *
 * @param {import('@agoric/base-zone').Zone} zone
 */
export const prepareEchoConnectionKit = zone => {
  const makeEchoConnectionKit = zone.exoClassKit(
    'EchoConnectionKit',
    {
      handler: M.interface('ConnectionHandler', {
        onReceive: M.callWhen(
          Shape.Connection,
          Shape.Bytes,
          Shape.ConnectionHandler,
        )
          .optional(Shape.Opts)
          .returns(Shape.Data),
        onClose: M.callWhen(Shape.Connection)
          .optional(M.any(), Shape.ConnectionHandler)
          .returns(M.undefined()),
      }),
      listener: M.interface('Listener', {
        onListen: M.callWhen(Shape.Port, Shape.ListenHandler).returns(
          Shape.Vow$(M.undefined()),
        ),
        onAccept: M.callWhen(
          Shape.Port,
          Shape.Endpoint,
          Shape.Endpoint,
          Shape.ListenHandler,
        ).returns(Shape.Vow$(Shape.ConnectionHandler)),
      }),
    },
    () => {
      return {
        /** @type {string | undefined} */
        closed: undefined,
      };
    },
    {
      handler: {
        /**
         * @param {Connection} _connection
         * @param {Bytes} bytes
         * @param {ConnectionHandler} _connectionHandler
         */
        async onReceive(_connection, bytes, _connectionHandler) {
          const { closed } = this.state;

          if (closed) {
            throw closed;
          }
          return bytes;
        },
        /**
         * @param {Connection} _connection
         * @param {CloseReason} [_reason]
         * @param {ConnectionHandler} [_connectionHandler]
         */
        async onClose(_connection, _reason, _connectionHandler) {
          const { closed } = this.state;

          if (closed) {
            throw Error(closed);
          }

          this.state.closed = 'Connection closed';
        },
      },
      listener: {
        async onAccept(_port, _localAddr, _remoteAddr, _listenHandler) {
          return this.facets.handler;
        },
        async onListen(port, _listenHandler) {
          console.debug(`listening on echo port: ${port}`);
        },
      },
    },
  );

  return makeEchoConnectionKit;
};

/**
 * Create a protocol handler that just connects to itself.
 *
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {ReturnType<import('@agoric/vow').prepareVowTools>} powers
 */
export function prepareLoopbackProtocolHandler(zone, { when }) {
  const detached = zone.detached();

  /** @param {string} [instancePrefix] */
  const initHandler = (instancePrefix = 'nonce/') => {
    /** @type {MapStore<string, [Remote<Port>, Remote<Required<ListenHandler>>]>} */
    const listeners = detached.mapStore('localAddr');

    return {
      listeners,
      portNonce: 0n,
      instancePrefix,
      instanceNonce: 0n,
    };
  };

  const makeLoopbackProtocolHandler = zone.exoClass(
    'ProtocolHandler',
    Shape.ProtocolHandlerI,
    initHandler,
    /** @type {ExoClassMethods<Required<ProtocolHandler>, typeof initHandler>} */ ({
      async onCreate(_impl, _protocolHandler) {
        // noop
      },
      async generatePortID(_localAddr, _protocolHandler) {
        this.state.portNonce += 1n;
        return `port${this.state.portNonce}`;
      },
      async onBind(_port, _localAddr, _protocolHandler) {
        // noop, for now; Maybe handle a bind?
      },
      async onConnect(_port, localAddr, remoteAddr, _chandler) {
        const { listeners } = this.state;
        const [lport, lhandler] = listeners.get(remoteAddr);
        const rchandler = await when(
          E(lhandler).onAccept(lport, remoteAddr, localAddr, lhandler),
        );
        // console.log(`rchandler is`, rchandler);
        const remoteInstance = await when(
          E(this.self).onInstantiate(lport, remoteAddr, localAddr, this.self),
        ).catch(rethrowUnlessMissing);
        return {
          remoteInstance,
          handler: rchandler,
        };
      },
      async onInstantiate(_port, _localAddr, _remote, _protocol) {
        const { instancePrefix } = this.state;
        this.state.instanceNonce += 1n;
        return `${instancePrefix}${this.state.instanceNonce}`;
      },
      async onListen(port, localAddr, listenHandler, _protocolHandler) {
        const { listeners } = this.state;

        const lh = /** @type {Remote<Required<ListenHandler>>} */ (
          listenHandler
        );

        // This implementation has a simple last-one-wins replacement policy.
        // Other handlers might use different policies.
        if (listeners.has(localAddr)) {
          const lhandler = listeners.get(localAddr)[1];
          if (lhandler !== listenHandler) {
            listeners.set(localAddr, harden([port, lh]));
          }
        } else {
          listeners.init(localAddr, harden([port, lh]));
        }
      },
      /**
       * @param {Port} port
       * @param {Endpoint} localAddr
       * @param {Remote<ListenHandler>} listenHandler
       * @param {*} _protocolHandler
       */
      async onListenRemove(port, localAddr, listenHandler, _protocolHandler) {
        const { listeners } = this.state;
        const [lport, lhandler] = listeners.get(localAddr);
        lport === port || Fail`Port does not match listener on ${localAddr}`;
        lhandler === listenHandler ||
          Fail`Listen handler does not match listener on ${localAddr}`;
        listeners.delete(localAddr);
      },
      async onRevoke(_port, _localAddr, _protocolHandler) {
        // This is an opportunity to clean up resources.
      },
    }),
  );

  return makeLoopbackProtocolHandler;
}
