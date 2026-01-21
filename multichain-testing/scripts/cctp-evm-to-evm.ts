#!/usr/bin/env -S node --import ts-blank-space/register
/**
 * @file Test script for direct EVM-to-EVM CCTP transfers
 * 
 * This script demonstrates CCTP transfers between EVM chains without going
 * through Noble. It uses Circle's TokenMessenger.depositForBurn on the source
 * chain and relies on Circle's attestation service to mint on the destination.
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
 *   MNEMONIC      - Wallet mnemonic for signing transactions
 *   SRC_CHAIN     - Source chain ID (e.g., eip155:42161 for Arbitrum)
 *   DEST_CHAIN    - Destination chain ID (e.g., eip155:8453 for Base)
 *   DEST_ADDRESS  - Destination address (0x...)
 *   AMOUNT_USDC   - Amount in USDC (whole units, e.g., 100 for 100 USDC)
 *   RPC_URL       - Optional RPC URL for source chain
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
const CCTP_DOMAINS: Record<string, number> = {
  'eip155:1': 0,        // Ethereum
  'eip155:43114': 1,    // Avalanche
  'eip155:10': 2,       // Optimism
  'eip155:42161': 3,    // Arbitrum
  'eip155:8453': 6,     // Base
};

// TokenMessenger contract addresses on each chain
// https://developers.circle.com/stablecoins/docs/cctp-protocol-contract
const TOKEN_MESSENGER_ADDRESSES: Record<string, string> = {
  'eip155:1': '0xBd3fa81B58Ba92a82136038B25aDec7066af3155',
  'eip155:43114': '0x6B25532e1060CE10cc3B0A99e5683b91BFDe6982',
  'eip155:10': '0x2B4069517957735bE00ceE0fadAE88a26365528f',
  'eip155:42161': '0x19330d10D9Cc8751218eaf51E8885D058642E08A',
  'eip155:8453': '0x1682Ae6375C4E4A97e4B583BC394c861A46D8962',
};

// USDC contract addresses on each chain
const USDC_ADDRESSES: Record<string, string> = {
  'eip155:1': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  'eip155:43114': '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
  'eip155:10': '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  'eip155:42161': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  'eip155:8453': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
};

// Default RPC URLs
const DEFAULT_RPC_URLS: Record<string, string> = {
  'eip155:1': 'https://eth.llamarpc.com',
  'eip155:43114': 'https://api.avax.network/ext/bc/C/rpc',
  'eip155:10': 'https://mainnet.optimism.io',
  'eip155:42161': 'https://arb1.arbitrum.io/rpc',
  'eip155:8453': 'https://mainnet.base.org',
};

// TokenMessenger ABI (only the methods we need)
const TOKEN_MESSENGER_ABI = [
  'function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) returns (uint64)',
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
  };
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
  console.log('Next steps:');
  console.log('1. Wait for Circle attestation service to process the burn');
  console.log('2. Monitor Circle Iris API for attestation:');
  console.log(`   https://iris-api.circle.com/v1/attestations/${receipt.blockNumber}/${tx.hash}`);
  console.log('3. Once attested, the USDC will be minted on the destination chain');
  console.log(`4. Check destination balance at ${config.destAddress} on ${config.destChain}`);
};

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
