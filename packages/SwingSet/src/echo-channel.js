// @ts-check

/**
 * @typedef {string|Buffer|ArrayBuffer} PacketData
 */

/**
 * @typedef {Object} Host The local host
 * @property {() => Promise<Port>} allocatePort
 * @property {(portName: string) => Promise<Port>} claimPort
 * @property {() => Connection} getConnection
 */

/**
 * @typedef {Object} Connection An ocap for connecting
 * @property {(connection: Connection, portName: string, protocol: string, channelHandler: ChannelHandler) => Promise<Channel>} connect
 */

/**
 * @typedef {Object} Port
 * @property {(acceptHandler: AcceptHandler) => void} listen
 */

/**
 * @typedef {Object} AcceptHandler
 * @property {(channel: Channel) => Promise<ChannelHandler>} onAccept
 * @property {(rej: any) => void} onError
 */

/**
 * @typedef {Object} Channel
 * @property {(channelHandler: ChannelHandler) => Channel} open
 * @property {(packetBytes: PacketData) => Promise<PacketData>} send
 * @property {() => void} close
 */

/**
 * @typedef {Object} ChannelHandler A handler for a given Channel
 * @property {(channel: Channel) => void} onOpen
 * @property {(packetBytes: PacketData) => Promise<PacketData>} onReceive
 * @property {(reason: any) => void} onClose
 */

/**
 * Create a Channel that just echoes its packets.
 *
 * @returns {Channel}
 */
export function makeEchoChannel() {
  let ch;
  /**
   * @type {Channel}
   */
  const channel = {
    open(channelHandler) {
      ch = channelHandler;
      ch.onOpen(channel);
      return channel;
    },
    async send(packetBytes) {
      // Just have the channelHandler receive the packet.
      return ch.onReceive(packetBytes);
    },
    async close() {
      // Close with the channelHandler.
      ch.onClose(undefined);
    },
  };
  return channel;
}

/**
 * Create a Port that just echoes.
 *
 * @returns {Port}
 */
export function makeEchoPort() {
  return {
    async listen(acceptHandler) {
      const echoChannel = makeEchoChannel();
      Promise.resolve()
        .then(_ => acceptHandler.onAccept(echoChannel))
        .then(
          newChannelHandler => echoChannel.open(newChannelHandler),
          rej => acceptHandler.onError(rej),
        );
    },
  };
}

export function makeEchoConnection() {
  return {
    async connect(
      _remoteConnection,
      _remotePortName,
      _protocol,
      channelHandler,
    ) {
      return makeEchoChannel().open(channelHandler);
    },
  };
}

/**
 * Create a Host that just echoes.
 *
 * @returns {Host}
 */
export function makeEchoHost() {
  return {
    async allocatePort() {
      return makeEchoPort();
    },
    async claimPort(_portName) {
      return makeEchoPort();
    },
    getConnection() {
      return makeEchoConnection();
    },
  };
}
