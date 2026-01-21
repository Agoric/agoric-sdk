#!/usr/bin/env -S node --import ts-blank-space/register
/**
 * @file Test script for direct EVM-to-EVM CCTP transfers
 * 
 * This script demonstrates CCTP transfers between EVM chains without going
 * through Noble. It uses Circle's TokenMessenger.depositForBurn on the source
 * chain and polls for the MintAndWithdraw event on the destination chain.
 * 
 * Supports both mainnet and testnet (Sepolia) chains.
 * 
 * Usage:
 *   MNEMONIC="your mnemonic" \
 *   SRC_CHAIN=eip155:42161 \
 *   DEST_CHAIN=eip155:8453 \
 *   DEST_ADDRESS=0x... \
 *   AMOUNT_USDC=100 \
 *   ./multichain-testing/scripts/cctp-evm-to-evm.ts
 * 
 * Environment variables:
 *   MNEMONIC        - Wallet mnemonic for signing transactions
 *   SRC_CHAIN       - Source chain ID (e.g., eip155:42161 for Arbitrum mainnet,
 *                     eip155:421614 for Arbitrum Sepolia)
 *   DEST_CHAIN      - Destination chain ID (e.g., eip155:8453 for Base mainnet,
 *                     eip155:84532 for Base Sepolia)
 *   DEST_ADDRESS    - Destination address (0x...)
 *   AMOUNT_USDC     - Amount in USDC (whole units, e.g., 100 for 100 USDC)
 *   RPC_URL         - Optional RPC URL for source chain
 *   DEST_RPC_URL    - Optional RPC URL for destination chain (used for polling)
 * 
 * Supported chains:
 *   Mainnet: Ethereum (1), Avalanche (43114), Optimism (10), Arbitrum (42161), Base (8453)
 *   Testnet: Ethereum Sepolia (11155111), Avalanche Fuji (43113), Optimism Sepolia (11155420),
 *            Arbitrum Sepolia (421614), Base Sepolia (84532)
 * 
 * Note: CCTP waits for source chain finality which varies significantly:
 *   - Ethereum: ~15 minutes
 *   - Optimism/Base/Arbitrum: up to 1 week (fraud proof window)
 *   - Avalanche: ~1-2 seconds
 * 
 * @see {@link https://developers.circle.com/stablecoins/docs/cctp-getting-started}
 */
import '@endo/init';

import type { AccountId } from '@agoric/orchestration';
import { accountIdTo32Bytes } from '@agoric/orchestration/src/utils/address.js';
import { toHex } from '@cosmjs/encoding';
import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
  type Address,
  type Hash,
  type PublicClient,
  type WalletClient,
} from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { makeRetryUntilCondition, type RetryOptions } from '../tools/sleep.ts';

// CCTP domain IDs for EVM chains
// https://developers.circle.com/stablecoins/supported-domains
const CCTP_DOMAINS = {
  // Mainnet
  'eip155:1': 0,        // Ethereum
  'eip155:43114': 1,    // Avalanche
  'eip155:10': 2,       // Optimism
  'eip155:42161': 3,    // Arbitrum
  'eip155:8453': 6,     // Base
  // Testnet (Sepolia)
  'eip155:11155111': 0, // Ethereum Sepolia
  'eip155:43113': 1,    // Avalanche Fuji
  'eip155:11155420': 2, // Optimism Sepolia
  'eip155:421614': 3,   // Arbitrum Sepolia
  'eip155:84532': 6,    // Base Sepolia
} as const;

// MessageTransmitter contract addresses (for watching mint events)
// https://developers.circle.com/stablecoins/docs/cctp-protocol-contract
const MESSAGE_TRANSMITTER_ADDRESSES = {
  // Mainnet
  'eip155:1': '0x0a992d191DEeC32aFe36203Ad87D7d289a738F81',
  'eip155:43114': '0x8186359aF5F57FbB40c6b14A588d2A59C0C29880',
  'eip155:10': '0x4D41f22c5a0e5c74090899E5a8Fb597a8842b3e8',
  'eip155:42161': '0xC30362313FBBA5cf9163F0bb16a0e01f01A896ca',
  'eip155:8453': '0xAD09780d193884d503182aD4588450C416D6F9D4',
  // Testnet (Sepolia)
  'eip155:11155111': '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
  'eip155:43113': '0xa9fb1b3009dcb79e2fe346c16a604b8fa8ae0a79',
  'eip155:11155420': '0x9ff9a4da6f2157A9c82CE756f8fD7E0d75be8895',
  'eip155:421614': '0xaCF1ceeF35caAc005e15888dDb8A3515C41B4872',
  'eip155:84532': '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
} as const;

// TokenMessenger contract addresses on each chain
// https://developers.circle.com/stablecoins/docs/cctp-protocol-contract
const TOKEN_MESSENGER_ADDRESSES = {
  // Mainnet
  'eip155:1': '0xBd3fa81B58Ba92a82136038B25aDec7066af3155',
  'eip155:43114': '0x6B25532e1060CE10cc3B0A99e5683b91BFDe6982',
  'eip155:10': '0x2B4069517957735bE00ceE0fadAE88a26365528f',
  'eip155:42161': '0x19330d10D9Cc8751218eaf51E8885D058642E08A',
  'eip155:8453': '0x1682Ae6375C4E4A97e4B583BC394c861A46D8962',
  // Testnet (Sepolia)
  'eip155:11155111': '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
  'eip155:43113': '0xeb08f243e5d3fcff26a9e38ae5520a669f4019d0',
  'eip155:11155420': '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
  'eip155:421614': '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
  'eip155:84532': '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
} as const;

// USDC contract addresses on each chain
const USDC_ADDRESSES = {
  // Mainnet
  'eip155:1': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  'eip155:43114': '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
  'eip155:10': '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  'eip155:42161': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  'eip155:8453': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  // Testnet (Sepolia)
  'eip155:11155111': '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  'eip155:43113': '0x5425890298aed601595a70ab815c96711a31bc65',
  'eip155:11155420': '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
  'eip155:421614': '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
  'eip155:84532': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
} as const;

// Default RPC URLs
const DEFAULT_RPC_URLS = {
  // Mainnet
  'eip155:1': 'https://eth.llamarpc.com',
  'eip155:43114': 'https://api.avax.network/ext/bc/C/rpc',
  'eip155:10': 'https://mainnet.optimism.io',
  'eip155:42161': 'https://arb1.arbitrum.io/rpc',
  'eip155:8453': 'https://mainnet.base.org',
  // Testnet (Sepolia)
  'eip155:11155111': 'https://eth-sepolia.public.blastapi.io',
  'eip155:43113': 'https://api.avax-test.network/ext/bc/C/rpc',
  'eip155:11155420': 'https://sepolia.optimism.io',
  'eip155:421614': 'https://sepolia-rollup.arbitrum.io/rpc',
  'eip155:84532': 'https://sepolia.base.org',
} as const;

// ERC20 ABI
const ERC20_ABI = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const;

// TokenMessenger ABI
const TOKEN_MESSENGER_ABI = [
  {
    type: 'function',
    name: 'depositForBurn',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'destinationDomain', type: 'uint32' },
      { name: 'mintRecipient', type: 'bytes32' },
      { name: 'burnToken', type: 'address' },
    ],
    outputs: [{ type: 'uint64' }],
  },
] as const;

// MessageTransmitter ABI (for watching mint events)
const MESSAGE_TRANSMITTER_ABI = [
  {
    type: 'event',
    name: 'MintAndWithdraw',
    inputs: [
      { name: 'mintRecipient', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'mintToken', type: 'address', indexed: true },
    ],
  },
] as const;

type Config = {
  mnemonic: string;
  srcChain: string;
  destChain: string;
  destAddress: string;
  amountUsdc: number;
  srcDomain: number;
  destDomain: number;
  rpcUrl: string;
  destRpcUrl: string;
};

type ExternalAuthority = {
  env: Record<string, string | undefined>;
  fetch: typeof fetch;
  retryUntilCondition: ReturnType<typeof makeRetryUntilCondition>;
};

/**
 * Parse command line arguments and environment variables
 */
const getConfig = (env: Record<string, string | undefined>): Config => {
  const mnemonic = env.MNEMONIC;
  if (!mnemonic) {
    throw new Error('MNEMONIC environment variable is required');
  }

  const srcChain = env.SRC_CHAIN;
  const destChain = env.DEST_CHAIN;
  const destAddress = env.DEST_ADDRESS;
  const amountUsdc = env.AMOUNT_USDC;

  if (!srcChain || !destChain || !destAddress || !amountUsdc) {
    throw new Error(
      'Required: SRC_CHAIN, DEST_CHAIN, DEST_ADDRESS, AMOUNT_USDC',
    );
  }

  const srcDomain = CCTP_DOMAINS[srcChain as keyof typeof CCTP_DOMAINS];
  const destDomain = CCTP_DOMAINS[destChain as keyof typeof CCTP_DOMAINS];

  if (srcDomain === undefined || destDomain === undefined) {
    throw new Error(
      `Unsupported chain. Supported: ${Object.keys(CCTP_DOMAINS).join(', ')}`,
    );
  }

  const rpcUrl = env.RPC_URL || DEFAULT_RPC_URLS[srcChain as keyof typeof DEFAULT_RPC_URLS];
  const destRpcUrl = env.DEST_RPC_URL || DEFAULT_RPC_URLS[destChain as keyof typeof DEFAULT_RPC_URLS];
  
  if (!rpcUrl || !destRpcUrl) {
    throw new Error(`No RPC URL found for ${srcChain} or ${destChain}`);
  }

  return {
    mnemonic,
    srcChain,
    destChain,
    destAddress,
    amountUsdc: parseFloat(amountUsdc),
    srcDomain,
    destDomain,
    rpcUrl,
    destRpcUrl,
  };
};

/**
 * Poll for MintAndWithdraw event on destination chain using retryUntilCondition
 */
const pollForMint = async (
  publicClient: PublicClient,
  messageTransmitterAddress: Address,
  recipientAddress: Address,
  expectedAmount: bigint,
  { retryUntilCondition }: Pick<ExternalAuthority, 'retryUntilCondition'>,
): Promise<boolean> => {
  console.log('Polling for mint event on destination chain...');
  console.log(`  Recipient: ${recipientAddress}`);
  console.log(`  Expected amount: ${formatUnits(expectedAmount, 6)} USDC`);

  try {
    await retryUntilCondition(
      async () => {
        // Get recent blocks
        const currentBlock = await publicClient.getBlockNumber();
        const fromBlock = currentBlock > 1000n ? currentBlock - 1000n : 0n;

        // Query for MintAndWithdraw events
        const logs = await publicClient.getLogs({
          address: messageTransmitterAddress,
          event: MESSAGE_TRANSMITTER_ABI[0],
          args: {
            mintRecipient: recipientAddress,
          },
          fromBlock,
          toBlock: currentBlock,
        });

        // Check if any event matches our expected amount
        for (const log of logs) {
          if (log.args.amount === expectedAmount) {
            console.log(`✅ Mint event found in block ${log.blockNumber}!`);
            console.log(`  Transaction: ${log.transactionHash}`);
            console.log(`  Amount: ${formatUnits(log.args.amount, 6)} USDC`);
            return { found: true, log };
          }
        }

        return { found: false };
      },
      (result) => result.found,
      'CCTP mint event',
      {
        maxRetries: 24, // 24 retries * 5s = 2 minutes
        retryIntervalMs: 5000,
        log: console.log,
      },
    );
    
    return true;
  } catch (error) {
    console.log('⏱️  Timeout reached without finding mint event');
    return false;
  }
};

/**
 * Setup wallet and validate balance
 */
const setupWallet = async (
  config: ReturnType<typeof getConfig>,
  publicClient: ReturnType<typeof createPublicClient>,
) => {
  const account = mnemonicToAccount(config.mnemonic);
  console.log(`Wallet address: ${account.address}`);

  const usdcAddress = USDC_ADDRESSES[config.srcChain as keyof typeof USDC_ADDRESSES] as Address;
  if (!usdcAddress) {
    throw new Error(`USDC address not found for ${config.srcChain}`);
  }

  const balance = await publicClient.readContract({
    address: usdcAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account.address],
  });

  const amountMicroUsdc = parseUnits(config.amountUsdc.toString(), 6);
  console.log(`USDC balance: ${formatUnits(balance, 6)} USDC`);

  if (balance < amountMicroUsdc) {
    throw new Error(
      `Insufficient balance. Need ${config.amountUsdc} USDC, have ${formatUnits(balance, 6)} USDC`,
    );
  }

  return { account, usdcAddress, amountMicroUsdc };
};

/**
 * Ensure TokenMessenger has approval to spend USDC
 */
const ensureApproval = async (
  publicClient: ReturnType<typeof createPublicClient>,
  walletClient: ReturnType<typeof createWalletClient>,
  usdcAddress: Address,
  tokenMessengerAddress: Address,
  accountAddress: Address,
  amountMicroUsdc: bigint,
) => {
  const allowance = await publicClient.readContract({
    address: usdcAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [accountAddress, tokenMessengerAddress],
  });

  if (allowance < amountMicroUsdc) {
    console.log('Approving TokenMessenger to spend USDC...');
    const approveTxHash = await walletClient.writeContract({
      address: usdcAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [tokenMessengerAddress, amountMicroUsdc],
    });
    console.log(`  Approve tx: ${approveTxHash}`);
    await publicClient.waitForTransactionReceipt({ hash: approveTxHash });
    console.log('  Approved!');
    console.log();
  }
};

/**
 * Execute CCTP burn transaction
 */
const executeBurn = async (
  config: ReturnType<typeof getConfig>,
  walletClient: ReturnType<typeof createWalletClient>,
  publicClient: ReturnType<typeof createPublicClient>,
  tokenMessengerAddress: Address,
  usdcAddress: Address,
  amountMicroUsdc: bigint,
) => {
  const destAccountId: AccountId = `${config.destChain}:${config.destAddress}`;
  const mintRecipientBytes = accountIdTo32Bytes(destAccountId);
  const mintRecipient = `0x${toHex(mintRecipientBytes)}` as `0x${string}`;

  console.log(`Mint recipient (bytes32): ${mintRecipient}`);
  console.log();

  console.log('Executing depositForBurn...');
  console.log(`  Amount: ${config.amountUsdc} USDC`);
  console.log(`  Destination domain: ${config.destDomain}`);
  console.log(`  Mint recipient: ${mintRecipient}`);
  console.log(`  Burn token: ${usdcAddress}`);

  const burnStartTime = Date.now();

  const txHash = await walletClient.writeContract({
    address: tokenMessengerAddress,
    abi: TOKEN_MESSENGER_ABI,
    functionName: 'depositForBurn',
    args: [amountMicroUsdc, config.destDomain, mintRecipient, usdcAddress],
  });

  console.log(`  Transaction hash: ${txHash}`);
  console.log('  Waiting for confirmation...');

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log(`  Confirmed in block ${receipt.blockNumber}`);
  console.log();

  console.log('✅ CCTP burn transaction successful!');
  console.log();

  return { txHash, receipt, burnStartTime };
};

/**
 * Wait for mint on destination chain and report results
 */
const waitForMint = async (
  config: ReturnType<typeof getConfig>,
  destPublicClient: ReturnType<typeof createPublicClient>,
  amountMicroUsdc: bigint,
  authority: ExternalAuthority,
  burnStartTime: number,
  receipt: any,
  txHash: `0x${string}`,
) => {
  const messageTransmitterAddress = MESSAGE_TRANSMITTER_ADDRESSES[
    config.destChain as keyof typeof MESSAGE_TRANSMITTER_ADDRESSES
  ] as Address;

  if (!messageTransmitterAddress) {
    console.log('⚠️  MessageTransmitter address not found for destination chain');
    console.log('Skipping mint event polling...');
    return;
  }

  const mintFound = await pollForMint(
    destPublicClient,
    messageTransmitterAddress,
    config.destAddress as Address,
    amountMicroUsdc,
    authority,
  );

  const latencySeconds = ((Date.now() - burnStartTime) / 1000).toFixed(1);

  if (mintFound) {
    console.log();
    console.log('✅ CCTP transfer complete! USDC has been minted on destination chain.');
    console.log(`⏱️  Total latency (burn to mint): ${latencySeconds} seconds`);
  } else {
    console.log();
    console.log('⚠️  Mint event not detected within timeout period.');
    console.log(`⏱️  Elapsed time: ${latencySeconds} seconds`);
    console.log('The transfer may still complete - check manually:');
    console.log('1. Monitor Circle Iris API for attestation:');
    console.log(`   https://iris-api.circle.com/v1/attestations/${receipt.blockNumber}/${txHash}`);
    console.log(`2. Check destination balance at ${config.destAddress} on ${config.destChain}`);
  }
};

/**
 * Execute direct EVM-to-EVM CCTP transfer
 */
const main = async (
  authority: ExternalAuthority = {
    env: process.env,
    fetch,
    retryUntilCondition: makeRetryUntilCondition(),
  },
) => {
  // Load and display configuration
  const config = getConfig(authority.env);
  console.log('Configuration:');
  console.log(`  Source chain: ${config.srcChain} (domain ${config.srcDomain})`);
  console.log(`  Dest chain: ${config.destChain} (domain ${config.destDomain})`);
  console.log(`  Dest address: ${config.destAddress}`);
  console.log(`  Amount: ${config.amountUsdc} USDC`);
  console.log(`  RPC URL: ${config.rpcUrl}`);
  console.log();

  // Create blockchain clients
  const publicClient = createPublicClient({
    transport: http(config.rpcUrl, { fetchOptions: { fetch: authority.fetch } }),
  });
  const destPublicClient = createPublicClient({
    transport: http(config.destRpcUrl, { fetchOptions: { fetch: authority.fetch } }),
  });

  // Setup wallet and validate balance
  const { account, usdcAddress, amountMicroUsdc } = await setupWallet(config, publicClient);

  // Get TokenMessenger contract address
  const tokenMessengerAddress = TOKEN_MESSENGER_ADDRESSES[
    config.srcChain as keyof typeof TOKEN_MESSENGER_ADDRESSES
  ] as Address;
  if (!tokenMessengerAddress) {
    throw new Error(`TokenMessenger address not found for ${config.srcChain}`);
  }

  // Create wallet client
  const walletClient = createWalletClient({
    account,
    transport: http(config.rpcUrl, { fetchOptions: { fetch: authority.fetch } }),
  });

  // Ensure approval for TokenMessenger
  await ensureApproval(
    publicClient,
    walletClient,
    usdcAddress,
    tokenMessengerAddress,
    account.address,
    amountMicroUsdc,
  );

  // Execute burn transaction
  const { txHash, receipt, burnStartTime } = await executeBurn(
    config,
    walletClient,
    publicClient,
    tokenMessengerAddress,
    usdcAddress,
    amountMicroUsdc,
  );

  // Wait for mint on destination chain
  await waitForMint(
    config,
    destPublicClient,
    amountMicroUsdc,
    authority,
    burnStartTime,
    receipt,
    txHash,
  );
};

// Only use ambient authority at the top level
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
}
