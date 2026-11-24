// @ts-check
const RUNNING = 0;
const STOPPING = 1;
const CLOSED = 2;
const FAILING = 3;
const FAILED = 4;

// Failure lives outside the transfer header, which a dead reader cannot advance.
export const makeRpcLifecycle = (buffer = new SharedArrayBuffer(4096)) => {
  const state = new Int32Array(buffer, 0, 1);
  const diagnostic = new Uint8Array(buffer, 4);
  return harden({
    buffer,
    fail(reason) {
      for (;;) {
        const previous = Atomics.load(state, 0);
        if (previous >= CLOSED) return;
        if (Atomics.compareExchange(state, 0, previous, FAILING) === previous)
          break;
      }
      const bytes = new TextEncoder().encode(String(reason));
      diagnostic.set(bytes.subarray(0, diagnostic.length - 1));
      Atomics.store(state, 0, FAILED);
      Atomics.notify(state, 0);
    },
    check() {
      const current = Atomics.load(state, 0);
      // If the failure publisher disappears mid-publication, still release waits.
      if (current === FAILING) throw Error('RPC transport failed');
      if (current === FAILED) {
        const end = diagnostic.indexOf(0);
        throw Error(
          new TextDecoder().decode(
            diagnostic.subarray(0, end < 0 ? diagnostic.length : end),
          ),
        );
      }
      if (current === CLOSED) throw Error('RPC transport closed');
    },
    beginShutdown: () =>
      Atomics.compareExchange(state, 0, RUNNING, STOPPING) === RUNNING,
    isStopping: () => Atomics.load(state, 0) === STOPPING,
    isClosed: () => Atomics.load(state, 0) === CLOSED,
    finish: () =>
      Atomics.compareExchange(state, 0, STOPPING, CLOSED) === STOPPING,
  });
};
/** @typedef {ReturnType<typeof makeRpcLifecycle>} RpcLifecycle */
