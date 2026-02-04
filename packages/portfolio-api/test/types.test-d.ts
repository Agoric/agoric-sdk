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
  LocalChainAccountRef,
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
expectAssignable<FlowDetail>({
  type: 'deposit',
  amount: natAmount,
  fromChain: 'Ethereum',
});
expectAssignable<FlowDetail>({ type: 'withdraw', amount: natAmount });
expectAssignable<FlowDetail>({
  type: 'withdraw',
  amount: natAmount,
  toChain: 'Ethereum',
});
expectNotAssignable<FlowDetail>({ type: 'deposit' });
expectNotAssignable<FlowDetail>({ type: 'withdraw' });

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
    depositFactoryAddresses: {
      Arbitrum: `eip155:1234:0x5678`,
      Avalanche: `eip155:4321:0x8765`,
      Base: `eip155:1111:0x2222`,
      Ethereum: `eip155:1:0x3333`,
      Optimism: `eip155:10:0x4444`,
    },
    evmRemoteAccountRouterConfig: {
      currentRouterAddresses: {
        Arbitrum: `eip155:1234:0xabcd`,
        Avalanche: `eip155:4321:0xfedc`,
        Base: `eip155:1111:0xbbbb`,
        Ethereum: `eip155:1:0xcccc`,
        Optimism: `eip155:10:0xdddd`,
      },
      factoryAddresses: {
        Arbitrum: `eip155:1234:0x1a2b`,
        Avalanche: `eip155:4321:0x9f8e`,
        Base: `eip155:1111:0x2b2b`,
        Ethereum: `eip155:1:0x3c3c`,
        Optimism: `eip155:10:0x4d4d`,
      },
      remoteAccountBytecodeHash: `0x1234567890abcdef`,
    },
  },
  evmWallet: {
    updated: 'messageUpdate',
    nonce: 1n,
    deadline: 1700000000n,
    status: 'ok',
    result: 'foo',
  },
  evmWalletPortfolios: [`published.ymax0.portfolios.portfolio123`],
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

// Ensure every Axelar chain key is covered by SupportedChain.
expectAssignable<keyof typeof SupportedChain>(
  null as unknown as keyof typeof AxelarChain,
);
