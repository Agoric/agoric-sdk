import test from 'ava';
import { EventEmitter } from 'node:events';
import type { WebSocketProvider } from 'ethers';
import {
  makeReconnectingProvider,
  type ReconnectingProvider,
} from '../src/support.ts';
import { WatcherTransportError } from '../src/errors.ts';
import { makeEvmRpc } from '../src/evm-scanner.ts';

/** Flush pending microtasks/timers so heartbeat loop bodies run. */
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

class FakeSocket extends EventEmitter {
  readyState = 1; // OPEN
  pings = 0;
  terminated = false;

  ping() {
    this.pings += 1;
  }

  terminate() {
    this.terminated = true;
    this.readyState = 3; // CLOSED
    this.emit('close', 1006, 'terminated');
  }
}

class FakeProvider {
  websocket = new FakeSocket();
  destroyed = false;

  async destroy() {
    this.destroyed = true;
  }
}

const makeFakeProviders = () => {
  const created: FakeProvider[] = [];
  const makeProvider = () => {
    const provider = new FakeProvider();
    created.push(provider);
    return provider as unknown as WebSocketProvider;
  };
  return { created, makeProvider };
};

/** A heartbeat whose ticks are driven manually; exposes the latest ticker. */
const makeManualHeartbeats = () => {
  let current: { tick: () => void };
  const makeHeartbeat = () => {
    const pending: true[] = [];
    let waiting: ((r: IteratorResult<unknown>) => void) | null = null;
    current = {
      tick: () => {
        if (waiting) {
          const resolve = waiting;
          waiting = null;
          resolve({ value: undefined, done: false });
        } else {
          pending.push(true);
        }
      },
    };
    return {
      [Symbol.asyncIterator]: () => ({
        next: () => {
          if (pending.length) {
            pending.shift();
            return Promise.resolve({ value: undefined, done: false });
          }
          return new Promise<IteratorResult<unknown>>(resolve => {
            waiting = resolve;
          });
        },
        return: () => Promise.resolve({ value: undefined, done: true }),
      }),
    };
  };
  return { makeHeartbeat, tick: () => current.tick() };
};

test('reportUnhealthy recreates the provider and terminates the old socket', t => {
  const { created, makeProvider } = makeFakeProviders();
  const sh = makeReconnectingProvider({ wsUrl: 'ws://x', makeProvider });

  t.is(sh.getProvider(), created[0] as unknown as WebSocketProvider);

  sh.reportUnhealthy('test');

  t.is(created.length, 2, 'a new provider is created');
  t.is(sh.getProvider(), created[1] as unknown as WebSocketProvider);
  t.true(created[0].websocket.terminated, 'old socket is terminated');
  t.true(created[0].destroyed, 'old provider is destroyed');
});

test('a socket close triggers a reconnect', t => {
  const { created, makeProvider } = makeFakeProviders();
  const sh = makeReconnectingProvider({ wsUrl: 'ws://x', makeProvider });

  created[0].websocket.emit('close', 1006, 'boom');

  t.is(created.length, 2);
  t.is(sh.getProvider(), created[1] as unknown as WebSocketProvider);
});

test('a stale socket close does not cycle the current provider', t => {
  const { created, makeProvider } = makeFakeProviders();
  const sh = makeReconnectingProvider({ wsUrl: 'ws://x', makeProvider });

  sh.reportUnhealthy('first'); // gen 0 → 1
  t.is(created.length, 2);

  // A late close from the already-replaced socket must be ignored.
  created[0].websocket.emit('close', 1006, 'late');
  t.is(created.length, 2, 'no extra reconnect from the stale socket');
});

test('heartbeat reconnects on a missed pong but not while ponging', async t => {
  const { created, makeProvider } = makeFakeProviders();
  const { makeHeartbeat, tick } = makeManualHeartbeats();
  makeReconnectingProvider({ wsUrl: 'ws://x', makeProvider, makeHeartbeat });

  // Tick once: pings, awaits pong.
  tick();
  await flush();
  t.is(created[0].websocket.pings, 1);

  // Pong arrives → still alive on the next tick.
  created[0].websocket.emit('pong');
  tick();
  await flush();
  t.is(created.length, 1, 'no reconnect while ponging');
  t.is(created[0].websocket.pings, 2);

  // No pong before the next tick → declared dead and reconnected.
  tick();
  await flush();
  t.is(created.length, 2, 'reconnected after a missed pong');
  t.true(created[0].websocket.terminated);
});

test('makeEvmRpc bounds a hanging call and reports the socket unhealthy', async t => {
  let unhealthyReason: string | undefined;
  const hanging = {
    getBlockNumber: () => new Promise<number>(() => {}), // never resolves
  };
  const sh = {
    getProvider: () => hanging,
    websocket: {},
    reportUnhealthy: (reason?: string) => {
      unhealthyReason = reason;
    },
    close: () => {},
  } as unknown as ReconnectingProvider;

  const rpc = makeEvmRpc(sh, globalThis.setTimeout, { timeoutMs: 50 });
  const err = await t.throwsAsync(() => rpc.getBlockNumber());

  t.true(err instanceof WatcherTransportError);
  t.is(unhealthyReason, 'getBlockNumber timeout');
});

test('makeEvmRpc passes a fast call through and clears the timeout', async t => {
  const sh = {
    getProvider: () => ({ getBlockNumber: async () => 123 }),
    websocket: {},
    reportUnhealthy: () => t.fail('should not cycle on a fast call'),
    close: () => {},
  } as unknown as ReconnectingProvider;

  const rpc = makeEvmRpc(sh, globalThis.setTimeout, { timeoutMs: 1000 });
  t.is(await rpc.getBlockNumber(), 123);
});
