// @ts-check
import { test } from 'tape-promise/tape';
import { makePromise } from '@agoric/make-promise';
import rawHarden from '@agoric/harden';

import {
  makeEchoChannelHandler,
  makeHost,
  bytesToString,
} from '../src/channel';

const harden = /** @type {<T>(data: T) => T} */ (rawHarden);

/**
 * @param {*} _t
 * @returns {import('../src/channel.js').HostHandler} A testing handler
 */
const makeHostHandler = _t => {
  /**
   * @type {import('../src/channel.js').ListenHandler}
   */
  let l;
  return harden({
    onCreate(_localhost, _impl) {
      // console.log('created', localhost, impl);
    },
    async onConnect(src, dst) {
      // console.log('connected', src, dst);
      return l ? l.onAccept(src, dst) : makeEchoChannelHandler();
    },
    async onListen(localPortName, listenHandler) {
      l = listenHandler;
      // console.log('listening', localPortName, listenHandler);
    },
  });
};

test('handled channel host', async t => {
  try {
    const host = makeHost(makeHostHandler(t));

    const hostHandle = host.getHandle();

    const closed = makePromise();
    const port = await host.allocatePort();
    await port.connect(
      hostHandle,
      'echo',
      'ordered',
      harden({
        async onOpen(channel) {
          const ack = await channel.send('ping');
          // console.log(ack);
          t.equals(bytesToString(ack), 'ping', 'received pong');
          channel.close();
        },
        async onClose(reason) {
          t.equals(reason, undefined, 'no close reason');
          closed.resolve();
        },
        async onReceive(bytes) {
          t.equals(bytesToString(bytes), 'ping');
          return 'pong';
        },
      }),
    );
    await closed.promise;
  } catch (e) {
    t.isNot(e, e, 'unexpceted exception');
  } finally {
    t.end();
  }
});

test('host channel listen', async t => {
  try {
    const host = makeHost(makeHostHandler(t));

    const closed = makePromise();

    const port = await host.claimPort('some-portname');
    port.listen(
      harden({
        onError(rej) {
          t.isNot(rej, rej, 'unexpected error');
        },
        async onAccept(_src, _dst) {
          return harden({
            async onOpen(channel) {
              const ack = await channel.send('ping');
              t.equals(bytesToString(ack), 'ping', 'received pong');
              channel.close();
            },
            async onClose(reason) {
              t.equals(reason, undefined, 'no close reason');
              closed.resolve();
            },
            async onReceive(packet) {
              t.equals(packet, 'ping', 'expected ping');
              return 'pong';
            },
          });
        },
      }),
    );

    const port2 = await host.allocatePort();
    const hostHandle = host.getHandle();
    await port2.connect(
      hostHandle,
      'some-portname',
      'ordered',
      makeEchoChannelHandler(),
    );

    await closed.promise;
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});
