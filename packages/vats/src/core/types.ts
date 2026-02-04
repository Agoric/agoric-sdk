import type { DProxy } from '@agoric/swingset-vat/src/types-external.js';
import type { BridgeDevice } from '@agoric/swingset-vat/src/devices/bridge/device-bridge.js';
import type { CommandDevice } from '@agoric/swingset-vat/src/devices/command/device-command.js';
import type { MailboxDevice } from '@agoric/swingset-vat/src/devices/mailbox/device-mailbox.js';
import type { PluginDevice } from '@agoric/swingset-vat/src/devices/plugin/device-plugin.js';
import type { TimerDevice } from '@agoric/swingset-vat/src/devices/timer/device-timer.js';
import type { VatAdminDevice } from '@agoric/swingset-vat/src/devices/vat-admin/device-vat-admin.js';
import type { VattpVat } from '@agoric/swingset-vat/src/vats/vattp/vat-vattp.js';
import type { VatAdminVat } from '@agoric/swingset-vat/src/vats/vat-admin/vat-vat-admin.js';
/** @see deliverToController in packages/SwingSet/src/vats/comms/controller.js */
import type { TimerVat } from '@agoric/swingset-vat/src/vats/timer/vat-timer.js';
import type { Issuer, Brand, Payment, Mint } from '@agoric/ertp';
import type { OrchestrationVat } from '@agoric/orchestration';
import type { ERef } from 'jessie.js';
import type { LocalChainVat } from '../vat-localchain.js';
import type { TransferVat } from '../vat-transfer.js';
import type { ZoeVat } from '../vat-zoe.js';
import type { PriceAuthorityVat } from '../vat-priceAuthority.js';
import type { ProvisioningVat } from '../vat-provisioning.js';
import type { BankVat } from '../vat-bank.js';
import type { MintsVat } from '../vat-mints.js';
import type { NetworkVat } from '../vat-network.js';
import type { IBCVat } from '../vat-ibc.js';
import type { BoardVat } from '../vat-board.js';
import type { AgoricNamesVat } from '../vat-agoricNames.js';
import type { BridgeVat } from '../vat-bridge.js';

export type BootDevices<T> = { vatPowers: { D: DProxy }; devices: T };

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
  timer: TimerDevice;
  plugin: PluginDevice;
};

export type ChainDevices = {
  vatAdmin: VatAdminDevice;
  mailbox: MailboxDevice;
  timer: TimerDevice;
  bridge?: BridgeDevice;
};

export type ClientProvider = {
  getChainBundle: () => unknown;
  getChainConfigNotifier: () => import('@agoric/notifier').Notifier<unknown>;
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

type CreateUserBundle = (
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
  StartFns extends Partial<
    Record<WellKnownName['installation'], import('@agoric/zoe').ContractStartFn>
  >,
> = {
  [Property in keyof StartFns]: Promise<
    import('@agoric/zoe').Installation<StartFns[Property]>
  >;
};

export type ContractInstancePromises<
  StartFns extends Partial<
    Record<WellKnownName['instance'], import('@agoric/zoe').ContractStartFn>
  >,
> = {
  [Property in keyof StartFns]: Promise<
    import('@agoric/zoe').Instance<StartFns[Property]>
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
    produce: Record<
      WellKnownName['installation'],
      Producer<import('@agoric/zoe').Installation>
    >;
    consume: Record<
      WellKnownName['installation'],
      Promise<import('@agoric/zoe').Installation<unknown>>
    > &
      ContractInstallationPromises<WellKnownContracts>;
  };
  instance: {
    produce: Record<
      WellKnownName['instance'],
      Producer<import('@agoric/zoe').Instance>
    >;
    consume: Record<
      WellKnownName['instance'],
      Promise<import('@agoric/zoe').Instance>
    > &
      ContractInstancePromises<WellKnownContracts>;
  };
  uiConfig: {
    produce: Record<WellKnownName['uiConfig'], Producer<Record<string, any>>>;
    consume: Record<WellKnownName['uiConfig'], Promise<Record<string, any>>>;
  };
};

export type StartGovernedUpgradableOpts<
  SF extends import('@agoric/governance').GovernableStartFn,
> = {
  installation: ERef<import('@agoric/zoe').Installation<SF>>;
  issuerKeywordRecord?: import('@agoric/zoe').IssuerKeywordRecord;
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

export type StartGovernedUpgradable = <
  SF extends import('@agoric/governance').GovernableStartFn,
>(
  opts: StartGovernedUpgradableOpts<SF>,
) => Promise<import('@agoric/governance').GovernanceFacetKit<SF>>;

export type StartUpgradableOpts<
  SF extends
    import('@agoric/zoe/src/zoeService/utils.js').ContractStartFunction,
> = {
  installation: ERef<import('@agoric/zoe').Installation<SF>>;
  issuerKeywordRecord?: import('@agoric/zoe').IssuerKeywordRecord;
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

export type StartedInstanceKitWithLabel<
  T extends import('@agoric/zoe/src/zoeService/utils.js').ContractStartFunction,
> = import('@agoric/zoe/src/zoeService/utils.js').StartedInstanceKit<T> & {
  label: string;
};

export type ChainBootstrapSpaceT = {
  agoricNames: import('../types.js').NameHub;
  agoricNamesAdmin: import('@agoric/vats').NameAdmin;
  bankManager: import('@agoric/vats/src/vat-bank.js').BankManager;
  bldIssuerKit: RemoteIssuerKit;
  board: import('@agoric/vats').Board;
  bridgeManager: import('../types.js').BridgeManager | undefined;
  chainStorage:
    | import('@agoric/internal').Remote<
        import('@agoric/internal/src/lib-chainStorage.js').StorageNode
      >
    | null;
  chainTimerService: import('@agoric/time').TimerService;
  client: ClientManager;
  clientCreator: any;
  coreEvalBridgeHandler: import('../types.js').BridgeHandler;
  cosmosInterchainService: import('@agoric/orchestration').CosmosInterchainService;
  /** Utilities to support debugging */
  diagnostics: {
    /**
     * Intended to save arguments in durable storage for disaster recovery.
     *
     * Powerful. Can overwrite privateArgs storage for any instance.
     */
    savePrivateArgs: (
      instance: import('@agoric/zoe').Instance,
      privateArgs: unknown,
    ) => void;
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
  instancePrivateArgs: Map<import('@agoric/zoe').Instance, unknown>;
  localchain: import('@agoric/vats/src/localchain.js').LocalChain;
  mints?: MintsVat;
  namesByAddress: import('../types.js').NameHub;
  namesByAddressAdmin: import('../types.js').NamesByAddressAdmin;
  networkVat: NetworkVat;
  orchestration?: import('@agoric/orchestration').CosmosInterchainService;
  pegasusConnections: import('@agoric/vats').NameHubKit;
  pegasusConnectionsAdmin: import('@agoric/vats').NameAdmin;
  powerStore: import('@agoric/store').MapStore;
  priceAuthorityVat: Awaited<PriceAuthorityVat>;
  priceAuthority: import('@agoric/zoe/tools/types.js').PriceAuthority;
  // signal that price feeds have #8400 QuotePayments storage leak fixed
  priceAuthority8400: import('@agoric/zoe/tools/types.js').PriceAuthority;
  priceAuthorityAdmin: import('@agoric/vats/src/priceAuthorityRegistry.js').PriceAuthorityRegistryAdmin;
  provisioning: Awaited<ProvisioningVat> | undefined;
  provisionBridgeManager:
    | import('../types.js').ScopedBridgeManager<'provision'>
    | undefined;
  provisionWalletBridgeManager:
    | import('../types.js').ScopedBridgeManager<'provisionWallet'>
    | undefined;
  storageBridgeManager:
    | import('../types.js').ScopedBridgeManager<'storage'>
    | undefined;
  transferMiddleware: import('../transfer.js').TransferMiddleware;
  /**
   * Convenience function for starting a contract (ungoverned) and saving its
   * facets (including adminFacet)
   */
  startUpgradable: StartUpgradable;
  /** kits stored by startUpgradable */
  contractKits: import('@agoric/store').MapStore<
    import('@agoric/zoe').Instance,
    StartedInstanceKitWithLabel<any>
  >;
  /** Convenience function for starting contracts governed by the Econ Committee */
  startGovernedUpgradable: StartGovernedUpgradable;
  /** kits stored by startGovernedUpgradable */
  governedContractKits: import('@agoric/store').MapStore<
    import('@agoric/zoe').Instance,
    import('@agoric/governance').GovernanceFacetKit<any> & { label: string }
  >;
  /** Used only for testing. Should not appear in any production proposals. */
  testFirstAnchorKit: import('../vat-bank.js').AssetIssuerKit;
  walletBridgeManager:
    | import('../types.js').ScopedBridgeManager<'wallet'>
    | undefined;
  walletFactoryStartResult: import('./startWalletFactory.js').WalletFactoryStartResult;
  provisionPoolStartResult: import('@agoric/governance').GovernanceFacetKit<
    typeof import('@agoric/inter-protocol/src/provisionPool.js').start
  >;
  vatStore: import('./utils.js').VatStore;
  vatUpgradeInfo: import('@agoric/store').MapStore;
  zoe: import('@agoric/zoe').ZoeService;
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
      vatAdminSvc: import('@agoric/swingset-vat').VatAdminSvc;
    },
    {
      loadVat: VatLoader;
      loadCriticalVat: VatLoader;
    },
    object
  >;

export type NamedVatPowers = {
  namedVat: PromiseSpaceOf<{
    agoricNames: Awaited<AgoricNamesVat>;
    board: Awaited<BoardVat>;
  }>;
};

type RemoteIssuerKit = {
  mint: ERef<Mint>;
  issuer: ERef<Issuer>;
  brand: Brand;
};

export type BankManager = Awaited<
  ReturnType<Awaited<BankVat>['makeBankManager']>
>;

export type DemoFaucetPowers = PromiseSpaceOf<{
  mints: MintsVat;
}>;

export type WellKnownVats = SwingsetVats & {
  bank: BankVat;
  board: BoardVat;
  bridge: BridgeVat;
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
