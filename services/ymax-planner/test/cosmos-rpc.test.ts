import test from 'ava';

import { CosmosRPCClient } from '../src/cosmos-rpc.ts';

/** A minimal stand-in for `ws`'s WebSocket, driven by the test. */
const makeFakeWebSocket = () => {
  const sent: any[] = [];
  let socket: any;
  class FakeWebSocket {
    listeners = new Map<string, Array<(event: any) => void>>();

    terminated = false;

    url: URL;

    constructor(url: URL) {
      this.url = url;
      socket = this;
    }

    addEventListener(type: string, listener: (event: any) => void) {
      this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
    }

    on(type: string, listener: (event: any) => void) {
      this.addEventListener(type, listener);
    }

    emit(type: string, event: any = {}) {
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
  const receive = (message: unknown) =>
    socket.emit('message', { data: Buffer.from(JSON.stringify(message)) });
  return {
    WebSocket: FakeWebSocket as any,
    sent,
    receive,
    getSocket: () => socket,
  };
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
  const { id } = fake.sent.at(-1);
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
