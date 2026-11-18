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
      sent.push(JSON.parse(data));
    }

    ping() {
      this.emit('pong');
    }

    terminate() {
      this.terminated = true;
    }

    close() {}
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

test('CosmosRPCClient fails a subscription that stops receiving messages', async t => {
  const fake = makeFakeWebSocket();
  const { heartbeats, beat } = makeHeartbeats();
  let now = 0;
  const rpc = new CosmosRPCClient('https://rpc.example:443', {
    WebSocket: fake.WebSocket,
    heartbeats,
    maxMessageGapMs: 60_000,
    now: () => now,
  });
  rpc.closed().catch(() => {});
  fake.getSocket().emit('open');
  await rpc.opened();
  const { responses, id } = await subscribe(rpc, fake);

  // A block within the gap keeps the connection alive.
  now = 50_000;
  fake.receive({ jsonrpc: '2.0', id, result: { data: { value: {} } } });
  await responses.next();
  now = 100_000;
  await beat();
  t.false(fake.getSocket().terminated);

  // No message for longer than the gap fails it.
  now = 110_001;
  await beat();
  t.true(fake.getSocket().terminated);
  await t.throwsAsync(responses.next(), {
    message: /sent no message in over 60000ms/,
  });
});

test('CosmosRPCClient without maxMessageGapMs tolerates silence', async t => {
  const fake = makeFakeWebSocket();
  const { heartbeats, beat } = makeHeartbeats();
  let now = 0;
  const rpc = new CosmosRPCClient('https://rpc.example:443', {
    WebSocket: fake.WebSocket,
    heartbeats,
    now: () => now,
  });
  fake.getSocket().emit('open');
  await rpc.opened();
  await subscribe(rpc, fake);
  now = 10 * 60_000;
  await beat();
  t.false(fake.getSocket().terminated);
});
