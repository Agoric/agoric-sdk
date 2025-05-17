import { Buffer } from 'node:buffer';
import { bech32 } from 'bech32';
import { ethers } from 'ethers';

/**
 * Adapted from https://docs.noble.xyz/cctp/mint#encoding
 *
 * @param {string} address
 * @returns {string}
 */
export const encodeBech32Address = address => {
  const decoded = bech32.decode(address);
  const rawBytes = Buffer.from(bech32.fromWords(decoded.words));

  const padded = Buffer.alloc(32);
  rawBytes.copy(padded, 32 - rawBytes.length);

  return `0x${padded.toString('hex')}`;
};

const tokenAbi = ['function approve(address spender, uint256 value) external'];

const contractAbi = [
  'function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) external',
];

export const makeProvider = (/** @type {string} */ rpc) =>
  new ethers.JsonRpcProvider(rpc);

const USDC_DECIMALS = 6;
// For CCTP, noble's domain is universally "4"
const NOBLE_DOMAIN = 4;

export const depositForBurn = async (
  /** @type {ethers.JsonRpcProvider} */ provider,
  /** @type {string} */ ethSeed,
  /** @type {string} */ tokenMessengerAddress,
  /** @type {string} */ tokenAddress,
  /** @type {string} */ destination,
  /** @type {string} */ amount,
  out = console,
) => {
  const privateKey = ethSeed;
  const wallet = new ethers.Wallet(privateKey, provider);
  const contractAddress = tokenMessengerAddress;
  const token = new ethers.Contract(tokenAddress, tokenAbi, wallet);
  const contract = new ethers.Contract(contractAddress, contractAbi, wallet);
  const parsedAmount = ethers.parseUnits(amount, USDC_DECIMALS);
  out.log('approving');
  const approveTx = await token.approve(contractAddress, parsedAmount);
  out.log('Transaction sent, waiting for confirmation...');
  const approveReceipt = await approveTx.wait();
  out.log('Transaction confirmed in block', approveReceipt.blockNumber);
  out.log('Transaction hash:', approveReceipt.hash);

  const mintRecipient = encodeBech32Address(destination);
  out.log('depositing for burn', parsedAmount, 4, mintRecipient, tokenAddress);
  const tx = await contract.depositForBurn(
    parsedAmount,
    NOBLE_DOMAIN,
    mintRecipient,
    tokenAddress,
  );

  out.log('Transaction sent, waiting for confirmation...');
  const receipt = await tx.wait();

  out.log('Transaction confirmed in block', receipt.blockNumber);
  out.log('Transaction hash:', receipt.hash);
  out.log('USDC transfer initiated successfully');
};
