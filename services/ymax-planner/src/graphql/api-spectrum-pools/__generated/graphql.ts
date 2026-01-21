/* eslint-disable */
import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** The JSON scalar type for method information */
  JSON: { input: any; output: any; }
};

export type ApyResult = {
  __typename?: 'APYResult';
  baseApy?: Maybe<Scalars['String']['output']>;
  extraApy?: Maybe<Scalars['String']['output']>;
  totalApy?: Maybe<Scalars['String']['output']>;
};

export type PendleImpliedApyCalculation = {
  __typename?: 'PendleImpliedApyCalculation';
  address?: Maybe<Scalars['String']['output']>;
  chain?: Maybe<Scalars['Int']['output']>;
  daysToExpiry?: Maybe<Scalars['Float']['output']>;
  effectivePtExchangeRate?: Maybe<Scalars['Float']['output']>;
  error?: Maybe<Scalars['String']['output']>;
  expiryDate?: Maybe<Scalars['String']['output']>;
  impliedApy?: Maybe<Scalars['Float']['output']>;
  pool?: Maybe<Scalars['String']['output']>;
};

export type PendlePoolUserImpliedApyInput = {
  address: Scalars['String']['input'];
  chain: Scalars['String']['input'];
  pool: Scalars['String']['input'];
};

export type PoolBalanceData = {
  __typename?: 'PoolBalanceData';
  address: Scalars['String']['output'];
  borrowAmount: Scalars['Float']['output'];
  chain: Scalars['String']['output'];
  pool: Scalars['String']['output'];
  results: Array<PoolBalanceResult>;
  supplyBalance: Scalars['Float']['output'];
};

export type PoolBalanceResult = {
  __typename?: 'PoolBalanceResult';
  borrowAmount?: Maybe<Scalars['Float']['output']>;
  error?: Maybe<Scalars['String']['output']>;
  pool: Scalars['String']['output'];
  supplyBalance?: Maybe<Scalars['Float']['output']>;
};

export type ProtocolAprData = {
  __typename?: 'ProtocolAPRData';
  apr: Scalars['Float']['output'];
  chain: Scalars['String']['output'];
  height: Scalars['Int']['output'];
  protocol: Scalars['String']['output'];
};

export type ProtocolPoolChainInput = {
  chain: Scalars['String']['input'];
  pool: Scalars['String']['input'];
  protocol: Scalars['String']['input'];
};

export type ProtocolPoolDetailsResult = {
  __typename?: 'ProtocolPoolDetailsResult';
  apy?: Maybe<ApyResult>;
  chain: Scalars['String']['output'];
  error?: Maybe<Scalars['String']['output']>;
  pool?: Maybe<Scalars['String']['output']>;
  protocol?: Maybe<Scalars['String']['output']>;
  tvl?: Maybe<TvlResult>;
};

export type ProtocolPoolPriceInput = {
  chain: Scalars['String']['input'];
  pool: Scalars['String']['input'];
  protocol: Scalars['String']['input'];
};

export type ProtocolPoolPriceResult = {
  __typename?: 'ProtocolPoolPriceResult';
  chain: Scalars['String']['output'];
  error?: Maybe<Scalars['String']['output']>;
  pool: Scalars['String']['output'];
  price?: Maybe<Scalars['JSON']['output']>;
  protocol: Scalars['String']['output'];
};

export type ProtocolPoolUserBalanceInput = {
  address: Scalars['String']['input'];
  chain: Scalars['String']['input'];
  pool: Scalars['String']['input'];
  protocol?: InputMaybe<Scalars['String']['input']>;
};

export type ProtocolPoolUserBalanceResult = {
  __typename?: 'ProtocolPoolUserBalanceResult';
  balance?: Maybe<Scalars['JSON']['output']>;
  chain: Scalars['String']['output'];
  error?: Maybe<Scalars['String']['output']>;
  pool?: Maybe<Scalars['String']['output']>;
  protocol?: Maybe<Scalars['String']['output']>;
};

export type Query = {
  __typename?: 'Query';
  /** Get all available methods for each chain */
  getMethodInfo: Scalars['JSON']['output'];
  /** Get the details for a pool protocol (TVL and APY) */
  getProtocolPoolDetails: Array<ProtocolPoolDetailsResult>;
  /** Get protocol pool price(s) in USD for supported protocols (aave, morpho, pendle) */
  getProtocolPoolPrice: Array<ProtocolPoolPriceResult>;
  /** Get the user balance in a pool for protocol on a chain */
  getProtocolPoolUserBalance: Array<ProtocolPoolUserBalanceResult>;
  /** Calculate implied APY for a user's PT position */
  pendleImpliedApy: Array<PendleImpliedApyCalculation>;
};


export type QueryGetProtocolPoolDetailsArgs = {
  input: Array<ProtocolPoolChainInput>;
};


export type QueryGetProtocolPoolPriceArgs = {
  input: Array<ProtocolPoolPriceInput>;
};


export type QueryGetProtocolPoolUserBalanceArgs = {
  input: Array<ProtocolPoolUserBalanceInput>;
};


export type QueryPendleImpliedApyArgs = {
  input: Array<PendlePoolUserImpliedApyInput>;
};

export type TvlResult = {
  __typename?: 'TVLResult';
  totals?: Maybe<Scalars['JSON']['output']>;
  underlying?: Maybe<Scalars['JSON']['output']>;
};

export type GetBalancesQueryVariables = Exact<{
  positions: Array<ProtocolPoolUserBalanceInput> | ProtocolPoolUserBalanceInput;
}>;


export type GetBalancesQuery = { __typename?: 'Query', balances: Array<{ __typename?: 'ProtocolPoolUserBalanceResult', chain: string, protocol?: string | null, pool?: string | null, balance?: any | null, error?: string | null }> };

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>;
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  override toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}

export const GetBalancesDocument = new TypedDocumentString(`query getBalances(\$positions: [ProtocolPoolUserBalanceInput!]!) {
  balances: getProtocolPoolUserBalance(input: \$positions) {
    chain
    protocol
    pool
    balance
    error
  }
}`) as unknown as TypedDocumentString<GetBalancesQuery, GetBalancesQueryVariables>;