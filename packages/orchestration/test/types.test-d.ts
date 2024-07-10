/**
 * @file pure types types, no runtime, ignored by Ava
 */
import { expectNotType, expectType } from 'tsd';
import { typedJson } from '@agoric/cosmic-proto';
import type { MsgDelegateResponse } from '@agoric/cosmic-proto/cosmos/staking/v1beta1/tx.js';
import type { QueryAllBalancesResponse } from '@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js';
import type { Vow } from '@agoric/vow';
import type { GuestAsyncFunc, HostInterface, HostOf } from '@agoric/async-flow';
import type {
  ChainAddress,
  CosmosValidatorAddress,
  StakingAccountActions,
  OrchestrationAccount,
} from '../src/types.js';
import type { LocalOrchestrationAccountKit } from '../src/exos/local-orchestration-account.js';
import { prepareCosmosOrchestrationAccount } from '../src/exos/cosmos-orchestration-account.js';

const anyVal = null as any;

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
expectType<ChainAddress>(chainAddr);
expectNotType<CosmosValidatorAddress>(chainAddr);

{
  // @ts-expect-error
  const notVa: CosmosValidatorAddress = chainAddr;
}

{
  const lcak: LocalOrchestrationAccountKit = null as any;
  const results = await lcak.holder.executeTx([
    typedJson('/cosmos.staking.v1beta1.MsgDelegate', {
      amount: {
        amount: '1',
        denom: 'ubld',
      },
      validatorAddress: 'agoric1valoperhello',
      delegatorAddress: 'agoric1pleab',
    }),
    typedJson('/cosmos.bank.v1beta1.QueryAllBalancesRequest', {
      address: 'agoric1pleab',
    }),
  ] as const);
  expectType<MsgDelegateResponse>(results[0]);
  expectType<QueryAllBalancesResponse>(results[1]);
}

// CosmosOrchestrationAccount interfaces
{
  const makeCosmosOrchestrationAccount = prepareCosmosOrchestrationAccount(
    anyVal,
    anyVal,
    anyVal,
    anyVal,
  );
  makeCosmosOrchestrationAccount(
    anyVal,
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
}

// PromiseToVow with TransferSteps
{
  type TransferStepsVow = HostOf<OrchestrationAccount<any>['transferSteps']>;

  const transferStepsVow: TransferStepsVow = (...args: any[]): Vow<any> =>
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
    bar: (x: string) => ({}) as Vow<boolean>,
    bizz: () => ({ foo: 1 }),
  };

  expectType<{
    foo: () => Vow<number>;
    bar: (x: string) => Vow<boolean>;
    bizz: () => Record<string, number>;
  }>(vowObject);
}
