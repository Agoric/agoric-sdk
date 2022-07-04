// @ts-check

/**
 * @typedef {string|Buffer|ArrayBuffer} Data
 * @typedef {string} Bytes
 */

/**
 * @typedef {string} Endpoint A local or remote address
 * See multiaddr.js for an opinionated router implementation
 */

/**
 * @typedef {object} Closable A closable object
 * @property {() => ERef<void>} close Terminate the object
 */

/**
 * @typedef {object} Protocol The network Protocol
 * @property {(prefix: Endpoint) => ERef<Port>} bind Claim a port, or if ending in ENDPOINT_SEPARATOR, a fresh name
 */

/**
 * @typedef {object} Port A port that has been bound to a protocol
 * @property {() => Endpoint} getLocalAddress Get the locally bound name of this port
 * @property {(acceptHandler: ListenHandler) => ERef<void>} addListener Begin accepting incoming connections
 * @property {(remote: Endpoint, connectionHandler?: ConnectionHandler) => ERef<Connection>} connect Make an outbound connection
 * @property {(acceptHandler: ListenHandler) => ERef<void>} removeListener Remove the currently-bound listener
 * @property {() => void} revoke Deallocate the port entirely, removing all listeners and closing all active connections
 */

/**
 * @typedef {object} ListenHandler A handler for incoming connections
 * @property {(port: Port, l: ListenHandler) => ERef<void>} [onListen] The listener has been registered
 * @property {(port: Port, localAddr: Endpoint, remoteAddr: Endpoint, l: ListenHandler) => ERef<ConnectionHandler>} onAccept A new connection is incoming
 * @property {(port: Port, localAddr: Endpoint, remoteAddr: Endpoint, l: ListenHandler) => ERef<void>} [onReject] The connection was rejected
 * @property {(port: Port, rej: any, l: ListenHandler) => ERef<void>} [onError] There was an error while listening
 * @property {(port: Port, l: ListenHandler) => ERef<void>} [onRemove] The listener has been removed
 */

/**
 * @typedef {object} Connection
 * @property {(packetBytes: Data, opts?: Record<string, any>) => ERef<Bytes>} send Send a packet on the connection
 * @property {() => ERef<void>} close Close both ends of the connection
 * @property {() => Endpoint} getLocalAddress Get the locally bound name of this connection
 * @property {() => Endpoint} getRemoteAddress Get the name of the counterparty
 */

/**
 * @typedef {object} ConnectionHandler A handler for a given Connection
 * @property {(connection: Connection, localAddr: Endpoint, remoteAddr: Endpoint, c: ConnectionHandler) => void} [onOpen] The connection has been opened
 * @property {(connection: Connection, packetBytes: Bytes, c: ConnectionHandler, opts?: Record<string, any>) => ERef<Data>} [onReceive] The connection received a packet
 * @property {(connection: Connection, reason?: CloseReason, c?: ConnectionHandler) => ERef<void>} [onClose] The connection has been closed
 *
 * @typedef {any?} CloseReason The reason a connection was closed
 */

/**
 * @typedef {object} AttemptDescription
 * @property {ConnectionHandler} handler
 * @property {Endpoint} [remoteAddress]
 * @property {Endpoint} [localAddress]
 */

/**
 * @typedef {object} ProtocolHandler A handler for things the protocol implementation will invoke
 * @property {(protocol: ProtocolImpl, p: ProtocolHandler) => ERef<void>} onCreate This protocol is created
 * @property {(localAddr: Endpoint, p: ProtocolHandler) => ERef<string>} generatePortID Create a fresh port identifier for this protocol
 * @property {(port: Port, localAddr: Endpoint, p: ProtocolHandler) => ERef<void>} onBind A port will be bound
 * @property {(port: Port, localAddr: Endpoint, listenHandler: ListenHandler, p: ProtocolHandler) => ERef<void>} onListen A port was listening
 * @property {(port: Port, localAddr: Endpoint, listenHandler: ListenHandler, p: ProtocolHandler) => ERef<void>} onListenRemove A port listener has been reset
 * @property {(port: Port, localAddr: Endpoint, remote: Endpoint, p: ProtocolHandler) => ERef<Endpoint>} [onInstantiate] Return unique suffix for
 * local address
 * @property {(port: Port, localAddr: Endpoint, remote: Endpoint, c: ConnectionHandler, p: ProtocolHandler) => ERef<AttemptDescription>} onConnect A port initiates an outbound connection
 * @property {(port: Port, localAddr: Endpoint, p: ProtocolHandler) => ERef<void>} onRevoke The port is being completely destroyed
 *
 * @typedef {object} InboundAttempt An inbound connection attempt
 * @property {(desc: AttemptDescription) => ERef<Connection>} accept Establish the connection
 * @property {() => Endpoint} getLocalAddress Return the local address for this attempt
 * @property {() => Endpoint} getRemoteAddress Return the remote address for this attempt
 * @property {() => ERef<void>} close Abort the attempt
 *
 * @typedef {object} ProtocolImpl Things the protocol can do for us
 * @property {(prefix: Endpoint) => ERef<Port>} bind Claim a port, or if ending in ENDPOINT_SEPARATOR, a fresh name
 * @property {(listenAddr: Endpoint, remoteAddr: Endpoint) => ERef<InboundAttempt>} inbound Make an attempt to connect into this protocol
 * @property {(port: Port, remoteAddr: Endpoint, connectionHandler: ConnectionHandler) => ERef<Connection>} outbound Create an outbound connection
 */
