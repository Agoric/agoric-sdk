// @ts-check
import makeStore from '@agoric/store';
import rawHarden from '@agoric/harden';
import { makePromise } from '@agoric/make-promise';

const harden = /** @type {<T>(x: T) => T} */ (rawHarden);

/**
 * @typedef {string|Buffer|ArrayBuffer} Data
 * @typedef {ArrayBuffer} Bytes
 */

/*
 * Convert some data to bytes.
 *
 * @param {Data} data
 * @returns {Bytes}
 */
export function toBytes(data) {
  if (typeof data === 'string') {
    data = Buffer.from(data, 'utf-8');
  }
  return new Uint8Array(data).buffer;
}

/**
 * Convert bytes to a String.
 *
 * @param {Bytes} bytes
 * @return {string}
 */
export function bytesToString(bytes) {
  return Buffer.from(bytes).toString('utf-8');
}

/**
 * @typedef {Object} Host The local host
 * @property {() => Promise<Port>} allocatePort Allocate an anonymous port
 * @property {(portName: string) => Promise<Port>} claimPort Claim a named port
 * @property {() => HostHandle} getHandle Get the host handle that represents this host
 */

/**
 * @typedef {Object} Port A port that has been bound to a host
 * @property {() => string} getBoundName Get the locally bound name of this port
 * @property {(acceptHandler: ListenHandler) => void} listen Begin accepting incoming channels
 * @property {(host: HostHandle, portName: string, protocol: string, channelHandler: ChannelHandler) => Promise<Channel>} connect Make an outbound channel
 *
 * @typedef {Object} ListenHandler A handler for incoming channels
 * @property {(src: Endpoint, dst: Endpoint) => Promise<ChannelHandler>} onAccept A new channel is incoming
 * @property {(rej: any) => void} onError There was an error while listening
 */

/**
 * @typedef {Object} Channel
 * @property {(packetBytes: Data) => Promise<Bytes>} send Send a packet on the channel
 * @property {() => void} close Close both ends of the channel
 *
 *
 * @typedef {Object} ChannelHandler A handler for a given Channel
 * @property {(channel: Channel) => void} [onOpen] The channel has been opened
 * @property {(packetBytes: Bytes) => Promise<Data>} [onReceive] The channel received a packet
 * @property {(reason?: CloseReason) => Promise<void>} [onClose] The channel has been closed
 *
 * @typedef {any?} CloseReason The reason a channel was closed
 */

/**
 * @typedef {Object} Endpoint
 * @property {string} protocol The name of the protocol in use
 * @property {HostHandle} host The remote host
 * @property {string} portName The remote port (per host)
 *
 * @typedef {Object} Packet
 * @property {Endpoint} src Source of the packet
 * @property {Endpoint} dst Destination of the packet
 * @property {Bytes} bytes Bytes in the packet
 * @property {import('@agoric/make-promise').Deferred<Bytes,any>} deferredAck The deferred to resolve the result
 *
 * @typedef {{ handle: 'Host' }} HostHandle An active host
 * @typedef {number} TTL A time-to-live for a packet
 */

/**
 * @typedef {Object} HostHandler A handler for things the host implementation will invoke
 * @property {(newHost: HostHandle, host: HostImpl) => void} onCreate This host is created
 * @property {(portName: string, listenHandler: ListenHandler) => Promise<void>} onListen A port was listening
 * @property {(src: Endpoint, dst: Endpoint) => Promise<ChannelHandler>} onConnect A port was connected
 *
 * @typedef {Object} HostImpl Things the host can do for us
 * @property {(port: Port, dst: Endpoint, channelHandler: ChannelHandler) => Promise<Channel>} connect Establish a channel from this host to an endpoint
 */

/**
 * @type {Map.<HostHandle, HostHandler>} Translate from handles to handlers
 */
const hostHandleMap = new Map();

let lastID = 0;

/**
 * @template {string} T
 * @param {T} type The type of handle to create.
 * @returns {{handle: T, id: number}}
 */
function makeHandle(type) {
  lastID += 1;
  return harden({ handle: type, id: lastID });
}

/**
 * Create a Host that has a handler.
 *
 * @param {HostHandler} hostHandler
 * @returns {Host} the local capability for connecting and listening
 */
export function makeHost(hostHandler) {
  const newHost = makeHandle('Host');
  hostHandleMap.set(newHost, hostHandler);

  /**
   * @type {HostImpl}
   */
  const hostImpl = harden({
    async connect(port, dst, srcHandler) {
      /**
       * @type {Endpoint}
       */
      const src = harden({
        host: newHost,
        portName: port.getBoundName(),
        protocol: dst.protocol,
      });
      const dstHandler = await hostHandler.onConnect(src, dst);

      /**
       * Create half of a channel pair.
       *
       * @param {ChannelHandler} local
       * @param {ChannelHandler} remote
       * @returns {[Channel, () => void]}
       */
      const makeChannel = (local, remote) => {
        const pending = [];
        let queue = [];
        let closed;
        /**
         * @type {Channel}
         */
        const channel = harden({
          async close() {
            if (closed) {
              throw closed;
            }
            closed = Error('Channel closed');
            if (local.onClose) {
              await local.onClose();
            }
            if (remote.onClose) {
              await remote.onClose();
            }
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
            const deferred = makePromise();
            if (queue) {
              queue.push([data, deferred]);
              pending.push(deferred);
              return deferred.promise;
            }
            if (!remote.onReceive) {
              return toBytes('');
            }
            const bytes = toBytes(data);
            const ack = await remote.onReceive(bytes);
            return toBytes(ack);
          },
        });
        const flush = () => {
          const q = queue;
          queue = undefined;
          while (q && q.length) {
            const [data, deferred] = q.shift();
            channel
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
        return [channel, flush];
      };

      const [srcChannel, srcFlush] = makeChannel(srcHandler, dstHandler);
      const [dstChannel, dstFlush] = makeChannel(dstHandler, srcHandler);

      if (srcHandler.onOpen) {
        srcHandler.onOpen(srcChannel);
      }
      if (dstHandler.onOpen) {
        dstHandler.onOpen(dstChannel);
      }

      srcFlush();
      dstFlush();

      return srcChannel;
    },
  });

  /**
   * @type {import('@agoric/store').Store.<string, Port>}
   */
  const boundPorts = makeStore();

  // Wire up the local host to the handler.
  hostHandler.onCreate(newHost, hostImpl);

  /**
   * @param {string} localPortName
   */
  const bind = localPortName => {
    let active;
    /**
     * @type {Port}
     */
    const port = harden({
      getBoundName() {
        return localPortName;
      },
      async listen(listenHandler) {
        if (active) {
          throw Error(`Port is already ${active}`);
        }
        await hostHandler.onListen(localPortName, listenHandler);
      },
      async connect(host, portName, protocol, channelHandler) {
        if (active) {
          throw Error(`Port is already ${active}`);
        }

        /**
         * @type {Endpoint}
         */
        const dst = harden({ host, portName, protocol });
        return hostImpl.connect(port, dst, channelHandler);
      },
    });

    boundPorts.init(localPortName, port);
    return port;
  };

  let lastAnonymousPort = 0;
  return harden({
    async allocatePort() {
      let portName;
      do {
        lastAnonymousPort += 1;
        portName = `anonymous${lastAnonymousPort}`;
      } while (boundPorts.has(portName));
      return bind(portName);
    },
    async claimPort(portName) {
      return bind(portName);
    },
    getHandle() {
      return newHost;
    },
  });
}

/**
 * Create a ChannelHandler that just echoes its packets.
 *
 * @returns {ChannelHandler}
 */
export function makeEchoChannelHandler() {
  /**
   * @type {Channel}
   */
  return harden({
    async onReceive(bytes) {
      return bytes;
    },
  });
}
