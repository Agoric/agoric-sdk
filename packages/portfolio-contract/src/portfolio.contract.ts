/**
 * @file Creates and manages diversified stablecoin portfolios that can be rebalanced across different yield-generating protocols.
 * @see {@link contract}
 * @see {@link start}
 */
import {
  makeTracer,
  mustMatch,
  NonNullish,
  type Remote,
  type TypedPattern,
} from '@agoric/internal';
import type {
  Marshaller,
  StorageNode,
} from '@agoric/internal/src/lib-chainStorage.js';
import {
  ChainInfoShape,
  DenomDetailShape,
  OrchestrationPowersShape,
  registerChainsAndAssets,
  withOrchestration,
  type ChainInfo,
  type Denom,
  type DenomDetail,
  type OrchestrationPowers,
  type OrchestrationTools,
} from '@agoric/orchestration';
import type { ContractMeta, ZCF } from '@agoric/zoe';
import type { ResolvedPublicTopic } from '@agoric/zoe/src/contractSupport/topics.js';
import type { Zone } from '@agoric/zone';
import { E } from '@endo/far';
import type { CopyRecord } from '@endo/pass-style';
import { M } from '@endo/patterns';
import { AxelarChain, YieldProtocol } from './constants.js';
import { preparePortfolioKit, type PortfolioKit } from './portfolio.exo.ts';
import * as flows from './portfolio.flows.ts';
import { makeOfferArgsShapes } from './type-guards-steps.ts';
import {
  BeefyPoolPlaces,
  makeProposalShapes,
  type EVMContractAddressesMap,
  type OfferArgsFor,
  type ProposalType,
} from './type-guards.ts';

const trace = makeTracer('PortC');
const { fromEntries, keys } = Object;

const interfaceTODO = undefined;

const EVMContractAddressesShape: TypedPattern<EVMContractAddresses> =
  M.splitRecord({
    aavePool: M.string(),
    compound: M.string(),
    factory: M.string(),
    usdc: M.string(),
  });

export type AxelarConfig = {
  [chain in AxelarChain]: {
    /**
     * Axelar chain IDs differ between mainnet and testnet.
     * See [supported-chains-list.ts](https://github.com/axelarnetwork/axelarjs-sdk/blob/f84c8a21ad9685091002e24cac7001ed1cdac774/src/chains/supported-chains-list.ts)
     */
    axelarId: string;
    contracts: EVMContractAddresses;
  };
};

const AxelarConfigPattern = M.splitRecord({
  axelarId: M.string(),
  chainInfo: ChainInfoShape,
  contracts: EVMContractAddressesShape,
});

export const AxelarConfigShape: TypedPattern<AxelarConfig> = M.splitRecord(
  fromEntries(
    keys(AxelarChain).map(chain => [chain, AxelarConfigPattern]),
  ) as Record<AxelarChain, typeof AxelarConfigPattern>,
);

export type BeefyContracts = {
  [K in keyof typeof BeefyPoolPlaces]: `0x${string}`;
};

export type EVMContractAddresses = {
  aavePool: `0x${string}`;
  compound: `0x${string}`;
  factory: `0x${string}`;
  usdc: `0x${string}`;
  tokenMessenger: `0x${string}`;
  aaveUSDC: `0x${string}`;
  aaveRewardsController: `0x${string}`;
  compoundRewardsController: `0x${string}`;
} & Partial<BeefyContracts>;

export type AxelarId = {
  [chain in AxelarChain]: string;
};

const EVMContractAddressesMap: TypedPattern<EVMContractAddressesMap> =
  M.splitRecord(
    fromEntries(
      keys(AxelarChain).map(chain => [chain, EVMContractAddressesShape]),
    ) as Record<AxelarChain, typeof EVMContractAddressesShape>,
  );

const AxelarIdsPattern = M.string();

const AxelarIdShape: TypedPattern<AxelarId> = M.splitRecord(
  fromEntries(keys(AxelarChain).map(chain => [chain, AxelarIdsPattern])),
);

type PortfolioPrivateArgs = OrchestrationPowers & {
  // XXX document required assets, chains
  assetInfo: [Denom, DenomDetail & { brandKey?: string }][];
  chainInfo: Record<string, ChainInfo>;
  marshaller: Marshaller;
  storageNode: Remote<StorageNode>;
  axelarIds: AxelarId;
  contracts: EVMContractAddressesMap;
};

const privateArgsShape: TypedPattern<PortfolioPrivateArgs> = {
  ...(OrchestrationPowersShape as CopyRecord),
  marshaller: M.remotable('marshaller'),
  storageNode: M.remotable('storageNode'),
  chainInfo: M.and(
    M.recordOf(M.string(), ChainInfoShape),
    M.splitRecord({ agoric: M.any(), noble: M.any() }),
  ),
  assetInfo: M.arrayOf([M.string(), DenomDetailShape]),
  axelarIds: AxelarIdShape,
  contracts: EVMContractAddressesMap,
};

export const meta: ContractMeta = {
  privateArgsShape,
};
harden(meta);

/**
 * Portfolio contract implementation. Creates and manages diversified stablecoin portfolios
 * that can be rebalanced across different yield protocols.
 *
 * Portfolio holders can:
 * - Open portfolios
 * - Allocate capital across different yield protocols
 * - Rebalance positions between protocols via continuing invitations
 *
 * The contract orchestrates multi-chain operations to manage positions across
 * different {@link SupportedEVMChains} and {@link YieldProtocol}s.
 *
 * Each portfolio maintains independent {@link PortfolioKit} state with position tracking
 * and flow logging published to vstorage for external monitoring.
 * Rebalancing operations use automatic rollback on failures.
 *
 * @param zcf - Zoe Contract Facet for offer handling and seat management
 * @param privateArgs - Deployment configuration including chain/asset info and capabilities
 * @param zone - Durable storage zone for contract state persistence
 * @param tools - Orchestration tools for cross-chain operations and Zoe integration
 * @see {@link openPortfolio} for portfolio creation flow details
 * @see {@link rebalance} for position management flow details
 * @see {@link start}
 */
export const contract = async (
  zcf: ZCF,
  privateArgs: PortfolioPrivateArgs,
  zone: Zone,
  tools: OrchestrationTools,
) => {
  const {
    chainInfo,
    assetInfo,
    axelarIds,
    contracts,
    timerService,
    marshaller,
    storageNode,
  } = privateArgs;
  const { brands } = zcf.getTerms();
  const { orchestrateAll, zoeTools, chainHub, vowTools } = tools;

  assert(brands.USDC, 'USDC missing from brands in terms');
  assert(brands.Fee, 'Fee missing from brands in terms');

  if (!('axelar' in chainInfo)) {
    trace('⚠️ no axelar chainInfo; GMP not available', Object.keys(chainInfo));
  }
  // TODO: only on 1st incarnation
  registerChainsAndAssets(chainHub, brands, chainInfo, assetInfo, {
    log: trace,
  });

  const proposalShapes = makeProposalShapes(
    brands.USDC,
    brands.Fee,
    brands.Access,
  );
  const offerArgsShapes = makeOfferArgsShapes(brands.USDC);

  // Until we find a need for on-chain subscribers, this stop-gap will do.
  const inertSubscriber: ResolvedPublicTopic<never>['subscriber'] = {
    getUpdateSince() {
      assert.fail('use off-chain queries');
    },
    subscribeAfter() {
      assert.fail('use off-chain queries');
    },
  };

  const ctx1 = {
    zoeTools,
    usdc: {
      brand: brands.USDC,
      denom: NonNullish(
        chainHub.getDenom(brands.USDC),
        'no denom for USDC brand',
      ),
    },
    gmpFeeInfo: {
      brand: brands.Fee,
      denom: NonNullish(
        chainHub.getDenom(brands.Fee),
        'no denom for Fee brand',
      ),
    },
    axelarIds,
    contracts,
  };

  // Create rebalance flow first - needed by preparePortfolioKit
  const { rebalance, rebalanceFromTransfer } = orchestrateAll(
    {
      rebalance: flows.rebalance,
      rebalanceFromTransfer: flows.rebalanceFromTransfer,
    },
    ctx1,
  );

  const makePortfolioKit = preparePortfolioKit(zone, {
    zcf,
    vowTools,
    axelarIds,
    rebalance,
    rebalanceFromTransfer,
    proposalShapes,
    offerArgsShapes,
    timer: timerService,
    chainHubTools: { getChainInfo: chainHub.getChainInfo.bind(chainHub) },
    portfoliosNode: E(storageNode).makeChildNode('portfolios'),
    marshaller,
    usdcBrand: brands.USDC,
  });

  const portfolios = zone.mapStore<number, PortfolioKit>('portfolios');

  // Create openPortfolio flow with makePortfolioKit - circular dependency avoided
  const { openPortfolio } = orchestrateAll(
    { openPortfolio: flows.openPortfolio },
    {
      ...ctx1,
      // Generate sequential portfolio IDs while keeping the portfolios collection private.
      // Each portfolio kit only gets access to its own state, not the full collection.
      makePortfolioKit: (() => {
        const portfolioId = portfolios.getSize();
        const it = makePortfolioKit({ portfolioId });
        portfolios.init(portfolioId, it);
        return it;
      }) as any, // XXX Guest...
      inertSubscriber,
    },
  );

  trace('XXX NEEDSTEST: baggage test');

  const publicFacet = zone.exo('PortfolioPub', interfaceTODO, {
    /**
     * Make an invitation to open a new portfolio.
     *
     * Portfolio holders may provide funds to create a portfolio
     * that can allocate capital across different {@link YieldProtocol}s.
     * The resulting portfolio can be rebalanced via continuing invitations.
     *
     * @see {@link ProposalType.openPortfolio} for proposal structure.
     *   Note that if the contract is started with an `Access` issuer,
     *   a non-empty amount of that token is required.
     *
     * @see {@link OfferArgsFor.openPortfolio} for offer arguments
     * @see {@link openPortfolio} for the underlying flow implementation
     * @see {@link rebalance} for position management flow details
     */
    makeOpenPortfolioInvitation() {
      trace('makeOpenPortfolioInvitation');
      return zcf.makeInvitation(
        (seat, offerArgs) => {
          mustMatch(offerArgs, offerArgsShapes.openPortfolio);
          return openPortfolio(seat, offerArgs);
        },
        'openPortfolio',
        undefined,
        proposalShapes.openPortfolio,
      );
    },
  });

  return { publicFacet };
};
harden(contract);

const keepDocsTypesImported:
  | undefined
  | YieldProtocol
  | OfferArgsFor
  | PortfolioKit
  | ProposalType = undefined;

/**
 * @see {@link contract}
 * @see @agoric/orchestration
 */
export const start = withOrchestration(contract);
harden(start);
