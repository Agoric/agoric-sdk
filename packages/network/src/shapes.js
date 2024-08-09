// @ts-check
import { M } from '@endo/patterns';

const Shape1 = /** @type {const} */ ({
  /**
   * Data is string | Buffer | ArrayBuffer
   * but only string is passable
   */
  Data: M.string(),
  Bytes: M.string(),
  Endpoint: M.string(),
  Vow: M.tagged(
    'Vow',
    harden({
      vowV0: M.remotable('VowV0'),
    }),
  ),
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
  ConnectionI: {
    connection: M.interface('Connection', {
      send: M.callWhen(Shape2.Data)
        .optional(Shape2.Opts)
        .returns(Shape2.Vow$(Shape2.Bytes)),
      close: M.callWhen().returns(Shape2.Vow$(M.undefined())),
      getLocalAddress: M.call().returns(Shape2.Endpoint),
      getRemoteAddress: M.call().returns(Shape2.Endpoint),
    }),
    openConnectionAckWatcher: M.interface('OpenConnectionAckWatcher', {
      onFulfilled: M.call(M.any()).rest(M.any()).returns(M.any()),
    }),
    rethrowUnlessMissingWatcher: M.interface('RethrowUnlessMissingWatcher', {
      onRejected: M.call(M.any()).rest(M.any()).returns(M.any()),
    }),
    sinkWatcher: M.interface('SinkWatcher', {
      onFulfilled: M.call(M.any()).rest(M.any()).returns(),
    }),
  },
  InboundAttemptI: {
    inboundAttempt: M.interface('InboundAttempt', {
      accept: M.callWhen(Shape2.AttemptDescription).returns(
        Shape2.Vow$(Shape2.Connection),
      ),
      getLocalAddress: M.call().returns(Shape2.Endpoint),
      getRemoteAddress: M.call().returns(Shape2.Endpoint),
      close: M.callWhen().returns(Shape2.Vow$(M.undefined())),
    }),
    inboundAttemptAcceptWatcher: M.interface('InboundAttemptAcceptWatcher', {
      onFulfilled: M.call(M.any()).rest(M.any()).returns(M.any()),
    }),
    rethrowUnlessMissingWatcher: M.interface('RethrowUnlessMissingWatcher', {
      onRejected: M.call(M.any()).rest(M.any()).returns(M.any()),
    }),
    sinkWatcher: M.interface('SinkWatcher', {
      onFulfilled: M.call(M.any()).rest(M.any()).returns(),
    }),
  },
  PortI: {
    port: M.interface('Port', {
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
    portAddListenerWatcher: M.interface('PortAddListenerWatcher', {
      onFulfilled: M.call(M.any()).rest(M.any()).returns(M.any()),
    }),
    portRemoveListenerWatcher: M.interface('PortRemoveListenerWatcher', {
      onFulfilled: M.call(M.any()).rest(M.any()).returns(M.any()),
    }),
    portConnectWatcher: M.interface('PortConnectWatcher', {
      onFulfilled: M.call(M.any()).rest(M.any()).returns(M.any()),
    }),
    portRevokeWatcher: M.interface('PortRevokeWatcher', {
      onFulfilled: M.call(M.any()).rest(M.any()).returns(M.any()),
    }),
    portRevokeCleanupWatcher: M.interface('PortRevokeCleanupWatcher', {
      onFulfilled: M.call(M.any()).rest(M.any()).returns(M.any()),
    }),
    rethrowUnlessMissingWatcher: M.interface('RethrowUnlessMissingWatcher', {
      onRejected: M.call(M.any()).rest(M.any()).returns(M.any()),
    }),
    sinkWatcher: M.interface('SinkWatcher', {
      onFulfilled: M.call(M.any()).rest(M.any()).returns(),
      onRejected: M.call(M.any()).rest(M.any()).returns(M.any()),
    }),
  },
  ProtocolHandlerI: {
    protocolHandler: M.interface('ProtocolHandler', {
      onCreate: M.callWhen(M.remotable(), Shape2.ProtocolHandler).returns(
        Shape2.Vow$(M.undefined()),
      ),
      generatePortID: M.callWhen(
        Shape2.Endpoint,
        Shape2.ProtocolHandler,
      ).returns(Shape2.Vow$(M.string())),
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
    protocolHandlerAcceptWatcher: M.interface('ProtocolHandlerAcceptWatcher', {
      onFulfilled: M.call(M.any()).rest(M.any()).returns(M.any()),
    }),
    protocolHandlerInstantiateWatcher: M.interface(
      'ProtocolHandlerInstantiateWatcher',
      {
        onFulfilled: M.call(M.any()).rest(M.any()).returns(M.any()),
      },
    ),
    protocolHandlerConnectWatcher: M.interface(
      'ProtocolHandlerConnectWatcher',
      {
        onFulfilled: M.call(M.any()).rest(M.any()).returns(M.any()),
      },
    ),
    rethrowUnlessMissingWatcher: M.interface('RethrowUnlessMissingWatcher', {
      onRejected: M.call(M.any()).rest(M.any()).returns(M.any()),
    }),
  },

  ProtocolImplI: M.interface('ProtocolImpl', {
    bindPort: M.callWhen(Shape2.Endpoint).returns(Shape2.Vow$(Shape2.Port)),
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
