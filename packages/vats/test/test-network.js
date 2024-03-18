import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { reincarnate } from '@agoric/swingset-liveslots/tools/setup-vat-data.js';

import { E } from '@endo/far';
import {
  makePinnedHistoryTopic,
  prepareDurablePublishKit,
  subscribeEach,
} from '@agoric/notifier';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { prepareVowTools } from '@agoric/vat-data/vow.js';

import { buildRootObject as ibcBuildRootObject } from '../src/vat-ibc.js';
import { buildRootObject as networkBuildRootObject } from '../src/vat-network.js';

import '../src/types.js';
import { registerNetworkProtocols } from '../src/proposals/network-proposal.js';

const { fakeVomKit } = reincarnate({ relaxDurabilityRules: false });
const provideBaggage = key => {
  const root = fakeVomKit.cm.provideBaggage();
  const zone = makeDurableZone(root);
  return zone.mapStore(`${key} baggage`);
};

const preparePlusOneConnectionHandler = (zone, { makeVowKit }, log) => {
  const makePlusOneConnectionHandler = zone.exoClass(
    'plusOne',
    undefined,
    ({ publisher }) => {
      return {
        publisher,
      };
    },
    {
      async onReceive(_c, packetBytes) {
        log('Receiving Data', packetBytes);
        const { vow, resolver } = makeVowKit();
        resolver.resolve(`${packetBytes}1`);
        return vow;
      },
      async onOpen(_c, localAddr, remoteAddr, _connectionHandler) {
        this.state.publisher.publish([
          'plusOne-open',
          { localAddr, remoteAddr },
        ]);
      },
    },
  );

  return makePlusOneConnectionHandler;
};

const prepareIBCListener = (zone, makePlusOne) => {
  const makeIBCListener = zone.exoClass(
    'ibcListener',
    undefined,
    ({ publisher }) => {
      return { publisher };
    },
    {
      async onAccept(_port, _localAddr, _remoteAddr, _listenHandler) {
        return makePlusOne({ publisher: this.state.publisher });
      },
      async onListen(port, _listenHandler) {
        console.debug(`listening on echo port: ${port}`);
      },
    },
  );

  return makeIBCListener;
};

test('network - ibc', async t => {
  const networkVat = E(networkBuildRootObject)(
    null,
    null,
    provideBaggage('network'),
  );
  const ibcVat = E(ibcBuildRootObject)(null, null, provideBaggage('ibc'));
  const baggage = provideBaggage('network - ibc');
  const zone = makeDurableZone(baggage);
  const powers = prepareVowTools(zone);
  const { when } = powers;

  const makeDurablePublishKit = prepareDurablePublishKit(
    baggage,
    'DurablePublishKit',
  );

  const { subscriber, publisher } = makeDurablePublishKit();

  const pinnedHistoryTopic = makePinnedHistoryTopic(subscriber);
  const events = subscribeEach(pinnedHistoryTopic)[Symbol.asyncIterator]();

  let hndlr;
  /** @type {import('../src/types.js').ScopedBridgeManager} */
  const bridgeHandler = zone.exo('IBC Bridge Manager', undefined, {
    toBridge: async obj => {
      const { method, type, ...params } = obj;
      publisher.publish([method, params]);
      t.is(type, 'IBC_METHOD');
      if (method === 'sendPacket') {
        const { packet } = params;
        return { ...packet, sequence: '39' };
      }
      return undefined;
    },
    fromBridge: async obj => {
      if (!hndlr) throw Error('no handler!');
      await when(E(hndlr).fromBridge(obj));
    },
    initHandler: h => {
      if (hndlr) throw Error('already init');
      hndlr = h;
    },
    setHandler: h => {
      if (!hndlr) throw Error('must init first');
      hndlr = h;
    },
  });

  await registerNetworkProtocols(
    { network: networkVat, ibc: ibcVat, provisioning: undefined },
    bridgeHandler,
  );

  // Actually test the ibc port binding.
  // TODO: Do more tests on the returned Port object.
  t.log('Opening a Listening Port');
  const p = await when(E(networkVat).bind('/ibc-port/'));
  const ev1 = await events.next();
  t.assert(!ev1.done);
  t.deepEqual(ev1.value, ['bindPort', { packet: { source_port: 'port-1' } }]);

  const makePlusOne = preparePlusOneConnectionHandler(zone, powers, t.log);
  const makeIBCListener = prepareIBCListener(zone, makePlusOne);

  const testEcho = async () => {
    await E(p).addListener(makeIBCListener({ publisher }));

    t.log('Accepting an Inbound Connection');
    const c = await when(E(p).connect('/ibc-port/port-1/unordered/foo'));

    t.log('Sending Data - echo');
    const ack = await when(E(c).send('hello198'));
    t.is(ack, 'hello1981', 'expected echo');

    t.log('Closing the Connection');
    await when(E(c).close());
  };

  await testEcho();

  const testIBCOutbound = async () => {
    t.log('Connecting to a Remote Port');
    const [hopName, portName, version] = ['connection-11', 'port-98', 'bar'];
    const remoteEndpoint = `/ibc-hop/${hopName}/ibc-port/${portName}/unordered/${version}`;
    const cP = E(p).connect(remoteEndpoint);

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

    await E(bridgeHandler).fromBridge({
      event: 'channelOpenAck',
      portID: 'port-1',
      channelID: 'channel-1',
      counterparty: { port_id: 'port-98', channel_id: 'channel-22' },
      counterpartyVersion: 'bar',
      connectionHops: ['connection-11'],
    });

    const c = await when(cP);
    t.log('Sending Data - transfer');
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

    await E(bridgeHandler).fromBridge({
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

    t.is(await when(ack), 'a-transfer-reply');

    await E(c).close();
  };

  await testIBCOutbound();

  const testIBCInbound = async () => {
    await E(bridgeHandler).fromBridge({
      event: 'channelOpenTry',
      channelID: 'channel-2',
      portID: 'port-1',
      counterparty: { port_id: 'port-99', channel_id: 'channel-23' },
      connectionHops: ['connection-12'],
      order: 'ORDERED',
      version: 'bazi',
      counterpartyVersion: 'bazo',
    });

    await E(bridgeHandler).fromBridge({
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

    await E(bridgeHandler).fromBridge({
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
  publisher.finish([]);
  const evend = await events.next();
  t.assert(evend.done);
  t.deepEqual(evend.value, []);
});
