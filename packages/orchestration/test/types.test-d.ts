/* eslint @typescript-eslint/no-floating-promises: "warn" */
/**
 * @file pure types types, no runtime, ignored by Ava
 */
import { expectNotType, expectType } from 'tsd';
import type { ChainAddress, CosmosValidatorAddress } from '../src/types.js';

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
