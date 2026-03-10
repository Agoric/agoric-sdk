/**
 * @file pure types, no runtime, ignored by Ava
 */

import type { HostInterface, HostOf } from '@agoric/async-flow';
import type {
  AnyJson,
  JsonSafe,
  MessageBody,
  Proto3CodecHelper,
  ResponseTypeUrl,
  TypeFromUrl,
} from '@agoric/cosmic-proto';
import type {
  QueryAllBalancesResponse as QueryAllBalancesResponseType,
  QueryBalanceResponse as QueryBalanceResponseType,
} from '@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js';
import type { MsgDelegateResponse as MsgDelegateResponseType } from '@agoric/cosmic-proto/cosmos/staking/v1beta1/tx.js';
import type { ResponseQuery } from '@agoric/cosmic-proto/tendermint/abci/types.js';
import type { Vow, VowTools } from '@agoric/vow';
import type { ResolvedPublicTopic } from '@agoric/zoe/src/contractSupport/topics.js';
import type { Passable } from '@endo/marshal';
import { expectAssignable, expectError, expectNotType, expectType } from 'tsd';
import type { TxBody } from '@agoric/cosmic-proto/cosmos/tx/v1beta1/tx.js';
import type {
  TargetApp,
  TargetRegistration,
} from '@agoric/vats/src/bridge-target.js';
import {
  prepareCosmosOrchestrationAccount as prepareCOA,
  type CosmosOrchestrationAccount,
} from '../src/exos/cosmos-orchestration-account.js';
import type { LocalOrchestrationAccountKit } from '../src/exos/local-orchestration-account.js';
import type { OrchestrationFacade } from '../src/facade.js';
import type {
  AmountArg,
  Chain,
  CosmosActionOptions,
  CosmosChainAddress,
  ChainInfo,
  CosmosChainInfo,
  CosmosValidatorAddress,
  DenomAmount,
  OrchestrationAccount,
  Orchestrator,
  StakingAccountActions,
  KnownChains,
} from '../src/types.js';
import { Any as OrchAny } from '../src/utils/codecs.js';
import type { ResolvedContinuingOfferResult } from '../src/utils/zoe-tools.js';
import { withChainCapabilities } from '../src/chain-capabilities.js';
import fetchedChainInfo from '../src/fetched-chain-info.js';
import cctpChainInfo from '../src/cctp-chain-info.js';
import { tryDecodeResponses } from '../src/utils/cosmos.js';

const MsgDelegate: Proto3CodecHelper<'/cosmos.staking.v1beta1.MsgDelegate'> =
  null as any;
const MsgDelegateResponse: Proto3CodecHelper<'/cosmos.staking.v1beta1.MsgDelegateResponse'> =
  null as any;
const QueryAllBalancesRequest: Proto3CodecHelper<'/cosmos.bank.v1beta1.QueryAllBalancesRequest'> =
  null as any;
const QueryAllBalancesResponse: Proto3CodecHelper<'/cosmos.bank.v1beta1.QueryAllBalancesResponse'> =
  null as any;
const QueryBalanceRequest: Proto3CodecHelper<'/cosmos.bank.v1beta1.QueryBalanceRequest'> =
  null as any;
const QueryBalanceResponse: Proto3CodecHelper<'/cosmos.bank.v1beta1.QueryBalanceResponse'> =
  null as any;
const Any: typeof OrchAny = null as any;

const anyVal = null as any;

const vt: VowTools = null as any;

const validatorAddr = {
  chainId: 'agoric3',
  value: 'agoric1valoperhello',
  encoding: 'bech32',
} as const;
expectType<CosmosValidatorAddress>(validatorAddr);

const chainAddr = {
  chainId: 'agoric-3',
  value: 'agoric1pleab',
  encoding: 'bech32',
} as const;
expectType<CosmosChainAddress>(chainAddr);
expectNotType<CosmosValidatorAddress>(chainAddr);

{
  // @ts-expect-error
  const notVa: CosmosValidatorAddress = chainAddr;
}

{
  const lcak: LocalOrchestrationAccountKit = null as any;
  const results = await lcak.holder.executeTx([
    MsgDelegate.typedJson({
      amount: {
        amount: '1',
        denom: 'ubld',
      },
      validatorAddress: 'agoric1valoperhello',
      delegatorAddress: 'agoric1pleab',
    }),
    QueryAllBalancesRequest.typedJson({
      address: 'agoric1pleab',
    }),
  ] as const);
  expectType<MsgDelegateResponseType>(results[0]);
  expectType<QueryAllBalancesResponseType>(results[1]);
}

// CosmosOrchestrationAccount interfaces
{
  const coa: CosmosOrchestrationAccount = null as any;
  const resultP = coa.executeTxProto3([
    Any.toJSON(
      MsgDelegate.toProtoMsg({
        amount: {
          amount: '1',
          denom: 'ubld',
        },
        validatorAddress: 'agoric1valoperhello',
        delegatorAddress: 'agoric1pleab',
      }),
    ),
    Any.toJSON(
      QueryAllBalancesRequest.toProtoMsg({
        address: 'agoric1pleab',
      }),
    ),
  ] as const);

  expectType<
    Vow<
      readonly [
        MessageBody<typeof MsgDelegateResponse.typeUrl>,
        MessageBody<typeof QueryAllBalancesResponse.typeUrl>,
      ]
    >
  >(resultP);

  const resps = await vt.when(resultP);
  expectType<2>(resps.length);

  // Check that the result is a tuple of the expected types.
  expectType<readonly [MsgDelegateResponseType, QueryAllBalancesResponseType]>(
    resps,
  );

  // Ensure the result is not widened to (MsgDelegateResponseType | QueryAllBalancesResponseType)[]
  expectNotType<
    readonly [QueryAllBalancesResponseType, MsgDelegateResponseType]
  >(resps);

  const prepareCosmosOrchestrationAccount: typeof prepareCOA = null as any;
  const makeCosmosOrchestrationAccount = prepareCosmosOrchestrationAccount(
    anyVal,
    anyVal,
  );
  makeCosmosOrchestrationAccount(
    anyVal,
    anyVal,
  ) satisfies HostInterface<StakingAccountActions>;
}

// HostOf
{
  type PromiseFn = () => Promise<number>;
  type SyncFn = () => number;

  type VowFn = HostOf<PromiseFn>;
  type StillSyncFn = HostOf<SyncFn>;

  // Use type assertion instead of casting
  const vowFn: VowFn = (() => ({}) as Vow<number>) as VowFn;
  expectType<() => Vow<number>>(vowFn);

  const syncFn: StillSyncFn = (() => 42) as StillSyncFn;
  expectType<() => number>(syncFn);

  // Negative test
  expectNotType<() => Promise<number>>(vowFn);

  const getDenomInfo: HostOf<Orchestrator['getDenomInfo']> = null as any;
  const chainHostOf = getDenomInfo('uatom', 'cosmoshub').chain;
  expectType<Vow<any>>(chainHostOf.getChainInfo());
}

{
  // HostInterface

  const chain: Chain<ChainInfo> = null as any;
  expectType<Promise<ChainInfo>>(chain.getChainInfo());
  const chainHostInterface: HostInterface<Chain<ChainInfo>> = null as any;
  expectType<Vow<ChainInfo>>(chainHostInterface.getChainInfo());

  const publicTopicRecord: HostInterface<
    Record<string, ResolvedPublicTopic<unknown>>
  > = {
    someTopic: {
      subscriber: null as any,
      storagePath: 'published.somewhere',
    },
  };
  // @ts-expect-error the promise from `subscriber.getUpdateSince` can't be used in a flow
  expectType<Record<string, ResolvedPublicTopic<unknown>>>(publicTopicRecord);
}

// HostOf with TransferSteps
{
  type TransferStepsVow = HostOf<OrchestrationAccount<any>['transferSteps']>;

  const transferStepsVow: TransferStepsVow = (..._args: any[]): Vow<any> =>
    ({}) as any;
  expectType<(...args: any[]) => Vow<any>>(transferStepsVow);
}

// VowifyAll
{
  type PromiseObject = {
    foo: () => Promise<number>;
    bar: (x: string) => Promise<boolean>;
    bizz: () => Record<string, number>;
  };

  type VowObject = HostInterface<PromiseObject>;

  const vowObject: VowObject = {
    foo: () => ({}) as Vow<number>,
    bar: (_x: string) => ({}) as Vow<boolean>,
    bizz: () => ({ foo: 1 }),
  };

  expectType<{
    foo: () => Vow<number>;
    bar: (x: string) => Vow<boolean>;
    bizz: () => Record<string, number>;
  }>(vowObject);
}

{
  // orchestrate()

  const facade: OrchestrationFacade = null as any;
  const echo = <T extends number>(
    _orc: Orchestrator,
    _ctx: undefined,
    num: T,
  ) => num;
  // @ts-expect-error requires an async function
  facade.orchestrate('name', undefined, echo);

  const slowEcho = <T extends number>(
    _orc: Orchestrator,
    _ctx: undefined,
    num: T,
  ) => Promise.resolve(num);
  {
    const h = facade.orchestrate('name', undefined, slowEcho);
    // TODO keep the return type as Vow<T>
    expectType<(num: number) => Vow<number>>(h);
    expectType<Vow<number>>(h(42));
    // @ts-expect-error literal not carried, widened to number
    expectType<Vow<42>>(h(42));
  }

  const makeOfferResult = () =>
    Promise.resolve({} as ResolvedContinuingOfferResult);
  {
    const h = facade.orchestrate('name', undefined, makeOfferResult);
    expectType<Vow<ResolvedContinuingOfferResult>>(h());
  }
}

// Test LocalChain.query()
{
  type ChainFacade = Chain<{ chainId: 'agoriclocal' }>;
  const localChain: ChainFacade = null as any;
  const results = localChain.query([
    QueryBalanceRequest.typedJson({
      address: 'agoric1pleab',
      denom: 'ubld',
    }),
    QueryAllBalancesRequest.typedJson({
      address: 'agoric1pleab',
    }),
  ] as const);

  expectType<ReturnType<ChainFacade['query']>>(results);
  expectType<{ reply: JsonSafe<QueryBalanceResponseType> }>(results[0]);
  expectType<{ reply: JsonSafe<QueryAllBalancesResponseType> }>(results[1]);
}

// Test RemoteCosmosChain.query() (icqEnabled: true)
{
  type ChainFacade = Chain<CosmosChainInfo & { icqEnabled: true }>;
  const remoteChain: ChainFacade = null as any;
  const results = remoteChain.query([
    {
      path: '/cosmos.staking.v1beta1.Query/Delegation',
      data: 'base64bytes=',
      height: '1',
      prove: true,
    },
    {
      path: '/cosmos.bank.v1beta1.Query/Balance',
      data: 'base64bytes=',
      height: '1',
      prove: true,
    },
  ] as const);

  expectType<ReturnType<ChainFacade['query']>>(results);
  expectType<JsonSafe<ResponseQuery>>(results[0]);
  expectType<JsonSafe<ResponseQuery>>(results[1]);
}

// Test RemoteCosmosChain.query() (icqEnabled: false)
{
  type ChainFacade = Chain<CosmosChainInfo>;
  const remoteChain: ChainFacade = null as any;

  expectType<never>(remoteChain.query);

  // @ts-expect-error query will throw an error
  const results = remoteChain.query([
    {
      path: '/cosmos.bank.v1beta1.Query/Balance',
      data: 'base64bytes=',
      height: '1',
      prove: true,
    },
  ] as const);
  results;
}

{
  const addr = {
    chainId: 'chainId',
    encoding: 'bech32',
    value: 'agoric1valoperfoo',
  };
  expectAssignable<Passable>(addr);
  const denomAmount = { denom: 'bld', value: 10n };
  expectAssignable<Passable>(denomAmount);

  // XXX when these types are interfaces this test fails.
  // TODO https://github.com/Agoric/agoric-sdk/issues/9822
  expectAssignable<Passable>(addr as CosmosValidatorAddress);
  expectAssignable<Passable>(denomAmount as DenomAmount);
}

// Test LocalAccountMethods
{
  type ChainFacade = Chain<CosmosChainInfo & { chainId: 'agoric-3' }>;
  const remoteChain: ChainFacade = null as any;

  const account = await remoteChain.makeAccount();

  // Verify monitorTransfers is available
  expectType<(tap: TargetApp) => Promise<TargetRegistration>>(
    account.monitorTransfers,
  );

  // Verify StakingAccountActions are available (StakingAccountQueries not yet supported)
  expectType<
    (validator: CosmosValidatorAddress, amount: AmountArg) => Promise<unknown>
  >(account.delegate);

  // @ts-expect-error executeEncodedTx not available on localAccount
  account.executeEncodedTx;
}

// Test CosmosChainAccountMethods
{
  type ChainFacade = Chain<
    CosmosChainInfo & {
      chainId: 'cosmoshub-4';
      stakingTokens: [{ denom: 'uatom' }];
    }
  >;
  const remoteChain: ChainFacade = null as any;

  const account = await remoteChain.makeAccount();

  // Verify executeEncodedTx is available
  expectType<
    (
      msgs: AnyJson[],
      opts?: Partial<Omit<TxBody, 'messages'>>,
    ) => Promise<string>
  >(account.executeEncodedTx);

  expectType<
    <TUS extends readonly (keyof TypeFromUrl | unknown)[]>(
      msgs: Readonly<{ [K in keyof TUS]: AnyJson<TUS[K]> }>,
      opts?: CosmosActionOptions,
    ) => Promise<{ [K in keyof TUS]: MessageBody<ResponseTypeUrl<TUS[K]>> }>
  >(account.executeTxProto3);

  // Verify delegate is available via stakingTokens parameter
  expectType<
    (
      validator: CosmosValidatorAddress,
      amount: AmountArg,
      opts?: CosmosActionOptions,
    ) => Promise<unknown>
  >(account.delegate);

  // @ts-expect-error `depositForBurn` only available for noble
  account.depositForBurn;
}

// Test NobleAccountMethods
{
  type ChainFacade = Chain<
    CosmosChainInfo & {
      chainId: 'noble-1';
    }
  >;
  const remoteChain: ChainFacade = null as any;
  const account = await remoteChain.makeAccount();

  expectType<(destination, amount: AmountArg) => Promise<unknown>>(
    account.depositForBurn,
  );

  // @ts-expect-error StakingMethods not available on noble
  account.delegate;
}

// KnownChains - Agoric
{
  const fetchedAgoricInfo = fetchedChainInfo.agoric;

  // ensure capabilities added to KnownChains
  const agoricChainInfo = withChainCapabilities(fetchedChainInfo).agoric;
  expectType<KnownChains['agoric']>(agoricChainInfo);
  expectType<boolean>(agoricChainInfo.pfmEnabled);
  expectType<boolean>(agoricChainInfo.icqEnabled);
  expectType<boolean>(agoricChainInfo.icaEnabled);
  // fetched info is preserved
  expectType<'agoric-3'>(fetchedAgoricInfo.chainId);
  expectType<'agoric'>(fetchedAgoricInfo.bech32Prefix);
  expectType<'cosmos'>(fetchedAgoricInfo.namespace);
  expectType<'agoric-3'>(fetchedAgoricInfo.reference);
  expectType<string>(fetchedAgoricInfo.stakingTokens[0].denom);
}

// KnownChains - Ethereum
{
  const ethChainInfo = cctpChainInfo.ethereum;
  expectType<KnownChains['ethereum']>(ethChainInfo);

  expectType<'eip155'>(ethChainInfo.namespace);
  expectType<'1'>(ethChainInfo.reference);
  expectType<number>(ethChainInfo.cctpDestinationDomain);
}
