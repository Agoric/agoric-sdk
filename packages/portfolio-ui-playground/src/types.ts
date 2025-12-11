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
  amount: `${number}`; // amount in smallest unit like "1000000"
  token: `0x${string}`; // USDC contract address
}

type EVMAddress = `0x${string}`;

export interface AvoidReplay {
  nonce: `${number}`; // timestamp as string
  deadline: `${number}`; // timestamp + 1 hour as string
}

export interface OpenPortfolio extends AvoidReplay {
  user: EVMAddress;
  asset: TokenAmount;
  allocation: AllocationEntry[];
}

export interface Deposit extends AvoidReplay {
  user: EVMAddress;
  asset: TokenAmount;
}

export interface Withdraw extends AvoidReplay {
  user: string; // EVM address
  asset: TokenAmount;
}

export interface Reallocate extends AvoidReplay {
  user: string; // EVM address
  allocation: AllocationEntry[];
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
