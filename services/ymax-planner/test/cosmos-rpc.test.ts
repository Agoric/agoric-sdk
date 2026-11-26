import test from 'ava';

import {
  CosmosRPCClient,
  type RpcCloseEvent,
  type RpcWebSocket,
} from '../src/cosmos-rpc.ts';

/** One event object that fits every RpcWebSocket listener. */
type FakeEvent = RpcCloseEvent & {
  data: Buffer;
  error?: { message?: string };
};

const makeFakeEvent = (fields: Partial<FakeEvent> = {}): FakeEvent => ({
  code: 1000,
  reason: '',
  wasClean: true,
  data: Buffer.from(''),
  ...fields,
});

/** A minimal stand-in for `ws`'s WebSocket, driven by the test. */
const makeFakeWebSocket = () => {
  const sent: unknown[] = [];
  let socket: FakeWebSocket | undefined;
  class FakeWebSocket {
    listeners = new Map<string, Array<(event: FakeEvent) => void>>();

    terminated = false;

    closed = false;

    sent = sent;

    url: URL;

    constructor(url: URL) {
      this.url = url;
      socket = this;
    }

    addEventListener(type: string, listener: (event: FakeEvent) => void) {
      this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
    }

    on(type: string, listener: (event: FakeEvent) => void) {
      this.addEventListener(type, listener);
    }

    emit(type: string, event: FakeEvent = makeFakeEvent()) {
      for (const listener of this.listeners.get(type) ?? []) listener(event);
    }

    send(data: string) {
      this.sent.push(JSON.parse(data));
    }

    ping() {
      this.emit('pong');
    }

    terminate() {
      this.terminated = true;
    }

    close() {
      this.closed = true;
    }
  }
  const WebSocket: new (url: URL) => RpcWebSocket = FakeWebSocket;
  const getSocket = () => {
    if (!socket) throw Error('no socket yet');
    return socket;
  };
  const receive = (message: unknown) =>
    getSocket().emit(
      'message',
      makeFakeEvent({ data: Buffer.from(JSON.stringify(message)) }),
    );
  const lastSentId = () => {
    const last = sent.at(-1);
    if (typeof last === 'object' && last !== null && 'id' in last) {
      return last.id;
    }
    throw Error('nothing sent');
  };
  return { WebSocket, receive, getSocket, lastSentId };
};

/** Heartbeats that the test triggers one at a time. */
const makeHeartbeats = () => {
  let next = Promise.withResolvers<void>();
  const heartbeats = (async function* () {
    for (;;) {
      await next.promise;
      next = Promise.withResolvers<void>();
      yield;
    }
  })();
  const beat = async () => {
    next.resolve();
    // Let the heartbeat loop run.
    await new Promise(resolve => setImmediate(resolve));
  };
  return { heartbeats, beat };
};

const subscribe = async (
  rpc: CosmosRPCClient,
  fake: ReturnType<typeof makeFakeWebSocket>,
) => {
  const responses = rpc.subscribe("tm.event = 'NewBlock'");
  const readyP = responses.next();
  await null;
  const id = fake.lastSentId();
  fake.receive({ jsonrpc: '2.0', id, result: {} });
  await readyP;
  return { responses, id };
};

test('CosmosRPCClient counts subscription notifications', async t => {
  const fake = makeFakeWebSocket();
  const rpc = new CosmosRPCClient('https://rpc.example:443', {
    WebSocket: fake.WebSocket,
  });
  fake.getSocket().emit('open');
  await rpc.opened();
  t.is(rpc.notificationCount(), 0);

  // The subscription's initial (empty) response counts.
  const { responses, id } = await subscribe(rpc, fake);
  t.is(rpc.notificationCount(), 1);

  fake.receive({ jsonrpc: '2.0', id, result: { data: { value: {} } } });
  await responses.next();
  t.is(rpc.notificationCount(), 2);

  // A response to another request doesn't.
  const statusP = rpc.request('status', {});
  fake.receive({ jsonrpc: '2.0', id: fake.lastSentId(), result: {} });
  await statusP;
  t.is(rpc.notificationCount(), 2);
});

test('CosmosRPCClient stays connected while a subscription is silent', async t => {
  const fake = makeFakeWebSocket();
  const { heartbeats, beat } = makeHeartbeats();
  const rpc = new CosmosRPCClient('https://rpc.example:443', {
    WebSocket: fake.WebSocket,
    heartbeats,
  });
  fake.getSocket().emit('open');
  await rpc.opened();
  await subscribe(rpc, fake);
  // Every node is quiet during a chain halt; the pongs keep it alive.
  for (let i = 0; i < 20; i += 1) await beat();
  t.false(fake.getSocket().terminated);
});
