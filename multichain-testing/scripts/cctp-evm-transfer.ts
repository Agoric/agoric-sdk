#!/usr/bin/env -S node --import ts-blank-space/register
// CCTP EVM-to-EVM Transfer Script
// Supports transfers between: Ethereum, Avalanche, Base, Arbitrum, Optimism
// Usage: ts-node cctp-evm-transfer.ts --src eth --dest aval --amount 10 [--addr 0x...] [--testnet]

import {
  JsonRpcProvider,
  parseUnits,
  Wallet,
  Contract,
  type Signer,
  type ContractTransactionResponse,
} from 'ethers';

const { PRIVATE_KEY, ALCHEMY_API, AVALANCHE_RPC_URL, BASE_RPC_URL } =
  process.env;

if (!PRIVATE_KEY) {
  throw Error('PRIVATE_KEY not defined');
}

if (!ALCHEMY_API) {
  throw Error('ALCHEMY_API not defined');
}

type ChainName = 'eth' | 'aval' | 'base' | 'arb' | 'op';
type NetworkType = 'mainnet' | 'testnet';

interface ChainConfig {
  name: string;
  domainId: number;
  rpcUrl: (network: NetworkType) => string;
  usdc: {
    mainnet: string;
    testnet: string;
  };
  tokenMessenger: {
    mainnet: string;
    testnet: string;
  };
  messageTransmitter: {
    mainnet: string;
    testnet: string;
  };
}

// src: https://developers.circle.com/cctp/references/contract-addresses#testnet-contract-addresses
// src: https://developers.circle.com/stablecoins/usdc-contract-addresses#testnet
// src: https://github.com/circlefin/evm-cctp-contracts/blob/master/src/TokenMessenger.sol#L152C1-L185C6
const CHAIN_CONFIGS: Record<ChainName, ChainConfig> = {
  eth: {
    name: 'Ethereum',
    domainId: 0,
    rpcUrl: network =>
      network === 'mainnet'
        ? `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API}`
        : `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API}`,
    usdc: {
      mainnet: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      testnet: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    },
    tokenMessenger: {
      mainnet: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d', // V2
      testnet: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA', // V2
    },
    messageTransmitter: {
      mainnet: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
      testnet: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
    },
  },
  aval: {
    name: 'Avalanche',
    domainId: 1,
    rpcUrl: network =>
      AVALANCHE_RPC_URL ||
      (network === 'mainnet'
        ? `https://avax-mainnet.g.alchemy.com/v2/${ALCHEMY_API}`
        : `https://avax-fuji.g.alchemy.com/v2/${ALCHEMY_API}`),
    usdc: {
      mainnet: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
      testnet: '0x5425890298aed601595a70AB815c96711a31Bc65',
    },
    tokenMessenger: {
      mainnet: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d', // V2
      testnet: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA', // V2
    },
    messageTransmitter: {
      mainnet: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
      testnet: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
    },
  },
  base: {
    name: 'Base',
    domainId: 6,
    rpcUrl: network =>
      BASE_RPC_URL ||
      (network === 'mainnet'
        ? `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API}`
        : `https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_API}`),
    usdc: {
      mainnet: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      testnet: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    },
    tokenMessenger: {
      mainnet: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d', // V2
      testnet: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA', // V2
    },
    messageTransmitter: {
      mainnet: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
      testnet: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
    },
  },
  arb: {
    name: 'Arbitrum',
    domainId: 3,
    rpcUrl: network =>
      network === 'mainnet'
        ? `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API}`
        : `https://arb-sepolia.g.alchemy.com/v2/${ALCHEMY_API}`,
    usdc: {
      mainnet: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      testnet: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    },
    tokenMessenger: {
      mainnet: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d', // V2
      testnet: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA', // V2
    },
    messageTransmitter: {
      mainnet: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
      testnet: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
    },
  },
  op: {
    name: 'Optimism',
    domainId: 2,
    rpcUrl: network =>
      network === 'mainnet'
        ? `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_API}`
        : `https://opt-sepolia.g.alchemy.com/v2/${ALCHEMY_API}`,
    usdc: {
      mainnet: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      testnet: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
    },
    tokenMessenger: {
      mainnet: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d', // V2
      testnet: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA', // V2
    },
    messageTransmitter: {
      mainnet: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
      testnet: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
    },
  },
};

const TOKEN_MESSENGER_ABI = [
  // V1 function signature
  'function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) external returns (uint64)',
  // V2 function signature with additional parameters
  'function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken, bytes32 destinationCaller, uint256 maxFee, uint32 minFinalityThreshold) external returns (uint64)',
  'function remoteTokenMessengers(uint32 domain) external view returns (bytes32)',
  'function localMinter() external view returns (address)',
];

const MESSAGE_TRANSMITTER_ABI = [
  'function receiveMessage(bytes message, bytes attestation) external returns (bool)',
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
];

interface TransferOptions {
  srcChain: ChainName;
  destChain: ChainName;
  amount: string;
  recipientAddress?: string; // If not provided, uses sender's address
  network: NetworkType;
}

/**
 * Convert an Ethereum address to bytes32 format
 */
const addressToBytes32 = (address: string): string => {
  // Remove 0x prefix if present
  const cleanAddress = address.toLowerCase().replace('0x', '');
  // Pad with zeros to make it 64 characters (32 bytes)
  return `0x${cleanAddress.padStart(64, '0')}`;
};

/**
 * Poll Circle's API for attestation
 */
const getAttestation = async (
  txHash: string,
  sourceDomain: number,
  network: NetworkType,
): Promise<{ message: string; attestation: string }> => {
  const apiUrl =
    network === 'mainnet'
      ? 'https://iris-api.circle.com'
      : 'https://iris-api-sandbox.circle.com';

  const url = `${apiUrl}/v2/messages/${sourceDomain}?transactionHash=${txHash}`;

  console.log(`\n⏳ Polling Circle API for attestation...`);
  console.log(`API: ${url}`);

  const maxAttempts = 60; // 10 minutes (10 second intervals)
  let attempts = 0;

  await null;
  while (attempts < maxAttempts) {
    attempts += 1;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.messages && data.messages.length > 0) {
        const msg = data.messages[0];

        if (msg.attestation && msg.status === 'complete') {
          console.log(
            `✅ Attestation complete! (attempt ${attempts}/${maxAttempts})`,
          );
          return {
            message: msg.message,
            attestation: msg.attestation,
          };
        }

        console.log(
          `⏳ Attestation status: ${msg.status || 'pending'} (attempt ${attempts}/${maxAttempts})`,
        );
      } else {
        console.log(
          `⏳ Waiting for message... (attempt ${attempts}/${maxAttempts})`,
        );
      }
    } catch (error) {
      console.log(`⚠️  API error (attempt ${attempts}): ${error}`);
    }

    // Wait 10 seconds before next attempt
    await new Promise(resolve => setTimeout(resolve, 10000));
  }

  throw new Error(
    `Failed to get attestation after ${maxAttempts} attempts (${(maxAttempts * 10) / 60} minutes)`,
  );
};

/**
 * Mint USDC on destination chain using attestation
 */
const mintOnDestination = async (
  message: string,
  attestation: string,
  destChainConfig: ChainConfig,
  network: NetworkType,
  signer: Signer,
): Promise<void> => {
  console.log(`\n🎯 Minting USDC on ${destChainConfig.name}...`);

  const messageTransmitterAddress = destChainConfig.messageTransmitter[network];
  const messageTransmitter = new Contract(
    messageTransmitterAddress,
    MESSAGE_TRANSMITTER_ABI,
    signer,
  );

  const mintTx = await messageTransmitter.receiveMessage(message, attestation);

  console.log(`Mint transaction hash: ${mintTx.hash}`);
  console.log(`Waiting for confirmation...`);

  const receipt = await mintTx.wait();
  console.log(`✅ Mint confirmed in block ${receipt?.blockNumber}`);
};

/**
 * Execute CCTP transfer between EVM chains
 */
const executeCCTPTransfer = async (
  signer: Signer,
  options: TransferOptions,
): Promise<ContractTransactionResponse> => {
  const { srcChain, destChain, amount, recipientAddress, network } = options;

  const srcConfig = CHAIN_CONFIGS[srcChain];
  const destConfig = CHAIN_CONFIGS[destChain];

  if (!srcConfig || !destConfig) {
    throw new Error(`Invalid chain configuration`);
  }

  // Get contract addresses based on network
  const usdcAddress = srcConfig.usdc[network];
  const tokenMessengerAddress = srcConfig.tokenMessenger[network];

  // Convert amount to wei (USDC has 6 decimals)
  const amountWei = parseUnits(amount, 6);

  // Determine recipient address
  const signerAddress = await signer.getAddress();
  const recipient = recipientAddress || signerAddress;
  const mintRecipient = addressToBytes32(recipient);

  console.log('\n=== CCTP Transfer Details ===');
  console.log(`Network: ${network}`);
  console.log(`Source Chain: ${srcConfig.name} (Domain ${srcConfig.domainId})`);
  console.log(
    `Destination Chain: ${destConfig.name} (Domain ${destConfig.domainId})`,
  );
  console.log(`Amount: ${amount} USDC`);
  console.log(`Sender: ${signerAddress}`);
  console.log(`Recipient: ${recipient}`);
  console.log(`Mint Recipient (bytes32): ${mintRecipient}`);
  console.log('============================\n');

  // Initialize contracts
  const tokenMessenger = new Contract(
    tokenMessengerAddress,
    TOKEN_MESSENGER_ABI,
    signer,
  );

  const usdcToken = new Contract(usdcAddress, ERC20_ABI, signer);

  // Set up destination chain provider and contract for balance checks
  const destRpcUrl = destConfig.rpcUrl(network);
  const destProvider = new JsonRpcProvider(destRpcUrl);
  const destUsdcAddress = destConfig.usdc[network];
  const destUsdcToken = new Contract(destUsdcAddress, ERC20_ABI, destProvider);

  // Check sender balance on source chain
  console.log('\n📊 Checking balances before transfer...');
  const senderBalanceBefore = await usdcToken.balanceOf(signerAddress);
  console.log(
    `Sender balance on ${srcConfig.name}: ${Number(senderBalanceBefore) / 1e6} USDC`,
  );

  if (senderBalanceBefore < amountWei) {
    throw new Error(
      `Insufficient USDC balance. Have: ${Number(senderBalanceBefore) / 1e6}, Need: ${amount}`,
    );
  }

  // Check recipient balance on destination chain
  const recipientBalanceBefore = await destUsdcToken.balanceOf(recipient);
  console.log(
    `Recipient balance on ${destConfig.name}: ${Number(recipientBalanceBefore) / 1e6} USDC`,
  );

  // Check allowance
  const allowance = await usdcToken.allowance(
    signerAddress,
    tokenMessengerAddress,
  );

  if (allowance < amountWei) {
    console.log('Approving USDC spend...');
    const approveTx = await usdcToken.approve(tokenMessengerAddress, amountWei);
    console.log(`Approval tx: ${approveTx.hash}`);
    await approveTx.wait();
    console.log('USDC approved');
  } else {
    console.log('USDC already approved');
  }

  console.log(`\nBurning ${amount} USDC for transfer...`);

  // Use V2 function signature with additional parameters
  const destinationCaller =
    '0x0000000000000000000000000000000000000000000000000000000000000000'; // anyone can call receiveMessage
  const maxFee = 0n; // no fee
  const minFinalityThreshold = 2000; // minimum confirmations (blocks)

  const tx = await tokenMessenger[
    'depositForBurn(uint256,uint32,bytes32,address,bytes32,uint256,uint32)'
  ](
    amountWei,
    destConfig.domainId,
    mintRecipient,
    usdcAddress,
    destinationCaller,
    maxFee,
    minFinalityThreshold,
  );

  console.log(`\n🔥 CCTP burn transaction hash: ${tx.hash}`);

  console.log('\n⏳ Waiting for transaction confirmation...');
  const receipt = await tx.wait();
  console.log(`✅ Transaction confirmed in block ${receipt?.blockNumber}`);

  // Check sender balance after burn
  console.log('\n📊 Checking balances after burn...');
  const senderBalanceAfter = await usdcToken.balanceOf(signerAddress);
  console.log(
    `Sender balance on ${srcConfig.name}: ${Number(senderBalanceAfter) / 1e6} USDC (reduced by ${Number(senderBalanceBefore - senderBalanceAfter) / 1e6} USDC)`,
  );

  // Check recipient balance after burn (won't have received funds yet - needs attestation)
  const recipientBalanceAfter = await destUsdcToken.balanceOf(recipient);
  console.log(
    `Recipient balance on ${destConfig.name}: ${Number(recipientBalanceAfter) / 1e6} USDC (unchanged - awaiting attestation)`,
  );

  console.log(
    `\n⏳ Circle attestation is in progress (this may take a few minutes)...`,
  );
  console.log(
    `Once attestation completes, recipient balance on ${destConfig.name} will increase by ${amount} USDC`,
  );

  return tx;
};

const parseArgs = (): TransferOptions & {
  help?: boolean;
  autoMint?: boolean;
  relayTx?: string;
} => {
  const args = process.argv.slice(2);
  const options: any = {
    network: 'testnet' as NetworkType,
    autoMint: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      return options;
    }

    if (arg === '--testnet') {
      options.network = 'testnet';
      continue;
    }

    if (arg === '--mainnet') {
      options.network = 'mainnet';
      continue;
    }

    if (arg === '--auto-mint') {
      options.autoMint = true;
      continue;
    }

    const value = args[i + 1];

    if (arg === '--src') {
      options.srcChain = value;
      i += 1;
    } else if (arg === '--dest') {
      options.destChain = value;
      i += 1;
    } else if (arg === '--amount') {
      options.amount = value;
      i += 1;
    } else if (arg === '--addr') {
      options.recipientAddress = value;
      i += 1;
    } else if (arg === '--relay-tx') {
      options.relayTx = value;
      i += 1;
    }
  }

  return options;
};

const printUsage = () => {
  console.log(`
CCTP EVM-to-EVM Transfer Script

Usage:
  ts-node cctp-evm-transfer.ts --src <chain> --dest <chain> --amount <amount> [options]

Required Arguments:
  --src <chain>      Source chain (eth, aval, base, arb, op)
  --dest <chain>     Destination chain (eth, aval, base, arb, op)
  --amount <amount>  Amount of USDC to transfer

Optional Arguments:
  --addr <address>   Recipient address (default: sender's address)
  --testnet          Use testnet (default)
  --mainnet          Use mainnet
  --auto-mint        Automatically retrieve attestation and mint on destination
  --relay-tx <hash>  Resume from an existing CCTP burn transaction; skips
                     source-chain transfer and mints on destination
  --help, -h         Show this help message

Supported Chains:
  eth   - Ethereum (Mainnet / Sepolia)
  aval  - Avalanche (C-Chain / Fuji)
  base  - Base (Mainnet / Sepolia)
  arb   - Arbitrum (One / Sepolia)
  op    - Optimism (Mainnet / Sepolia)

Examples:
  # Transfer 10 USDC from Ethereum to Avalanche on testnet
  ts-node cctp-evm-transfer.ts --src eth --dest aval --amount 10

  # Transfer with automatic minting (completes transfer automatically)
  ts-node cctp-evm-transfer.ts --src eth --dest aval --amount 10 --auto-mint

  # Transfer 100 USDC from Base to Arbitrum on mainnet
  ts-node cctp-evm-transfer.ts --src base --dest arb --amount 100 --mainnet

  # Transfer to a specific address
  ts-node cctp-evm-transfer.ts --src eth --dest op --amount 50 --addr 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

Environment Variables:
  PRIVATE_KEY        Private key for signing transactions (required)
  ALCHEMY_API        Alchemy API key for RPC access (required)
  AVALANCHE_RPC_URL  Optional Avalanche RPC override for mainnet or testnet
  BASE_RPC_URL       Optional Base RPC override for mainnet or testnet

Note:
  - Use --auto-mint to automatically complete the transfer (includes attestation + minting)
  - Without --auto-mint, you'll need to manually use Circle's attestation service
  - USDC will be minted on the destination chain after attestation completes
  - Keep your transaction hash to track the transfer
  `);
};

(async () => {
  const options = parseArgs();

  if (options.help) {
    printUsage();
    process.exit(0);
  }

  if (!options.srcChain || !options.destChain) {
    console.error('Error: Missing required arguments\n');
    printUsage();
    process.exit(1);
  }

  const validChains = ['eth', 'aval', 'base', 'arb', 'op'];
  if (
    !validChains.includes(options.srcChain) ||
    !validChains.includes(options.destChain)
  ) {
    console.error(
      'Error: Invalid chain name. Supported chains: eth, aval, base, arb, op\n',
    );
    printUsage();
    process.exit(1);
  }

  if (options.srcChain === options.destChain) {
    console.error('Error: Source and destination chains must be different\n');
    process.exit(1);
  }

  await null;
  try {
    const srcConfig = CHAIN_CONFIGS[options.srcChain as ChainName];
    const rpcUrl = srcConfig.rpcUrl(options.network);

    console.log(`\n🔗 Connecting to ${srcConfig.name} (${options.network})...`);
    const provider = new JsonRpcProvider(rpcUrl);
    const signer = new Wallet(PRIVATE_KEY, provider);

    console.log(`Wallet address: ${await signer.getAddress()}`);

    let tx: { hash: string };
    if (options.relayTx) {
      console.log(`\n🚀 Relaying existing transaction: ${options.relayTx}`);
      tx = { hash: options.relayTx };
    } else {
      if (!options.amount) {
        console.error('Error: Missing required arguments\n');
        printUsage();
        process.exit(1);
      }
      tx = await executeCCTPTransfer(signer, options as TransferOptions);

      console.log(`\n📋 Transaction hash: ${tx.hash}`);
    }

    // Auto-mint if requested
    if (options.autoMint || options.relayTx) {
      const destConfig = CHAIN_CONFIGS[options.destChain as ChainName];
      const destRpcUrl = destConfig.rpcUrl(options.network);
      const destProvider = new JsonRpcProvider(destRpcUrl);
      const destSigner = new Wallet(PRIVATE_KEY, destProvider);

      try {
        // Get attestation from Circle
        const { message, attestation } = await getAttestation(
          tx.hash,
          srcConfig.domainId,
          options.network,
        );

        // Mint USDC on destination chain
        await mintOnDestination(
          message,
          attestation,
          destConfig,
          options.network,
          destSigner,
        );

        // Check final balance
        console.log(`\n📊 Final Balance Check...`);
        const destUsdcAddress = destConfig.usdc[options.network];
        const destUsdcToken = new Contract(
          destUsdcAddress,
          ERC20_ABI,
          destProvider,
        );
        const recipient =
          options.recipientAddress || (await signer.getAddress());
        const finalBalance = await destUsdcToken.balanceOf(recipient);
        console.log(
          `✅ Recipient balance on ${destConfig.name}: ${Number(finalBalance) / 1e6} USDC`,
        );

        console.log(`\n🎉 Transfer complete!`);
      } catch (error) {
        console.error('\n❌ Auto-mint failed:', error);
        console.log(
          `\nYou can manually complete the mint later using the transaction hash: ${tx.hash}`,
        );
      }
    } else {
      console.log(`
🎯 Next Steps:
1. Track your transaction: https://iris.circle.com
2. The USDC will be minted on ${CHAIN_CONFIGS[options.destChain as ChainName].name} after attestation completes
3. Check recipient balance on destination chain after a few minutes
4. Or use --auto-mint flag to automatically complete the transfer
    `);
    }
  } catch (error) {
    console.error('\n❌ CCTP transfer failed:', error);
    process.exit(1);
  }
})();
