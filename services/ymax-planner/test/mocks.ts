import type { SigningSmartWalletKit } from '@agoric/client-utils';
import type { EvmContext } from '../src/pending-tx-manager';
import type { AxelarChainIdMap } from '../src/support.ts';
import type { AccountId } from '@agoric/orchestration';
import { PENDING_TX_PATH_PREFIX } from '../src/engine.ts';
import type { TxStatus } from '@aglocal/portfolio-contract/src/resolver/constants.js';

export const createMockEvmContext = (): EvmContext => ({
  axelarQueryApi: 'https://testnet.api.axelarscan.io',
  usdcAddresses: {
    'eip155:1': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum
    'eip155:42161': '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Arbitrum
  },
  axelarChainIds: {
    'eip155:42161': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    'eip155:1': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  } as AxelarChainIdMap[keyof AxelarChainIdMap],
  evmProviders: {},
  signingSmartWalletKit: {} as SigningSmartWalletKit,
  fetch: global.fetch,
});

export const createMockPendingTxData = ({
  type = 'cctp',
  status = 'pending',
  amount = 100_000n,
  destinationAddress = 'eip155:42161:0x742d35Cc6635C0532925a3b8D9dEB1C9e5eb2b64',
}: {
  type?: 'cctp' | 'gmp';
  status?: TxStatus;
  amount?: bigint;
  destinationAddress?: AccountId;
} = {}) =>
  harden({
    type,
    status,
    amount,
    destinationAddress,
  });

export const createMockPendingTxEvent = (
  txId: string,
  vstorageValue: string,
) => ({
  path: `${PENDING_TX_PATH_PREFIX}.${txId}`,
  value: vstorageValue,
});

export const createMockStreamCell = (values: unknown[]) => ({
  values,
  blockHeight: '1000',
});
