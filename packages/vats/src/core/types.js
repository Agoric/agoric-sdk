// @ts-check

/** @typedef { import('@agoric/eventual-send').EProxy } EProxy */

/**
 * @template T
 * @typedef {'Device' & { __deviceType__: T }} Device
 */
/** @typedef {<T>(target: Device<T>) => T} DProxy (approximately) */

/**
 * SwingSet types
 *
 * @typedef { Device<ReturnType<typeof
 *   import('@agoric/swingset-vat/src/devices/mailbox-src.js').buildRootDeviceNode>> } MailboxDevice
 * @typedef { ERef<ReturnType<typeof
 *   import('@agoric/swingset-vat/src/vats/vat-tp.js').buildRootObject>> } VattpVat
 * @typedef { ERef<ReturnType<typeof
 *   import('@agoric/swingset-vat/src/kernel/vatAdmin/vatAdminWrapper.js').buildRootObject>> } VatAdminVat
 * @typedef { ERef<ReturnType<typeof
 *   import('@agoric/swingset-vat/src/vats/vat-timerWrapper.js').buildRootObject>> } TimerVat
 *
 * See deliverToController in packages/SwingSet/src/vats/comms/controller.js
 * @typedef {ERef<{
 *   addRemote: (name: string, tx: unknown, rx: unknown) => void,
 *   addEgress: (addr: string, ix: number, provider: unknown) => void,
 * }>} CommsVatRoot
 *
 * @typedef {{
 *   comms: CommsVatRoot,
 *   timer: TimerVat,
 *   vatAdmin: VatAdminVat,
 *   vattp: VattpVat,
 * }} SwingsetVats
 * @typedef {{
 *   mailbox: MailboxDevice,
 *   vatAdmin: unknown,
 * }} SwingsetDevices
 */

/**
 * @typedef {ReturnType<typeof import('../bridge.js').makeBridgeManager> | undefined} OptionalBridgeManager
 */

/**
 * @typedef {{
 *   getChainBundle: () => unknown,
 *   getChainConfigNotifier: () => Notifier<unknown>,
 * }} ClientProvider
 */

/**
 * @typedef {{ resolve: (v: T) => void }} Producer<T>
 * @template T
 */
/**
 * @typedef {(name: string) => T} VatLoader<T>
 * @template T
 */
/**
 * @typedef {{
 *   consume: Record<string, Promise<unknown>>,
 *   produce: Record<string, Producer<unknown>>,
 * }} PromiseSpace
 *
 * @typedef {{
 *   assignBundle: (ps: Record<string, (addr: string) => void>) => void
 * }} ClientManager
 */

/**
 * @callback CreateUserBundle
 * @param {string} nickname
 * @param {string} clientAddress
 * @param {string[]} powerFlags
 * @returns {unknown}
 *
 * @typedef {Object} ClientFacet
 * @property {() => unknown} getChainBundle Required for ag-solo, but deprecated in favour of getConfiguration
 * @property {() => AsyncIterator<unknown>} getConfiguration
 *
 * @typedef {Object} ClientCreator
 * @property {CreateUserBundle} createUserBundle Required for vat-provisioning, but deprecated in favor of {@link createClient}.
 * @property {(nickname: string, clientAddress: string, powerFlags: string[]) => ClientFacet} createClientFacet
 */
