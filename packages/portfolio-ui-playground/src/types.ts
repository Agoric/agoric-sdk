export interface TargetAllocation {
  poolKey: string;
  basisPoints: number; // out of 10000
}

export interface PortfolioOperation {
  operation: 'openPortfolio' | 'rebalance' | 'deposit' | 'withdraw';
  user: string; // EVM address
  amount: string; // wei string
  targetAllocation: TargetAllocation[];
  nonce: number; // timestamp
  deadline: number; // timestamp + 1 hour
}

export interface EIP712Domain {
  name: string;
  version: string;
}

export interface EIP712Types {
  PortfolioOperation: Array<{ name: string; type: string }>;
  TargetAllocation: Array<{ name: string; type: string }>;
}
