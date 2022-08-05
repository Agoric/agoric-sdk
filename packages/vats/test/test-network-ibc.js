// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { E, Far } from '@endo/far';
import { makeSubscriptionKit } from '@agoric/notifier';
import { makeScalarBigMapStore } from '@agoric/vat-data';

import { buildRootObject as ibcBuildRootObject } from '../src/vat-ibc.js';
import { buildRootObject as networkBuildRootObject } from '../src/network/vat-network.js';

test('network - ibc', async t => {
  const baggage = makeScalarBigMapStore('ersatz baggage', { durable: true });
  const networkVat = E(networkBuildRootObject)(null, null, baggage);
  const ibcVat = E(ibcBuildRootObject)();

  const { subscription, publication } = makeSubscriptionKit();

  const events = subscription[Symbol.asyncIterator]();
  const callbacks = Far('ibcCallbacks', {
    downcall: (method, params) => {
      publication.updateState([method, params]);
      if (method === 'sendPacket') {
        const { packet } = params;
        return { ...packet, sequence: '39' };
      }
      return undefined;
    },
  });

  const ibcHandler = await E(ibcVat).createInstance(callbacks);
  await E(networkVat).registerProtocolHandler(
    ['/ibc-port', '/ibc-hop'],
    'ibc-test',
    ibcHandler,
  );

  // Actually test the ibc port binding.
  // TODO: Do more tests on the returned Port object.
  const p = E(networkVat).bind('/ibc-port/');
  await p;
  const ev1 = await events.next();
  t.assert(!ev1.done);
  t.deepEqual(ev1.value, ['bindPort', { packet: { source_port: 'port-1' } }]);

  const testEcho = async () => {
    await E(p).addListener(
      Far('ibcListener', {
        async onAccept(_port, _localAddr, _remoteAddr, _listenHandler) {
          /** @type {ConnectionHandler} */
          const handler = Far('plusOne', {
            async onReceive(_c, packetBytes) {
              return `${packetBytes}1`;
            },
            async onOpen(_c, localAddr, remoteAddr, _connectionHandler) {
              publication.updateState([
                'plusOne-open',
                { localAddr, remoteAddr },
              ]);
            },
          });
          return handler;
        },
        async onListen(port, _listenHandler) {
          console.debug(`listening on echo port: ${port}`);
        },
      }),
    );

    const c = E(p).connect('/ibc-port/port-1/unordered/foo');

    const ack = await E(c).send('hello198');
    t.is(ack, 'hello1981', 'expected echo');
    await c;

    await E(c).close();
  };

  await testEcho();

  const testIBCOutbound = async () => {
    const c = E(p).connect(
      '/ibc-hop/connection-11/ibc-port/port-98/unordered/bar',
    );

    const evopen = await events.next();
    t.assert(!evopen.done);
    t.deepEqual(evopen.value, [
      'plusOne-open',
      {
        localAddr: '/ibc-port/port-1/unordered/foo',
        remoteAddr: '/ibc-port/port-1',
      },
    ]);

    const ev2 = await events.next();
    t.assert(!ev2.done);
    t.deepEqual(ev2.value, [
      'startChannelOpenInit',
      {
        packet: { source_port: 'port-1', destination_port: 'port-98' },
        order: 'UNORDERED',
        hops: ['connection-11'],
        version: 'bar',
      },
    ]);

    await E(ibcHandler).fromBridge('dontcare', {
      event: 'channelOpenAck',
      portID: 'port-1',
      channelID: 'channel-1',
      counterparty: { port_id: 'port-98', channel_id: 'channel-22' },
      counterpartyVersion: 'bar',
      connectionHops: ['connection-11'],
    });

    await c;
    const ack = E(c).send('some-transfer-message');

    const ev3 = await events.next();
    t.assert(!ev3.done);
    t.deepEqual(ev3.value, [
      'sendPacket',
      {
        packet: {
          data: 'c29tZS10cmFuc2Zlci1tZXNzYWdl',
          destination_channel: 'channel-22',
          destination_port: 'port-98',
          source_channel: 'channel-1',
          source_port: 'port-1',
        },
        relativeTimeoutNs: 600_000_000_000n, // 10 minutes in nanoseconds.
      },
    ]);

    await E(ibcHandler).fromBridge('stilldontcare', {
      event: 'acknowledgementPacket',
      packet: {
        data: 'c29tZS10cmFuc2Zlci1tZXNzYWdl',
        destination_channel: 'channel-22',
        destination_port: 'port-98',
        source_channel: 'channel-1',
        source_port: 'port-1',
        sequence: '39',
      },
      acknowledgement: 'YS10cmFuc2Zlci1yZXBseQ==',
    });

    t.is(await ack, 'a-transfer-reply');

    await E(c).close();
  };

  await testIBCOutbound();

  const testIBCInbound = async () => {
    await E(ibcHandler).fromBridge('reallydontcare', {
      event: 'channelOpenTry',
      channelID: 'channel-2',
      portID: 'port-1',
      counterparty: { port_id: 'port-99', channel_id: 'channel-23' },
      connectionHops: ['connection-12'],
      order: 'ORDERED',
      version: 'bazi',
      counterpartyVersion: 'bazo',
    });

    await E(ibcHandler).fromBridge('stillreallydontcare', {
      event: 'channelOpenConfirm',
      portID: 'port-1',
      channelID: 'channel-2',
    });

    const evopen = await events.next();
    t.assert(!evopen.done);
    t.deepEqual(evopen.value, [
      'plusOne-open',
      {
        localAddr: '/ibc-port/port-1/ordered/bazi/ibc-channel/channel-2',
        remoteAddr:
          '/ibc-hop/connection-12/ibc-port/port-99/ordered/bazo/ibc-channel/channel-23',
      },
    ]);

    await E(ibcHandler).fromBridge('notevenyet', {
      event: 'receivePacket',
      packet: {
        data: 'aW5ib3VuZC1tc2c=',
        destination_port: 'port-1',
        destination_channel: 'channel-2',
        source_channel: 'channel-23',
        source_port: 'port-99',
      },
    });

    const ev4 = await events.next();
    t.assert(!ev4.done);
    t.deepEqual(ev4.value, [
      'receiveExecuted',
      {
        ack: 'aW5ib3VuZC1tc2cx',
        packet: {
          data: 'aW5ib3VuZC1tc2c=',
          destination_channel: 'channel-2',
          destination_port: 'port-1',
          source_channel: 'channel-23',
          source_port: 'port-99',
        },
      },
    ]);
  };

  await testIBCInbound();

  // Verify that we consumed all the published events.
  publication.finish([]);
  const evend = await events.next();
  t.assert(evend.done);
  t.deepEqual(evend.value, []);
});
