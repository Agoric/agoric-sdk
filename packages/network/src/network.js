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
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {ReturnType<import('@agoric/whenable').prepareWhenableModule>} powers
 */
const prepareHalfConnection = (zone, { when }) => {
  const makeHalfConnection = zone.exoClass(
    'Connection',
    undefined,
    ({ addrs, handlers, conns, current, l, r }) => {
      return {
        addrs,
        handlers,
        conns,
        current,
        l,
        r,
        closed: undefined,
      };
    },
    {
      getLocalAddress() {
        return this.state.addrs[this.state.l];
      },
      getRemoteAddress() {
        return this.state.addrs[this.state.r];
      },
      async send(packetBytes) {
        if (this.state.closed) {
          throw this.state.closed;
        }

        // watch(
        //   E(this.state.handlers[this.state.r])
        //     .onReceive(
        //       this.state.conns.get(this.state.r),
        //       toBytes(packetBytes),
        //       this.state.handlers[this.state.r],
        //     )
        //     .catch(rethrowUnlessMissing),
        //   {
        //     onFulfilled: ack => {

        //     },
        //     onRejected: () => { },
        //   },
        // );

        const ack = await when(
          E(this.state.handlers[this.state.r])
            .onReceive(
              this.state.conns.get(this.state.r),
              toBytes(packetBytes),
              this.state.handlers[this.state.r],
            )
            .catch(rethrowUnlessMissing),
        );

        return toBytes(ack || '');
      },
      async close() {
        if (this.state.closed) {
          throw this.state.closed;
        }
        this.state.closed = Error('Connection closed');
        this.state.current.delete(this.state.conns.get(this.state.l));
        await E(this.state.handlers[this.state.l])
          .onClose(
            this.state.conns.get(this.state.l),
            undefined,
            this.state.handlers[this.state.l],
          )
          .catch(rethrowUnlessMissing);
      },
    },
  );

  return makeHalfConnection;
};

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param handler0
 * @param addr0
 * @param handler1
 * @param addr1
 * @param makeConnection
 * @param current
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

  /** @type {MapStore<int, Connection>} */
  const conns = detached.mapStore('addrToConnections');

  /** @type {ConnectionHandler[]} */
  const handlers = harden([handler0, handler1]);
  /** @type {Endpoint[]} */
  const addrs = harden([addr0, addr1]);

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
 * @param {import('@agoric/base-zone').Zone} zone
 * @param makeConnection
 */
const prepareInboundAttempt = (zone, makeConnection) => {
  const makeInboundAttempt = zone.exoClass(
    'InboundAttempt',
    undefined,
    ({
      localAddr,
      remoteAddr,
      currentConnections,
      listenPrefix,
      listening,
    }) => ({
      localAddr,
      remoteAddr,
      consummated: undefined,
      currentConnections,
      listenPrefix,
      listening,
    }),
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
      async accept({
        localAddress = this.state.localAddr,
        remoteAddress = this.state.remoteAddr,
        handler: rchandler,
      }) {
        if (this.state.consummated) {
          throw this.state.consummated;
        }
        this.state.consummated = Error(`Already accepted`);

        const [port, listener] = this.state.listening.get(
          this.state.listenPrefix,
        );
        const current = this.state.currentConnections.get(port);

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
const RevokeState = {
  NOT_REVOKED: 0,
  REVOKING: 1,
  REVOKED: 2,
};

const preparePort = zone => {
  const makePort = zone.exoClass(
    'Port',
    undefined,
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
        revoked: undefined,
      };
    },
    {
      getLocalAddress() {
        // Works even after revoke().
        return this.state.localAddr;
      },
      async addListener(listenHandler) {
        const revoked = this.state.revoked;

        !revoked || Fail`Port ${this.state.localAddr} is revoked`;
        listenHandler || Fail`listenHandler is not defined`;

        if (this.state.listening.has(this.state.localAddr)) {
          // Last one wins.
          const [lport, lhandler] = this.state.listening.get(
            this.state.localAddr,
          );
          if (lhandler === listenHandler) {
            return;
          }
          this.state.listening.set(this.state.localAddr, [
            this.self,
            listenHandler,
          ]);
          E(lhandler).onRemove(lport, lhandler).catch(rethrowUnlessMissing);
        } else {
          this.state.listening.init(
            this.state.localAddr,
            harden([this.self, listenHandler]),
          );
        }

        // TODO: Check that the listener defines onAccept.

        await E(this.state.protocolHandler).onListen(
          this.self,
          this.state.localAddr,
          listenHandler,
          this.state.protocolHandler,
        );
        await E(listenHandler)
          .onListen(this.self, listenHandler)
          .catch(rethrowUnlessMissing);
      },
      async removeListener(listenHandler) {
        this.state.listening.has(this.state.localAddr) ||
          Fail`Port ${this.state.localAddr} is not listening`;
        this.state.listening.get(this.state.localAddr)[1] === listenHandler ||
          Fail`Port ${this.state.localAddr} handler to remove is not listening`;
        this.state.listening.delete(this.state.localAddr);
        await E(this.state.protocolHandler).onListenRemove(
          this.self,
          this.state.localAddr,
          listenHandler,
          this.state.protocolHandler,
        );
        await E(listenHandler)
          .onRemove(this.self, listenHandler)
          .catch(rethrowUnlessMissing);
      },
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
            .catch(_ => { }),
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
        localAddr: undefined,
      };
    },
    {
      protocolImpl: {
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
        async outbound(port, remoteAddr, lchandler) {
          const localAddr =
            /** @type {string} */
            (await E(port).getLocalAddress());

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

export const makeNetworkProtocol = (zone, protocolHandler, powers) => {
  const detached = zone.detached();

  /** @type {MapStore<string, SetStore<Closable>} */
  const currentConnections = detached.mapStore('portToCurrentConnections');

  /** @type {MapStore<string, Port>} */
  const boundPorts = detached.mapStore('addrToPort');

  /** @type {MapStore<Endpoint, [Port, ListenHandler]>} */
  const listening = detached.mapStore('listening');

  const makeBinder = prepareBinder(zone, powers);
  const { binder, protocolImpl } = makeBinder({
    currentConnections,
    boundPorts,
    listening,
    protocolHandler,
  });

  // Wire up the local protocol to the handler.
  void E(protocolHandler).onCreate(protocolImpl, protocolHandler);
  return harden(binder);
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
    () => ({
      closed: undefined,
    }),
    {
      async onReceive(_connection, bytes, _connectionHandler) {
        if (this.state.closed) {
          throw this.state.closed;
        }
        return bytes;
      },
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
 * @param {ProtocolHandler['onInstantiate']} [onInstantiate]
 * @param makeNonceMaker
 */
export function prepareLoopbackProtocolHandler(zone, makeNonceMaker) {
  const makePortID = makeNonceMaker('port').get();
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
        return makePortID();
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
