export interface TargetAllocation {
  poolKey: string;
  basisPoints: number; // out of 10000
}

export interface AllocationEntry {
  protocol: string;
  percentage: string; // "50.00%"
}

export interface PortfolioOperation {
  intent: 'allocate' | 'rebalance' | 'deposit' | 'withdraw';
  user: string; // EVM address
  depositAmount: string; // formatted amount like "1,000.00"
  token: string; // USDC contract address
  decimals: string; // "6"
  allocation: AllocationEntry[];
  nonce: number; // timestamp
  deadline: number; // timestamp + 1 hour
}

export interface EIP712Domain {
  name: string;
  version: string;
}

export interface EIP712Types {
  PortfolioOperation: Array<{ name: string; type: string }>;
  AllocationEntry: Array<{ name: string; type: string }>;
}
