import { JSONRPCClient, type JSONRPCResponse } from 'json-rpc-2.0';
import type { CloseEvent, WebSocket } from 'ws';

const MAX_SUBSCRIPTIONS = 5;

const hasOwnProperties = (obj: unknown) =>
  typeof obj === 'object' && obj !== null && Reflect.ownKeys(obj).length > 0;

/** cf. https://docs.cometbft.com/v1.0/explanation/core/subscription */
export type SubscriptionResponse = {
  type: string;
  value: Record<string, unknown>;
};

export class CosmosRPCClient extends JSONRPCClient {
  #subscriptions: Map<
    number,
    {
      query: string;
      notify: (response: JSONRPCResponse) => void;
      finish: () => void;
      fail: (error: unknown) => void;
      unsubscribe: () => void;
    }
  >;

  #openedPK: PromiseWithResolvers<void>;

  #closedPK: PromiseWithResolvers<CloseEvent>;

  #isClosed: boolean;

  #lastSentId: number;

  #ws: WebSocket;

  constructor(
    url: string | URL,
    {
      WebSocket,
      heartbeats,
    }: {
      WebSocket: typeof import('ws').WebSocket;
      heartbeats?: AsyncIterable<unknown>;
    },
  ) {
    const wsUrl = new URL('/websocket', url);
    wsUrl.protocol = wsUrl.protocol.replace(/^http/, 'ws');
    wsUrl.pathname = '/websocket';
    const ws = new WebSocket(wsUrl);
    super(payload => {
      this.#lastSentId = payload.id;
      // console.log('sending payload:', payload);
      ws.send(JSON.stringify(payload));
    });
    this.#ws = ws;
    this.#subscriptions = new Map();
    this.#openedPK = Promise.withResolvers();
    this.#closedPK = Promise.withResolvers();
    this.#isClosed = false;
    this.#lastSentId = -1;

    ws.addEventListener('close', event => {
      this.#closedPK.resolve(event);
      this.#isClosed = true;
      for (const sub of this.#subscriptions.values()) {
        sub.finish();
      }
      this.#subscriptions.clear();
      this.rejectAllPendingRequests('socket closed');
    });

    const onError = err => {
      this.#openedPK.reject(err);
      this.#closedPK.reject(err);
      this.#isClosed = true;
      for (const sub of this.#subscriptions.values()) {
        sub.fail(err);
      }
      this.#subscriptions.clear();
      this.rejectAllPendingRequests(err?.message ?? 'unknown error');
    };

    ws.addEventListener('error', event => {
      const cause = event.error;
      const msg = `WebSocket ${wsUrl.href} error: ${cause?.message}`;
      onError(Error(msg, { cause }));
    });

    if (heartbeats) {
      let gotPong = true;
      ws.on('pong', () => {
        gotPong = true;
      });
      void (async () => {
        for await (const _ of heartbeats) {
          if (this.#isClosed) break;
          if (!gotPong) {
            onError(Error('pong timeout'));
            ws.terminate();
            break;
          }
          gotPong = false;
          ws.ping();
        }
      })();
    }

    ws.addEventListener('message', event => {
      const str = event.data.toString('utf8');
      const response = JSON.parse(str);
      const sub = this.#subscriptions.get(response.id);
      if (sub) {
        sub.notify(response);
      }
      this.receive(response);
    });

    ws.addEventListener('open', () => {
      this.#openedPK.resolve();
    });
  }

  async send(payload: any) {
    if (this.#isClosed) throw Error('already closed');
    return super.send(payload);
  }

  receive(response: JSONRPCResponse) {
    // console.log('Received RPC response:', response);
    return super.receive(response);
  }

  close() {
    this.rejectAllPendingRequests('RPC client closed');
    this.#ws.close();
  }

  opened() {
    return this.#openedPK.promise;
  }

  closed() {
    return this.#closedPK.promise;
  }

  subscribe(query: string) {
    return this.subscribeAll([query]);
  }

  /**
   * Websocket documentation: https://docs.cometbft.com/v1.0/explanation/core/subscription
   * Query syntax: https://pkg.go.dev/github.com/cometbft/cometbft@v1.0.1/libs/pubsub/query/syntax
   * List of events: https://pkg.go.dev/github.com/cometbft/cometbft/types#pkg-constants
   */
  async *subscribeAll(queries: string[]): AsyncGenerator<{
    query: string;
    data: SubscriptionResponse;
    events?: Record<string, unknown>;
  }> {
    const newQueries = new Set(queries);
    if (newQueries.size < 1) {
      throw new Error(`No new subscriptions: ${queries.join(', ')}`);
    }
    const currentQueriesCount = this.#subscriptions.size;
    if (currentQueriesCount + newQueries.size > MAX_SUBSCRIPTIONS) {
      throw new Error(
        `Too many subscriptions: existing ${currentQueriesCount} + new ${newQueries.size} exceeds RPC client limit of ${MAX_SUBSCRIPTIONS}`,
      );
    }

    type Cell = { head: JSONRPCResponse; tail: Promise<Cell> };
    let lastPK = Promise.withResolvers<Cell>();
    let nextCellP = lastPK.promise;

    const subscriptionKits = [...newQueries.keys()].map(query => {
      const subP = this.request('subscribe', { query });
      const subId = this.#lastSentId;
      // console.log(`Subscribing to query ${JSON.stringify(query)} with ID ${subId}`);
      const unsubscribe = () => {
        this.#subscriptions.delete(subId);
        void this.request('unsubscribe', { query });
      };
      const readyKit = {
        isSettled: false,
        ...Promise.withResolvers<undefined>(),
      };
      this.#subscriptions.set(subId, {
        query,
        finish: () => {
          readyKit.isSettled = true;
          readyKit.resolve(undefined);
          // @ts-expect-error undefined is not a Cell but indicates conclusion
          lastPK.resolve(undefined);
        },
        fail: (err: unknown) => {
          readyKit.isSettled = true;
          readyKit.reject(err);
          lastPK.reject(err);
        },
        notify: (response: JSONRPCResponse) => {
          // Ignore an initial empty-result response.
          if (!readyKit.isSettled) {
            readyKit.isSettled = true;
            if (response.error) {
              readyKit.reject(response.error);
              lastPK.reject(response.error);
              return;
            }
            readyKit.resolve(undefined);
            if (!hasOwnProperties(response.result)) return;
          }
          // console.log('notified for query:', query, response);
          const thisPK = lastPK;
          lastPK = Promise.withResolvers();
          thisPK.resolve({ head: response, tail: lastPK.promise });
        },
        unsubscribe,
      });
      return { promise: Promise.all([subP, readyKit.promise]), unsubscribe };
    });

    // console.log(`Awaiting subscription responses for queries:`, subscriptionKits);
    await Promise.all(subscriptionKits.map(kit => kit.promise));
    // @ts-expect-error indicate readiness with an initial `undefined` result
    yield undefined;

    // console.log('wait forever?');
    try {
      while (true) {
        const nextCell = await nextCellP;
        if (!nextCell) break;
        const { head, tail } = nextCell;
        nextCellP = tail;
        if (head.error) {
          // Propagate application-level errors non-fatally.
          yield Promise.reject(Error(head.error.message));
          continue;
        }
        yield head.result;
      }
    } finally {
      for (const { unsubscribe } of subscriptionKits) {
        unsubscribe();
      }
    }
  }
}
