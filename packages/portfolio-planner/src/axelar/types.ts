import type { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { type Bech32Address } from '@agoric/orchestration';

export type AxelarGmpOutgoingMemo = {
  destination_chain: string;
  destination_address: string;
  payload: number[] | null;
  type: 1 | 2; // 1 == ContractCall and 2 == ContractCallWithToken;
  fee: {
    amount: string;
    recipient: Bech32Address;
  };
};

export type ContractCall = {
  target: `0x${string}`;
  functionSignature: string;
  args: unknown[];
};

export type AbiEncodedContractCall = {
  target: `0x${string}`;
  data: `0x${string}`;
};

export const AxelarChains = /** @type {const} */ {
  Avalanche: 'Avalanche',
  Arbitrum: 'Arbitrum',
  Optimism: 'Optimism',
  Polygon: 'Polygon',
};

export type AxelarChain = keyof typeof AxelarChains;

export type BaseGmpArgs = {
  destinationChain: AxelarChain;
  gasAmt: number;
};

export type GmpArgsContractCall = BaseGmpArgs & {
  destinationAddr: string;
  type: 1 | 2; // 1 == ContractCall and 2 == ContractCallWithToken
  calls: Array<ContractCall>;
  gmpAddr: Bech32Address;
  gasAddr: Bech32Address;
};

//
type AxelarId = {
  [chain in AxelarChain]: string;
};

type EVMContractAddresses = {
  aavePool: `0x${string}`;
  compound: `0x${string}`;
  factory: `0x${string}`;
  usdc: `0x${string}`;
  tokenMessenger: `0x${string}`;
  aaveUSDC: `0x${string}`;
  aaveRewardsController: `0x${string}`;
  compoundRewardsController: `0x${string}`;
};
type GmpAddresses = {
  AXELAR_GMP: Bech32Address;
  AXELAR_GAS: Bech32Address;
};

type EVMContractAddressesMap = {
  [chain in AxelarChain]: EVMContractAddresses;
};

export type PortfolioInstanceContext = {
  axelarConfig: {
    axelarIds: AxelarId;
    contracts: EVMContractAddressesMap;
    gmpAddresses: GmpAddresses;
  };
  signer: DirectSecp256k1HdWallet;
  sourceChannel: string;
  rpcUrl: string;
};
