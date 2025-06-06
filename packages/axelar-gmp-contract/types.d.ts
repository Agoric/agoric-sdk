import type {
  OrchestrationAccount,
  CosmosChainAddress,
  Denom,
  Bech32Address,
} from '@agoric/orchestration';
import { IBCChannelID } from '@agoric/vats';
import { EVM_CHAINS } from '@aglocal/axelar-gmp-deploy/src/config';

export enum GMPMessageType {
  ContractCall = 1,
  ContractCallWithToken = 2,
  TokenTransfer = 3,
}

export type AxelarGmpIncomingMemo = {
  source_chain: string;
  source_address: string;
  payload: string;
  type: GMPMessageType;
};

export type AxelarFeeObject = {
  amount: string;
  recipient: Bech32Address;
};

// NOTE: If you make any changes to this type, or to AxelarFeeObject and GMPMessageType,
// be sure to update the corresponding section in the README to keep them in sync.
export type AxelarGmpOutgoingMemo = {
  destination_chain: string;
  destination_address: string;
  payload: number[] | null;
  type: GMPMessageType;
  fee?: AxelarFeeObject;
};

export type EvmTapState = {
  localAccount: OrchestrationAccount<{ chainId: 'agoric' }>;
  localChainAddress: CosmosChainAddress;
  sourceChannel: IBCChannelID;
  remoteDenom: Denom;
  localDenom: Denom;
  assets: any;
  remoteChainInfo: any;
};

export type ContractCall = {
  target: `0x${string}`;
  functionSignature: string;
  args: Array<unknown>;
};

export type AbiEncodedContractCall = {
  target: `0x${string}`;
  data: `0x${string}`;
};

export type SupportedDestinationChains = keyof typeof EVM_CHAINS;
