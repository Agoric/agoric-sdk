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
  JSON: { input: any; output: any; }
};

export type BitcoinBlockDetails = {
  __typename?: 'BitcoinBlockDetails';
  bits?: Maybe<Scalars['String']['output']>;
  chain: Scalars['String']['output'];
  chainwork?: Maybe<Scalars['String']['output']>;
  confirmations?: Maybe<Scalars['String']['output']>;
  difficulty?: Maybe<Scalars['String']['output']>;
  hash?: Maybe<Scalars['String']['output']>;
  height?: Maybe<Scalars['String']['output']>;
  mediantime?: Maybe<Scalars['String']['output']>;
  merkleroot?: Maybe<Scalars['String']['output']>;
  nTx?: Maybe<Scalars['String']['output']>;
  nonce?: Maybe<Scalars['String']['output']>;
  previousblockhash?: Maybe<Scalars['String']['output']>;
  size?: Maybe<Scalars['String']['output']>;
  strippedsize?: Maybe<Scalars['String']['output']>;
  time?: Maybe<Scalars['String']['output']>;
  tx?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  version?: Maybe<Scalars['String']['output']>;
  versionHex?: Maybe<Scalars['String']['output']>;
  weight?: Maybe<Scalars['String']['output']>;
};

/**  The block details, can be an EVM, Solana, Tendermint or Bitcoin block  */
export type BlockDetails = BitcoinBlockDetails | EvmBlockDetails | SolanaBlockDetails | TendermintBlockDetails;

/** The response when getting an address' balance of a token on a chain */
export type ChainAddressTokenBalance = {
  __typename?: 'ChainAddressTokenBalance';
  /**  The address  */
  address?: Maybe<Scalars['String']['output']>;
  /**  The balance  */
  balance?: Maybe<Scalars['String']['output']>;
  /**  The chain name  */
  chain: Scalars['String']['output'];
  /**  An error string  */
  error?: Maybe<Scalars['String']['output']>;
  /**  The token, this can be native | address | denom  */
  token?: Maybe<Scalars['String']['output']>;
};

/** The input to get a balance of a user for a token on a chain */
export type ChainAddressTokenInput = {
  /**  The address to query  */
  address: Scalars['String']['input'];
  /**  The chain name  */
  chain: Scalars['String']['input'];
  /**  The token to query, this can be native | address | denom  */
  token: Scalars['String']['input'];
};

/** The response when getting a block of a chain */
export type ChainBlockDetails = {
  __typename?: 'ChainBlockDetails';
  /**  The block details  */
  block?: Maybe<BlockDetails>;
  /**  The chain name  */
  chain: Scalars['String']['output'];
  /**  Error message  */
  error?: Maybe<Scalars['String']['output']>;
  /**  The hash of the block  */
  hash?: Maybe<Scalars['String']['output']>;
  /**  The block number  */
  height?: Maybe<Scalars['String']['output']>;
};

/** The input to get a block by number/height for a chain */
export type ChainBlockNumberInput = {
  /**  The block number or height  */
  block: Scalars['String']['input'];
  /**  The chain name  */
  chain: Scalars['String']['input'];
};

/** The input to get a block by hash for a chain */
export type ChainHashInput = {
  /**  The chain name  */
  chain: Scalars['String']['input'];
  /**  The hash of the block  */
  hash: Scalars['String']['input'];
};

/** The response when getting the latest block of a chain */
export type ChainHeight = {
  __typename?: 'ChainHeight';
  /**  The chain name  */
  chain: Scalars['String']['output'];
  /**  Error message  */
  error?: Maybe<Scalars['String']['output']>;
  /**  The latest block number / height  */
  height?: Maybe<Scalars['String']['output']>;
};

/** The response when getting method information for a chain */
export type ChainMethodInfo = {
  __typename?: 'ChainMethodInfo';
  /**  The chain ID  */
  chainId: Scalars['String']['output'];
  /**  The available methods for this chain  */
  methods: Array<Scalars['String']['output']>;
  /**  The chain name  */
  name: Scalars['String']['output'];
  /**  The chain type (EVM, Solana, Bitcoin, Tendermint)  */
  type: Scalars['String']['output'];
};

/** The response when getting a transaction of a chain */
export type ChainTransactionDetails = {
  __typename?: 'ChainTransactionDetails';
  /**  The chain name  */
  chain: Scalars['String']['output'];
  /**  Error message  */
  error?: Maybe<Scalars['String']['output']>;
  /**  The block number  */
  hash?: Maybe<Scalars['String']['output']>;
  /**  The transaction details  */
  transaction?: Maybe<TransactionDetails>;
};

export type EvmBlockDetails = {
  __typename?: 'EVMBlockDetails';
  baseFeePerGas?: Maybe<Scalars['String']['output']>;
  blobGasUsed?: Maybe<Scalars['String']['output']>;
  chain: Scalars['String']['output'];
  difficulty?: Maybe<Scalars['String']['output']>;
  excessBlobGas?: Maybe<Scalars['String']['output']>;
  extraData?: Maybe<Scalars['String']['output']>;
  gasLimit?: Maybe<Scalars['String']['output']>;
  gasUsed?: Maybe<Scalars['String']['output']>;
  hash?: Maybe<Scalars['String']['output']>;
  logsBloom?: Maybe<Scalars['String']['output']>;
  miner?: Maybe<Scalars['String']['output']>;
  mixHash?: Maybe<Scalars['String']['output']>;
  nonce?: Maybe<Scalars['String']['output']>;
  number?: Maybe<Scalars['String']['output']>;
  parentBeaconBlockRoot?: Maybe<Scalars['String']['output']>;
  parentHash?: Maybe<Scalars['String']['output']>;
  receiptsRoot?: Maybe<Scalars['String']['output']>;
  sha3Uncles?: Maybe<Scalars['String']['output']>;
  size?: Maybe<Scalars['String']['output']>;
  stateRoot?: Maybe<Scalars['String']['output']>;
  timestamp?: Maybe<Scalars['String']['output']>;
  transactions?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  transactionsRoot?: Maybe<Scalars['String']['output']>;
  withdrawals?: Maybe<Array<Maybe<EvmWithdrawal>>>;
  withdrawalsRoot?: Maybe<Scalars['String']['output']>;
};

export type EvmBlockFeeInfo = {
  __typename?: 'EVMBlockFeeInfo';
  baseFeePerGas?: Maybe<Scalars['String']['output']>;
  chain: Scalars['String']['output'];
  error?: Maybe<Scalars['String']['output']>;
  maxPriorityFeePerGas?: Maybe<Scalars['String']['output']>;
};

export type EvmTransactionDetails = {
  __typename?: 'EVMTransactionDetails';
  accessList?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  blockHash?: Maybe<Scalars['String']['output']>;
  blockNumber?: Maybe<Scalars['String']['output']>;
  chain: Scalars['String']['output'];
  chainId?: Maybe<Scalars['String']['output']>;
  from?: Maybe<Scalars['String']['output']>;
  gas?: Maybe<Scalars['String']['output']>;
  gasPrice?: Maybe<Scalars['String']['output']>;
  hash?: Maybe<Scalars['String']['output']>;
  input?: Maybe<Scalars['String']['output']>;
  maxFeePerGas?: Maybe<Scalars['String']['output']>;
  maxPriorityFeePerGas?: Maybe<Scalars['String']['output']>;
  nonce?: Maybe<Scalars['String']['output']>;
  r?: Maybe<Scalars['String']['output']>;
  s?: Maybe<Scalars['String']['output']>;
  to?: Maybe<Scalars['String']['output']>;
  transactionIndex?: Maybe<Scalars['String']['output']>;
  type?: Maybe<Scalars['String']['output']>;
  v?: Maybe<Scalars['String']['output']>;
  value?: Maybe<Scalars['String']['output']>;
  yParity?: Maybe<Scalars['String']['output']>;
};

export type EvmWithdrawal = {
  __typename?: 'EVMWithdrawal';
  address?: Maybe<Scalars['String']['output']>;
  amount?: Maybe<Scalars['String']['output']>;
  index?: Maybe<Scalars['String']['output']>;
  validatorIndex?: Maybe<Scalars['String']['output']>;
};

export type InnerInstruction = {
  __typename?: 'InnerInstruction';
  index?: Maybe<Scalars['String']['output']>;
  instructions?: Maybe<Array<Maybe<Instruction>>>;
};

export type Instruction = {
  __typename?: 'Instruction';
  accounts?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  data?: Maybe<Scalars['String']['output']>;
  programIdIndex?: Maybe<Scalars['Int']['output']>;
  stackHeight?: Maybe<Scalars['Int']['output']>;
};

export type LoadedAddresses = {
  __typename?: 'LoadedAddresses';
  readonly?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  writable?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

export type Query = {
  __typename?: 'Query';
  /** Get the balance of an address for a token on different chains */
  getAddressBalance: Array<ChainAddressTokenBalance>;
  /** Get the block by hash on different chains */
  getBlockByHash: Array<ChainBlockDetails>;
  /** Get the block by number/height on different chains */
  getBlockByNumber: Array<ChainBlockDetails>;
  /** Get block fee information (baseFeePerGas and maxPriorityFeePerGas) for EVM chains */
  getBlockFee: Array<EvmBlockFeeInfo>;
  /** Get the latest block heights on different chains */
  getBlockHeights: Array<ChainHeight>;
  /** Get all available methods for each chain */
  getMethodInfo: Scalars['JSON']['output'];
  /** Get the transaction by hash on different chains */
  getTransactionByHash: Array<ChainTransactionDetails>;
};


export type QueryGetAddressBalanceArgs = {
  input: Array<ChainAddressTokenInput>;
};


export type QueryGetBlockByHashArgs = {
  input: Array<ChainHashInput>;
};


export type QueryGetBlockByNumberArgs = {
  input: Array<ChainBlockNumberInput>;
};


export type QueryGetBlockFeeArgs = {
  chains: Array<Scalars['String']['input']>;
};


export type QueryGetBlockHeightsArgs = {
  chains: Array<Scalars['String']['input']>;
};


export type QueryGetTransactionByHashArgs = {
  input: Array<ChainHashInput>;
};

export type SolanaBlockDetails = {
  __typename?: 'SolanaBlockDetails';
  blockHeight?: Maybe<Scalars['String']['output']>;
  blockTime?: Maybe<Scalars['String']['output']>;
  blockhash?: Maybe<Scalars['String']['output']>;
  chain: Scalars['String']['output'];
  parentSlot?: Maybe<Scalars['String']['output']>;
  previousBlockhash?: Maybe<Scalars['String']['output']>;
  rewards?: Maybe<Array<Maybe<SolanaRewards>>>;
  transactions?: Maybe<Array<Maybe<SolanaTransaction>>>;
};

export type SolanaMeta = {
  __typename?: 'SolanaMeta';
  computeUnitsConsumed?: Maybe<Scalars['String']['output']>;
  err?: Maybe<Scalars['String']['output']>;
  fee?: Maybe<Scalars['String']['output']>;
  innerInstructions?: Maybe<Array<Maybe<InnerInstruction>>>;
  loadedAddresses?: Maybe<LoadedAddresses>;
  logMessages?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

export type SolanaRewards = {
  __typename?: 'SolanaRewards';
  commission?: Maybe<Scalars['String']['output']>;
  lamports?: Maybe<Scalars['String']['output']>;
  postBalance?: Maybe<Scalars['String']['output']>;
  pubkey?: Maybe<Scalars['String']['output']>;
  rewardType?: Maybe<Scalars['String']['output']>;
};

export type SolanaTransaction = {
  __typename?: 'SolanaTransaction';
  meta?: Maybe<Scalars['JSON']['output']>;
  transaction?: Maybe<Scalars['JSON']['output']>;
  version?: Maybe<Scalars['JSON']['output']>;
};

export type SolanaTransactionDetails = {
  __typename?: 'SolanaTransactionDetails';
  blockTime?: Maybe<Scalars['String']['output']>;
  chain: Scalars['String']['output'];
  meta?: Maybe<SolanaMeta>;
};

export type TendermintAuthInfo = {
  __typename?: 'TendermintAuthInfo';
  fee: TendermintFee;
  signer_infos: Array<TendermintSignerInfo>;
  tip?: Maybe<Scalars['String']['output']>;
};

export type TendermintBlockDetails = {
  __typename?: 'TendermintBlockDetails';
  chain: Scalars['String']['output'];
  data?: Maybe<TendermintData>;
  evidence?: Maybe<TendermintEvidence>;
  header?: Maybe<TendermintHeader>;
  last_commit?: Maybe<TendermintLastCommit>;
};

export type TendermintBlockId = {
  __typename?: 'TendermintBlockId';
  hash?: Maybe<Scalars['String']['output']>;
  part_set_header?: Maybe<TendermintPartSetHeader>;
};

export type TendermintCoin = {
  __typename?: 'TendermintCoin';
  amount: Scalars['String']['output'];
  denom: Scalars['String']['output'];
};

export type TendermintData = {
  __typename?: 'TendermintData';
  txs?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

export type TendermintEvent = {
  __typename?: 'TendermintEvent';
  attributes: Array<TendermintEventAttribute>;
  type: Scalars['String']['output'];
};

export type TendermintEventAttribute = {
  __typename?: 'TendermintEventAttribute';
  index: Scalars['Boolean']['output'];
  key: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type TendermintEvidence = {
  __typename?: 'TendermintEvidence';
  evidence?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
};

export type TendermintFee = {
  __typename?: 'TendermintFee';
  amount: Array<TendermintCoin>;
  gas_limit: Scalars['String']['output'];
  granter: Scalars['String']['output'];
  payer: Scalars['String']['output'];
};

export type TendermintHeader = {
  __typename?: 'TendermintHeader';
  app_hash?: Maybe<Scalars['String']['output']>;
  chain_id?: Maybe<Scalars['String']['output']>;
  consensus_hash?: Maybe<Scalars['String']['output']>;
  data_hash?: Maybe<Scalars['String']['output']>;
  evidence_hash?: Maybe<Scalars['String']['output']>;
  height?: Maybe<Scalars['String']['output']>;
  last_block_id?: Maybe<TendermintBlockId>;
  last_commit_hash?: Maybe<Scalars['String']['output']>;
  last_results_hash?: Maybe<Scalars['String']['output']>;
  next_validators_hash?: Maybe<Scalars['String']['output']>;
  proposer_address?: Maybe<Scalars['String']['output']>;
  time?: Maybe<Scalars['String']['output']>;
  validators_hash?: Maybe<Scalars['String']['output']>;
  version?: Maybe<TendermintVersion>;
};

export type TendermintLastCommit = {
  __typename?: 'TendermintLastCommit';
  block_id?: Maybe<TendermintBlockId>;
  height?: Maybe<Scalars['String']['output']>;
  round?: Maybe<Scalars['String']['output']>;
  signatures?: Maybe<Array<Maybe<TendermintSignature>>>;
};

export type TendermintModeInfo = {
  __typename?: 'TendermintModeInfo';
  single: TendermintSingleMode;
};

export type TendermintPartSetHeader = {
  __typename?: 'TendermintPartSetHeader';
  hash?: Maybe<Scalars['String']['output']>;
  total?: Maybe<Scalars['Int']['output']>;
};

export type TendermintPublicKey = {
  __typename?: 'TendermintPublicKey';
  /** @deprecated Maps '@type' in JSON */
  _type: Scalars['String']['output'];
  key: Scalars['String']['output'];
};

export type TendermintSignature = {
  __typename?: 'TendermintSignature';
  block_id_flag?: Maybe<Scalars['String']['output']>;
  signature?: Maybe<Scalars['String']['output']>;
  timestamp?: Maybe<Scalars['String']['output']>;
  validator_address?: Maybe<Scalars['String']['output']>;
};

export type TendermintSignerInfo = {
  __typename?: 'TendermintSignerInfo';
  mode_info: TendermintModeInfo;
  public_key: TendermintPublicKey;
  sequence: Scalars['String']['output'];
};

export type TendermintSingleMode = {
  __typename?: 'TendermintSingleMode';
  mode: Scalars['String']['output'];
};

export type TendermintTransactionDetails = {
  __typename?: 'TendermintTransactionDetails';
  chain: Scalars['String']['output'];
  tx_response?: Maybe<TendermintTxResponse>;
};

export type TendermintTx = {
  __typename?: 'TendermintTx';
  auth_info: TendermintAuthInfo;
  body: TendermintTxBody;
  signatures: Array<Scalars['String']['output']>;
};

export type TendermintTxBody = {
  __typename?: 'TendermintTxBody';
  memo: Scalars['String']['output'];
  messages: Array<Scalars['JSON']['output']>;
  timeout_height: Scalars['String']['output'];
};

export type TendermintTxResponse = {
  __typename?: 'TendermintTxResponse';
  code: Scalars['Int']['output'];
  codespace: Scalars['String']['output'];
  data: Scalars['String']['output'];
  events: Array<TendermintEvent>;
  gas_used: Scalars['String']['output'];
  gas_wanted: Scalars['String']['output'];
  height: Scalars['String']['output'];
  info: Scalars['String']['output'];
  raw_log: Scalars['String']['output'];
  timestamp: Scalars['String']['output'];
  tx: TendermintTx;
  txhash: Scalars['String']['output'];
};

export type TendermintVersion = {
  __typename?: 'TendermintVersion';
  app?: Maybe<Scalars['String']['output']>;
  block?: Maybe<Scalars['String']['output']>;
};

/**  The transaction details, can be an EVM, Solana or Cosmos transaction  */
export type TransactionDetails = EvmTransactionDetails | SolanaTransactionDetails | TendermintTransactionDetails;

export type GetBalancesQueryVariables = Exact<{
  accounts: Array<ChainAddressTokenInput> | ChainAddressTokenInput;
}>;


export type GetBalancesQuery = { __typename?: 'Query', balances: Array<{ __typename?: 'ChainAddressTokenBalance', chain: string, address?: string | null, token?: string | null, balance?: string | null, error?: string | null }> };

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

export const GetBalancesDocument = new TypedDocumentString(`
    """
Get the balances for an arbitrary number of accounts.

Each account is identified by a blockchain (for EVM chains, a
'0x<upaddedLowercaseHexDigits>'' representation of their EIP-155 CHAIN_ID [cf.
https://chainlist.org/ ]), address, and token (for EVM chains, a
'0x<hexDigits>' representation of its contract address, visible on e.g.
https://coinmarketcap.com/ ).

Note that the output 'balance' is a decimal string representing a floating-point
token balance (e.g., each unit of which is 1e6 micro-units).
"""
query getBalances($accounts: [ChainAddressTokenInput!]!) {
  balances: getAddressBalance(input: $accounts) {
    chain
    address
    token
    balance
    error
  }
}
    `) as unknown as TypedDocumentString<GetBalancesQuery, GetBalancesQueryVariables>;