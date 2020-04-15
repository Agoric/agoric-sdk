// @ts-check
import { test } from 'tape-promise/tape';
import { producePromise } from '@agoric/produce-promise';
import rawHarden from '@agoric/harden';

import {
  parse,
  unparse,
  makeEchoChannelHandler,
  makeNetworkPeer,
  makeRouter,
} from '../src/vats/network';

const harden = /** @type {<T>(data: T) => T} */ (rawHarden);

const log = false ? console.log : () => {};

/**
 * @param {*} t
 * @returns {import('../src/vats/network').PeerHandler} A testing handler
 */
const makePeerHandler = t => {
  /**
   * @type {import('../src/vats/network').ListenHandler}
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
      console.log('connected', port.getLocalAddress(), remoteAddr, l);
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
          t.equals(`${ack}`, 'ping', 'received pong');
          channel.close();
        },
        async onClose(_channel, reason) {
          t.equals(reason, undefined, 'no close reason');
          closed.resolve();
        },
        async onReceive(_channel, bytes) {
          t.equals(`${bytes}`, 'ping');
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
     * @type {import('../src/vats/network').ListenHandler}
     */
    const listener = harden({
      async onListen(p, listenHandler) {
        t.equals(p, port, `port is tracked in onListen`);
        t.assert(listenHandler, `listenHandler is tracked in onListen`);
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
            t.equals(`${ack}`, 'ping', 'received pong');
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
            t.equals(`${packet}`, 'ping', 'expected ping');
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
    });

    await port.addListener(listener);

    const port2 = await peer.bind('/ibc/self');
    const channelHandler = makeEchoChannelHandler();
    await port2.connect(
      '/ibc/self/ordered/some-portname',
      harden({
        ...channelHandler,
        async onOpen(channel, c) {
          if (channelHandler.onOpen) {
            await channelHandler.onOpen(channel, c);
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

test('routing', async t => {
  try {
    const router = makeRouter();
    t.deepEquals(router.getRoutes('/if/local'), [], 'get routes matches none');
    router.register('/if/', 'a');
    t.deepEquals(
      router.getRoutes('/if/foo'),
      [['/if/', 'a']],
      'get routes matches prefix',
    );
    router.register('/if/foo', 'b');
    t.deepEquals(
      router.getRoutes('/if/foo'),
      [
        ['/if/foo', 'b'],
        ['/if/', 'a'],
      ],
      'get routes matches all',
    );
    t.deepEquals(
      router.getRoutes('/if/foob'),
      [['/if/', 'a']],
      'get routes needs separator',
    );
    router.register('/ibc/self', 'c');
    t.deepEquals(
      router.getRoutes('/if/foo'),
      [
        ['/if/foo', 'b'],
        ['/if/', 'a'],
      ],
      'get routes avoids nonmatching paths',
    );
    t.deepEquals(
      router.getRoutes('/ibc/self'),
      [['/ibc/self', 'c']],
      'direct match',
    );
    t.deepEquals(
      router.getRoutes('/ibc/self/zot'),
      [['/ibc/self', 'c']],
      'prefix matches',
    );
    t.deepEquals(router.getRoutes('/ibc/barfo'), [], 'no match');

    t.throws(
      () => router.unregister('/ibc/self', 'a'),
      /Router is not registered/,
      'unregister fails for no match',
    );
    router.unregister('/ibc/self', 'c');
    t.deepEquals(
      router.getRoutes('/ibc/self'),
      [],
      'no match after unregistration',
    );
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});

test('multiaddr', async t => {
  try {
    t.deepEquals(parse('/if/local'), [['if', 'local']]);
    t.deepEquals(parse('/zot'), [['zot']]);
    t.deepEquals(parse('/zot/foo/bar/baz/bot'), [
      ['zot', 'foo'],
      ['bar', 'baz'],
      ['bot'],
    ]);
    for (const str of ['', 'foobar']) {
      t.throws(
        () => parse(str),
        /Error parsing Multiaddr/,
        `expected failure of ${str}`,
      );
    }
    for (const str of [
      '/',
      '//',
      '/foo',
      '/foobib/bar',
      '/k1/v1/k2/v2/k3/v3',
    ]) {
      t.equals(
        unparse(parse(str)),
        str,
        `round-trip of ${JSON.stringify(str)} matches`,
      );
    }
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});
