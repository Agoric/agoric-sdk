export interface TargetAllocation {
  poolKey: string;
  percentage: number; // 0-100
}

export interface AllocationEntry {
  protocol: string;
  percentage: number; // 0-100
}

export interface OpenPortfolio {
  user: string; // EVM address
  depositAmount: string; // amount in smallest unit like "1000000"
  token: string; // USDC contract address
  decimals: string; // "6"
  allocation: AllocationEntry[];
  nonce: string; // timestamp as string
  deadline: string; // timestamp + 1 hour as string
}

export interface Deposit {
  user: string; // EVM address
  depositAmount: string; // amount in smallest unit like "1000000"
  token: string; // USDC contract address
  decimals: string; // "6"
  nonce: string; // timestamp as string
  deadline: string; // timestamp + 1 hour as string
}

export interface Withdraw {
  user: string; // EVM address
  withdrawAmount: string; // amount in smallest unit like "1000000"
  token: string; // USDC contract address
  decimals: string; // "6"
  nonce: string; // timestamp as string
  deadline: string; // timestamp + 1 hour as string
}

export interface Reallocate {
  user: string; // EVM address
  allocation: AllocationEntry[];
  nonce: string; // timestamp as string
  deadline: string; // timestamp + 1 hour as string
}

export type PortfolioOperation = OpenPortfolio | Deposit | Withdraw | Reallocate;

export interface EIP712Domain {
  name: string;
  version: string;
}

export interface EIP712Types {
  OpenPortfolio?: Array<{ name: string; type: string }>;
  Deposit?: Array<{ name: string; type: string }>;
  Withdraw?: Array<{ name: string; type: string }>;
  Reallocate?: Array<{ name: string; type: string }>;
  AllocationEntry: Array<{ name: string; type: string }>;
}
