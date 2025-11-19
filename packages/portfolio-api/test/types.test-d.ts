import type { NatAmount } from '@agoric/ertp';
import type {
  AccountId,
  Bech32Address,
  CosmosChainAddress,
} from '@agoric/orchestration';
import { expectAssignable, expectNotAssignable, expectType } from 'tsd';
import type { SupportedChain, YieldProtocol } from '../src/constants.js';
import { AxelarChain } from '../src/constants.js';
import type { InstrumentId } from '../src/instruments.js';
import type { PublishedTx } from '../src/resolver.js';
import {
  enumeratePortfolioPlaces,
  iterateVstorageHistory,
  makeMockVstorageReaders,
  materializePortfolioPositions,
  readPortfolioLatest,
  selectPendingFlows,
} from '../src/vstorage-schema.js';
import type {
  AssetPlaceRef,
  FlowDetail,
  FlowKey,
  FlowStatus,
  FlowStep,
  InterChainAccountRef,
  LocalChainAccountRef,
  PoolKey,
  PortfolioKey,
  ProposalType,
  SeatKeyword,
  StatusFor,
  TargetAllocation,
} from '../src/types.js';
import type {
  FlowNodeLatest,
  PortfolioChainAccountPlace,
  PortfolioLatestSnapshot,
  PortfolioPositionPlace,
} from '../src/vstorage-schema.js';

declare const natAmount: NatAmount;
declare const accountId: AccountId;
declare const bech32Address: Bech32Address;
declare const cosmosAddress: CosmosChainAddress;
declare const publishedTx: PublishedTx;
declare const yieldProtocol: YieldProtocol;
declare const supportedChain: SupportedChain;
declare const instrumentId: InstrumentId;

expectAssignable<SeatKeyword>('Cash');
expectAssignable<SeatKeyword>('Deposit');
expectNotAssignable<SeatKeyword>('Flow');

expectAssignable<LocalChainAccountRef>('+agoric');
expectNotAssignable<LocalChainAccountRef>('+other');
expectNotAssignable<LocalChainAccountRef>('@agoric');

expectAssignable<InterChainAccountRef>('@Base');
expectNotAssignable<InterChainAccountRef>('Arbitrum');

expectAssignable<AssetPlaceRef>('<Deposit>');
expectAssignable<AssetPlaceRef>('+agoric');
expectAssignable<AssetPlaceRef>(instrumentId);
expectNotAssignable<AssetPlaceRef>('Deposit');

const targetAllocation: TargetAllocation = {
  [instrumentId]: 100n,
  Aave_Base: 250n,
};

expectNotAssignable<TargetAllocation>({ Arbitrary: 100n });

const emptyGive: ProposalType['openPortfolio']['give'] = {};
const openPortfolio = {
  give: {
    Deposit: natAmount,
    Access: natAmount,
  },
  want: {},
} satisfies ProposalType['openPortfolio'];
expectType<ProposalType['openPortfolio']['give']>(emptyGive);
expectType<ProposalType['openPortfolio']>(openPortfolio);

const rebalanceDeposit = {
  give: { Deposit: natAmount },
  want: {},
} satisfies ProposalType['rebalance'];
expectType<ProposalType['rebalance']>(rebalanceDeposit);
expectNotAssignable<ProposalType['rebalance']>({
  want: { Deposit: natAmount },
  give: {},
});

const withdrawProposal = {
  want: { Cash: natAmount },
  give: {},
} satisfies ProposalType['withdraw'];
expectType<ProposalType['withdraw']>(withdrawProposal);
expectNotAssignable<ProposalType['withdraw']>({
  give: { Deposit: natAmount },
  want: {},
});

expectAssignable<FlowDetail>({ type: 'rebalance' });
expectAssignable<FlowDetail>({ type: 'deposit', amount: natAmount });
expectNotAssignable<FlowDetail>({ type: 'deposit' });

expectAssignable<FlowStatus>({ state: 'run', step: 1, how: 'start' });
expectAssignable<FlowStatus>({
  state: 'fail',
  step: 1,
  how: 'submit',
  error: 'boom',
});
expectNotAssignable<FlowStatus>({ state: 'done', step: 1 });

const assetRef: AssetPlaceRef = '<Cash>';

const flowStep: FlowStep = {
  how: 'send',
  amount: natAmount,
  src: assetRef,
  dest: '+agoric',
};

const flowSteps: FlowStep[] = [flowStep, { ...flowStep, dest: '@Base' }];

expectType<FlowKey>('flow1');
expectNotAssignable<FlowKey>('flow');

expectType<PortfolioKey>('portfolio2');
expectNotAssignable<PortfolioKey>('portfolio');

const flowsRunning: Record<FlowKey, FlowDetail> = {
  flow1: { type: 'withdraw', amount: natAmount },
};

const status: StatusFor = {
  contract: {
    contractAccount: cosmosAddress.value,
  },
  pendingTx: publishedTx,
  portfolios: {
    addPortfolio: 'portfolio1',
  },
  portfolio: {
    positionKeys: [instrumentId],
    accountIdByChain: { [supportedChain]: accountId },
    accountsPending: [supportedChain],
    depositAddress: bech32Address,
    nobleForwardingAddress: bech32Address,
    targetAllocation,
    policyVersion: 1,
    rebalanceCount: 0,
    flowCount: 0,
    flowsRunning,
  },
  position: {
    protocol: yieldProtocol,
    accountId,
    totalIn: natAmount,
    totalOut: natAmount,
  },
  flow: { state: 'done', type: 'rebalance' },
  flowSteps,
  flowOrder: [
    [4, [2, 3]],
    [5, [3]],
  ],
};

expectType<StatusFor>(status);

declare const readLatest: (path: string) => Promise<unknown>;
declare const listChildren: (path: string) => Promise<string[]>;

const positionNodes: Partial<Record<PoolKey, StatusFor['position']>> = {
  [instrumentId]: status.position,
};

const materialized = materializePortfolioPositions({
  status: status.portfolio,
  positionNodes,
});
expectType<Partial<Record<PoolKey, unknown>>>(materialized.positions);
expectType<
  Partial<Record<SupportedChain, { positions: readonly unknown[] }>>
>(materialized.positionsByChain);

expectType<Promise<PortfolioLatestSnapshot>>(
  readPortfolioLatest({
    readLatest,
    listChildren,
    portfoliosPathPrefix: 'published.ymax0.portfolios',
    portfolioKey: 'portfolio1',
    includePositions: true,
  }),
);

const pending = selectPendingFlows({
  portfolioKey: 'portfolio1',
  status: status.portfolio,
  flows: {
    flow1: {
      flowKey: 'flow1',
      detail: flowsRunning.flow1,
      status: undefined,
      steps: undefined,
      order: undefined,
      phase: 'init',
    },
  },
  },
});
expectType<readonly FlowNodeLatest[]>(pending);

const mockReaders = makeMockVstorageReaders();
expectType<Promise<unknown>>(mockReaders.readLatest('path'));
expectType<Promise<string[]>>(mockReaders.listChildren('path'));

declare const readAt: (
  path: string,
  height?: number | bigint,
) => Promise<{ blockHeight: number | bigint; values: unknown[] }>;

const historyIterator = iterateVstorageHistory({
  readAt,
  path: 'published.demo',
});
expectAssignable<AsyncIterableIterator<any>>(historyIterator);

const places = enumeratePortfolioPlaces({ status: status.portfolio });
expectType<readonly PortfolioPositionPlace[]>(places.positions);
expectType<readonly PortfolioChainAccountPlace[]>(places.chainAccounts);

// Ensure every Axelar chain key is covered by SupportedChain.
expectAssignable<keyof typeof SupportedChain>(
  null as unknown as keyof typeof AxelarChain,
);
