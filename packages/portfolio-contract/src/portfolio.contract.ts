/**
 * @file Creates and manages diversified stablecoin portfolios that can be rebalanced across different yield-generating protocols.
 * @see {@link contract}
 * @see {@link start}
 */
import { AmountMath, type Payment, type NatValue } from '@agoric/ertp';
import type { GuestInterface } from '@agoric/async-flow';
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
  type AccountId,
  type Bech32Address,
  type ChainInfo,
  type Denom,
  type DenomAmount,
  type DenomDetail,
  type OrchestrationPowers,
  type OrchestrationTools,
} from '@agoric/orchestration';
import {
  AxelarChain,
  YieldProtocol,
} from '@agoric/portfolio-api/src/constants.js';
import {
  AxelarGMPMessageType,
  type AxelarGmpOutgoingMemo,
} from '@agoric/orchestration/src/axelar-types.js';
import { buildGasPayload } from '@agoric/orchestration/src/utils/gmp.js';
import type { ContractMeta, ZCF, ZCFSeat } from '@agoric/zoe';
import type { ResolvedPublicTopic } from '@agoric/zoe/src/contractSupport/topics.js';
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import type { Instance } from '@agoric/zoe/src/zoeService/types.js';
import type { Zone } from '@agoric/zone';
import { Fail } from '@endo/errors';
import { E } from '@endo/far';
import { makeMarshal } from '@endo/marshal';
import type { CopyRecord } from '@endo/pass-style';
import { M } from '@endo/patterns';
import { preparePlanner } from './planner.exo.ts';
import {
  preparePortfolioKit,
  type GMPAccountInfo,
  type PortfolioKit,
} from './portfolio.exo.ts';
import * as flows from './portfolio.flows.ts';
import { prepareResolverKit } from './resolver/resolver.exo.js';
import { PENDING_TXS_NODE_KEY } from './resolver/types.ts';
import { makeOfferArgsShapes } from './type-guards-steps.ts';
import {
  BeefyPoolPlaces,
  makeProposalShapes,
  type EVMContractAddressesMap,
  type OfferArgsFor,
  type ProposalType,
  type StatusFor,
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

interface PostalServiceI {
  deliverPayment(addr: string, pmt: Payment): Promise<void>;
}

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

const EVMContractAddressesMapShape: TypedPattern<EVMContractAddressesMap> =
  M.splitRecord(
    fromEntries(
      keys(AxelarChain).map(chain => [chain, EVMContractAddressesShape]),
    ) as Record<AxelarChain, typeof EVMContractAddressesShape>,
  );

const AxelarIdsPattern = M.string();

const AxelarIdShape: TypedPattern<AxelarId> = M.splitRecord(
  fromEntries(keys(AxelarChain).map(chain => [chain, AxelarIdsPattern])),
);

export type GmpAddresses = {
  AXELAR_GMP: Bech32Address;
  AXELAR_GAS: Bech32Address;
};

const GmpAddressesShape: TypedPattern<GmpAddresses> = M.splitRecord({
  AXELAR_GMP: M.string(),
  AXELAR_GAS: M.string(),
});

export type PortfolioPrivateArgs = OrchestrationPowers & {
  // XXX document required assets, chains
  assetInfo: [Denom, DenomDetail & { brandKey?: string }][];
  chainInfo: Record<string, ChainInfo>;
  marshaller: Marshaller;
  storageNode: Remote<StorageNode>;
  axelarIds: AxelarId;
  contracts: EVMContractAddressesMap;
  gmpAddresses: GmpAddresses;
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
  contracts: EVMContractAddressesMapShape,
  gmpAddresses: GmpAddressesShape,
};

export const meta: ContractMeta = {
  privateArgsShape,
};
harden(meta);

const marshalData = makeMarshal(_ => Fail`data only`);

const publishStatus = <K extends keyof StatusFor>(
  node: Remote<StorageNode>,
  status: StatusFor[K],
) => {
  const capData = marshalData.toCapData(status);
  void E(node).setValue(JSON.stringify(capData));
};

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
    marshaller,
    storageNode,
    gmpAddresses,
  } = privateArgs;
  const { brands } = zcf.getTerms();
  const { orchestrateAll, zoeTools, chainHub, vowTools } = tools;

  assert(brands.USDC, 'USDC missing from brands in terms');
  assert(brands.Fee, 'Fee missing from brands in terms');

  if (!('axelar' in chainInfo)) {
    trace('⚠️ no axelar chainInfo; GMP not available', Object.keys(chainInfo));
  }

  // Only register chains and assets if chainHub is empty to avoid conflicts on restart
  if (chainHub.isEmpty()) {
    trace('chainHub:', Object.keys(chainInfo));
    registerChainsAndAssets(chainHub, brands, chainInfo, assetInfo);
  } else {
    trace('chainHub already populated, using existing entries');
  }

  const proposalShapes = makeProposalShapes(brands.USDC, brands.Access);
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

  const resolverZone = zone.subZone('Resolver');
  const makeResolverKit = prepareResolverKit(resolverZone, zcf, {
    vowTools,
    pendingTxsNode: E(storageNode).makeChildNode(PENDING_TXS_NODE_KEY),
    marshaller,
  });
  const {
    client: resolverClient,
    invitationMakers: makeResolverInvitationMakers,
  } = resolverZone.makeOnce('resolverKit', () => makeResolverKit());

  const { makeLCA } = orchestrateAll({ makeLCA: flows.makeLCA }, {});
  const contractAccountV = zone.makeOnce('contractAccountV', () => makeLCA());
  void vowTools.when(contractAccountV, acct => {
    const addr = acct.getAddress();
    publishStatus(storageNode, harden({ contractAccount: addr.value }));
    trace('published contractAccount', addr.value);
  });

  // Minimal durable in-contract EVM account pool; shared across portfolios.
  const poolZone = zone.subZone('EvmPool');
  const EvmAccountPoolI = M.interface('EvmAccountPool', {
    acquire: M.call(M.string()).returns(M.or(M.record(), M.undefined())),
    addReady: M.call(M.record()).returns(),
    summary: M.call().returns(
      M.recordOf(
        M.string(),
        M.splitRecord({ ready: M.number(), handedOut: M.number() }),
      ),
    ),
  });
  type HostEvmAccountPool = {
    acquire: (chain: AxelarChain) => GMPAccountInfo | undefined;
    addReady: (info: GMPAccountInfo) => void;
    summary: () => Record<string, { ready: number; handedOut: number }>;
  };
  const readyByChain = poolZone
    .detached()
    .mapStore<string, GMPAccountInfo[]>('readyByChain');
  const handedOut = poolZone.detached().mapStore<string, number>('handedOut');
  const evmAccountPool: HostEvmAccountPool = poolZone.exo(
    'EvmAccountPool',
    EvmAccountPoolI,
    {
      acquire(chain: AxelarChain) {
        const list: GMPAccountInfo[] = readyByChain.has(chain)
          ? readyByChain.get(chain)
          : [];
        if (!list.length) return undefined;
        const info = list.shift()!;
        readyByChain.set(chain, list);
        const n = handedOut.has(chain) ? handedOut.get(chain) : 0;
        handedOut.set(chain, n + 1);
        return info;
      },
      addReady(info: GMPAccountInfo) {
        const chain = info.chainName;
        const list: GMPAccountInfo[] = readyByChain.has(chain)
          ? readyByChain.get(chain)
          : [];
        list.push(info);
        readyByChain.set(chain, list);
      },
      summary() {
        const out: Record<string, { ready: number; handedOut: number }> = {};
        for (const [chain, list] of readyByChain.entries()) {
          out[chain] = {
            ready: list.length,
            handedOut: handedOut.has(chain) ? handedOut.get(chain) : 0,
          };
        }
        return out;
      },
    },
  );

  // Provide a GuestInterface-compatible facade exposing only the acquire() method
  // with an async signature expected by flows.
  type EvmAccountPoolGuest = GuestInterface<{
    acquire: (chain: AxelarChain) => Promise<GMPAccountInfo | undefined>;
  }>;
  const evmAccountPoolGuest: EvmAccountPoolGuest = harden({
    async acquire(chain: AxelarChain) {
      return evmAccountPool.acquire(chain);
    },
  }) as unknown as EvmAccountPoolGuest;

  const ctx1: flows.PortfolioInstanceContext = {
    zoeTools: zoeTools as any, // XXX Guest...
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
    gmpAddresses,
    resolverClient,
    inertSubscriber,
    contractAccount: contractAccountV as any, // XXX Guest...
    evmAccountPool: evmAccountPoolGuest,
  };

  // Create rebalance flow first - needed by preparePortfolioKit
  const { executePlan, rebalance, parseInboundTransfer } = orchestrateAll(
    {
      executePlan: flows.executePlan,
      rebalance: flows.rebalance,
      parseInboundTransfer: flows.parseInboundTransfer,
    },
    ctx1,
  );

  const makePortfolioKit = preparePortfolioKit(zone, {
    zcf,
    vowTools,
    axelarIds,
    gmpAddresses,
    executePlan,
    rebalance,
    parseInboundTransfer,
    proposalShapes,
    offerArgsShapes,
    chainHubTools: {
      getChainInfo: chainHub.getChainInfo.bind(chainHub),
      getChainsAndConnection: chainHub.getChainsAndConnection.bind(chainHub),
    },
    portfoliosNode: E(storageNode).makeChildNode('portfolios'),
    marshaller,
    usdcBrand: brands.USDC,
    evmAccountPool,
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

  const usedAccessTokens = zone.makeOnce(
    'usedAccessTokens',
    () => zcf.makeEmptySeatKit().zcfSeat,
  );
  const consumeAccessToken = brands.Access
    ? (seat: ZCFSeat) => {
        const Access = AmountMath.make(brands.Access, 1n);
        zcf.atomicRearrange([[seat, usedAccessTokens, { Access }]]);
      }
    : () => {};

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
          consumeAccessToken(seat);
          return openPortfolio(seat, offerArgs);
        },
        'openPortfolio',
        undefined,
        proposalShapes.openPortfolio,
      );
    },
  });

  const makeResolverInvitation = () => {
    trace('makeResolverInvitation');

    const resolverHandler = (seat: ZCFSeat) => {
      seat.exit();
      return harden({ invitationMakers: makeResolverInvitationMakers });
    };

    return zcf.makeInvitation(resolverHandler, 'resolver', undefined);
  };

  const getPortfolio = (id: number) => portfolios.get(id);
  const makePlanner = preparePlanner(zone.subZone('planner'), {
    zcf,
    rebalance,
    getPortfolio,
    shapes: offerArgsShapes,
    vowTools,
  });

  const makePlannerInvitation = () =>
    zcf.makeInvitation(seat => {
      seat.exit();
      return makePlanner();
    }, 'planner');

  const creatorFacet = zone.exo(
    'PortfolioAdmin',
    M.interface('PortfolioAdmin', {
      makeResolverInvitation: M.callWhen().returns(InvitationShape),
      deliverResolverInvitation: M.callWhen(
        M.string(),
        M.remotable('Instance'),
      ).returns(),
      makePlannerInvitation: M.callWhen().returns(InvitationShape),
      deliverPlannerInvitation: M.callWhen(
        M.string(),
        M.remotable('Instance'),
      ).returns(),
      /** Proactively create GMP accounts to populate the in-contract pool */
      prefillEvmAccounts: M.callWhen(
        M.string(),
        M.number(),
        M.bigint(),
        M.nat(),
      ).returns(),
      withdrawFees: M.callWhen(M.string())
        .optional(M.record())
        .returns(M.record()),
    }),
    {
      makeResolverInvitation() {
        return makeResolverInvitation();
      },
      async deliverResolverInvitation(
        address: string,
        instancePS: Instance<() => { publicFacet: PostalServiceI }>,
      ) {
        const zoe = zcf.getZoeService();
        const pfP = E(zoe).getPublicFacet(instancePS);
        const invitation = await makeResolverInvitation();
        trace('made resolver invitation', invitation);
        await E(pfP).deliverPayment(address, invitation);
        trace('delivered resolver invitation');
      },
      makePlannerInvitation() {
        return makePlannerInvitation();
      },
      /**
       * Make and deliver a planner invitation to the specified address.
       *
       * Note: Contract handles delivery due to wallet DSL limitations - see CONTRIBUTING.md
       * section "Invitation Delivery Limitations in the Wallet Action DSL" for architectural context.
       *
       * @param address - Agoric address where to deliver the planner invitation
       * @param instancePS - Postal service instance for delivery
       */
      async deliverPlannerInvitation(
        address: string,
        instancePS: Instance<() => { publicFacet: PostalServiceI }>,
      ) {
        trace('deliverPlannerInvitation', address, instancePS);
        const zoe = zcf.getZoeService();
        const pfP = E(zoe).getPublicFacet(instancePS);
        const invitation = await makePlannerInvitation();
        trace('made planner invitation', invitation);
        await E(pfP).deliverPayment(address, invitation);
        trace('delivered planner invitation');
      },
      async prefillEvmAccounts(
        chainName: AxelarChain,
        count: number,
        evmGas: bigint,
        feeValue: NatValue,
      ) {
        trace('prefillEvmAccounts', chainName, count);
        const { when } = vowTools;
        const acct = await when(contractAccountV);
        const feeDenom = NonNullish(
          chainHub.getDenom(brands.Fee),
          'no denom for Fee brand',
        );
        const fee = { denom: feeDenom, value: feeValue };

        const axelarInfo = await when(chainHub.getChainInfo('axelar'));
        const gmpChainId = `${axelarInfo.namespace}:${axelarInfo.reference}`;
        const gmpAccount = {
          chainId: gmpChainId,
          value: gmpAddresses.AXELAR_GMP,
          encoding: 'bech32' as const,
        };
        const axelarId = axelarIds[chainName];
        const destinationAddress = contracts[chainName].factory;

        for (let i = 0; i < count; i += 1) {
          const memo: AxelarGmpOutgoingMemo = {
            destination_chain: axelarId,
            destination_address: destinationAddress,
            payload: buildGasPayload(evmGas),
            type: AxelarGMPMessageType.ContractCall,
            fee: {
              amount: String(fee.value),
              recipient: gmpAddresses.AXELAR_GAS,
            },
          };
          await when(
            acct.transfer(gmpAccount, fee, { memo: JSON.stringify(memo) }),
          );
        }
      },
      /**
       * Withdraw from contractAccount; for example, before terminating the contract
       *
       * @param toAccount
       * @param optAmount - defaults to BLD balance
       */
      async withdrawFees(toAccount: AccountId, optAmount?: DenomAmount) {
        const traceWithdraw = trace.sub('withdrawFees');
        traceWithdraw('to', toAccount);
        // LCA operations are prompt
        const { when } = vowTools;
        const acct = await when(contractAccountV);
        const amount = await (optAmount || when(acct.getBalance('ubld')));
        traceWithdraw('amount', amount);
        await when(acct.send(toAccount, amount));
        traceWithdraw({ amount, from: acct.getAddress().value, toAccount });
        return amount;
      },
    },
  );

  return { creatorFacet, publicFacet };
};
harden(contract);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
