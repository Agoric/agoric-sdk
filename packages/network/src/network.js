// @ts-check

import { E } from '@endo/far';
import { M } from '@endo/patterns';
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

const Shape1 = /** @type {const} */ ({
  /**
   * Data is string | Buffer | ArrayBuffer
   * but only string is passable
   */
  Data: M.string(),
  Bytes: M.string(),
  Endpoint: M.string(),
  // TODO: match on "Vow" tag
  // @endo/patterns supports it as of
  // https://github.com/endojs/endo/pull/2091
  // but that's not in agoric-sdk yet.
  // For now, use M.any() to avoid:
  // cannot check unrecognized tag "Vow": "[Vow]"
  Vow: M.any(),

  ConnectionHandler: M.remotable('ConnectionHandler'),
  Connection: M.remotable('Connection'),
  InboundAttempt: M.remotable('InboundAttempt'),
  Listener: M.remotable('Listener'),
  ListenHandler: M.remotable('ListenHandler'),
  Port: M.remotable('Port'),
  ProtocolHandler: M.remotable('ProtocolHandler'),
  ProtocolImpl: M.remotable('ProtocolImpl'),
});

const Shape2 = /** @type {const} */ ({
  ...Shape1,
  Vow$: shape => M.or(shape, Shape1.Vow),
  AttemptDescription: M.splitRecord(
    { handler: Shape1.ConnectionHandler },
    { remoteAddress: Shape1.Endpoint, localAddress: Shape1.Endpoint },
  ),
  Opts: M.recordOf(M.string(), M.any()),
});

export const Shape = /** @type {const} */ harden({
  ...Shape2,
  ConnectionI: M.interface('Connection', {
    send: M.callWhen(Shape2.Data)
      .optional(Shape2.Opts)
      .returns(Shape2.Vow$(Shape2.Bytes)),
    close: M.callWhen().returns(Shape2.Vow$(M.undefined())),
    getLocalAddress: M.call().returns(Shape2.Endpoint),
    getRemoteAddress: M.call().returns(Shape2.Endpoint),
  }),
  InboundAttemptI: M.interface('InboundAttempt', {
    accept: M.callWhen(Shape2.AttemptDescription).returns(
      Shape2.Vow$(Shape2.Connection),
    ),
    getLocalAddress: M.call().returns(Shape2.Endpoint),
    getRemoteAddress: M.call().returns(Shape2.Endpoint),
    close: M.callWhen().returns(Shape2.Vow$(M.undefined())),
  }),
  PortI: M.interface('Port', {
    getLocalAddress: M.call().returns(Shape2.Endpoint),
    addListener: M.callWhen(Shape2.Listener).returns(
      Shape2.Vow$(M.undefined()),
    ),
    connect: M.callWhen(Shape2.Endpoint)
      .optional(Shape2.ConnectionHandler)
      .returns(Shape2.Vow$(Shape2.Connection)),
    removeListener: M.callWhen(Shape2.Listener).returns(
      Shape2.Vow$(M.undefined()),
    ),
    revoke: M.callWhen().returns(Shape2.Vow$(M.undefined())),
  }),
  ProtocolHandlerI: M.interface('ProtocolHandler', {
    onCreate: M.callWhen(M.remotable(), Shape2.ProtocolHandler).returns(
      Shape2.Vow$(M.undefined()),
    ),
    generatePortID: M.callWhen(Shape2.Endpoint, Shape2.ProtocolHandler).returns(
      Shape2.Vow$(M.string()),
    ),
    onBind: M.callWhen(
      Shape2.Port,
      Shape2.Endpoint,
      Shape2.ProtocolHandler,
    ).returns(Shape2.Vow$(M.undefined())),
    onListen: M.callWhen(
      Shape2.Port,
      Shape2.Endpoint,
      Shape2.ListenHandler,
      Shape2.ProtocolHandler,
    ).returns(Shape2.Vow$(M.undefined())),
    onListenRemove: M.callWhen(
      Shape2.Port,
      Shape2.Endpoint,
      Shape2.ListenHandler,
      Shape2.ProtocolHandler,
    ).returns(Shape2.Vow$(M.undefined())),
    onInstantiate: M.callWhen(
      Shape2.Port,
      Shape2.Endpoint,
      Shape2.Endpoint,
      Shape2.ProtocolHandler,
    ).returns(Shape2.Vow$(Shape2.Endpoint)),
    onConnect: M.callWhen(
      Shape2.Port,
      Shape2.Endpoint,
      Shape2.Endpoint,
      Shape2.ConnectionHandler,
      Shape2.ProtocolHandler,
    ).returns(Shape2.Vow$(Shape2.AttemptDescription)),
    onRevoke: M.callWhen(
      Shape2.Port,
      Shape2.Endpoint,
      Shape2.ProtocolHandler,
    ).returns(Shape2.Vow$(M.undefined())),
  }),
  ProtocolImplI: M.interface('ProtocolImpl', {
    bind: M.callWhen(Shape2.Endpoint).returns(Shape2.Vow$(Shape2.Port)),
    inbound: M.callWhen(Shape2.Endpoint, Shape2.Endpoint).returns(
      Shape2.Vow$(Shape2.InboundAttempt),
    ),
    outbound: M.callWhen(
      Shape2.Port,
      Shape2.Endpoint,
      Shape2.ConnectionHandler,
    ).returns(Shape2.Vow$(Shape2.Connection)),
  }),
});

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

/** @param {import('@agoric/base-zone').Zone} zone */
const prepareOpenConnectionAckWatcher = zone => {
  const makeOpenConnectionAckWatcher = zone.exoClass(
    'OpenConnectionAckWatcher',
    M.interface('OpenConnectionAckWatcher', {
      onFulfilled: M.call(M.any()).rest(M.any()).returns(M.any()),
    }),
    () => ({}),
    {
      onFulfilled(ack) {
        return toBytes(ack || '');
      },
    },
  );
  return makeOpenConnectionAckWatcher;
};

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param makeConnection
 */
const prepareInboundAttemptAcceptWatcher = (zone, makeConnection) => {
  const makeInboundAttemptAcceptWatcher = zone.exoClass(
    'InboundAttemptAcceptWatcher',
    M.interface('InboundAttemptAcceptWatcher', {
      onFulfilled: M.call(M.any()).rest(M.any()).returns(M.any()),
    }),
    ({ localAddress, rchandler, remoteAddress, current }) => ({
      localAddress,
      rchandler,
      remoteAddress,
      current,
    }),
    {
      onFulfilled(lchandler) {
        const { localAddress, rchandler, remoteAddress, current } = this.state;

        // eslint-disable-next-line no-use-before-define
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
  return makeInboundAttemptAcceptWatcher;
};

/** @param {import('@agoric/base-zone').Zone} zone */
const prepareSinkWatcher = zone => {
  const makeSinkWatcher = zone.exoClass(
    'SinkWatcher',
    M.interface('OpenConnectionAckWatcher', {
      onFulfilled: M.call(M.any()).rest(M.any()).returns(),
    }),
    () => ({}),
    {
      onFulfilled(_value) {
        return undefined;
      },
    },
  );
  return makeSinkWatcher;
};

/** @param {import('@agoric/base-zone').Zone} zone */
const preparePortAddListenerWatcher = zone => {
  const makePortAddListenerWatcher = zone.exoClass(
    'PortAddListenerWatcher',
    M.interface('PortAddListenerWatcher', {
      onFulfilled: M.call(M.any()).rest(M.any()).returns(M.any()),
    }),
    ({ port, listenHandler }) => ({
      port,
      listenHandler,
    }),
    {
      onFulfilled(_value) {
        const { port, listenHandler } = this.state;
        return E(listenHandler).onListen(port, listenHandler);
      },
    },
  );
  return makePortAddListenerWatcher;
};

/** @param {import('@agoric/base-zone').Zone} zone */
const preparePortRemoveListenerWatcher = zone => {
  const makePortRemoveListenerWatcher = zone.exoClass(
    'PortRemoveListenerWatcher',
    M.interface('PortRemoveListenerWatcher', {
      onFulfilled: M.call(M.any()).rest(M.any()).returns(M.any()),
    }),
    ({ port, listenHandler }) => ({
      port,
      listenHandler,
    }),
    {
      onFulfilled(_value) {
        const { port, listenHandler } = this.state;
        return E(listenHandler).onRemove(port, listenHandler);
      },
    },
  );
  return makePortRemoveListenerWatcher;
};

/** @param {import('@agoric/base-zone').Zone} zone */
const preparePortConnectWatcher = zone => {
  const makePortConnectWatcher = zone.exoClass(
    'PortConnectWatcher',
    M.interface('PortConnectWatcher', {
      onFulfilled: M.call(M.any()).rest(M.any()).returns(M.any()),
    }),
    ({ revoked, openConnections }) => ({
      revoked,
      openConnections,
    }),
    {
      onFulfilled(conn) {
        const { revoked, openConnections } = this.state;

        if (revoked) {
          void E(conn).close();
        } else {
          openConnections.add(conn);
        }
        return conn;
      },
    },
  );
  return makePortConnectWatcher;
};

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {ReturnType<import('@agoric/vow').prepareVowTools>} powers
 
 */
const preparePortRevokeWatcher = (zone, { watch }) => {
  const makePortRevokeWatcher = zone.exoClass(
    'PortRevokeWatcher',
    M.interface('PortRevokeWatcher', {
      onFulfilled: M.call(M.any()).rest(M.any()).returns(M.any()),
    }),
    ({ currentConnections, port, listening, localAddr }) => ({
      currentConnections,
      port,
      listening,
      localAddr,
    }),
    {
      onFulfilled(_value) {
        const { currentConnections, port, listening, localAddr } = this.state;

        // Clean up everything we did.
        const values = [...currentConnections.get(port).values()];
        const ps = values.map(conn => {
          return watch(E(conn).close(), harden({}));
        });

        if (listening.has(localAddr)) {
          const listener = listening.get(localAddr)[1];
          ps.push(port.removeListener(listener));
        }

        return ps;
      },
    },
  );
  return makePortRevokeWatcher;
};

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {ReturnType<import('@agoric/vow').prepareVowTools>} powers
 
 */
const preparePortCloseAllWatcher = zone => {
  const makePortCloseAllWatcher = zone.exoClass(
    'PortCloseAllWatcher',
    M.interface('PortCloseAllWatcher', {
      onFulfilled: M.call(M.any()).rest(M.any()).returns(M.any()),
    }),
    () => ({}),
    {
      onFulfilled(vows) {
        return Promise.all(vows);
      },
    },
  );
  return makePortCloseAllWatcher;
};

/** @param {import('@agoric/base-zone').Zone} zone */
const preparePortRevokeCleanupWatcher = zone => {
  const makePortRevokeCleanupWatcher = zone.exoClass(
    'PortRevokeCleanupWatcher',
    M.interface('PortRevokeCleanupWatcher', {
      onFulfilled: M.call(M.any()).rest(M.any()).returns(),
    }),
    ({ currentConnections, boundPorts, localAddr, port, store }) => ({
      currentConnections,
      boundPorts,
      localAddr,
      port,
      store,
    }),
    {
      onFulfilled(_value) {
        const { currentConnections, boundPorts, localAddr, port, store } =
          this.state;

        // eslint-disable-next-line no-use-before-define
        store.set('revoked', RevokeState.REVOKED);

        currentConnections.delete(port);
        boundPorts.delete(localAddr);
      },
    },
  );
  return makePortRevokeCleanupWatcher;
};

/** @param {import('@agoric/base-zone').Zone} zone */
const prepareProtocolHandlerAcceptWatcher = zone => {
  const makeProtocolHandlerAcceptWatcher = zone.exoClass(
    'ProtocolHandlerAcceptWatcher',
    M.interface('ProtocolHandlerAcceptWatcher', {
      onFulfilled: M.call(M.any()).rest(M.any()).returns(),
    }),
    () => ({}),
    {
      onFulfilled(rchandler) {
        return rchandler;
      },
    },
  );
  return makeProtocolHandlerAcceptWatcher;
};

/** @param {import('@agoric/base-zone').Zone} zone */
const prepareProtocolHandlerConnectWatcher = zone => {
  const makeProtocolHandlerConnectWatcher = zone.exoClass(
    'ProtocolHandlerConnectWatcher',
    undefined,
    () => ({}),
    {
      onFulfilled(results) {
        return {
          remoteInstance: results[0],
          handler: results[1],
        };
      },
    },
  );
  return makeProtocolHandlerConnectWatcher;
};

/** @param {import('@agoric/base-zone').Zone} zone */
const prepareProtocolHandlerInstantiateWatcher = zone => {
  const makeProtocolHandlerInstantiateWatcher = zone.exoClass(
    'ProtocolHandlerInstantiateWatcher',
    undefined,
    () => ({}),
    {
      onFulfilled(remoteInstance) {
        return remoteInstance;
      },
    },
  );
  return makeProtocolHandlerInstantiateWatcher;
};

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param watch
 */
const prepareBinderBindGeneratePortWatcher = (zone, watch) => {
  const makeBinderBindGeneratePortWatcher = zone.exoClass(
    'BinderBindGeneratePortWatcher',
    undefined,
    ({ underspecified, localAddr, protocolHandler, boundPorts }) => ({
      underspecified,
      localAddr,
      protocolHandler,
      boundPorts,
    }),
    {
      onFulfilled(portID) {
        const { localAddr, protocolHandler, boundPorts, underspecified } =
          this.state;

        if (!underspecified) {
          return localAddr;
        }

        const newAddr = `${localAddr}${portID}`;
        if (!boundPorts.has(newAddr)) {
          return newAddr;
        }
        return watch(
          E(protocolHandler).generatePortID(localAddr, protocolHandler),
          this.self,
        );
      },
    },
  );
  return makeBinderBindGeneratePortWatcher;
};

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param watch
 * @param makePort
 * @param makwBinderPortWatcher
 */
const prepareBinderBindWatcher = (
  zone,
  watch,
  makePort,
  makwBinderPortWatcher,
) => {
  const makeBinderBindWatcher = zone.exoClass(
    'BinderBindWatcher',
    undefined,
    ({
      boundPorts,
      listening,
      openConnections,
      currentConnections,
      protocolHandler,
      protocolImpl,
    }) => ({
      boundPorts,
      listening,
      openConnections,
      currentConnections,
      protocolHandler,
      protocolImpl,
    }),
    {
      onFulfilled(localAddr) {
        const {
          boundPorts,
          listening,
          openConnections,
          currentConnections,
          protocolHandler,
          protocolImpl,
        } = this.state;

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
          protocolImpl,
        });

        return watch(
          E(protocolHandler).onBind(port, localAddr, protocolHandler),
          makwBinderPortWatcher({
            port,
            boundPorts,
            localAddr,
            currentConnections,
          }),
        );
      },
    },
  );
  return makeBinderBindWatcher;
};

/** @param {import('@agoric/base-zone').Zone} zone */
const prepareBinderPortWatcher = zone => {
  const makeBinderPortWatcher = zone.exoClass(
    'BinderPortWatcher',
    undefined,
    ({ port, boundPorts, localAddr, currentConnections }) => ({
      port,
      boundPorts,
      localAddr,
      currentConnections,
    }),
    {
      onFulfilled(_value) {
        const { port, boundPorts, localAddr, currentConnections } = this.state;
        boundPorts.init(localAddr, harden(port));
        currentConnections.init(port, zone.detached().setStore('connections'));
        return port;
      },
    },
  );
  return makeBinderPortWatcher;
};

/** @param {import('@agoric/base-zone').Zone} zone */
const prepareRethrowUnlessMissingWatcher = zone => {
  const makeRethrowUnlessMissingWatcher = zone.exoClass(
    'RethrowUnlessMissingWatcher',
    undefined,
    () => ({}),
    {
      onRejected(e) {
        rethrowUnlessMissing(e);
      },
    },
  );
  return makeRethrowUnlessMissingWatcher;
};

/** @param {import('@agoric/base-zone').Zone} zone */
const prepareLoopbackRethrowUnlessMissingWatcher = zone => {
  const makeLoopbackRethrowUnlessMissingWatcher = zone.exoClass(
    'LoopbackRethrowUnlessMissingWatcher',
    undefined,
    () => ({}),
    {
      onRejected(e) {
        rethrowUnlessMissing(e);
      },
    },
  );
  return makeLoopbackRethrowUnlessMissingWatcher;
};

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
 * @param {ReturnType<import('@agoric/vow').prepareVowTools>} powers
 * @param makeAckWatcher
 * @param makeAckWatcher.makeOpenConnectionAckWatcher
 * @param makeAckWatcher.makeRethrowUnlessMissingWatcher
 * @param makeAckWatcher.makeSinkWatcher
 */
const prepareHalfConnection = (
  zone,
  { watch },
  {
    makeOpenConnectionAckWatcher,
    makeRethrowUnlessMissingWatcher,
    makeSinkWatcher,
  },
) => {
  const makeHalfConnection = zone.exoClass(
    'Connection',
    Shape.ConnectionI,
    /** @param {ConnectionOpts} opts */
    ({ addrs, handlers, conns, current, l, r }) => {
      /** @type {string | undefined} */
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
          throw closed;
        }

        const innerVow = watch(
          E(handlers[r]).onReceive(
            conns.get(r),
            toBytes(packetBytes),
            handlers[r],
          ),
          makeOpenConnectionAckWatcher(),
        );
        return watch(innerVow, makeRethrowUnlessMissingWatcher());
      },
      async close() {
        const { closed, current, conns, l, handlers } = this.state;
        if (closed) {
          throw Error(closed);
        }
        this.state.closed = 'Connection closed';
        current.delete(conns.get(l));
        const innerVow = watch(
          E(this.state.handlers[l]).onClose(
            conns.get(l),
            undefined,
            handlers[l],
          ),
          makeSinkWatcher(),
        );

        return watch(innerVow, makeRethrowUnlessMissingWatcher());
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
 * @param {ReturnType<import('@agoric/vow').prepareVowTools>} powers
 * @param root0
 * @param root0.makeSinkWatcher
 * @param root0.makeRethrowUnlessMissingWatcher
 * @param root0.makeInboundAttemptAcceptWatcher
 */
const prepareInboundAttempt = (
  zone,
  makeConnection,
  { watch },
  {
    makeSinkWatcher,
    makeRethrowUnlessMissingWatcher,
    makeInboundAttemptAcceptWatcher,
  },
) => {
  const makeInboundAttempt = zone.exoClass(
    'InboundAttempt',
    Shape.InboundAttemptI,
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

        const innerVow = watch(
          E(listener).onReject(port, localAddr, remoteAddr, listener),
          makeSinkWatcher(),
        );

        return watch(innerVow, makeRethrowUnlessMissingWatcher());
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
          throw Error(consummated);
        }

        if (localAddress === undefined) {
          localAddress = localAddr;
        }
        this.state.consummated = `${localAddress} Already accepted`;

        if (remoteAddress === undefined) {
          remoteAddress = remoteAddr;
        }

        const [port, listener] = listening.get(listenPrefix);
        const current = currentConnections.get(port);

        current.delete(this.self);

        return watch(
          E(listener).onAccept(port, localAddress, remoteAddress, listener),
          makeInboundAttemptAcceptWatcher({
            localAddress,
            rchandler,
            remoteAddress,
            current,
          }),
        );
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
 * @param root0
 * @param root0.makeSinkWatcher
 * @param root0.makeRethrowUnlessMissingWatcher
 * @param root0.makePortAddListenerWatcher
 * @param root0.makePortRemoveListenerWatcher
 * @param root0.makePortConnectWatcher
 * @param root0.preparePortRevokeWatcher
 * @param root0.makePortRevokeWatcher
 */
const preparePort = (
  zone,
  powers,
  { makeSinkWatcher, makeRethrowUnlessMissingWatcher },
) => {
  const makeIncapable = zone.exoClass('Incapable', undefined, () => ({}), {});

  const { when, watch } = powers;

  const makePortAddListenerWatcher = preparePortAddListenerWatcher(zone);
  const makePortRemoveListenerWatcher = preparePortRemoveListenerWatcher(zone);
  const makePortConnectWatcher = preparePortConnectWatcher(zone);
  const makePortRevokeWatcher = preparePortRevokeWatcher(zone, powers);
  const makePortCloseAllWatcher = preparePortCloseAllWatcher(zone);
  const makePortRevokeCleanupWatcher = preparePortRevokeCleanupWatcher(zone);

  const makePort = zone.exoClass(
    'Port',
    Shape.PortI,
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
      const detached = zone.detached();

      /** @type {MapStore<string, any>} */
      const store = detached.mapStore('portStore');
      store.init('revoked', undefined);

      return {
        listening,
        openConnections,
        currentConnections,
        boundPorts,
        localAddr,
        protocolHandler,
        protocolImpl,
        store,
      };
    },
    {
      getLocalAddress() {
        // Works even after revoke().
        return this.state.localAddr;
      },
      /** @param {ListenHandler} listenHandler */
      async addListener(listenHandler) {
        const { store, listening, localAddr, protocolHandler } = this.state;
        const revoked = store.get('revoked');

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

        // ASSUME: that the listener defines onAccept.

        await when(
          E(protocolHandler).onListen(
            this.self,
            localAddr,
            listenHandler,
            protocolHandler,
          ),
          makePortAddListenerWatcher({ port: this.self, listenHandler }),
          listenHandler,
        );
        return watch(innerVow, makeRethrowUnlessMissingWatcher());
      },
      /** @param {ListenHandler} listenHandler */
      async removeListener(listenHandler) {
        const { listening, localAddr, protocolHandler } = this.state;
        listening.has(localAddr) || Fail`Port ${localAddr} is not listening`;
        listening.get(localAddr)[1] === listenHandler ||
          Fail`Port ${localAddr} handler to remove is not listening`;
        listening.delete(localAddr);

        const innerVow = watch(
          E(protocolHandler).onListenRemove(
            this.self,
            localAddr,
            listenHandler,
            protocolHandler,
          ),
          makePortRemoveListenerWatcher({ port: this.self, listenHandler }),
          listenHandler,
        );
        return watch(innerVow, makeRethrowUnlessMissingWatcher());
      },
      /**
       * @param {Endpoint} remotePort
       * @param {ConnectionHandler} connectionHandler
       */
      async connect(
        remotePort,
        connectionHandler = /** @type {any} */ (makeIncapable()),
      ) {
        const { store, localAddr, protocolImpl, openConnections } = this.state;

        const revoked = store.get('revoked');

        !revoked || Fail`Port ${localAddr} is revoked`;
        /** @type {Endpoint} */
        const dst = harden(remotePort);
        return watch(
          protocolImpl.outbound(this.self, dst, connectionHandler),
          makePortConnectWatcher({ revoked, openConnections }),
        );
      },
      async revoke() {
        const { store, localAddr } = this.state;
        const { protocolHandler, currentConnections, listening, boundPorts } =
          this.state;

        const revoked = store.get('revoked');

        revoked !== RevokeState.REVOKED ||
          Fail`Port ${localAddr} is already revoked`;
        store.set('revoked', RevokeState.REVOKING);

        const revokeVow = watch(
          E(protocolHandler).onRevoke(this.self, localAddr, protocolHandler),
          makePortRevokeWatcher({
            currentConnections,
            listening,
            localAddr,
            port: this.self,
          }),
        );

        const closeVow = watch(revokeVow, makePortCloseAllWatcher());
        return watch(
          closeVow,
          makePortRevokeCleanupWatcher({
            currentConnections,
            boundPorts,
            localAddr,
            port: this.self,
            store,
          }),
        );
      },
    },
  );

  return makePort;
};

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {ReturnType<import('@agoric/vow').prepareVowTools>} powers
 */
const prepareBinder = (zone, powers) => {
  const makeOpenConnectionAckWatcher = prepareOpenConnectionAckWatcher(zone);
  const makeRethrowUnlessMissingWatcher =
    prepareRethrowUnlessMissingWatcher(zone);
  const makeSinkWatcher = prepareSinkWatcher(zone);

  const makeConnection = prepareHalfConnection(zone, powers, {
    makeOpenConnectionAckWatcher,
    makeRethrowUnlessMissingWatcher,
    makeSinkWatcher,
  });

  const makeInboundAttemptAcceptWatcher = prepareInboundAttemptAcceptWatcher(
    zone,
    makeConnection,
  );

  const { when, watch } = powers;

  const makeBinderBindGeneratePortWatcher =
    prepareBinderBindGeneratePortWatcher(zone, watch);

  const makeInboundAttempt = prepareInboundAttempt(
    zone,
    makeConnection,
    powers,
    {
      makeSinkWatcher,
      makeRethrowUnlessMissingWatcher,
      makeInboundAttemptAcceptWatcher,
    },
  );

  const makePort = preparePort(zone, powers, {
    makeSinkWatcher,
    makeRethrowUnlessMissingWatcher,
  });

  const makeBinderPortWatcher = prepareBinderPortWatcher(zone);
  const makeBinderBindWatcher = prepareBinderBindWatcher(
    zone,
    watch,
    makePort,
    makeBinderPortWatcher,
  );

  const detached = zone.detached();

  const makeBinderKit = zone.exoClassKit(
    'binder',
    {
      protocolImpl: Shape.ProtocolImplI,
      binder: M.interface('Binder', {
        bind: M.callWhen(Shape.Endpoint).returns(Shape2.Vow$(Shape.Port)),
      }),
    },
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
            accepted = await when(attempt.accept({ handler: lchandler }));
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

          const current = currentConnections.get(port);
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

          const localAddrVow = watch(
            E(protocolHandler).generatePortID(localAddr, protocolHandler),
            makeBinderBindGeneratePortWatcher({
              underspecified,
              localAddr,
              protocolHandler,
              boundPorts,
            }),
          );

          return watch(
            localAddrVow,
            makeBinderBindWatcher({
              listening,
              openConnections,
              currentConnections,
              boundPorts,
              protocolHandler,
              protocolImpl: this.facets.protocolImpl,
            }),
          );
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
          Shape2.Connection,
          Shape2.Bytes,
          Shape2.ConnectionHandler,
        )
          .optional(Shape2.Opts)
          .returns(Shape2.Data),
        onClose: M.callWhen(Shape2.Connection)
          .optional(M.any(), Shape2.ConnectionHandler)
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
      /** @type {string | undefined} */
      let closed;
      return {
        closed,
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
          return harden(this.facets.handler);
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
export function prepareLoopbackProtocolHandler(zone, { watch, when }) {
  const detached = zone.detached();
  const makeProtocolHandlerAcceptWatcher =
    prepareProtocolHandlerAcceptWatcher(zone);
  const makeProtocolHandlerInstantiateWatcher =
    prepareProtocolHandlerInstantiateWatcher(zone);
  const makeProtocolHandlerConnectWatcher =
    prepareProtocolHandlerConnectWatcher(zone);
  const makeRethrowUnlessMissingWatcher =
    prepareLoopbackRethrowUnlessMissingWatcher(zone);

  const makeLoopbackProtocolHandler = zone.exoClass(
    'ProtocolHandler',
    Shape.ProtocolHandlerI,
    /** @param {string} [instancePrefix] */
    (instancePrefix = 'nonce/') => {
      /** @type {MapStore<string, [Port, ListenHandler]>} */
      const listeners = detached.mapStore('localAddr');

      return {
        listeners,
        portNonce: 0n,
        instancePrefix,
        instanceNonce: 0n,
      };
    },
    {
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
      async onConnect(
        _port,
        localAddr,
        remoteAddr,
        _chandler,
        protocolHandler,
      ) {
        const { listeners } = this.state;
        const [lport, lhandler] = listeners.get(remoteAddr);

        const acceptVow = watch(
          E(lhandler).onAccept(lport, remoteAddr, localAddr, lhandler),
          makeProtocolHandlerAcceptWatcher(),
        );

        const instantiateInnerVow = watch(
          E(protocolHandler).onInstantiate(
            lport,
            remoteAddr,
            localAddr,
            protocolHandler,
          ),
          makeProtocolHandlerInstantiateWatcher(),
        );

        const instantiateVow = watch(
          instantiateInnerVow,
          makeRethrowUnlessMissingWatcher(),
        );
        return watch(
          Promise.all([acceptVow, instantiateVow]),
          makeProtocolHandlerConnectWatcher(),
        );
      },
      async onInstantiate(_port, _localAddr, _remote, _protocol) {
        const { instancePrefix } = this.state;
        this.state.instanceNonce += 1n;
        return `${instancePrefix}${this.state.instanceNonce}`;
      },
      async onListen(port, localAddr, listenHandler, _protocolHandler) {
        const { listeners } = this.state;

        // This implementation has a simple last-one-wins replacement policy.
        // Other handlers might use different policies.
        if (listeners.has(localAddr)) {
          const lhandler = listeners.get(localAddr)[1];
          if (lhandler !== listenHandler) {
            listeners.set(localAddr, [port, listenHandler]);
          }
        } else {
          listeners.init(localAddr, harden([port, listenHandler]));
        }
      },
      /**
       * @param {Port} port
       * @param {Endpoint} localAddr
       * @param {ListenHandler} listenHandler
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
    },
  );

  return makeLoopbackProtocolHandler;
}
