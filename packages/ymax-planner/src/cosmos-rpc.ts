import { JSONRPCClient, type JSONRPCResponse } from 'json-rpc-2.0';

const MAX_SUBSCRIPTIONS = 5;

const hasOwnProperties = (obj: unknown) =>
  typeof obj === 'object' && obj !== null && Reflect.ownKeys(obj).length > 0;

export class CosmosRPCClient extends JSONRPCClient {
  #subscriptions: Map<
    number,
    {
      query: string;
      notified: (response: JSONRPCResponse) => void;
      unsubscribe: () => void;
    }
  >;

  #openedPK: PromiseWithResolvers<void>;

  #closedPK: PromiseWithResolvers<void>;

  #lastSentId: number;

  #ws: WebSocket;

  constructor(url) {
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
    this.#openedPK = Promise.withResolvers<void>();
    this.#closedPK = Promise.withResolvers<void>();
    this.#lastSentId = -1;

    ws.addEventListener('close', () => {
      this.#closedPK.resolve();
      this.#subscriptions.clear();
    });

    ws.addEventListener('error', ev => {
      const err = new Error(`WebSocket ${wsUrl.href} error: ${ev}`);
      this.#openedPK.reject(err);
      this.#closedPK.reject(err);
    });

    ws.addEventListener('message', event => {
      const str = event.data.toString('utf8');
      const response = JSON.parse(str);
      const sub = this.#subscriptions.get(response.id);
      if (sub) {
        sub.notified(response);
      }
      this.receive(response);
    });

    ws.addEventListener('open', () => {
      this.#openedPK.resolve();
    });
  }

  receive(response: JSONRPCResponse) {
    // console.log('Received RPC response:', response);
    return super.receive(response);
  }

  close() {
    this.rejectAllPendingRequests('RPC client closed');
    this.#ws.close();
    this.#subscriptions.clear();
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

  async *subscribeAll(queries: string[]) {
    type Cell = { head: JSONRPCResponse; tail: Promise<Cell> };
    let lastPK = Promise.withResolvers<Cell>();
    let nextCell: Promise<Cell> = lastPK.promise;

    const newQueriesSet = new Set(queries);
    if (newQueriesSet.size === 0) {
      throw new Error(`No new queries to subscribe to: ${queries.join(', ')}`);
    }

    const currentQueriesCount = this.#subscriptions.size;
    const totalQueries = newQueriesSet.size + currentQueriesCount;
    if (totalQueries > MAX_SUBSCRIPTIONS) {
      throw new Error(
        `Too many subscriptions: new ${newQueriesSet.size} + existing ${currentQueriesCount} exceeds RPC client limit of ${MAX_SUBSCRIPTIONS}`,
      );
    }

    const qs = [...newQueriesSet.keys()].map(query => {
      const subP = this.request('subscribe', { query });
      const subId = this.#lastSentId;
      // console.log(`Subscribing to query "${query}" with ID ${subId}`);
      const unsubscribe = () => {
        this.#subscriptions.delete(subId);
        void this.request('unsubscribe', { query });
      };
      let isFirstResponse = true;
      this.#subscriptions.set(subId, {
        query,
        notified: (response: JSONRPCResponse) => {
          // Ignore an initial empty-result response.
          if (isFirstResponse) {
            isFirstResponse = false;
            if (response.error) {
              lastPK.reject(response.error);
              return;
            }
            if (!hasOwnProperties(response.result)) return;
          }
          // console.log('notified for query:', query, response);
          const thisPK = lastPK;
          lastPK = Promise.withResolvers<Cell>();
          thisPK.resolve({ head: response, tail: lastPK.promise });
        },
        unsubscribe,
      });
      return { subP, unsubscribe };
    });

    // console.log(`Awaiting subscription responses for queries:`, qs);
    await Promise.all(qs.map(({ subP }) => subP));

    // console.log('wait forever?');
    try {
      while (true) {
        // console.log('wait for next event');
        const { head, tail } = await nextCell;
        nextCell = tail;
        if (head.error) {
          // Propagate errors non-fatally.
          yield Promise.reject(Error(head.error.message));
          continue;
        }
        yield head.result;
      }
    } catch (error) {
      console.error('Subscription error:', error);
      lastPK.reject(error);
    } finally {
      for (const { unsubscribe } of qs) {
        unsubscribe();
      }
    }
  }
}
