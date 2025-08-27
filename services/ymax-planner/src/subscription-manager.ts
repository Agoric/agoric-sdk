import type { AxelarId } from '@aglocal/portfolio-contract/src/portfolio.contract.ts';
import type { SigningSmartWalletKit } from '@agoric/client-utils';
import type { AxelarChain } from '@agoric/portfolio-api/src/constants.js';
import { JsonRpcProvider } from 'ethers';
import { TxStatus } from '@aglocal/portfolio-contract/src/resolver/constants.js';
import { watchGmp } from './watchers/gmp-watcher.ts';
import { resolveCctpSubscription } from './resolver.ts';
import { watchCctpTransfer } from './watchers/cctp-watcher.ts';

export type EvmChain = keyof typeof AxelarChain;

export type EvmContext = {
  axelarQueryApi: string;
  evmProviders: Partial<Record<EvmChain, JsonRpcProvider>>;
  signingSmartWalletKit: SigningSmartWalletKit;
  fetch: typeof fetch;
};

type CctpTransfer = {
  amount: bigint;
  destinationAddress: string;
};

export type GmpTransfer = {
  lcaAddr: string;
  destinationChain: AxelarId;
  contractAddress: `0x${string}`;
};

/**
 * Subscription state machine:
 * pending -> success (when cross-chain operation completes successfully)
 * pending -> failed (when operation fails or times out)
 *
 * Terminal states: success and timeout never transition to other states.
 */
type BaseSubscription = {
  subscriptionId: string;
  status: TxStatus;
};

type SubscriptionOf<T, K extends string> = BaseSubscription & T & { type: K };

export type CctpSubscription = SubscriptionOf<CctpTransfer, 'cctp'>;
export type GmpSubscription = SubscriptionOf<GmpTransfer, 'gmp'>;

export type Subscription = CctpSubscription | GmpSubscription;

export type SubscriptionMonitor<T extends Subscription = Subscription> = {
  watch: (
    ctx: EvmContext,
    subscription: T,
    log: (...args: unknown[]) => void,
  ) => Promise<void>;
};

type MonitorRegistry = {
  cctp: SubscriptionMonitor<CctpSubscription>;
  gmp: SubscriptionMonitor<GmpSubscription>;
};

export type CctpChainConfig = {
  name: string;
  domain: number;
  contracts: {
    tokenMessengerV2: string;
    messageTransmitterV2: string;
    tokenMinterV2: string;
    messageV2: string;
    usdc: string;
  };
};

// Type of the full config object
type CctpConfig = {
  [chainId: string]: CctpChainConfig;
};

/**
 * Sourced from:
 * - https://chainlist.org/
 * - https://docs.simplehash.com/reference/supported-chains-testnets
 *   (accessed on 27th August 2025)
 * - https://developers.circle.com/cctp/evm-smart-contracts
 * - https://developers.circle.com/stablecoins/usdc-contract-addresses
 *
 * Notes:
 * - This list should conceptually come from an orchestration type
 *   for supported EVM networks.
 * - Currently this config mirrors the EVM chains defined in
 *   packages/orchestration/src/cctp-chain-info.js
 */
const cctpConfig: CctpConfig = {
  // 1 — Ethereum
  '1': {
    name: 'Ethereum',
    domain: 0,
    // NOTE: Currently only USDC address is used for filtering.
    // In future, other contract addresses can be used to narrow tx filters further.
    contracts: {
      tokenMessengerV2: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
      messageTransmitterV2: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
      tokenMinterV2: '0xfd78EE919681417d192449715b2594ab58f5D002',
      messageV2: '0xec546b6B005471ECf012e5aF77FBeC07e0FD8f78',
      usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    },
  },

  // 42161 — Arbitrum
  '42161': {
    name: 'Arbitrum',
    domain: 3,
    contracts: {
      tokenMessengerV2: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
      messageTransmitterV2: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
      tokenMinterV2: '0xfd78EE919681417d192449715b2594ab58f5D002',
      messageV2: '0xec546b6B005471ECf012e5aF77FBeC07e0FD8f78',
      usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    },
  },

  // 43114 — Avalanche
  '43114': {
    name: 'Avalanche',
    domain: 1,
    contracts: {
      tokenMessengerV2: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
      messageTransmitterV2: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
      tokenMinterV2: '0xfd78EE919681417d192449715b2594ab58f5D002',
      messageV2: '0xec546b6B005471ECf012e5aF77FBeC07e0FD8f78',
      usdc: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    },
  },

  // 137 — Polygon PoS
  '137': {
    name: 'Polygon',
    domain: 7,
    contracts: {
      tokenMessengerV2: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
      messageTransmitterV2: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
      tokenMinterV2: '0xfd78EE919681417d192449715b2594ab58f5D002',
      messageV2: '0xec546b6B005471ECf012e5aF77FBeC07e0FD8f78',
      usdc: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
    },
  },

  // 10 — Optimism
  '10': {
    name: 'Optimism',
    domain: 2,
    contracts: {
      tokenMessengerV2: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
      messageTransmitterV2: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
      tokenMinterV2: '0xfd78EE919681417d192449715b2594ab58f5D002',
      messageV2: '0xec546b6B005471ECf012e5aF77FBeC07e0FD8f78',
      usdc: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    },
  },

  // 8453 — Base
  '8453': {
    name: 'Base',
    domain: 6,
    contracts: {
      tokenMessengerV2: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
      messageTransmitterV2: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
      tokenMinterV2: '0xfd78EE919681417d192449715b2594ab58f5D002',
      messageV2: '0xec546b6B005471ECf012e5aF77FBeC07e0FD8f78',
      usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    },
  },

  // 11155111 — Ethereum Sepolia
  '11155111': {
    name: 'Ethereum',
    domain: 0,
    contracts: {
      tokenMessengerV2: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
      messageTransmitterV2: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
      tokenMinterV2: '0xb43db544E2c27092c107639Ad201b3dEfAbcF192',
      messageV2: '0xbaC0179bB358A8936169a63408C8481D582390C4',
      usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    },
  },

  // 421614 — Arbitrum Sepolia
  '421614': {
    name: 'Arbitrum',
    domain: 3,
    contracts: {
      tokenMessengerV2: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
      messageTransmitterV2: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
      tokenMinterV2: '0xb43db544E2c27092c107639Ad201b3dEfAbcF192',
      messageV2: '0xbaC0179bB358A8936169a63408C8481D582390C4',
      usdc: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    },
  },

  // 43113 — Avalanche Fuji
  '43113': {
    name: 'Avalanche',
    domain: 1,
    contracts: {
      tokenMessengerV2: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
      messageTransmitterV2: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
      tokenMinterV2: '0xb43db544E2c27092c107639Ad201b3dEfAbcF192',
      messageV2: '0xbaC0179bB358A8936169a63408C8481D582390C4',
      usdc: '0x5425890298aed601595a70AB815c96711a31Bc65',
    },
  },

  // 80002 — Polygon Amoy
  '80002': {
    name: 'Polygon',
    domain: 7,
    contracts: {
      tokenMessengerV2: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
      messageTransmitterV2: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
      tokenMinterV2: '0xb43db544E2c27092c107639Ad201b3dEfAbcF192',
      messageV2: '0xbaC0179bB358A8936169a63408C8481D582390C4',
      usdc: '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582',
    },
  },

  // 11155420 — OP Sepolia
  '11155420': {
    name: 'Optimism',
    domain: 2,
    contracts: {
      tokenMessengerV2: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
      messageTransmitterV2: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
      tokenMinterV2: '0xb43db544E2c27092c107639Ad201b3dEfAbcF192',
      messageV2: '0xbaC0179bB358A8936169a63408C8481D582390C4',
      usdc: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
    },
  },

  // 84532 — Base Sepolia
  '84532': {
    name: 'Base',
    domain: 6,
    contracts: {
      tokenMessengerV2: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
      messageTransmitterV2: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
      tokenMinterV2: '0xb43db544E2c27092c107639Ad201b3dEfAbcF192',
      messageV2: '0xbaC0179bB358A8936169a63408C8481D582390C4',
      usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    },
  },
};

export function getCctpConfig(chainId: string) {
  return cctpConfig[chainId];
}

const cctpMonitor: SubscriptionMonitor<CctpSubscription> = {
  watch: async (ctx, subscription, log) => {
    const { subscriptionId, destinationAddress, amount } = subscription;
    const logPrefix = `[${subscriptionId}]`;

    log(`${logPrefix} handling cctp subscription`);

    // Parse destinationAddress format: 'eip155:42161:0x126cf3AC9ea12794Ff50f56727C7C66E26D9C092'
    const [, chainId, receiver] = destinationAddress.split(':');
    const config = cctpConfig[chainId];
    const provider = ctx.evmProviders[config.name];

    if (!provider) {
      throw Error(
        `${logPrefix} No EVM provider configured for chain: ${cctpConfig.name}`,
      );
    }

    const transferStatus = await watchCctpTransfer({
      config,
      watchAddress: receiver,
      expectedAmount: amount,
      provider,
      log: (msg, ...args) => log(`${logPrefix} ${msg}`, ...args),
    });

    await resolveCctpSubscription({
      signingSmartWalletKit: ctx.signingSmartWalletKit,
      subscriptionId,
      status: transferStatus ? TxStatus.SUCCESS : TxStatus.FAILED,
      subscriptionData: subscription,
    });

    log(`${logPrefix} CCTP subscription resolved`);
  },
};

const gmpMonitor: SubscriptionMonitor<GmpSubscription> = {
  watch: async (ctx, subscription, log) => {
    const { subscriptionId, destinationChain, contractAddress } = subscription;
    const logPrefix = `[${subscriptionId}]`;

    log(`${logPrefix} handling gmp subscription`);

    const res = await watchGmp({
      url: ctx.axelarQueryApi,
      fetch: ctx.fetch,
      params: {
        sourceChain: 'agoric',
        destinationChain: destinationChain as unknown as string,
        contractAddress,
      },
      subscriptionId,
      log: (msg, ...args) => log(`${logPrefix} ${msg}`, ...args),
    });

    if (res.success) {
      log(`${logPrefix} GMP transaction executed successfully`);
      // TODO: resolve GMP subscription
    } else {
      log(`${logPrefix} GMP transaction failed or timed out`);
    }
  },
};

const createMonitorRegistry = (): MonitorRegistry => ({
  cctp: cctpMonitor,
  gmp: gmpMonitor,
});

export const handleSubscription = async (
  ctx: EvmContext,
  subscription: Subscription,
  log: (...args: unknown[]) => void = () => {},
  registry: MonitorRegistry = createMonitorRegistry(),
) => {
  await null;
  const logPrefix = `[${subscription.subscriptionId}]`;
  log(`${logPrefix} handling ${subscription.type} subscription`);

  const monitor = registry[subscription.type] as SubscriptionMonitor;

  if (!monitor) {
    throw Error(
      `${logPrefix} No monitor registered for subscription type: ${subscription.type}`,
    );
  }

  await monitor.watch(ctx, subscription, log);
};
