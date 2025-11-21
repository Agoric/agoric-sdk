import type {
  Device,
  DProxy,
  VatAdminSvc,
} from '@agoric/swingset-vat/src/types-external.js';

export type { Device, DProxy };

export type BootDevices<T> = { vatPowers: { D: DProxy }; devices: T };

export type { BridgeDevice } from '@agoric/swingset-vat/src/devices/bridge/device-bridge.js';

export type CommandDevice = Device<
  ReturnType<
    typeof import('@agoric/swingset-vat/src/devices/command/device-command.js').buildRootDeviceNode
  >
>;

export type MailboxDevice = Device<
  ReturnType<
    typeof import('@agoric/swingset-vat/src/devices/mailbox/device-mailbox.js').buildRootDeviceNode
  >
>;

export type PluginDevice = Device<
  ReturnType<
    typeof import('@agoric/swingset-vat/src/devices/plugin/device-plugin.js').buildRootDeviceNode
  >
>;

export type TimerDevice =
  import('@agoric/swingset-vat/src/devices/timer/device-timer.js').TimerDevice;

export type VatAdminDevice = Device<
  import('@agoric/swingset-vat/src/devices/vat-admin/device-vat-admin.js').VatAdminRootDeviceNode
>;

export type VattpVat = ERef<
  ReturnType<
    typeof import('@agoric/swingset-vat/src/vats/vattp/vat-vattp.js').buildRootObject
  >
>;

export type VatAdminVat = ERef<
  ReturnType<
    typeof import('@agoric/swingset-vat/src/vats/vat-admin/vat-vat-admin.js').buildRootObject
  >
>;

/** @see deliverToController in packages/SwingSet/src/vats/comms/controller.js */
export type TimerVat = ERef<
  ReturnType<
    typeof import('@agoric/swingset-vat/src/vats/timer/vat-timer.js').buildRootObject
  >
>;

export type CommsVatRoot = ERef<{
  addRemote: (name: string, tx: unknown, rx: unknown) => void;
  addEgress: (addr: string, ix: number, provider: unknown) => void;
  addIngress: (
    remoteID: string,
    remoteRefID: number,
    label?: string,
  ) => Promise<any>;
}>;

export type SwingsetVats = {
  comms: CommsVatRoot;
  timer: TimerVat;
  vatAdmin: VatAdminVat;
  vattp: VattpVat;
};

export type ChainStorageVatParams = {
  vatParameters: { chainStorageEntries?: [k: string, v: string][] };
};

export type SoloDevices = {
  vatAdmin: VatAdminDevice;
  mailbox: MailboxDevice;
  command: CommandDevice;
  timer: import('@agoric/swingset-vat/src/devices/timer/device-timer.js').TimerDevice;
  plugin: PluginDevice;
};

export type ChainDevices = {
  vatAdmin: VatAdminDevice;
  mailbox: MailboxDevice;
  timer: import('@agoric/swingset-vat/src/devices/timer/device-timer.js').TimerDevice;
  bridge?: import('@agoric/swingset-vat/src/devices/bridge/device-bridge.js').BridgeDevice;
};

export type ClientProvider = {
  getChainBundle: () => unknown;
  getChainConfigNotifier: () => Notifier<unknown>;
};

export type Producer<T> = {
  resolve: (v: ERef<T>) => void;
  reject: (r: unknown) => void;
  reset: (reason?: unknown) => void;
};

export type VatSourceRef = { bundleName?: string; bundleID?: string };
export type VatLoader<Names extends keyof WellKnownVats = keyof WellKnownVats> =
  <N extends Names>(
    name: N,
    sourceRef?: VatSourceRef,
  ) => Promise<Awaited<WellKnownVats[N]>>;

/** callback to assign a property onto the `home` object of the client */
export type PropertyMaker = (
  addr: string,
  flags: string[],
) => Record<string, unknown>;

/** tool to put properties onto the `home` object of the client */
export type ClientManager = {
  assignBundle: (ps: PropertyMaker[]) => void;
};
/**
 * @template B - Bidirectional
 * @template C - Consume only
 * @template P - Produce only
 */
export type PromiseSpaceOf<B, C = object, P = object> = {
  consume: { [K in keyof (B & C)]: Promise<(B & C)[K]> };
  produce: { [K in keyof (B & P)]: Producer<(B & P)[K]> };
};

export type CreateUserBundle = (
  nickname: string,
  clientAddress: string,
  powerFlags: string[],
) => Promise<Record<string, Promise<any>>>;

export type ClientFacet = {
  /**
   * Required for ag-solo, but deprecated in favour of getConfiguration NOTE: we
   * use `any` rather than `unknown` because each client that wants to call a
   * method such as `E(userBundle.bank).deposit(payment)` has to cast
   * userBundle.bank; ideally, the cast is to some useful type. But unknown
   * can't be cast directly to some other type; it has to be cast to any first.
   */
  getChainBundle(): ERef<Record<string, any>>;
  getConfiguration(): AsyncIterable<{
    clientAddress: string;
    clientHome: Record<string, any>;
  }>;
};
export type ClientCreator = {
  createClientFacet(
    nickname: string,
    clientAddress: string,
    powerFlags: string[],
  ): Promise<ClientFacet>;
  createUserBundle: CreateUserBundle;
};

export type WellKnownName = {
  issuer:
    | import('@agoric/internal/src/tokens.js').TokenKeyword
    | 'Invitation'
    | 'AUSD';
  installation:
    | 'centralSupply'
    | 'mintHolder'
    | 'walletFactory'
    | 'provisionPool'
    | 'feeDistributor'
    | 'contractGovernor'
    | 'committee'
    | 'noActionElectorate'
    | 'binaryVoteCounter'
    | 'VaultFactory'
    | 'liquidate'
    | 'Pegasus'
    | 'reserve'
    | 'psm'
    | 'scaledPriceAuthority'
    | 'stakeAtom' // test contract
    | 'stakeBld' // test contract
    | 'econCommitteeCharter'
    | 'priceAggregator';
  instance:
    | 'economicCommittee'
    | 'feeDistributor'
    | 'VaultFactory'
    | 'VaultFactoryGovernor'
    | 'econCommitteeCharter'
    | 'walletFactory'
    | 'provisionPool'
    | 'reserve'
    | 'reserveGovernor'
    | 'stakeAtom' // test contract
    | 'stakeBld' // test contract
    | 'Pegasus';
  oracleBrand: 'USD';
  uiConfig: 'VaultFactory';
};

export type ContractInstallationPromises<
  StartFns extends Record<
    WellKnownName['installation'],
    import('@agoric/zoe').ContractStartFn
  >,
> = {
  [Property in keyof StartFns]: Promise<Installation<StartFns[Property]>>;
};

export type ContractInstancePromises<
  StartFns extends Record<
    WellKnownName['instance'],
    import('@agoric/zoe').ContractStartFn
  >,
> = {
  [Property in keyof StartFns]: Promise<
    import('@agoric/zoe/src/zoeService/utils.js').Instance<StartFns[Property]>
  >;
};

export type WellKnownContracts = {
  centralSupply: typeof import('@agoric/vats/src/centralSupply.js').start;
  committee: typeof import('@agoric/governance/src/committee.js').start;
  contractGovernor: typeof import('@agoric/governance/src/contractGovernor.js').start;
  econCommitteeCharter: typeof import('@agoric/inter-protocol/src/econCommitteeCharter.js').start;
  feeDistributor: typeof import('@agoric/inter-protocol/src/feeDistributor.js').start;
  mintHolder: typeof import('@agoric/vats/src/mintHolder.js').start;
  psm: typeof import('@agoric/inter-protocol/src/psm/psm.js').start;
  provisionPool: typeof import('@agoric/inter-protocol/src/provisionPool.js').start;
  priceAggregator: typeof import('@agoric/inter-protocol/src/price/fluxAggregatorContract.js').start;
  reserve: typeof import('@agoric/inter-protocol/src/reserve/assetReserve.js').start;
  reserveGovernor: typeof import('@agoric/governance/src/contractGovernor.js').start;
  VaultFactory: typeof import('@agoric/inter-protocol/src/vaultFactory/vaultFactory.js').start;
  // no typeof because walletFactory is exporting `start` as a type
  walletFactory: import('@agoric/smart-wallet/src/walletFactory.js').start;
};

export type WellKnownSpaces = {
  issuer: {
    produce: Record<WellKnownName['issuer'], Producer<Issuer>>;
    consume: Record<WellKnownName['issuer'], Promise<Issuer>> & {
      BLD: Promise<Issuer<'nat'>>;
      IST: Promise<Issuer<'nat'>>;
    };
  };
  brand: {
    produce: Record<WellKnownName['issuer'], Producer<Brand>> & {
      timer: Producer<import('@agoric/time').TimerBrand>;
    };
    consume: Record<WellKnownName['issuer'], Promise<Brand>> & {
      BLD: Promise<Brand<'nat'>>;
      IST: Promise<Brand<'nat'>>;
      timer: Producer<import('@agoric/time').TimerBrand>;
    };
  };
  oracleBrand: {
    produce: Record<WellKnownName['oracleBrand'], Producer<Brand>>;
    consume: Record<WellKnownName['oracleBrand'], Promise<Brand>>;
  };
  installation: {
    produce: Record<WellKnownName['installation'], Producer<Installation>>;
    consume: Record<
      WellKnownName['installation'],
      Promise<Installation<unknown>>
    > &
      // @ts-expect-error XXX
      ContractInstallationPromises<WellKnownContracts>;
  };
  instance: {
    produce: Record<WellKnownName['instance'], Producer<Instance>>;
    consume: Record<WellKnownName['instance'], Promise<Instance>> &
      // @ts-expect-error XXX
      ContractInstancePromises<WellKnownContracts>;
  };
  uiConfig: {
    produce: Record<WellKnownName['uiConfig'], Producer<Record<string, any>>>;
    consume: Record<WellKnownName['uiConfig'], Promise<Record<string, any>>>;
  };
};

export type StartGovernedUpgradableOpts<SF extends GovernableStartFn> = {
  installation: ERef<Installation<SF>>;
  issuerKeywordRecord?: IssuerKeywordRecord;
  governedParams: Record<string, unknown>;
  terms: Omit<
    import('@agoric/zoe/src/zoeService/utils.js').StartParams<SF>['terms'],
    'brands' | 'issuers' | 'governedParams' | 'electionManager'
  >;
  privateArgs: Omit<
    // @ts-expect-error XXX
    import('@agoric/zoe/src/zoeService/utils.js').StartParams<SF>['privateArgs'],
    'initialPoserInvitation'
  >;
  label: string;
};

export type StartGovernedUpgradable = <SF extends GovernableStartFn>(
  opts: StartGovernedUpgradableOpts<SF>,
) => Promise<GovernanceFacetKit<SF>>;

export type StartUpgradableOpts<
  SF extends
    import('@agoric/zoe/src/zoeService/utils.js').ContractStartFunction,
> = {
  installation: ERef<Installation<SF>>;
  issuerKeywordRecord?: IssuerKeywordRecord;
  terms?: Omit<
    import('@agoric/zoe/src/zoeService/utils.js').StartParams<SF>['terms'],
    'brands' | 'issuers'
  >;
  privateArgs?: Parameters<SF>[1];
  label: string;
};

export type StartUpgradable = <
  SF extends
    import('@agoric/zoe/src/zoeService/utils.js').ContractStartFunction,
>(
  opts: StartUpgradableOpts<SF>,
) => Promise<
  import('@agoric/zoe/src/zoeService/utils.js').StartedInstanceKit<SF> & {
    label: string;
  }
>;

export type StartedInstanceKit<
  T extends import('@agoric/zoe/src/zoeService/utils.js').ContractStartFunction,
> = import('@agoric/zoe/src/zoeService/utils.js').StartedInstanceKit<T>;

export type StartedInstanceKitWithLabel = {
  label: string;
} & StartedInstanceKit<
  import('@agoric/zoe/src/zoeService/utils.js').ContractStartFunction
>;

export type ChainBootstrapSpaceT = {
  agoricNames: import('../types.ts').NameHub;
  agoricNamesAdmin: import('@agoric/vats').NameAdmin;
  bankManager: import('@agoric/vats/src/vat-bank.js').BankManager;
  bldIssuerKit: RemoteIssuerKit;
  board: import('@agoric/vats').Board;
  bridgeManager: import('../types.ts').BridgeManager | undefined;
  chainStorage: import('@agoric/internal').Remote<StorageNode> | null;
  chainTimerService: import('@agoric/time').TimerService;
  client: ClientManager;
  clientCreator: any;
  coreEvalBridgeHandler: import('../types.ts').BridgeHandler;
  cosmosInterchainService: import('@agoric/orchestration').CosmosInterchainService;
  /** Utilities to support debugging */
  diagnostics: {
    /**
     * Intended to save arguments in durable storage for disaster recovery.
     *
     * Powerful. Can overwrite privateArgs storage for any instance.
     */
    savePrivateArgs: (instance: Instance, privateArgs: unknown) => void;
  };
  /** Super powerful ability to mint IST. ("License to print money") */
  feeMintAccess: import('@agoric/zoe').FeeMintAccess;
  highPrioritySendersManager:
    | import('@agoric/internal/src/priority-senders.js').PrioritySendersManager
    | undefined
    | null;
  initialSupply: Payment<'nat'>;
  /**
   * Very powerful. Has the private args for critical contract instances such as
   * Vault Factory. ONLY FOR DISASTER RECOVERY
   */
  instancePrivateArgs: Map<Instance, unknown>;
  localchain: import('@agoric/vats/src/localchain.js').LocalChain;
  mints?: MintsVat;
  namesByAddress: import('../types.ts').NameHub;
  namesByAddressAdmin: import('../types.ts').NamesByAddressAdmin;
  networkVat: NetworkVat;
  orchestration?: import('@agoric/orchestration').CosmosInterchainService;
  pegasusConnections: import('@agoric/vats').NameHubKit;
  pegasusConnectionsAdmin: import('@agoric/vats').NameAdmin;
  powerStore: MapStore;
  priceAuthorityVat: Awaited<PriceAuthorityVat>;
  priceAuthority: import('@agoric/zoe/tools/types.js').PriceAuthority;
  // signal that price feeds have #8400 QuotePayments storage leak fixed
  priceAuthority8400: import('@agoric/zoe/tools/types.js').PriceAuthority;
  priceAuthorityAdmin: import('@agoric/vats/src/priceAuthorityRegistry.js').PriceAuthorityRegistryAdmin;
  provisioning: Awaited<ProvisioningVat> | undefined;
  provisionBridgeManager:
    | import('../types.ts').ScopedBridgeManager<'provision'>
    | undefined;
  provisionWalletBridgeManager:
    | import('../types.ts').ScopedBridgeManager<'provisionWallet'>
    | undefined;
  storageBridgeManager:
    | import('../types.ts').ScopedBridgeManager<'storage'>
    | undefined;
  transferMiddleware: import('../transfer.js').TransferMiddleware;
  /**
   * Convenience function for starting a contract (ungoverned) and saving its
   * facets (including adminFacet)
   */
  startUpgradable: StartUpgradable;
  /** kits stored by startUpgradable */
  contractKits: MapStore<Instance, StartedInstanceKitWithLabel>;
  /** Convenience function for starting contracts governed by the Econ Committee */
  startGovernedUpgradable: StartGovernedUpgradable;
  /** kits stored by startGovernedUpgradable */
  governedContractKits: MapStore<
    Instance,
    GovernanceFacetKit<any> & { label: string }
  >;
  /** Used only for testing. Should not appear in any production proposals. */
  testFirstAnchorKit: import('../vat-bank.js').AssetIssuerKit;
  walletBridgeManager:
    | import('../types.ts').ScopedBridgeManager<'wallet'>
    | undefined;
  walletFactoryStartResult: import('./startWalletFactory.js').WalletFactoryStartResult;
  provisionPoolStartResult: GovernanceFacetKit<
    typeof import('@agoric/inter-protocol/src/provisionPool.js').start
  >;
  vatStore: import('./utils.js').VatStore;
  vatUpgradeInfo: MapStore;
  zoe: ZoeService;
};

export type ChainBootstrapSpace = PromiseSpaceOf<ChainBootstrapSpaceT>;

export type BootstrapVatParams = {
  argv: {
    hardcodedClientAddresses?: string[];
    FIXME_GCI: string;
    PROVISIONER_INDEX?: number;
  };
};

export type BootstrapPowers = BootstrapSpace & {
  zone: import('@agoric/zone').Zone;
  devices: SoloDevices | ChainDevices;
  vats: SwingsetVats;
  vatPowers: { [prop: string]: any; D: DProxy };
  vatParameters: BootstrapVatParams;
  runBehaviors: (manifest: unknown) => Promise<unknown>;
  modules: import('./boot-chain.js').BootstrapModules;
};

export type BootstrapSpace = WellKnownSpaces &
  PromiseSpaceOf<
    ChainBootstrapSpaceT & {
      vatAdminSvc: VatAdminSvc;
    },
    {
      loadVat: VatLoader;
      loadCriticalVat: VatLoader;
    },
    object
  >;

export type LocalChainVat = ERef<
  ReturnType<typeof import('../vat-localchain.js').buildRootObject>
>;

export type TransferVat = ERef<
  ReturnType<typeof import('../vat-transfer.js').buildRootObject>
>;

export type ProvisioningVat = ERef<
  ReturnType<typeof import('../vat-provisioning.js').buildRootObject>
>;

export type MintsVat = ERef<
  ReturnType<typeof import('../vat-mints.js').buildRootObject>
>;

export type PriceAuthorityVat = ERef<
  ReturnType<typeof import('../vat-priceAuthority.js').buildRootObject>
>;

export type NetworkVat = ERef<
  ReturnType<typeof import('../vat-network.js').buildRootObject>
>;
export type IBCVat = ERef<
  ReturnType<typeof import('../vat-ibc.js').buildRootObject>
>;
export type NamedVatPowers = {
  namedVat: PromiseSpaceOf<{
    agoricNames: Awaited<AgoricNamesVat>;
    board: Awaited<BoardVat>;
  }>;
};

export type OrchestrationVat = ERef<
  import('@agoric/orchestration').OrchestrationVat
>;
export type ZoeVat = ERef<import('../vat-zoe.js').ZoeVat>;

export type RemoteIssuerKit = {
  mint: ERef<Mint>;
  issuer: ERef<Issuer>;
  brand: Brand;
};
export type AgoricNamesVat = ERef<
  ReturnType<typeof import('../vat-agoricNames.js').buildRootObject>
>;
export type BankVat = ERef<
  ReturnType<typeof import('../vat-bank.js').buildRootObject>
>;
export type BoardVat = ERef<
  ReturnType<typeof import('../vat-board.js').buildRootObject>
>;
export type ChainStorageVat = ERef<
  ReturnType<typeof import('../vat-bridge.js').buildRootObject>
>;
export type BankManager = Awaited<
  ReturnType<Awaited<BankVat>['makeBankManager']>
>;

export type DemoFaucetPowers = PromiseSpaceOf<{
  mints: MintsVat;
}>;

export type WellKnownVats = SwingsetVats & {
  bank: BankVat;
  board: BoardVat;
  bridge: ChainStorageVat;
  ibc: IBCVat;
  localchain: LocalChainVat;
  mints: MintsVat;
  network: NetworkVat;
  orchestration: OrchestrationVat;
  priceAuthority: PriceAuthorityVat;
  provisioning: ProvisioningVat;
  transfer: TransferVat;
  zoe: ZoeVat;
};
