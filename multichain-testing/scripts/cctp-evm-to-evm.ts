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
 * @see {@link https://developers.circle.com/stablecoins/docs/cctp-getting-started}
 */
import '@endo/init';

import type { AccountId } from '@agoric/orchestration';
import { accountIdTo32Bytes } from '@agoric/orchestration/src/utils/address.js';
import { toHex } from '@cosmjs/encoding';
import { ethers } from 'ethers';

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

// TokenMessenger ABI (only the methods we need)
const TOKEN_MESSENGER_ABI = [
  'function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) returns (uint64)',
];

// MessageTransmitter ABI (for watching mint events)
const MESSAGE_TRANSMITTER_ABI = [
  'event MintAndWithdraw(address indexed mintRecipient, uint256 amount, address indexed mintToken)',
];

// ERC20 ABI (only the methods we need)
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

/**
 * Parse command line arguments and environment variables
 */
const getConfig = () => {
  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic) {
    throw new Error('MNEMONIC environment variable is required');
  }

  const srcChain = process.env.SRC_CHAIN;
  const destChain = process.env.DEST_CHAIN;
  const destAddress = process.env.DEST_ADDRESS;
  const amountUsdc = process.env.AMOUNT_USDC;

  if (!srcChain || !destChain || !destAddress || !amountUsdc) {
    throw new Error(
      'Required: SRC_CHAIN, DEST_CHAIN, DEST_ADDRESS, AMOUNT_USDC',
    );
  }

  const srcDomain = CCTP_DOMAINS[srcChain];
  const destDomain = CCTP_DOMAINS[destChain];

  if (srcDomain === undefined || destDomain === undefined) {
    throw new Error(
      `Unsupported chain. Supported: ${Object.keys(CCTP_DOMAINS).join(', ')}`,
    );
  }

  const rpcUrl = process.env.RPC_URL || DEFAULT_RPC_URLS[srcChain];
  if (!rpcUrl) {
    throw new Error(`No RPC URL found for ${srcChain}`);
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
    destRpcUrl: process.env.DEST_RPC_URL || DEFAULT_RPC_URLS[destChain],
  };
};

/**
 * Poll for MintAndWithdraw event on destination chain
 */
const pollForMint = async (
  provider: ethers.JsonRpcProvider,
  messageTransmitterAddress: string,
  recipientAddress: string,
  expectedAmount: bigint,
  timeoutMs = 120_000, // 2 minutes timeout
): Promise<boolean> => {
  const messageTransmitter = new ethers.Contract(
    messageTransmitterAddress,
    MESSAGE_TRANSMITTER_ABI,
    provider,
  );

  const startTime = Date.now();
  const pollInterval = 5_000; // Poll every 5 seconds

  console.log('Polling for mint event on destination chain...');
  console.log(`  Recipient: ${recipientAddress}`);
  console.log(`  Expected amount: ${ethers.formatUnits(expectedAmount, 6)} USDC`);

  while (Date.now() - startTime < timeoutMs) {
    try {
      // Get recent blocks
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 1000); // Look back 1000 blocks

      // Query for MintAndWithdraw events
      const filter = messageTransmitter.filters.MintAndWithdraw(
        recipientAddress,
        null,
        null,
      );
      const events = await messageTransmitter.queryFilter(
        filter,
        fromBlock,
        currentBlock,
      );

      // Check if any event matches our expected amount
      for (const event of events) {
        if (event.args && event.args.amount === expectedAmount) {
          console.log(`✅ Mint event found in block ${event.blockNumber}!`);
          console.log(`  Transaction: ${event.transactionHash}`);
          console.log(`  Amount: ${ethers.formatUnits(event.args.amount, 6)} USDC`);
          return true;
        }
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      console.log(`  Still waiting... (${elapsed}s elapsed)`);
    } catch (error) {
      console.warn(`  Poll error: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  console.log('⏱️  Timeout reached without finding mint event');
  return false;
};

/**
 * Execute direct EVM-to-EVM CCTP transfer
 */
const main = async () => {
  const config = getConfig();

  console.log('Configuration:');
  console.log(`  Source chain: ${config.srcChain} (domain ${config.srcDomain})`);
  console.log(`  Dest chain: ${config.destChain} (domain ${config.destDomain})`);
  console.log(`  Dest address: ${config.destAddress}`);
  console.log(`  Amount: ${config.amountUsdc} USDC`);
  console.log(`  RPC URL: ${config.rpcUrl}`);
  console.log();

  // Connect to source chain
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallet = ethers.Wallet.fromPhrase(config.mnemonic).connect(provider);

  console.log(`Wallet address: ${wallet.address}`);

  // Get contract instances
  const usdcAddress = USDC_ADDRESSES[config.srcChain];
  const tokenMessengerAddress = TOKEN_MESSENGER_ADDRESSES[config.srcChain];

  if (!usdcAddress || !tokenMessengerAddress) {
    throw new Error(`Contract addresses not found for ${config.srcChain}`);
  }

  const usdc = new ethers.Contract(usdcAddress, ERC20_ABI, wallet);
  const tokenMessenger = new ethers.Contract(
    tokenMessengerAddress,
    TOKEN_MESSENGER_ABI,
    wallet,
  );

  // Check balance
  const balance = await usdc.balanceOf(wallet.address);
  const amountMicroUsdc = BigInt(config.amountUsdc * 1_000_000);

  console.log(`USDC balance: ${ethers.formatUnits(balance, 6)} USDC`);

  if (balance < amountMicroUsdc) {
    throw new Error(
      `Insufficient balance. Need ${config.amountUsdc} USDC, have ${ethers.formatUnits(balance, 6)} USDC`,
    );
  }

  // Convert destination address to bytes32 format for CCTP
  const destAccountId: AccountId = `${config.destChain}:${config.destAddress}`;
  const mintRecipientBytes = accountIdTo32Bytes(destAccountId);
  const mintRecipient = `0x${toHex(mintRecipientBytes)}`;

  console.log(`Mint recipient (bytes32): ${mintRecipient}`);
  console.log();

  // Check/set allowance
  const allowance = await usdc.allowance(wallet.address, tokenMessengerAddress);
  if (allowance < amountMicroUsdc) {
    console.log('Approving TokenMessenger to spend USDC...');
    const approveTx = await usdc.approve(tokenMessengerAddress, amountMicroUsdc);
    console.log(`  Approve tx: ${approveTx.hash}`);
    await approveTx.wait();
    console.log('  Approved!');
    console.log();
  }

  // Execute depositForBurn
  console.log('Executing depositForBurn...');
  console.log(`  Amount: ${config.amountUsdc} USDC`);
  console.log(`  Destination domain: ${config.destDomain}`);
  console.log(`  Mint recipient: ${mintRecipient}`);
  console.log(`  Burn token: ${usdcAddress}`);

  const tx = await tokenMessenger.depositForBurn(
    amountMicroUsdc,
    config.destDomain,
    mintRecipient,
    usdcAddress,
  );

  console.log(`  Transaction hash: ${tx.hash}`);
  console.log('  Waiting for confirmation...');

  const receipt = await tx.wait();
  console.log(`  Confirmed in block ${receipt.blockNumber}`);
  console.log();

  console.log('✅ CCTP burn transaction successful!');
  console.log();

  // Poll for mint event on destination chain
  const destProvider = new ethers.JsonRpcProvider(config.destRpcUrl);
  const messageTransmitterAddress = MESSAGE_TRANSMITTER_ADDRESSES[config.destChain];

  if (!messageTransmitterAddress) {
    console.log('⚠️  MessageTransmitter address not found for destination chain');
    console.log('Skipping mint event polling...');
  } else {
    const mintFound = await pollForMint(
      destProvider,
      messageTransmitterAddress,
      config.destAddress,
      amountMicroUsdc,
    );

    if (mintFound) {
      console.log();
      console.log('✅ CCTP transfer complete! USDC has been minted on destination chain.');
    } else {
      console.log();
      console.log('⚠️  Mint event not detected within timeout period.');
      console.log('The transfer may still complete - check manually:');
      console.log('1. Monitor Circle Iris API for attestation:');
      console.log(`   https://iris-api.circle.com/v1/attestations/${receipt.blockNumber}/${tx.hash}`);
      console.log(`2. Check destination balance at ${config.destAddress} on ${config.destChain}`);
    }
  }
};

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
