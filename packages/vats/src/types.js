// @ts-check

export {};

/**
 * @template T
 * @typedef {import('@endo/far').EOnly<T>} EOnly
 */

/**
 * @typedef {ReturnType<
 *   ReturnType<typeof import('./lib-board.js').prepareBoardKit>
 * >['board']} Board
 */

/**
 * @typedef {object} NameHub read-only access to a node in a name hierarchy
 *
 *   NOTE: We need to return arrays, not iterables, because even if marshal could
 *   allow passing a remote iterable, there would be an inordinate number of
 *   round trips for the contents of even the simplest nameHub.
 * @property {(key: string) => boolean} has
 * @property {(...path: string[]) => Promise<any>} lookup Look up a path of keys
 *   starting from the current NameHub. Wait on any reserved promises.
 * @property {(includeReserved?: boolean) => [string, unknown][]} entries get
 *   all the entries available in the current NameHub
 * @property {() => string[]} keys get all names available in the current
 *   NameHub
 * @property {() => unknown[]} values get all values available in the current
 *   NameHub
 */

/**
 * @typedef {object} NameAdmin write access to a node in a name hierarchy
 * @property {(key: string, reserved?: string[]) => Promise<NameHubKit>} provideChild
 * @property {(key: string) => Promise<void>} reserve Mark a key as reserved;
 *   will return a promise that is fulfilled when the key is updated (or
 *   rejected when deleted). If the key was already set it does nothing.
 * @property {<T>(key: string, newValue: T, newAdmin?: NameAdmin) => T} default
 *   Update if not already updated. Return existing value, or newValue if not
 *   existing.
 * @property {(key: string, newValue: unknown, newAdmin?: NameAdmin) => void} set
 *   Update only if already initialized. Reject if not.
 * @property {(key: string, newValue: unknown, newAdmin?: NameAdmin) => void} update
 *   Fulfill an outstanding reserved promise (if any) to the newValue and set the
 *   key to the newValue. If newAdmin is provided, set that to return via
 *   lookupAdmin.
 * @property {(...path: string[]) => Promise<NameAdmin>} lookupAdmin Look up the
 *   `newAdmin` from the path of keys starting from the current NameAdmin. Wait
 *   on any reserved promises.
 * @property {(key: string) => void} delete Delete a value and reject an
 *   outstanding reserved promise (if any).
 * @property {() => NameHub} readonly get the NameHub corresponding to the
 *   current NameAdmin
 * @property {(fn: undefined | NameHubUpdateHandler) => void} onUpdate
 *
 * @typedef {{ write: (entries: [string, unknown][]) => void }} NameHubUpdateHandler
 */

/**
 * @typedef {object} NameHubKit a node in a name hierarchy
 * @property {NameHub} nameHub read access
 * @property {NameAdmin} nameAdmin write access
 */

/** @typedef {NameAdmin & { getMyAddress(): string }} MyAddressNameAdmin */
/**
 * @typedef {NameAdmin & {
 *   provideChild(
 *     addr: string,
 *     reserved?: string[],
 *   ): Promise<{
 *     nameHub: NameHub;
 *     nameAdmin: MyAddressNameAdmin;
 *   }>;
 *   lookupAdmin(addr: string): Promise<MyAddressNameAdmin>;
 * }} NamesByAddressAdmin
 */

/**
 * @typedef {object} BridgeHandler An object that can receive messages from the
 *   bridge device
 * @property {(obj: any) => Promise<void>} fromBridge Handle an inbound message
 */

/**
 * @typedef {object} ScopedBridgeManager An object which handles messages for a
 *   specific bridge
 * @property {(obj: any) => Promise<any>} toBridge
 * @property {(obj: any) => Promise<void>} fromBridge
 * @property {(handler: ERef<BridgeHandler>) => void} initHandler
 * @property {(handler: ERef<BridgeHandler>) => void} setHandler
 */

/**
 * @typedef {object} BridgeManager The object to manage this bridge
 * @property {(
 *   bridgeId: string,
 *   handler?: ERef<BridgeHandler | undefined>,
 * ) => ScopedBridgeManager} register
 */
