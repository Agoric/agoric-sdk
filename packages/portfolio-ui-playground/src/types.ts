export interface TargetAllocation {
  poolKey: string;
  percentage: number; // 0-100
}

export interface AllocationEntry {
  protocol: string; // "Aave", "Compound", "USDN"
  network: string; // "Ethereum", "Arbitrum", "Optimism", "Base", "Noble"
  instrument: string; // "USDC", "Pool_v3", etc.
  percentage: number; // 0-100
}

export interface TokenAmount {
  amount: string; // amount in smallest unit like "1000000"
  token: string; // USDC contract address
}

export interface OpenPortfolio {
  user: string; // EVM address
  asset: TokenAmount;
  allocation: AllocationEntry[];
  nonce: string; // timestamp as string
  deadline: string; // timestamp + 1 hour as string
}

export interface Deposit {
  user: string; // EVM address
  asset: TokenAmount;
  nonce: string; // timestamp as string
  deadline: string; // timestamp + 1 hour as string
}

export interface Withdraw {
  user: string; // EVM address
  asset: TokenAmount;
  nonce: string; // timestamp as string
  deadline: string; // timestamp + 1 hour as string
}

export interface Reallocate {
  user: string; // EVM address
  allocation: AllocationEntry[];
  nonce: string; // timestamp as string
  deadline: string; // timestamp + 1 hour as string
}

export type PortfolioOperation =
  | OpenPortfolio
  | Deposit
  | Withdraw
  | Reallocate;

export interface EIP712Domain {
  name: string;
  version: string;
}

export type EIP712Types = Record<string, Array<{ name: string; type: string }>>;
