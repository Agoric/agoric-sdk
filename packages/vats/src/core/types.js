// @ts-check

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
 * @typedef { Device<ReturnType<typeof
 *   import('@agoric/swingset-vat/src/devices/plugin/device-plugin.js').buildRootDeviceNode>> } PluginDevice
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
 *
 * @typedef {{
 *   vatParameters: { chainStorageEntries?: Array<[k: string, v: string]>,
 * }}} ChainStorageVatParams
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
 * @typedef {{
 *   getChainBundle: () => unknown,
 *   getChainConfigNotifier: () => Notifier<unknown>,
 * }} ClientProvider
 */

/**
 * @template T
 * @typedef {object} Producer<T>
 * @property {(v: ERef<T>) => void} resolve
 * @property {(r: unknown) => void} reject
 * @property {(reason?: unknown) => void} reset
 */
/**
 * @typedef {{ bundleName?: string, bundleID?: string }} VatSourceRef
 */
/**
 * @template T
 * @typedef {(name: string, sourceRef?: VatSourceRef) => T} VatLoader<T>
 */

/**
 * @typedef {{
 *   assignBundle: (ps: PropertyMaker[]) => void
 * }} ClientManager tool to put properties onto the `home` object of the client
 *
 * @typedef {(addr: string, flags: string[]) => Record<string, unknown>} PropertyMaker callback to assign a property onto the `home` object of the client
 */

/**
 * @template B Bidirectional
 * @template [C={}] Consume only
 * @template [P={}] Produce only
 * @typedef {{
 *   consume: { [K in keyof (B & C)]: Promise<(B & C)[K]> },
 *   produce: { [K in keyof (B & P)]: Producer<(B & P)[K]> },
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
 * @property {() => AsyncIterable<Configuration, Configuration>} getConfiguration
 *
 * @typedef {{ clientAddress: string, clientHome: Record<string, any>}} Configuration
 *
 * @typedef {object} ClientCreator
 * @property {CreateUserBundle} createUserBundle Required for vat-provisioning, but deprecated in favor of {@link createClient}.
 * @property {(nickname: string, clientAddress: string, powerFlags: string[]) => Promise<ClientFacet>} createClientFacet
 */

/**
 * @typedef {import('@agoric/inter-protocol/src/tokens.js').TokenKeyword} TokenKeyword
 *
 * @typedef {{
 *   issuer: |
 *     TokenKeyword | 'Invitation' | 'AUSD',
 *   installation: |
 *     'centralSupply' | 'mintHolder' |
 *     'walletFactory' | 'provisionPool' | 'auctioneer' |
 *     'feeDistributor' |
 *     'contractGovernor' | 'committee' | 'noActionElectorate' | 'binaryVoteCounter' |
 *     'VaultFactory' | 'liquidate' |
 *     'Pegasus' | 'reserve' | 'psm' | 'econCommitteeCharter' | 'priceAggregator',
 *   instance: |
 *     'economicCommittee' | 'feeDistributor' | 'auctioneer' |
 *     'VaultFactory' | 'VaultFactoryGovernor' |
 *     'econCommitteeCharter' |
 *     'walletFactory' | 'provisionPool' |
 *     'reserve' | 'reserveGovernor' | 'Pegasus',
 *   oracleBrand:
 *     'USD',
 *   uiConfig: |
 *     'VaultFactory'
 * }} WellKnownName
 *
 * @typedef {{
 *   issuer: {
 *     produce: Record<WellKnownName['issuer'], Producer<Issuer>>,
 *     consume: Record<WellKnownName['issuer'], Promise<Issuer>> & { BLD: Promise<Issuer<'nat'>>, IST: Promise<Issuer<'nat'>> },
 *   },
 *   brand: {
 *     produce: Record<WellKnownName['issuer'], Producer<Brand>> &
 *              { timer: Producer<import('@agoric/time').TimerBrand> },
 *     consume: Record<WellKnownName['issuer'], Promise<Brand>> &
 *              { BLD: Promise<Brand<'nat'>>, IST: Promise<Brand<'nat'>>,
 *                timer: Producer<import('@agoric/time').TimerBrand> },
 *   },
 *   oracleBrand: {
 *     produce: Record<WellKnownName['oracleBrand'], Producer<Brand>>,
 *     consume: Record<WellKnownName['oracleBrand'], Promise<Brand>>,
 *   },
 *   installation:{
 *     produce: Record<WellKnownName['installation'], Producer<Installation>>,
 *     consume: Record<WellKnownName['installation'], Promise<Installation<unknown>>> & {
 *       auctioneer: Promise<Installation<import('@agoric/inter-protocol/src/auction/auctioneer.js').start>>,
 *       centralSupply: Promise<Installation<import('@agoric/vats/src/centralSupply.js').start>>,
 *       committee: Promise<Installation<import('@agoric/governance/src/committee.js')['prepare']>>,
 *       contractGovernor: Promise<Installation<import('@agoric/governance/src/contractGovernor.js')['prepare']>>,
 *       econCommitteeCharter: Promise<Installation<import('@agoric/inter-protocol/src/econCommitteeCharter.js')['prepare']>>,
 *       feeDistributor: Promise<Installation<import('@agoric/inter-protocol/src/feeDistributor.js').start>>,
 *       mintHolder: Promise<Installation<import('@agoric/vats/src/mintHolder.js').prepare>>,
 *       psm: Promise<Installation<import('@agoric/inter-protocol/src/psm/psm.js')['prepare']>>,
 *       provisionPool: Promise<Installation<import('@agoric/vats/src/provisionPool.js')['prepare']>>,
 *       reserve: Promise<Installation<import('@agoric/inter-protocol/src/reserve/assetReserve.js')['prepare']>>,
 *       VaultFactory: Promise<Installation<import('@agoric/inter-protocol/src/vaultFactory/vaultFactory.js')['prepare']>>,
 *       walletFactory: Promise<Installation<import('@agoric/smart-wallet/src/walletFactory.js').prepare>>,
 *     },
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
 * @template {GovernableStartFn} SF
 * @typedef {{
 *   installation: ERef<Installation<SF>>,
 *   issuerKeywordRecord?: IssuerKeywordRecord,
 *   governedParams: Record<string, unknown>,
 *   terms: Omit<import('@agoric/zoe/src/zoeService/utils').StartParams<SF>['terms'], 'brands' | 'issuers' | 'governedParams' | 'electionManager'>,
 *   privateArgs: Omit<import('@agoric/zoe/src/zoeService/utils').StartParams<SF>['privateArgs'], 'initialPoserInvitation'>,
 *   label: string,
 * }} StartGovernedUpgradableOpts
 *
 */
/**
 * @typedef {<SF extends GovernableStartFn>(opts: StartGovernedUpgradableOpts<SF>) => Promise<GovernanceFacetKit<SF>>
 * } startGovernedUpgradable
 */

/**
 * @template {import('@agoric/zoe/src/zoeService/utils').ContractStartFunction} SF
 * @typedef {{
 *   installation: ERef<Installation<SF>>,
 *   issuerKeywordRecord?: IssuerKeywordRecord,
 *   terms?: Omit<import('@agoric/zoe/src/zoeService/utils').StartParams<SF>['terms'], 'brands' | 'issuers'>,
 *   privateArgs?: import('@agoric/zoe/src/zoeService/utils').StartParams<SF>['privateArgs'],
 *   label: string,
 * }} StartUpgradableOpts
 */
/**
 * @typedef {<SF extends import('@agoric/zoe/src/zoeService/utils').ContractStartFunction>(opts: StartUpgradableOpts<SF>)
 *   => Promise<
 *     import('@agoric/zoe/src/zoeService/utils').StartedInstanceKit<SF> &
 *     { label: string }
 *   >
 * } StartUpgradable
 */

/** @template T @typedef {import('@agoric/zoe/src/zoeService/utils').StartedInstanceKit<T> } StartedInstanceKit */

/** @typedef {{label: string} & StartedInstanceKit<import('@agoric/zoe/src/zoeService/utils').ContractStartFunction>} StartedInstanceKitWithLabel */

/**
 * @typedef {{
 *   agoricNames: NameHub,
 *   agoricNamesAdmin: import('@agoric/vats').NameAdmin,
 *   bankManager: BankManager,
 *   bldIssuerKit: RemoteIssuerKit,
 *   board: import('@agoric/vats').Board,
 *   bridgeManager: import('../types.js').BridgeManager | undefined,
 *   chainStorage: StorageNode | null,
 *   chainTimerService: import('@agoric/time/src/types').TimerService,
 *   client: ClientManager,
 *   clientCreator: ClientCreator,
 *   coreEvalBridgeHandler: import('../types.js').BridgeHandler,
 *   diagnostics: { savePrivateArgs: (instance: Instance, privateArgs: unknown) => void },
 *   feeMintAccess: FeeMintAccess,
 *   highPrioritySendersManager: import('@agoric/internal/src/priority-senders.js').PrioritySendersManager?,
 *   initialSupply: Payment<'nat'>,
 *   instancePrivateArgs: Map<Instance, unknown>,
 *   namesByAddress: NameHub,
 *   namesByAddressAdmin: import('../types').NamesByAddressAdmin,
 *   pegasusConnections: import('@agoric/vats').NameHubKit,
 *   pegasusConnectionsAdmin: import('@agoric/vats').NameAdmin,
 *   priceAuthorityVat: Awaited<PriceAuthorityVat>,
 *   priceAuthority: PriceAuthority,
 *   priceAuthorityAdmin: PriceAuthorityRegistryAdmin,
 *   provisioning: Awaited<ProvisioningVat> | undefined,
 *   provisionBridgeManager: import('../types.js').ScopedBridgeManager | undefined,
 *   provisionWalletBridgeManager: import('../types.js').ScopedBridgeManager | undefined,
 *   storageBridgeManager: import('../types.js').ScopedBridgeManager?,
 *   contractKits: MapStore<Instance, StartedInstanceKitWithLabel>,
 *   startUpgradable: StartUpgradable,
 *   governedContractKits: MapStore<Instance, GovernanceFacetKit<any> & {label: string}>,
 *   startGovernedUpgradable: startGovernedUpgradable,
 *   testFirstAnchorKit: import('../vat-bank.js').AssetIssuerKit<'nat'>,
 *   walletBridgeManager: import('../types.js').ScopedBridgeManager | undefined,
 *   walletFactoryStartResult: import('./startWalletFactory').WalletFactoryStartResult,
 *   provisionPoolStartResult: unknown,
 *   vatStore: import('./utils.js').VatStore,
 *   zoe: ZoeService,
 * }} ChainBootstrapSpaceT
 * @typedef {PromiseSpaceOf<ChainBootstrapSpaceT>} ChainBootstrapSpace
 *
 * @typedef {import('@agoric/vats').NameHub} NameHub
 * IDEA/TODO: make types of demo stuff invisible in production behaviors
 * @typedef {{
 *   argv: {
 *     hardcodedClientAddresses?: string[],
 *     FIXME_GCI: string,
 *     PROVISIONER_INDEX?: number,
 *   },
 * }} BootstrapVatParams
 * @typedef { BootstrapSpace & {
 *   zone: import('@agoric/zone').Zone,
 *   devices: SoloDevices | ChainDevices,
 *   vats: SwingsetVats,
 *   vatPowers: { [prop: string]: any, D: DProxy },
 *   vatParameters: BootstrapVatParams,
 *   runBehaviors: (manifest: unknown) => Promise<unknown>,
 *   modules: Record<string, Record<string, any>>,
 * }} BootstrapPowers
 * @typedef { WellKnownSpaces & PromiseSpaceOf<ChainBootstrapSpaceT & {
 *     vatAdminSvc: VatAdminSvc,
 *   }, {}, {
 *     loadVat: VatLoader<unknown>,
 *     loadCriticalVat: VatLoader<unknown>,
 *   }>
 * } BootstrapSpace
 * @typedef {{ mint: ERef<Mint>, issuer: ERef<Issuer>, brand: Brand }} RemoteIssuerKit
 * @typedef {Awaited<ReturnType<Awaited<BankVat>['makeBankManager']>>} BankManager
 * @typedef {ERef<ReturnType<import('../vat-agoricNames').buildRootObject>>} AgoricNamesVat
 * @typedef {ERef<ReturnType<import('../vat-bank.js').buildRootObject>>} BankVat
 * @typedef {ERef<ReturnType<import('../vat-board.js').buildRootObject>>} BoardVat
 * @typedef {ERef<ReturnType<import('../vat-bridge.js').buildRootObject>>} ChainStorageVat
 * @typedef {ERef<ReturnType<import('../vat-provisioning.js').buildRootObject>>} ProvisioningVat
 * @typedef {ERef<ReturnType<import('../vat-mints.js').buildRootObject>>} MintsVat
 * @typedef {ERef<ReturnType<import('../vat-priceAuthority.js').buildRootObject>>} PriceAuthorityVat
 * @typedef {ERef<ReturnType<import('../vat-network.js').buildRootObject>>} NetworkVat
 * @typedef {ERef<ReturnType<import('../vat-ibc.js').buildRootObject>>} IBCVat
 * @typedef { import('@agoric/zoe/tools/priceAuthorityRegistry').PriceAuthorityRegistryAdmin } PriceAuthorityRegistryAdmin
 *
 * @typedef {{ namedVat: PromiseSpaceOf<{
 *   agoricNames: Awaited<AgoricNamesVat>,
 *   board: Awaited<BoardVat>,
 * }> }} NamedVatPowers
 */

/**
 * @typedef {PromiseSpaceOf<{
 *   mints: MintsVat
 * }>} DemoFaucetPowers
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
