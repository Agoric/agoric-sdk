type TxReceipt = {
  gasUsed: string;
  blockNumber: number;
  from: string;
  transactionIndex: number;
  status: number;
  transactionHash: string;
};

type TxMeta = {
  blockNumber: number;
  gas: string;
  from: string;
  transactionIndex: number;
  to: string;
  hash: string;
  gasPrice: string;
};

type TimeIndex = {
  ms: number;
  hour: number;
  day: number;
  week: number;
  month: number;
  quarter: number;
  year: number;
};

type AxelarCallEvent = {
  chain: string;
  _id: string;
  blockNumber: number;
  axelarTransactionHash: string;
  transactionHash: string;
  logIndex: number;
  event: string;
  returnValues: {
    destinationContractAddress: string;
    destinationChain: string;
    messageId: string;
    payload: string;
    payloadHash: string;
    sender: string;
    sourceChain: string;
  };
  block_timestamp: number;
  receipt: TxReceipt;
  transaction: TxMeta;
  id: string;
  chain_type: string;
  destination_chain_type: string;
  created_at: TimeIndex;
  messageIdIndex: number;
  messageIdHash: string;
};

type AxelarGasPaidEvent = {
  axelarTransactionHash: string;
  chain: string;
  chain_type: string;
  logIndex: number;
  created_at: TimeIndex;
  transactionHash: string;
  returnValues: {
    amount: string;
    sourceChain: string;
    sourceAddress: string;
    destinationAddress: string;
    gasFeeAmount: string;
    gasToken: string;
    messageId: string;
    payloadHash: string;
    refundAddress: string;
    recipient: string;
    destinationChain: string;
    denom: string;
    asset: string;
  };
  blockNumber: number;
  block_timestamp: number;
  receipt: TxReceipt;
  _id: string;
  id: string;
  event: string;
  transaction: TxMeta;
  destination_chain_type: string;
};

type AxelarConfirmEvent = {
  sourceChain: string;
  confirmation_txhash: string;
  blockNumber: number;
  block_timestamp: number;
  messageId: string;
  transactionIndex: number;
  sourceTransactionHash: string;
  event: string;
  transactionHash: string;
};

type AxelarApprovedEvent = {
  blockHash: string;
  chain: string;
  chain_type: string;
  address: string;
  logIndex: number;
  topics: string[];
  eventSignature: string;
  created_at: TimeIndex;
  transactionIndex: number;
  eventIndex: number;
  contract_address: string;
  transactionHash: string;
  returnValues: {
    sourceEventIndex: string;
    sourceChain: string;
    sourceAddress: string;
    sourceTxHash: string;
    contractAddress: string;
    payloadHash: string;
    commandId: string;
  };
  blockNumber: number;
  block_timestamp: number;
  receipt: TxReceipt;
  id: string;
  event: string;
  transaction: TxMeta;
  _logIndex: number;
};

export type AxelarExecutedEvent = {
  chain: string;
  sourceChain: string;
  chain_type: string;
  messageId: string;
  created_at: TimeIndex;
  sourceTransactionLogIndex: number;
  transactionIndex: number;
  contract_address: string;
  relayerAddress: string;
  transactionHash: string;
  blockNumber: number;
  block_timestamp: number;
  from: string;
  receipt: TxReceipt & {
    cumulativeGasUsed: string;
    effectiveGasPrice: string;
    confirmations: number;
    logs: {
      logIndex: number;
      data: string;
      topics: string[];
      blockNumber: number;
      transactionIndex: number;
    }[];
  };
  sourceTransactionHash: string;
  _id: string;
  id: string;
  event: string;
  transaction: TxMeta & {
    chainId: number;
    maxPriorityFeePerGas: string;
    maxFeePerGas: string;
    nonce: number;
  };
};

type AxelarCallbackEvent = {
  blockHash: string;
  chain: string;
  chain_type: string;
  address: string;
  logIndex: number;
  topics: string[];
  eventSignature: string;
  created_at: TimeIndex;
  transactionIndex: number;
  eventIndex: number;
  contract_address: string;
  transactionHash: string;
  returnValues: {
    sender: string;
    destinationContractAddress: string;
    payload: string;
    payloadHash: string;
    destinationChain: string;
  };
  blockNumber: number;
  block_timestamp: number;
  receipt: TxReceipt;
  id: string;
  event: string;
  destination_chain_type: string;
  transaction: TxMeta & {
    chainId: number;
    maxPriorityFeePerGas: string;
    maxFeePerGas: string;
    nonce: number;
  };
  _logIndex: number;
};

export type AxelarEventRecord = {
  call: AxelarCallEvent;
  gas_paid: AxelarGasPaidEvent;
  confirm: AxelarConfirmEvent;
  approved: AxelarApprovedEvent;
  executed: AxelarExecutedEvent;
  callback: AxelarCallbackEvent;
  // other useful fields
  message_id: string;
  status: string;
  simplified_status: string;
  is_invalid_call: boolean;
  is_not_enough_gas: boolean;
  no_gas_remain: boolean;
  command_id: string;
};

export type AxelarEventsResponse = {
  data: AxelarEventRecord[];
  total: number;
  time_spent: number;
};

type EventType = 'ContractCall' | 'ContractCallWithToken';

type StatusType =
  | 'called'
  | 'confirming'
  | 'express_executed'
  | 'approving'
  | 'approved'
  | 'executing'
  | 'executed'
  | 'error'
  | 'waiting_for_route_message'
  | 'waiting_for_ibc'
  | 'insufficient_fee';

export type AxelarQueryParams = {
  txHash?: string;
  txLogIndex?: number;
  messageId?: string;
  event?: EventType;
  commandId?: string;
  sourceChain?: string;
  sourceAddress?: string;
  destinationChain?: string;
  contractAddress?: string;
  asset?: string; // use denom or symbol
  symbol?: string;
  status?: StatusType;
  fromTime?: number; // unixtime
  toTime?: number; // unixtime
  from?: number; // default: 0
  size?: number; // default: 25
};
