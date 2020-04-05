// @ts-check
import { test } from 'tape-promise/tape';
import { makePromise } from '@agoric/make-promise';

import { makeEchoHost } from '../src/echo-channel';

test('echo channel connect', async t => {
  const host = makeEchoHost();
  const connection = host.getConnection();

  const closed = makePromise();
  await connection.connect(connection, 'echo', 'ordered', {
    async onOpen(channel) {
      const ack = await channel.send('ping');
      t.equals(ack, 'pong', 'received pong');
      channel.close();
    },
    onClose(reason) {
      t.equals(reason, undefined, 'no close reason');
      closed.resolve();
    },
    async onReceive(packet) {
      t.equals(packet, 'ping');
      return 'pong';
    },
  });
  await closed.promise;
  t.end();
});

test('echo channel listen', async t => {
  const host = makeEchoHost();

  const closed = makePromise();

  const port = await host.claimPort('some-portname');
  port.listen({
    onError(rej) {
      t.isNot(rej, rej, 'unexpected error');
    },
    async onAccept() {
      return {
        async onOpen(channel) {
          const ack = await channel.send('ping');
          t.equals(ack, 'pong', 'received pong');
          channel.close();
        },
        onClose(reason) {
          t.equals(reason, undefined, 'no close reason');
          closed.resolve();
        },
        async onReceive(packet) {
          t.equals(packet, 'ping', 'expected ping');
          return 'pong';
        },
      };
    },
  });
  await closed.promise;
  t.end();
});
