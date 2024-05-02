// @ts-check

import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { reincarnate } from '@agoric/swingset-liveslots/tools/setup-vat-data.js';

import { E } from '@endo/far';
import { prepareVowTools } from '@agoric/vat-data/vow.js';
import { makeDurableZone } from '@agoric/zone/durable.js';

import {
  parse,
  unparse,
  prepareEchoConnectionKit,
  prepareRouter,
  prepareLoopbackProtocolHandler,
  prepareNetworkProtocol,
  preparePortAllocator,
} from '../src/index.js';

/**
 * @import {ListenHandler} from '../src/types.js';
 */

// eslint-disable-next-line no-constant-condition
const log = false ? console.log : () => {};

/**
 * @param {import('@agoric/zone').Zone} zone
 * @param {import('ava').ExecutionContext} t
 * @param {ReturnType<prepareEchoConnectionKit>} makeEchoConnectionHandler
 * @param {*} powers
 */
const prepareProtocolHandler = (
  zone,
  t,
  makeEchoConnectionHandler,
  { when },
) => {
  const makeProtocolHandler = zone.exoClass(
    'ProtocolHandler',
    undefined,
    () => {
      return {
        /** @type {ListenHandler | undefined } */
        l: undefined,
        lp: undefined,
        nonce: 0,
      };
    },
    {
      async onInstantiate(_port, _localAddr, _remote, _protocol) {
        return '';
      },
      async onCreate(_protocol, _impl) {
        log('created', _protocol, _impl);
      },
      async generatePortID() {
        this.state.nonce += 1;
        return `port-${this.state.nonce}`;
      },
      async onBind(port, localAddr) {
        t.assert(port, `port is supplied to onBind`);
        t.assert(localAddr, `local address is supplied to onBind`);
      },
      async onConnect(port, localAddr, remoteAddr) {
        t.assert(port, `port is tracked in onConnect`);
        t.assert(localAddr, `local address is supplied to onConnect`);
        t.assert(remoteAddr, `remote address is supplied to onConnect`);
        if (!this.state.lp) {
          return { handler: makeEchoConnectionHandler().handler };
        }
        assert(this.state.l);
        const ch = await when(
          this.state.l.onAccept(
            this.state.lp,
            localAddr,
            remoteAddr,
            this.state.l,
          ),
        );
        return { localAddr, handler: ch };
      },
      async onListen(port, localAddr, listenHandler) {
        t.assert(port, `port is tracked in onListen`);
        t.assert(localAddr, `local address is supplied to onListen`);
        t.assert(listenHandler, `listen handler is tracked in onListen`);
        this.state.lp = port;
        this.state.l = listenHandler;
        log('listening', port.getLocalAddress(), listenHandler);
      },
      async onListenRemove(port, localAddr, listenHandler) {
        t.assert(port, `port is tracked in onListen`);
        t.assert(localAddr, `local address is supplied to onListen`);
        t.is(
          listenHandler,
          this.state.lp && this.state.l,
          `listenHandler is tracked in onListenRemove`,
        );
        this.state.lp = undefined;
        log('port done listening', port.getLocalAddress());
      },
      async onRevoke(port, localAddr) {
        t.assert(port, `port is tracked in onRevoke`);
        t.assert(localAddr, `local address is supplied to onRevoke`);
        log('port done revoking', port.getLocalAddress());
      },
    },
  );

  return makeProtocolHandler;
};

const { fakeVomKit } = reincarnate({ relaxDurabilityRules: false });
const provideBaggage = key => {
  const root = fakeVomKit.cm.provideBaggage();
  const zone = makeDurableZone(root);
  return zone.mapStore(`${key} baggage`);
};

test('handled protocol', async t => {
  const zone = makeDurableZone(provideBaggage('network-handled-protocol'));
  const powers = prepareVowTools(zone);
  const { makeVowKit, when } = powers;
  const makeNetworkProtocol = prepareNetworkProtocol(zone, powers);
  const makeEchoConnectionHandler = prepareEchoConnectionKit(zone);
  const makeProtocolHandler = prepareProtocolHandler(
    zone,
    t,
    makeEchoConnectionHandler,
    powers,
  );
  const protocol = makeNetworkProtocol(makeProtocolHandler());

  const port = await when(protocol.bindPort('/ibc/*/ordered'));

  const { vow, resolver } = makeVowKit();

  const prepareTestProtocolHandler = () => {
    const makeTestProtocolHandler = zone.exoClass(
      'TestProtocolHandler',
      undefined,
      () => ({ resolver }),
      {
        async onOpen(connection, localAddr, remoteAddr) {
          t.is(localAddr, '/ibc/*/ordered');
          t.is(remoteAddr, '/ibc/*/ordered/echo');
          const ack = await when(E(connection).send('ping'));
          // log(ack);
          t.is(`${ack}`, 'ping', 'received pong');
          void connection.close();
        },
        async onClose(_connection, reason) {
          t.is(reason, undefined, 'no close reason');
          this.state.resolver.resolve(null);
        },
        async onReceive(_connection, bytes) {
          t.is(`${bytes}`, 'ping');
          return 'pong';
        },
      },
    );

    return makeTestProtocolHandler;
  };

  const makeTestProtocolHandler = prepareTestProtocolHandler();

  await port.connect('/ibc/*/ordered/echo', makeTestProtocolHandler());
  await when(vow);
  await when(port.revoke());
});

test('verify port allocation', async t => {
  const zone = makeDurableZone(
    provideBaggage('network-verify-port-allocation'),
  );
  const powers = prepareVowTools(zone);
  const { when } = powers;
  const makeNetworkProtocol = prepareNetworkProtocol(zone, powers);
  const makeEchoConnectionHandler = prepareEchoConnectionKit(zone);
  const makeProtocolHandler = prepareProtocolHandler(
    zone,
    t,
    makeEchoConnectionHandler,
    powers,
  );
  const protocol = makeNetworkProtocol(makeProtocolHandler());
  const makePortAllocator = preparePortAllocator(zone, powers);
  const portAllocator = makePortAllocator({ protocol });

  const ibcPort = await when(portAllocator.allocateCustomIBCPort());
  t.is(ibcPort.getLocalAddress(), '/ibc-port/port-1');

  const namedIbcPort = await when(
    portAllocator.allocateCustomIBCPort('test-1'),
  );
  t.is(namedIbcPort.getLocalAddress(), '/ibc-port/custom-test-1');

  const icaControllerPort1 = await when(
    portAllocator.allocateICAControllerPort(),
  );
  t.is(icaControllerPort1.getLocalAddress(), '/ibc-port/icacontroller-1');

  const icaControllerPort2 = await when(
    portAllocator.allocateICAControllerPort(),
  );
  t.is(icaControllerPort2.getLocalAddress(), '/ibc-port/icacontroller-2');

  const localPort = await when(portAllocator.allocateCustomLocalPort());
  t.is(localPort.getLocalAddress(), '/local/port-5');

  const namedLocalPort = await when(
    portAllocator.allocateCustomLocalPort('local-1'),
  );
  t.is(namedLocalPort.getLocalAddress(), '/local/custom-local-1');

  await t.throwsAsync(when(portAllocator.allocateCustomIBCPort('/test-1')), {
    message: 'Invalid IBC port name: /test-1',
  });

  const icqControllerPort1 = await when(
    portAllocator.allocateICQControllerPort(),
  );
  t.is(icqControllerPort1.getLocalAddress(), '/ibc-port/icqcontroller-1');

  const icqControllerPort2 = await when(
    portAllocator.allocateICQControllerPort(),
  );
  t.is(icqControllerPort2.getLocalAddress(), '/ibc-port/icqcontroller-2');
});

test('protocol connection listen', async t => {
  const zone = makeDurableZone(provideBaggage('network-protocol-connection'));
  const powers = prepareVowTools(zone);
  const { makeVowKit, when } = powers;
  const makeNetworkProtocol = prepareNetworkProtocol(zone, powers);
  const makeEchoConnectionHandler = prepareEchoConnectionKit(zone);
  const makeProtocolHandler = prepareProtocolHandler(
    zone,
    t,
    makeEchoConnectionHandler,
    powers,
  );
  const protocol = makeNetworkProtocol(makeProtocolHandler());

  const port = await when(
    protocol.bindPort('/net/ordered/ordered/some-portname'),
  );
  const { vow, resolver } = makeVowKit();

  const prepareConnectionHandler = () => {
    let handler;

    const makeConnectionHandler = zone.exoClass(
      'connectionHandler',
      undefined,
      () => ({ resolver }),
      {
        async onOpen(connection, _localAddr, _remoteAddr, connectionHandler) {
          t.assert(connectionHandler, `connectionHandler is tracked in onOpen`);
          handler = connectionHandler;
          const ack = await when(connection.send('ping'));
          t.is(`${ack}`, 'ping', 'received pong');
          await when(connection.close());
        },
        async onClose(c, reason, connectionHandler) {
          t.is(
            connectionHandler,
            handler,
            `connectionHandler is tracked in onClose`,
          );
          handler = undefined;
          t.assert(c, 'connection is passed to onClose');
          t.is(reason, undefined, 'no close reason');
          this.state.resolver.resolve(null);
        },
        async onReceive(c, packet, connectionHandler) {
          t.is(
            connectionHandler,
            handler,
            `connectionHandler is tracked in onReceive`,
          );
          t.assert(c, 'connection is passed to onReceive');
          t.is(`${packet}`, 'ping', 'expected ping');
          return 'pong';
        },
      },
    );
    return makeConnectionHandler;
  };

  const prepareListenHandler = () => {
    const makeListenHandler = zone.exoClass(
      'ListenHandler',
      undefined,
      () => ({ port }),
      {
        async onListen(p, listenHandler) {
          t.is(p, this.state.port, `port is tracked in onListen`);
          t.assert(listenHandler, `listenHandler is tracked in onListen`);
        },
        async onAccept(p, localAddr, remoteAddr, listenHandler) {
          t.assert(localAddr, `local address is passed to onAccept`);
          t.assert(remoteAddr, `remote address is passed to onAccept`);
          t.is(p, this.state.port, `port is tracked in onAccept`);
          t.is(
            listenHandler,
            this.self,
            `listenHandler is tracked in onAccept`,
          );

          const makeConnectionHandler = prepareConnectionHandler();
          return makeConnectionHandler();
        },
        async onError(p, rej, listenHandler) {
          t.is(p, port, `port is tracked in onError`);
          t.is(listenHandler, this.self, `listenHandler is tracked in onError`);
          t.not(rej, rej, 'unexpected error');
        },
        async onRemove(p, listenHandler) {
          t.is(
            listenHandler,
            this.self,
            `listenHandler is tracked in onRemove`,
          );
          t.is(p, this.state.port, `port is passed to onReset`);
        },
      },
    );

    return makeListenHandler;
  };

  const makeListenHandler = prepareListenHandler();
  const listener = makeListenHandler();

  await port.addListener(listener);

  const port2 = await when(protocol.bindPort('/net/ordered'));
  const { handler } = makeEchoConnectionHandler();

  const prepareHandlerWithOpen = () => {
    const makeHandlerWithOpen = zone.exoClass(
      'connectionHandlerWithOpen',
      undefined,
      () => ({}),
      {
        async onReceive(_connection, bytes, _connectionHandler) {
          return handler.onReceive(_connection, bytes, _connectionHandler);
        },
        async onClose(_connection, _reason, _connectionHandler) {
          return handler.onClose(_connection, _reason, _connectionHandler);
        },
        async onOpen(connection, _localAddr, _remoteAddr, _c) {
          void connection.send('ping');
        },
      },
    );

    return makeHandlerWithOpen;
  };

  const makeHandlerWithOpen = prepareHandlerWithOpen();

  await when(
    port2.connect('/net/ordered/ordered/some-portname', makeHandlerWithOpen()),
  );

  await when(vow);

  await when(port.removeListener(listener));
  await when(port.revoke());
});

test('loopback protocol', async t => {
  const zone = makeDurableZone(provideBaggage('network-loopback-protocol'));
  const powers = prepareVowTools(zone);
  const { makeVowKit, when } = powers;
  const makeLoopbackProtocolHandler = prepareLoopbackProtocolHandler(
    zone,
    powers,
  );
  const makeNetworkProtocol = prepareNetworkProtocol(zone, powers);
  const protocol = makeNetworkProtocol(makeLoopbackProtocolHandler());
  const { vow, resolver } = makeVowKit();

  const port = await when(protocol.bindPort('/loopback/foo'));

  const prepareConnectionHandler = () => {
    const makeConnectionHandler = zone.exoClass(
      'connectionHandler',
      undefined,
      () => ({}),
      {
        async onReceive(c, packet, _connectionHandler) {
          t.is(`${packet}`, 'ping', 'expected ping');
          return 'pingack';
        },
      },
    );
    return makeConnectionHandler;
  };

  const makeConnectionHandler = prepareConnectionHandler();

  const prepareListenHandler = () => {
    const makeListenHandler = zone.exoClass(
      'listener',
      undefined,
      () => ({ port }),
      {
        async onAccept(_p, _localAddr, _remoteAddr, _listenHandler) {
          return makeConnectionHandler();
        },
      },
    );

    return makeListenHandler;
  };

  const makeListenHandler = prepareListenHandler();
  const listener = makeListenHandler();
  await when(port.addListener(listener));

  const port2 = await when(protocol.bindPort('/loopback/bar'));
  const prepareOpener = () => {
    const openerHandler = zone.exoClass(
      'opener',
      undefined,
      ({ resolver: innerResolver }) => ({ innerResolver }),
      {
        async onOpen(c, localAddr, remoteAddr, _connectionHandler) {
          t.is(localAddr, '/loopback/bar/nonce/1');
          t.is(remoteAddr, '/loopback/foo/nonce/2');
          const pingack = await when(c.send('ping'));
          t.is(pingack, 'pingack', 'expected pingack');
          this.state.innerResolver.resolve(null);
        },
      },
    );

    return openerHandler;
  };

  const makeOpenerHandler = prepareOpener();

  await when(
    port2.connect(port.getLocalAddress(), makeOpenerHandler({ resolver })),
  );

  await when(vow);

  await port.removeListener(listener);
});

test('routing', async t => {
  const zone = makeDurableZone(provideBaggage('network-loopback-protocol'));
  const makeRouter = prepareRouter(zone);
  const router = makeRouter();
  t.deepEqual(router.getRoutes('/if/local'), [], 'get routes matches none');
  router.register('/if/', 'a');
  t.deepEqual(
    router.getRoutes('/if/foo'),
    [['/if/', 'a']],
    'get routes matches prefix',
  );
  router.register('/if/foo', 'b');
  t.deepEqual(
    router.getRoutes('/if/foo'),
    [
      ['/if/foo', 'b'],
      ['/if/', 'a'],
    ],
    'get routes matches all',
  );
  t.deepEqual(
    router.getRoutes('/if/foob'),
    [['/if/', 'a']],
    'get routes needs separator',
  );
  router.register('/ibc/*/ordered', 'c');
  t.deepEqual(
    router.getRoutes('/if/foo'),
    [
      ['/if/foo', 'b'],
      ['/if/', 'a'],
    ],
    'get routes avoids nonmatching paths',
  );
  t.deepEqual(
    router.getRoutes('/ibc/*/ordered'),
    [['/ibc/*/ordered', 'c']],
    'direct match',
  );
  t.deepEqual(
    router.getRoutes('/ibc/*/ordered/zot'),
    [['/ibc/*/ordered', 'c']],
    'prefix matches',
  );
  t.deepEqual(router.getRoutes('/ibc/*/barfo'), [], 'no match');

  t.throws(
    () => router.unregister('/ibc/*/ordered', 'a'),
    { message: /Router is not registered/ },
    'unregister fails for no match',
  );
  router.unregister('/ibc/*/ordered', 'c');
  t.deepEqual(
    router.getRoutes('/ibc/*/ordered'),
    [],
    'no match after unregistration',
  );
});

test('multiaddr', async t => {
  t.deepEqual(parse('/if/local'), [['if', 'local']]);
  t.deepEqual(parse('/zot'), [['zot']]);
  t.deepEqual(parse('/zot/foo/bar/baz/bot'), [
    ['zot', 'foo'],
    ['bar', 'baz'],
    ['bot'],
  ]);
  for (const str of ['', 'foobar']) {
    t.throws(
      () => parse(str),
      { message: /Error parsing Multiaddr/ },
      `expected failure of ${str}`,
    );
  }
  for (const str of ['/', '//', '/foo', '/foobib/bar', '/k1/v1/k2/v2/k3/v3']) {
    t.is(
      unparse(parse(str)),
      str,
      `round-trip of ${JSON.stringify(str)} matches`,
    );
  }
});
