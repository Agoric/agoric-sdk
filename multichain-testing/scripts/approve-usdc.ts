#!/usr/bin/env -S node --import ts-blank-space/register
/**
 * @file Approve USDC for Permit2 contract on any supported EVM chain
 *
 * Usage:
 *   node scripts/approve-usdc.ts <chain> <amount>
 *
 * The script reads PRIVATE_KEY and AGORIC_NET from:
 *   1. scripts/.env file (if exists)
 *   2. Environment variables (if .env not found or values not set)
 *
 * Examples:
 *   node scripts/approve-usdc.ts Arbitrum 100000000
 *   PRIVATE_KEY=0x... AGORIC_NET=main node scripts/approve-usdc.ts Ethereum 1000000000
 *
 * Amount is in the smallest unit (6 decimals for USDC):
 *   1 USDC = 1_000_000
 *   100 USDC = 100_000_000
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ethers } from 'ethers';

// USDC contract addresses
const USDC_ADDRESSES = {
  mainnet: {
    Arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    Avalanche: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    Base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    Ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    Optimism: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  },
  testnet: {
    Arbitrum: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    Avalanche: '0x5425890298aed601595a70AB815c96711a31Bc65',
    Base: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    Ethereum: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    Optimism: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
  },
} as const;

/**
 * Load environment variables from .env file
 * Looks for .env in scripts/ directory
 */
const loadEnv = () => {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const envPath = resolve(__dirname, '.env');
    const envContent = readFileSync(envPath, 'utf-8');

    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        const trimmedKey = key.trim();
        let trimmedValue = value.trim();

        // Remove quotes if present
        if (
          (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
          (trimmedValue.startsWith("'") && trimmedValue.endsWith("'"))
        ) {
          trimmedValue = trimmedValue.slice(1, -1);
        }

        // Only set if not already in environment
        if (!process.env[trimmedKey]) {
          process.env[trimmedKey] = trimmedValue;
        }
      }
    }
  } catch (err) {
    // .env file not found or not readable - that's okay, will use env vars
  }
};

// Permit2 contract address (same on all chains)
const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

// ERC20 ABI for approve and allowance
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

/**
 * RPC endpoints for each chain
 */
const RPC_URLS = {
  mainnet: {
    Arbitrum: 'https://arb1.arbitrum.io/rpc',
    Avalanche: 'https://api.avax.network/ext/bc/C/rpc',
    Base: 'https://mainnet.base.org',
    Ethereum: 'https://eth.llamarpc.com',
    Optimism: 'https://mainnet.optimism.io',
  },
  testnet: {
    Arbitrum: 'https://arbitrum-sepolia-rpc.publicnode.com',
    Avalanche: 'https://api.avax-test.network/ext/bc/C/rpc',
    Base: 'https://sepolia.base.org',
    Ethereum: 'https://ethereum-sepolia-rpc.publicnode.com',
    Optimism: 'https://sepolia.optimism.io',
  },
} as const;

type ChainName = 'Arbitrum' | 'Avalanche' | 'Base' | 'Ethereum' | 'Optimism';

/**
 * Get network configuration based on environment
 */
const getNetworkConfig = (network: 'main' | 'devnet') => {
  switch (network) {
    case 'main':
      return {
        usdcAddresses: USDC_ADDRESSES.mainnet,
        rpcUrls: RPC_URLS.mainnet,
        label: 'mainnet',
      };
    case 'devnet':
      return {
        usdcAddresses: USDC_ADDRESSES.testnet,
        rpcUrls: RPC_URLS.testnet,
        label: 'testnet',
      };
    default:
      throw new Error(
        `Unsupported network: ${network}. Use 'main' or 'devnet'`,
      );
  }
};

/**
 * Format amount with USDC decimals for display
 */
const formatUSDC = (amount: bigint): string => {
  const decimals = 6n;
  const divisor = 10n ** decimals;
  const whole = amount / divisor;
  const fraction = amount % divisor;
  return `${whole}.${fraction.toString().padStart(6, '0')} USDC`;
};

/**
 * Approve USDC for Permit2 contract
 */
const approveUSDC = async ({
  chain,
  amount,
  privateKey,
  network,
}: {
  chain: ChainName;
  amount: bigint;
  privateKey: string;
  network: 'main' | 'devnet';
}) => {
  const config = getNetworkConfig(network);

  // Validate chain
  if (!(chain in config.usdcAddresses)) {
    const supportedChains = Object.keys(config.usdcAddresses).join(', ');
    throw new Error(
      `Unsupported chain: ${chain}. Supported chains: ${supportedChains}`,
    );
  }

  const rpcUrl = config.rpcUrls[chain];
  const usdcAddress = config.usdcAddresses[chain];

  console.log(`\n🔗 Chain: ${chain} (${config.label})`);
  console.log(`📍 RPC: ${rpcUrl}`);
  console.log(`💵 USDC: ${usdcAddress}`);
  console.log(`🔐 Permit2: ${PERMIT2_ADDRESS}`);

  // Connect to the chain
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(privateKey, provider);
  const signerAddress = await signer.getAddress();

  console.log(`👛 Wallet: ${signerAddress}`);

  // Get USDC contract
  const usdc = new ethers.Contract(usdcAddress, ERC20_ABI, signer);

  // Check current balance
  const balance = await usdc.balanceOf(signerAddress);
  console.log(`💰 USDC Balance: ${formatUSDC(balance)}`);

  if (balance < amount) {
    console.warn(
      `⚠️  Warning: Requested approval (${formatUSDC(amount)}) exceeds balance (${formatUSDC(balance)})`,
    );
  }

  // Check current allowance
  const currentAllowance = await usdc.allowance(signerAddress, PERMIT2_ADDRESS);
  console.log(`📊 Current Allowance: ${formatUSDC(currentAllowance)}`);

  if (currentAllowance >= amount) {
    console.log(
      `✅ Allowance already sufficient (${formatUSDC(currentAllowance)} >= ${formatUSDC(amount)})`,
    );
    console.log('No approval needed.');
    return;
  }

  // Approve USDC for Permit2
  console.log(`\n📝 Approving ${formatUSDC(amount)} for Permit2...`);
  const tx = await usdc.approve(PERMIT2_ADDRESS, amount);
  console.log(`📤 Transaction hash: ${tx.hash}`);
  console.log('⏳ Waiting for confirmation...');

  const receipt = await tx.wait();
  console.log(`✅ Transaction confirmed in block ${receipt?.blockNumber}`);

  // Verify new allowance
  const newAllowance = await usdc.allowance(signerAddress, PERMIT2_ADDRESS);
  console.log(`\n✨ New Allowance: ${formatUSDC(newAllowance)}`);
  console.log('🎉 Approval successful!');
};

/**
 * Main entry point
 */
const main = async ({ argv = process.argv, env = process.env } = {}) => {
  // Load .env file first
  loadEnv();

  // Parse arguments
  const [chain, amountStr] = argv.slice(2);

  if (!chain || !amountStr) {
    console.error(`Usage: ${argv[1]} <chain> <amount>`);
    console.error(
      '\nSupported chains: Arbitrum, Avalanche, Base, Ethereum, Optimism',
    );
    console.error('Amount is in smallest unit (6 decimals for USDC)');
    console.error('  1 USDC = 1000000');
    console.error('  100 USDC = 100000000');
    console.error('\nConfiguration:');
    console.error(
      '  Reads from scripts/.env file (if exists) or environment variables',
    );
    console.error('  PRIVATE_KEY - Your wallet private key (required)');
    console.error(
      '  AGORIC_NET  - Network to use: "main" or "devnet" (default: devnet)',
    );
    console.error('\nExample:');
    console.error('  node scripts/approve-usdc.ts Arbitrum 100000000');
    console.error(
      '  PRIVATE_KEY=0x... AGORIC_NET=main node scripts/approve-usdc.ts Ethereum 1000000000',
    );
    process.exit(1);
  }

  // Get environment variables
  const privateKey = env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY environment variable is required');
  }

  const network = (env.AGORIC_NET as 'main' | 'devnet') || 'devnet';
  if (network !== 'main' && network !== 'devnet') {
    throw new Error('AGORIC_NET must be either "main" or "devnet"');
  }

  // Parse amount
  const amount = BigInt(amountStr);
  if (amount <= 0n) {
    throw new Error('Amount must be positive');
  }

  // Approve USDC
  await approveUSDC({
    chain: chain as ChainName,
    amount,
    privateKey,
    network,
  });
};

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
