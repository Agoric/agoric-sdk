/**
 * Signals that a watcher's underlying transport (WebSocket) failed.
 * Distinct from a transaction-level failure: the watch could not continue,
 * so the caller may safely restart it (see `watchWithRetry`).
 *
 * Defined in its own leaf module so both the RPC layer (`makeEvmRpc`, which
 * throws it on a bounded-call timeout) and the watchers can import it without
 * an import cycle.
 */
export const WatcherTransportError = class WatcherTransportError extends Error {};
WatcherTransportError.prototype.name = WatcherTransportError.name;
