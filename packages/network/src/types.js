// @ts-check

/**
 * @template T
 * @typedef {Promise<T | import('@agoric/whenable').Whenable<T>>} PromiseWhenable
 */

/**
 * @typedef {string | Buffer | ArrayBuffer} Data
 *
 * @typedef {string} Bytes
 */

/**
 * @typedef {string} Endpoint A local or remote address See multiaddr.js for an
 *   opinionated router implementation
 */

/**
 * @typedef {object} Closable A closable object
 * @property {() => PromiseWhenable<void>} close Terminate the object
 */

/**
 * @typedef {object} Protocol The network Protocol
 * @property {(prefix: Endpoint) => PromiseWhenable<Port>} bind Claim a port, or if
 *   ending in ENDPOINT_SEPARATOR, a fresh name
 */

/**
 * @typedef {object} Port A port that has been bound to a protocol
 * @property {() => Endpoint} getLocalAddress Get the locally bound name of this
 *   port
 * @property {(acceptHandler: ListenHandler) => PromiseWhenable<void>} addListener
 *   Begin accepting incoming connections
 * @property {(
 *   remote: Endpoint,
 *   connectionHandler?: ConnectionHandler,
 * ) => PromiseWhenable<Connection>} connect
 *   Make an outbound connection
 * @property {(acceptHandler: ListenHandler) => PromiseWhenable<void>} removeListener
 *   Remove the currently-bound listener
 * @property {() => void} revoke Deallocate the port entirely, removing all
 *   listeners and closing all active connections
 */

/**
 * @typedef {object} ListenHandler A handler for incoming connections
 * @property {(port: Port, l: ListenHandler) => PromiseWhenable<void>} [onListen] The
 *   listener has been registered
 * @property {(
 *   port: Port,
 *   localAddr: Endpoint,
 *   remoteAddr: Endpoint,
 *   l: ListenHandler,
 * ) => PromiseWhenable<ConnectionHandler>} onAccept
 *   A new connection is incoming
 * @property {(
 *   port: Port,
 *   localAddr: Endpoint,
 *   remoteAddr: Endpoint,
 *   l: ListenHandler,
 * ) => PromiseWhenable<void>} [onReject]
 *   The connection was rejected
 * @property {(port: Port, rej: any, l: ListenHandler) => PromiseWhenable<void>} [onError]
 *   There was an error while listening
 * @property {(port: Port, l: ListenHandler) => PromiseWhenable<void>} [onRemove] The
 *   listener has been removed
 */

/**
 * @typedef {object} Connection
 * @property {(
 *   packetBytes: Data,
 *   opts?: Record<string, any>,
 * ) => PromiseWhenable<Bytes>} send
 *   Send a packet on the connection
 * @property {() => PromiseWhenable<void>} close Close both ends of the connection
 * @property {() => Endpoint} getLocalAddress Get the locally bound name of this
 *   connection
 * @property {() => Endpoint} getRemoteAddress Get the name of the counterparty
 */

/**
 * @typedef {object} ConnectionHandler A handler for a given Connection
 * @property {(
 *   connection: Connection,
 *   localAddr: Endpoint,
 *   remoteAddr: Endpoint,
 *   c: ConnectionHandler,
 * ) => void} [onOpen]
 *   The connection has been opened
 * @property {(
 *   connection: Connection,
 *   ack: Bytes,
 *   c: ConnectionHandler,
 *   opts?: Record<string, any>,
 * ) => PromiseWhenable<Data>} [onReceive]
 *   The connection received a packet
 * @property {(
 *   connection: Connection,
 *   reason?: CloseReason,
 *   c?: ConnectionHandler,
 * ) => PromiseWhenable<void>} [onClose]
 *   The connection has been closed
 *
 * @typedef {any | null} CloseReason The reason a connection was closed
 */

/**
 * @typedef {object} AttemptDescription
 * @property {ConnectionHandler} handler
 * @property {Endpoint} [remoteAddress]
 * @property {Endpoint} [localAddress]
 */

/**
 * @typedef {object} ProtocolHandler A handler for things the protocol
 *   implementation will invoke
 * @property {(protocol: ProtocolImpl, p: ProtocolHandler) => PromiseWhenable<void>} onCreate
 *   This protocol is created
 * @property {(localAddr: Endpoint, p: ProtocolHandler) => PromiseWhenable<string>} generatePortID
 *   Create a fresh port identifier for this protocol
 * @property {(
 *   port: Port,
 *   localAddr: Endpoint,
 *   p: ProtocolHandler,
 * ) => PromiseWhenable<void>} onBind
 *   A port will be bound
 * @property {(
 *   port: Port,
 *   localAddr: Endpoint,
 *   listenHandler: ListenHandler,
 *   p: ProtocolHandler,
 * ) => PromiseWhenable<void>} onListen
 *   A port was listening
 * @property {(
 *   port: Port,
 *   localAddr: Endpoint,
 *   listenHandler: ListenHandler,
 *   p: ProtocolHandler,
 * ) => PromiseWhenable<void>} onListenRemove
 *   A port listener has been reset
 * @property {(
 *   port: Port,
 *   localAddr: Endpoint,
 *   remote: Endpoint,
 *   p: ProtocolHandler,
 * ) => PromiseWhenable<Endpoint>} [onInstantiate]
 *   Return unique suffix for local address
 * @property {(
 *   port: Port,
 *   localAddr: Endpoint,
 *   remote: Endpoint,
 *   c: ConnectionHandler,
 *   p: ProtocolHandler,
 * ) => PromiseWhenable<AttemptDescription>} onConnect
 *   A port initiates an outbound connection
 * @property {(
 *   port: Port,
 *   localAddr: Endpoint,
 *   p: ProtocolHandler,
 * ) => PromiseWhenable<void>} onRevoke
 *   The port is being completely destroyed
 *
 * @typedef {object} InboundAttempt An inbound connection attempt
 * @property {(desc: AttemptDescription) => PromiseWhenable<Connection>} accept
 *   Establish the connection
 * @property {() => Endpoint} getLocalAddress Return the local address for this
 *   attempt
 * @property {() => Endpoint} getRemoteAddress Return the remote address for
 *   this attempt
 * @property {() => PromiseWhenable<void>} close Abort the attempt
 *
 * @typedef {object} ProtocolImpl Things the protocol can do for us
 * @property {(prefix: Endpoint) => PromiseWhenable<Port>} bind Claim a port, or if
 *   ending in ENDPOINT_SEPARATOR, a fresh name
 * @property {(
 *   listenAddr: Endpoint,
 *   remoteAddr: Endpoint,
 * ) => PromiseWhenable<InboundAttempt>} inbound
 *   Make an attempt to connect into this protocol
 * @property {(
 *   port: Port,
 *   remoteAddr: Endpoint,
 *   connectionHandler: ConnectionHandler,
 * ) => PromiseWhenable<Connection>} outbound
 *   Create an outbound connection
 */
