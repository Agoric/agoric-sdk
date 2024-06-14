/**
 * @file pure types types, no runtime, ignored by Ava
 */
import { expectNotType, expectType } from 'tsd';
import { typedJson } from '@agoric/cosmic-proto';
import type { MsgDelegateResponse } from '@agoric/cosmic-proto/cosmos/staking/v1beta1/tx.js';
import type { QueryAllBalancesResponse } from '@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js';
import type {
  ChainAddress,
  CosmosValidatorAddress,
  StakingAccountActions,
} from '../src/types.js';
import type { LocalChainAccountKit } from '../src/exos/local-chain-account-kit.js';
import { prepareCosmosOrchestrationAccount } from '../src/exos/cosmosOrchestrationAccount.js';

const anyVal = null as any;

const validatorAddr = {
  chainId: 'agoric3',
  address: 'agoric1valoperhello',
  addressEncoding: 'bech32',
} as const;
expectType<CosmosValidatorAddress>(validatorAddr);

const chainAddr = {
  chainId: 'agoric-3',
  address: 'agoric1pleab',
  addressEncoding: 'bech32',
} as const;
expectType<ChainAddress>(chainAddr);
expectNotType<CosmosValidatorAddress>(chainAddr);

{
  // @ts-expect-error
  const notVa: CosmosValidatorAddress = chainAddr;
}

{
  const lcak: LocalChainAccountKit = null as any;
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
  );
  makeCosmosOrchestrationAccount(
    anyVal,
    anyVal,
    anyVal,
  ) satisfies StakingAccountActions;
}
