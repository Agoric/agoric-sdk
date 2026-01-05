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
import type {
  AssetPlaceRef,
  FlowDetail,
  FlowKey,
  FlowStatus,
  FlowStep,
  InterChainAccountRef,
  PortfolioKey,
  ProposalType,
  SeatKeyword,
  StatusFor,
  TargetAllocation,
} from '../src/types.js';

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

expectAssignable<InterChainAccountRef>('@Base');
expectNotAssignable<InterChainAccountRef>('Arbitrum');

expectAssignable<AssetPlaceRef>('<Deposit>');
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
  dest: '@Base',
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

// Ensure every Axelar chain key is covered by SupportedChain.
expectAssignable<keyof typeof SupportedChain>(
  null as unknown as keyof typeof AxelarChain,
);
