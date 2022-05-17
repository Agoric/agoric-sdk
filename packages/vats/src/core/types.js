// @ts-check

/** @typedef { import('@endo/eventual-send').EProxy } EProxy */

/**
 * This type conflicts with packages/SwingSet/src/vats/plugin-manager.js
 *
 * @template T
 * @typedef {'Device' & { __deviceType__: T }} Device
 */

/** @typedef {<T>(target: Device<T>) => T} DProxy (approximately) */

/**
 * SwingSet types
 *
 * @typedef { Device<ReturnType<typeof
 *   import('@agoric/swingset-vat/src/devices/bridge/device-bridge.js').buildRootDeviceNode>> } BridgeDevice
 * @typedef { Device<ReturnType<typeof
 *   import('@agoric/swingset-vat/src/devices/command/device-command.js').buildRootDeviceNode>> } CommandDevice
 * @typedef { Device<ReturnType<typeof
 *   import('@agoric/swingset-vat/src/devices/mailbox/device-mailbox.js').buildRootDeviceNode>> } MailboxDevice
 * @typedef { import('@agoric/swingset-vat/src/vats/plugin-manager.js').PluginDevice } PluginDevice
 * @typedef { Device<ReturnType<typeof
 *   import('@agoric/swingset-vat/src/devices/timer/device-timer.js').buildRootDeviceNode>> } TimerDevice
 * @typedef { Device<
 *   import('@agoric/swingset-vat/src/devices/vat-admin/device-vat-admin.js').VatAdminRootDeviceNode> } VatAdminDevice
 *
 * @typedef { ERef<ReturnType<typeof
 *   import('@agoric/swingset-vat/src/vats/vattp/vat-vattp.js').buildRootObject>> } VattpVat
 * @typedef { ERef<ReturnType<typeof
 *   import('@agoric/swingset-vat/src/vats/vat-admin/vat-vat-admin.js').buildRootObject>> } VatAdminVat
 * @typedef { ERef<ReturnType<typeof
 *   import('@agoric/swingset-vat/src/vats/timer/vat-timer.js').buildRootObject>> } TimerVat
 *
 * See deliverToController in packages/SwingSet/src/vats/comms/controller.js
 * @typedef {ERef<{
 *   addRemote: (name: string, tx: unknown, rx: unknown) => void,
 *   addEgress: (addr: string, ix: number, provider: unknown) => void,
 *   addIngress: (remoteID: string, remoteRefID: number, label?: string) => Promise<any>,
 * }>} CommsVatRoot
 *
 * @typedef {{
 *   comms: CommsVatRoot,
 *   timer: TimerVat,
 *   vatAdmin: VatAdminVat,
 *   vattp: VattpVat,
 * }} SwingsetVats
 */

/**
 * @typedef {{
 *   vatAdmin: VatAdminDevice,
 *   mailbox: MailboxDevice,
 *   command: CommandDevice,
 *   timer: TimerDevice,
 *   plugin: PluginDevice,
 * }} SoloDevices
 *
 * @typedef {{
 *   vatAdmin: VatAdminDevice,
 *   mailbox: MailboxDevice,
 *   timer: TimerDevice,
 *   bridge?: BridgeDevice,
 * }} ChainDevices
 */

/**
 * @typedef {ReturnType<typeof import('../bridge.js').makeBridgeManager>} BridgeManager
 * @typedef {BridgeManager | undefined} OptionalBridgeManager
 */

/**
 * @typedef {{
 *   getChainBundle: () => unknown,
 *   getChainConfigNotifier: () => Notifier<unknown>,
 * }} ClientProvider
 */

/**
 * @typedef {object} Producer<T>
 * @property {(v: ERef<T>) => void} resolve
 * @property {(r: unknown) => void} reject
 * @property {() => void} reset
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
 *   assignBundle: (ps: PropertyMakers) => void
 * }} ClientManager
 *
 * @typedef {Array<(addr: string) => Record<string, unknown>>} PropertyMakers
 */

/**
 * @template T
 * @typedef {{
 *   consume: { [P in keyof T]: ERef<T[P]> },
 *   produce: { [P in keyof T]: Producer<T[P]> },
 * }} PromiseSpaceOf
 */

/**
 * @callback CreateUserBundle
 * @param {string} nickname
 * @param {string} clientAddress
 * @param {string[]} powerFlags
 * @returns {Promise<Record<string, Promise<any>>>}
 *
 * @typedef {object} ClientFacet
 * @property {() => ERef<Record<string, any>>} getChainBundle Required for ag-solo, but deprecated in favour of getConfiguration
 *   NOTE: we use `any` rather than `unknown` because each client that wants to call a method such as
 *   `E(userBundle.bank).deposit(payment)` has to cast userBundle.bank;
 *   ideally, the cast is to some useful type. But unknown can't be cast directly to some other type;
 *   it has to be cast to any first.
 * @property {() => ConsistentAsyncIterable<Configuration>} getConfiguration
 *
 * @typedef {{ clientAddress: string, clientHome: Record<string, any>}} Configuration
 *
 * @typedef {object} ClientCreator
 * @property {CreateUserBundle} createUserBundle Required for vat-provisioning, but deprecated in favor of {@link createClient}.
 * @property {(nickname: string, clientAddress: string, powerFlags: string[]) => Promise<ClientFacet>} createClientFacet
 */

/**
 * @typedef {{
 *   issuer: |
 *     'RUN' | 'BLD' | 'Attestation' | 'AUSD',
 *   installation: |
 *     'centralSupply' | 'mintHolder' | 'feeDistributor' |
 *     'contractGovernor' | 'committee' | 'noActionElectorate' | 'binaryVoteCounter' |
 *     'amm' | 'VaultFactory' | 'liquidate' | 'runStake' |
 *     'Pegasus' | 'reserve' | 'psm' | 'interchainPool',
 *   instance: |
 *     'economicCommittee' | 'feeDistributor' |
 *     'amm' | 'ammGovernor' | 'VaultFactory' | 'VaultFactoryGovernor' |
 *     'runStake' | 'runStakeGovernor' |
 *     'psm' | 'psmGovernor' | 'interchainPool' |
 *     'Treasury' | 'reserve' | 'reserveGovernor' | 'Pegasus',
 *   oracleBrand:
 *     'USD',
 *   uiConfig: |
 *     'VaultFactory' |
 *     'Treasury' // compat.
 * }} WellKnownName
 *
 * @typedef {{
 *   issuer: {
 *     produce: Record<WellKnownName['issuer'], Producer<Issuer>>,
 *     consume: Record<WellKnownName['issuer'], Promise<Issuer>>,
 *   },
 *   brand: {
 *     produce: Record<WellKnownName['issuer'], Producer<Brand>>,
 *     consume: Record<WellKnownName['issuer'], Promise<Brand>>,
 *   },
 *   oracleBrand: {
 *     produce: Record<WellKnownName['oracleBrand'], Producer<Brand>>,
 *     consume: Record<WellKnownName['oracleBrand'], Promise<Brand>>,
 *   },
 *   installation:{
 *     produce: Record<WellKnownName['installation'], Producer<Installation>>,
 *     consume: Record<WellKnownName['installation'], Promise<Installation>>,
 *   },
 *   instance:{
 *     produce: Record<WellKnownName['instance'], Producer<Instance>>,
 *     consume: Record<WellKnownName['instance'], Promise<Instance>>,
 *   },
 *   uiConfig: {
 *     produce: Record<WellKnownName['uiConfig'], Producer<Record<string, any>>>,
 *     consume: Record<WellKnownName['uiConfig'], Promise<Record<string, any>>>,
 *   },
 * }} WellKnownSpaces
 */

/**
 * @typedef {PromiseSpaceOf<{
 *   agoricNames: NameHub,
 *   agoricNamesAdmin: NameAdmin,
 *   bankManager: Awaited<BankManager>,
 *   bldIssuerKit: RemoteIssuerKit,
 *   board: Board,
 *   bridgeManager: OptionalBridgeManager,
 *   chainStorage: unknown,
 *   chainTimerService: TimerService,
 *   client: ClientManager,
 *   clientCreator: ClientCreator,
 *   coreEvalBridgeHandler: unknown,
 *   feeMintAccess: FeeMintAccess,
 *   initialSupply: Payment,
 *   mints: MintsVat,
 *   namesByAddress: NameHub,
 *   namesByAddressAdmin: NameAdmin,
 *   pegasusConnections: NameHub,
 *   pegasusConnectionsAdmin: NameAdmin,
 *   priceAuthorityVat: Awaited<PriceAuthorityVat>,
 *   priceAuthority: PriceAuthority,
 *   priceAuthorityAdmin: PriceAuthorityRegistryAdmin,
 *   provisioning: Awaited<ProvisioningVat>,
 *   zoe: ZoeService,
 * }>} ChainBootstrapSpace
 *
 * IDEA/TODO: make types of demo stuff invisible in production behaviors
 * @typedef {{
 *   argv: {
 *     ROLE: string,
 *     hardcodedClientAddresses: string[],
 *     FIXME_GCI: string,
 *     PROVISIONER_INDEX: number,
 *   },
 *   bootstrapManifest?: Record<string, Record<string, unknown>>,
 *   governanceActions?: boolean,
 * }} BootstrapVatParams
 * @typedef { BootstrapSpace & {
 *   devices: SoloDevices | ChainDevices,
 *   vats: SwingsetVats,
 *   vatPowers: { [prop: string]: any, D: DProxy },
 *   vatParameters: BootstrapVatParams,
 *   runBehaviors: (manifest: unknown) => Promise<unknown>,
 *   modules: Record<string, Record<string, any>>,
 * }} BootstrapPowers
 * @typedef { WellKnownSpaces & ChainBootstrapSpace & PromiseSpaceOf<{
 *     vatAdminSvc: VatAdminSvc,
 *   }> & { produce: {
 *     loadVat: Producer<VatLoader<unknown>>,
 *   }}
 * } BootstrapSpace
 * @typedef {{ mint: ERef<Mint>, issuer: ERef<Issuer>, brand: Brand }} RemoteIssuerKit
 * @typedef {ReturnType<Awaited<BankVat>['makeBankManager']>} BankManager
 * @typedef {ERef<ReturnType<import('../vat-bank.js').buildRootObject>>} BankVat
 * @typedef {ERef<ReturnType<import('../vat-provisioning.js').buildRootObject>>} ProvisioningVat
 * @typedef {ERef<ReturnType<import('../vat-mints.js').buildRootObject>>} MintsVat
 * @typedef {ERef<ReturnType<import('../vat-priceAuthority.js').buildRootObject>>} PriceAuthorityVat
 * @typedef {ERef<ReturnType<import('../vat-network.js').buildRootObject>>} NetworkVat
 * @typedef {ERef<ReturnType<import('../vat-ibc.js').buildRootObject>>} IBCVat
 * @typedef { import('@agoric/zoe/tools/priceAuthorityRegistry').PriceAuthorityRegistryAdmin } PriceAuthorityRegistryAdmin
 */

/**
 * @typedef {{
 *   spawner: SpawnerVat,
 *   http: HttpVat,
 *   network: NetworkVat,
 *   uploads: UploadsVat,
 *   bootstrap: unknown
 * }} SoloVats
 * @typedef {ERef<ReturnType<import('@agoric/solo/src/vat-spawner.js').buildRootObject>>} SpawnerVat
 * @typedef {ERef<ReturnType<import('@agoric/solo/src/vat-http.js').buildRootObject>>} HttpVat
 * @typedef {ERef<ReturnType<import('@agoric/solo/src/vat-uploads.js').buildRootObject>>} UploadsVat
 */

/** @template T @typedef  {{vatPowers: { D: DProxy }, devices: T}} BootDevices<T>  */
