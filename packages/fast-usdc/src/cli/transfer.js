import {
  AgoricChainStoragePathKind,
  makeAgoricChainStorageWatcher,
} from '@agoric/rpc';
import axios from 'axios';
import fsp from 'node:fs/promises';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { SigningStargateClient } from '@cosmjs/stargate';
import { Buffer } from 'node:buffer';
import { bech32 } from 'bech32';
import { ethers } from 'ethers';
import { makeTendermintRpcClient } from '@agoric/casting';

const createMsgRegisterAccount = (
  /** @type {string} */ signer,
  /** @type {string} */ recipient,
  /** @type {string} */ channel,
) => {
  return {
    typeUrl: '/noble.forwarding.v1.MsgRegisterAccount',
    value: {
      signer,
      recipient,
      channel,
    },
  };
};

export const registerFwdAccount = async (
  /** @type {import('./config').ConfigOpts} */ config,
  /** @type {string} */ recipient,
  io,
) => {
  const {
    fetch = globalThis.fetch,
    rpcClient = makeTendermintRpcClient(config.nobleRpc, fetch),
  } = io;
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(config.nobleSeed, {
    prefix: 'noble',
  });
  const accounts = await wallet.getAccounts();
  const signerAddress = accounts[0].address;
  const msg = createMsgRegisterAccount(
    signerAddress,
    recipient,
    config.nobleToAgoricChannel,
  );
  const fee = {
    amount: [
      {
        denom: 'uusdc',
        amount: '5000',
      },
    ],
    gas: '200000',
  };

  const clientWithSigner = await SigningStargateClient.connectWithSigner(
    rpcClient,
    wallet,
  );

  const txResult = await clientWithSigner.signAndBroadcast(
    signerAddress,
    [msg],
    fee,
    'Register Account Transaction',
  );

  if (txResult.code !== undefined && txResult.code !== 0) {
    throw new Error(
      `Transaction failed with code ${txResult.code}: ${txResult.events || ''}`,
    );
  }
  return `Transaction successful with hash: ${txResult.transactionHash}`;
};

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

const contractAbi = [
  'function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) external',
];

const depositForBurn = async (
  /** @type {import('./config').ConfigOpts} */ config,
  /** @type {string} */ mintRecipient,
  /** @type {`${bigint}`} */ amount,
  io,
) => {
  const { fetch = globalThis.fetch } = io;
  // TODO: override ambient authority used in JsonRpcProvider constructor
  // somehow we need to use geturl-browser.ts
  // and override fetch here with an injected arg:
  // https://github.com/ethers-io/ethers.js/blob/9e7e7f3e2f2d51019aaa782e6290e079c38332fb/src.ts/utils/geturl-browser.ts#L48
  const provider = new ethers.JsonRpcProvider(config.ethRpc);
  const privateKey = config.ethSeed;
  const wallet = new ethers.Wallet(privateKey, provider);
  const contractAddress = config.tokenMessengerAddress;
  const contract = new ethers.Contract(contractAddress, contractAbi, wallet);
  const parsedAmount = ethers.parseUnits(amount, 6);
  const tx = await contract.depositForBurn(
    parsedAmount,
    4,
    mintRecipient,
    config.tokenAddress,
  );

  console.log('Transaction sent, waiting for confirmation...');
  const receipt = await tx.wait();

  console.log('Transaction confirmed in block', receipt.blockNumber);
  console.log('Transaction hash:', receipt.transactionHash);
};

/** @typedef {import("@agoric/rpc").ChainStorageWatcher} ChainStorageWatcher */

const transfer = async (
  /** @type {import("fs").PathLike} */ configPath,
  /** @type {`${bigint}`} */ amount,
  /** @type {string} */ destination,
  out = console,
  get = axios.get,
  /** @type {ChainStorageWatcher | undefined} */ watcher,
  io = {},
) => {
  const execute = async (
    /** @type {import('./config').ConfigOpts} */ config,
  ) => {
    watcher ||= makeAgoricChainStorageWatcher(config.agoricApi, 'agoric');
    const agoricAddr = await watcher.queryOnce([
      AgoricChainStoragePathKind.Data,
      // TODO: Find real vstorage path for settlement account address
      'published.fastUSDC.settlementAccount',
    ]);
    const appendedAddr = `${agoricAddr}+${destination}`;
    const forwardingAddressRes = await get(
      `${config.nobleApi}/noble/forwarding/v1/address/${config.nobleToAgoricChannel}/${appendedAddr}`,
    );
    const { address, exists } = forwardingAddressRes.data;
    if (!exists) {
      await registerFwdAccount(config, appendedAddr);
    }

    const mintRecipient = encodeBech32Address(address);
    await depositForBurn(config, mintRecipient, amount).catch(out.error);
    // TODO: Sign and broadcast CCTP transfer to noble forwarding address
    // ETH sepolia USDC token address: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
    // ETH sepolia token messenger contract: 0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5
    // ETH sepolia (and mainnet) noble domain: 4
    // ETH mainnet USDC token address: 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48
    // ETH mainnet token messenger contract: 0xbd3fa81b58ba92a82136038b25adec7066af3155
  };

  let config;
  await null;
  const { readFile = fsp.readFile, contentP = readFile(configPath, 'utf-8') } =
    io;
  try {
    config = JSON.parse(await contentP);
  } catch {
    out.error(
      `No config found at ${configPath}. Use "config init" to create one, or "--home" to specify config location.`,
    );
    return;
  }
  await execute(config);
};

export default { transfer };
