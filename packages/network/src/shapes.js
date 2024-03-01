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
  Opts: M.recordOf(M.string(), M.any()),
  Vow: M.tagged(
    'Vow',
    M.splitRecord({
      vowV0: M.remotable('VowV0'), // basic version 0 support
    }),
  ),
  Vow$: shape => M.or(shape, Shape1.Vow),
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
  AttemptDescription: M.splitRecord(
    { handler: Shape1.ConnectionHandler },
    { remoteAddress: Shape1.Endpoint, localAddress: Shape1.Endpoint },
  ),
  ConnectionI: M.interface('Connection', {
    send: M.callWhen(Shape1.Data)
      .optional(Shape1.Opts)
      .returns(Shape1.Vow$(Shape1.Bytes)),
    close: M.callWhen().returns(Shape1.Vow$(M.undefined())),
    getLocalAddress: M.call().returns(Shape1.Endpoint),
    getRemoteAddress: M.call().returns(Shape1.Endpoint),
  }),
  PortI: M.interface('Port', {
    getLocalAddress: M.call().returns(Shape1.Endpoint),
    addListener: M.callWhen(Shape1.Listener).returns(
      Shape1.Vow$(M.undefined()),
    ),
    connect: M.callWhen(Shape1.Endpoint)
      .optional(Shape1.ConnectionHandler)
      .returns(Shape1.Vow$(Shape1.Connection)),
    removeListener: M.callWhen(Shape1.Listener).returns(
      Shape1.Vow$(M.undefined()),
    ),
    revoke: M.callWhen().returns(M.undefined()),
  }),
  ProtocolHandlerI: M.interface('ProtocolHandler', {
    onCreate: M.callWhen(M.remotable(), Shape1.ProtocolHandler).returns(
      Shape1.Vow$(M.undefined()),
    ),
    generatePortID: M.callWhen(Shape1.Endpoint, Shape1.ProtocolHandler).returns(
      Shape1.Vow$(M.string()),
    ),
    onBind: M.callWhen(
      Shape1.Port,
      Shape1.Endpoint,
      Shape1.ProtocolHandler,
    ).returns(Shape1.Vow$(M.undefined())),
    onListen: M.callWhen(
      Shape1.Port,
      Shape1.Endpoint,
      Shape1.ListenHandler,
      Shape1.ProtocolHandler,
    ).returns(Shape1.Vow$(M.undefined())),
    onListenRemove: M.callWhen(
      Shape1.Port,
      Shape1.Endpoint,
      Shape1.ListenHandler,
      Shape1.ProtocolHandler,
    ).returns(Shape1.Vow$(M.undefined())),
    onInstantiate: M.callWhen(
      Shape1.Port,
      Shape1.Endpoint,
      Shape1.Endpoint,
      Shape1.ProtocolHandler,
    ).returns(Shape1.Vow$(Shape1.Endpoint)),
    onConnect: M.callWhen(
      Shape1.Port,
      Shape1.Endpoint,
      Shape1.Endpoint,
      Shape1.ConnectionHandler,
      Shape1.ProtocolHandler,
    ).returns(Shape1.Vow$(Shape1.AttemptDescription)),
    onRevoke: M.callWhen(
      Shape1.Port,
      Shape1.Endpoint,
      Shape1.ProtocolHandler,
    ).returns(Shape1.Vow$(M.undefined())),
  }),
  ProtocolImplI: M.interface('ProtocolImpl', {
    bind: M.callWhen(Shape1.Endpoint).returns(Shape1.Vow$(Shape1.Port)),
    inbound: M.callWhen(Shape1.Endpoint, Shape1.Endpoint).returns(
      Shape1.Vow$(Shape1.InboundAttempt),
    ),
    outbound: M.callWhen(
      Shape1.Port,
      Shape1.Endpoint,
      Shape1.ConnectionHandler,
    ).returns(Shape1.Vow$(Shape1.Connection)),
  }),
});

export const Shape = /** @type {const} */ harden({
  ...Shape2,
  InboundAttemptI: M.interface('InboundAttempt', {
    accept: M.callWhen(Shape2.AttemptDescription).returns(
      Shape2.Vow$(Shape2.Connection),
    ),
    getLocalAddress: M.call().returns(Shape2.Endpoint),
    getRemoteAddress: M.call().returns(Shape2.Endpoint),
    close: M.callWhen().returns(Shape2.Vow$(M.undefined())),
  }),
});
