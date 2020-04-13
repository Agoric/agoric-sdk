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

/**
 * @param {*} _t
 * @returns {import('../src/network.js').PeerHandler} A testing handler
 */
const makeNetworkHandler = _t => {
  /**
   * @type {import('../src/network.js').ListenHandler}
   */
  let l;
  return harden({
    onCreate(_peer, _impl) {
      console.log('created', _peer, _impl);
    },
    async onConnect(localAddr, remoteAddr) {
      console.log('connected', localAddr, remoteAddr);
      return l ? l.onAccept(localAddr, remoteAddr) : makeEchoChannelHandler();
    },
    async onListen(localAddr, listenHandler) {
      l = listenHandler;
      console.log('listening', localAddr, listenHandler);
    },
  });
};

test('handled peer', async t => {
  try {
    const peer = makeNetworkPeer(makeNetworkHandler(t));

    const closed = producePromise();
    const port = await peer.bind('/ibc/self');
    await port.connect(
      '/ibc/self/ordered/echo',
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

test('peer channel listen', async t => {
  try {
    const peer = makeNetworkPeer(makeNetworkHandler(t));

    const closed = producePromise();

    const port = await peer.bind('/ibc/self/ordered/some-portname');
    port.listen(
      harden({
        onError(rej) {
          t.isNot(rej, rej, 'unexpected error');
        },
        async onAccept(_localAddr, _remoteAddr) {
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

    const port2 = await peer.bind('/ibc/self');
    await port2.connect(
      '/ibc/self/ordered/some-portname',
      makeEchoChannelHandler(),
    );

    await closed.promise;
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});
