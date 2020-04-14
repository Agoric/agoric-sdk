// @ts-check
import { test } from 'tape-promise/tape';
import { producePromise } from '@agoric/produce-promise';
import rawHarden from '@agoric/harden';

import {
  makeEchoChannelHandler,
  makeNetworkPeer,
  bytesToString,
} from '../src/network';

const harden = /** @type {<T>(data: T) => T} */ (rawHarden);

const log = false ? console.log : () => {};

/**
 * @param {*} t
 * @returns {import('../src/network.js').PeerHandler} A testing handler
 */
const makePeerHandler = t => {
  /**
   * @type {import('../src/network.js').ListenHandler}
   */
  let l;
  let lp;
  return harden({
    async onCreate(_peer, _impl) {
      log('created', _peer, _impl);
    },
    async onConnect(port, remoteAddr) {
      t.assert(port, `port is tracked in onConnect`);
      t.assert(remoteAddr, `remote address is supplied to onConnect`);
      log('connected', port.getLocalAddress(), remoteAddr);
      return lp ? l.onAccept(lp, remoteAddr, l) : makeEchoChannelHandler();
    },
    async onListen(port, listenHandler) {
      t.assert(port, `port is tracked in onListen`);
      t.assert(listenHandler, `listen handler is tracked in onListen`);
      lp = port;
      l = listenHandler;
      log('listening', port.getLocalAddress(), listenHandler);
    },
    async onListenRemove(port, listenHandler) {
      t.equals(listenHandler, l, `listenHandler is tracked in onListenRemove`);
      l = undefined;
      lp = undefined;
      log('port done listening', port.getLocalAddress());
    },
  });
};

test('handled peer', async t => {
  try {
    const peer = makeNetworkPeer(makePeerHandler(t));

    const closed = producePromise();
    const port = await peer.bind('/ibc/self');
    await port.connect(
      '/ibc/self/ordered/echo',
      harden({
        async onOpen(channel) {
          const ack = await channel.send('ping');
          // log(ack);
          t.equals(bytesToString(ack), 'ping', 'received pong');
          channel.close();
        },
        async onClose(_channel, reason) {
          t.equals(reason, undefined, 'no close reason');
          closed.resolve();
        },
        async onReceive(_channel, bytes) {
          t.equals(bytesToString(bytes), 'ping');
          return 'pong';
        },
      }),
    );
    await closed.promise;
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});

test('peer channel listen', async t => {
  try {
    const peer = makeNetworkPeer(makePeerHandler(t));

    const closed = producePromise();

    const port = await peer.bind('/ibc/self/ordered/some-portname');

    /**
     * @type {import('../src/network').ListenHandler}
     */
    let listener;
    port.addListener(
      harden({
        async onListen(p, listenHandler) {
          t.equals(p, port, `port is tracked in onListen`);
          t.assert(listenHandler, `listenHandler is tracked in onListen`);
          listener = listenHandler;
        },
        async onAccept(p, remoteAddr, listenHandler) {
          t.assert(remoteAddr, `remote address is passed to onAccept`);
          t.equals(p, port, `port is tracked in onAccept`);
          t.equals(
            listenHandler,
            listener,
            `listenHandler is tracked in onAccept`,
          );
          let handler;
          return harden({
            async onOpen(channel, channelHandler) {
              t.assert(channelHandler, `channelHandler is tracked in onOpen`);
              handler = channelHandler;
              const ack = await channel.send('ping');
              t.equals(bytesToString(ack), 'ping', 'received pong');
              channel.close();
            },
            async onClose(c, reason, channelHandler) {
              t.equals(
                channelHandler,
                handler,
                `channelHandler is tracked in onClose`,
              );
              handler = undefined;
              t.assert(c, 'channel is passed to onClose');
              t.equals(reason, undefined, 'no close reason');
              closed.resolve();
            },
            async onReceive(c, packet, channelHandler) {
              t.equals(
                channelHandler,
                handler,
                `channelHandler is tracked in onReceive`,
              );
              t.assert(c, 'channel is passed to onReceive');
              t.equals(bytesToString(packet), 'ping', 'expected ping');
              return 'pong';
            },
          });
        },
        async onError(p, rej, listenHandler) {
          t.equals(p, port, `port is tracked in onError`);
          t.equals(
            listenHandler,
            listener,
            `listenHandler is tracked in onError`,
          );
          t.isNot(rej, rej, 'unexpected error');
        },
        async onRemove(p, listenHandler) {
          t.equals(
            listenHandler,
            listener,
            `listenHandler is tracked in onRemove`,
          );
          t.equals(p, port, `port is passed to onReset`);
        },
      }),
    );

    const port2 = await peer.bind('/ibc/self');
    const channelHandler = makeEchoChannelHandler();
    await port2.connect(
      '/ibc/self/ordered/some-portname',
      harden({
        ...channelHandler,
        async onOpen(channel) {
          if (channelHandler.onOpen) {
            await channelHandler.onOpen(channel);
          }
          channel.send('ping');
        },
      }),
    );

    await closed.promise;

    await port.removeListener(listener);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});
