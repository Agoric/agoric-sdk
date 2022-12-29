// @ts-check

export {};

/**
 * @template T
 * @typedef {import('@endo/far').EOnly<T>} EOnly
 */

/**
 * @typedef {ReturnType<typeof import('./lib-board.js').makeBoard>} Board
 */

/**
 * @typedef {object} NameHub read-only access to a node in a name hierarchy
 *
 * NOTE: We need to return arrays, not iterables, because even if marshal could
 * allow passing a remote iterable, there would be an inordinate number of round
 * trips for the contents of even the simplest nameHub.
 *
 * @property {(...path: Array<string>) => Promise<any>} lookup Look up a
 * path of keys starting from the current NameHub.  Wait on any reserved
 * promises.
 * @property {() => [string, unknown][]} entries get all the entries
 * available in the current NameHub
 * @property {() => string[]} keys get all names available in the
 * current NameHub
 * @property {() => unknown[]} values get all values available in the
 * current NameHub
 */

/**
 * @typedef {object} NameAdmin write access to a node in a name hierarchy
 *
 * @property {(key: string) => void} reserve Mark a key as reserved; will
 * return a promise that is fulfilled when the key is updated (or rejected when
 * deleted).
 * @property {<T>( key: string, newValue: T, newAdmin?: unknown) =>
 *   T } default Update if not already updated.  Return
 *   existing value, or newValue if not existing.
 * @property {(
 *   key: string, newValue: unknown, newAdmin?: unknown) => void
 * } set Update only if already initialized. Reject if not.
 * @property {(
 *   key: string, newValue: unknown, newAdmin?: unknown) => void
 * } update Fulfill an outstanding reserved promise (if any) to the newValue and
 * set the key to the newValue.  If newAdmin is provided, set that to return via
 * lookupAdmin.
 * @property {(...path: Array<string>) => Promise<any>} lookupAdmin Look up the
 * `newAdmin` from the path of keys starting from the current NameAdmin.  Wait
 * on any reserved promises.
 * @property {(key: string) => void} delete Delete a value and reject an
 * outstanding reserved promise (if any).
 * @property {() => NameHub} readonly get the NameHub corresponding to the
 * current NameAdmin
 * @property {(fn: undefined | ((entries: [string, unknown][]) => void)) => void} onUpdate
 */

/**
 * @typedef {object} NameHubKit a node in a name hierarchy
 * @property {NameHub} nameHub read access
 * @property {NameAdmin} nameAdmin write access
 */

/**
 * @typedef {NameAdmin & { getMyAddress(): string }} MyAddressNameAdmin
 */

/**
 * @typedef {object} BridgeHandler An object that can receive messages from the bridge device
 * @property {(obj: any) => Promise<void>} fromBridge Handle an inbound message
 */

/**
 * @typedef {object} BridgeManager The object to manage this bridge
 * @property {(dstID: string, obj: any) => Promise<any>} toBridge
 * @property {(dstID: string, obj: any) => void} fromBridge
 * @property {(srcID: string, handler: ERef<BridgeHandler>) => void} register
 * @property {(srcID: string, handler: ERef<BridgeHandler>) => void} unregister
 */
