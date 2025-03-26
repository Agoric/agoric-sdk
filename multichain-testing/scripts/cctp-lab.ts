#!/usr/bin/env -S node --import ts-blank-space/register

import { MsgDepositForBurn } from '@agoric/cosmic-proto/circle/cctp/v1/tx.js';
import { fromHex } from '@cosmjs/encoding';
import {
  DirectSecp256k1HdWallet,
  Registry,
  type GeneratedType,
} from '@cosmjs/proto-signing';
import { SigningStargateClient } from '@cosmjs/stargate';

export const cctpTypes: ReadonlyArray<[string, GeneratedType]> = [
  [
    '/circle.cctp.v1.MsgDepositForBurn',
    // @ts-expect-error type of encode doesn't match. not sure why
    MsgDepositForBurn,
  ],
];

function createDefaultRegistry(): Registry {
  return new Registry(cctpTypes);
}

const exampleFee = {
  amount: [{ denom: 'uusdc', amount: '0' }],
  gas: '200000',
};

// IOU docs ref
const domains = {
  eth: 0,
  solana: 5,
};

const configs = {
  test: {
    noble: {
      explorer: 'https://mintscan.io/noble-testnet',
      rpc: 'https://noble-testnet-rpc.polkachu.com:443',
    },
    eth: { explorer: 'https://sepolia.etherscan.io' },
  },
  main: {
    noble: {
      explorer: 'https://mintscan.io/noble',
      rpc: 'https://noble-rpc.polkachu.com:443',
    },
    eth: { explorer: 'https://etherscan.io' },
  },
};
const config = configs.test;

// https://github.com/Agoric/agoric-sdk/pull/11037/files#diff-ab8e7785ae43086c39c85476d30212af7ed31ef5d5f19bb56e06f25999d9b11aR153
/**
 * Left pad the mint recipient address with 0's to 32 bytes. standard ETH
 * addresses are 20 bytes, but for ABI data structures and other reasons, 32
 * bytes are used.
 *
 * @param {string} rawAddress
 */
export const leftPadEthAddressTo32Bytes = rawAddress => {
  const cleanedAddress = rawAddress.replace(/^0x/, '');
  const zeroesNeeded = 64 - cleanedAddress.length;
  const paddedAddress = '0'.repeat(zeroesNeeded) + cleanedAddress;
  return fromHex(paddedAddress);
};

const go = async (
  client: SigningStargateClient,
  from: string,
  destEthAddr: string,
) => {
  const mintRecipientBytes = leftPadEthAddressTo32Bytes(destEthAddr);
  const msg = {
    typeUrl: '/circle.cctp.v1.MsgDepositForBurn',
    value: {
      from,
      amount: '1',
      destinationDomain: domains.eth,
      mintRecipient: mintRecipientBytes,
      burnToken: 'uusdc',
      // If using DepositForBurnWithCaller, add destinationCaller here
    },
  };

  console.log('protoMsg', MsgDepositForBurn.toProtoMsg(msg.value));

  const result = await client.signAndBroadcast(from, [msg], exampleFee);

  return result.transactionHash;
};

const main = async () => {
  const mnemonic = process.env.MNEMONIC ? process.env.MNEMONIC : '';
  const dest = process.env.ETH_DEST!;

  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    prefix: 'noble',
  });
  const [account] = await wallet.getAccounts();
  console.log('source addr:', account.address);

  const client = await SigningStargateClient.connectWithSigner(
    config.noble.rpc,
    wallet,
    { registry: createDefaultRegistry() },
  );

  const transactionHash = await go(client, account.address, dest);

  console.log(
    `Burned on Noble: ${config.noble.explorer}/tx/${transactionHash}`,
  );
  console.log('minting on Eth:', `${config.eth.explorer}/address/${dest}`);
};

main().catch(err => console.error(err));
