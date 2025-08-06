// Reference: https://github.com/circlefin/noble-cctp/blob/master/examples/depositForBurn.ts
// Instructions for running: https://github.com/circlefin/noble-cctp/blob/master/examples/README.md
import 'dotenv/config';
import {
  DirectSecp256k1HdWallet,
  Registry,
  type GeneratedType,
} from '@cosmjs/proto-signing';
import { SigningStargateClient } from '@cosmjs/stargate';
import { MsgDepositForBurn } from './generated/tx';

export const cctpTypes: ReadonlyArray<[string, GeneratedType]> = [
  ['/circle.cctp.v1.MsgDepositForBurn', MsgDepositForBurn],
];

const createDefaultRegistry = (): Registry => {
  return new Registry(cctpTypes);
};

const main = async () => {
  const NOBLE_RPC = 'https://rpc.testnet.noble.xyz/';
  const amountToSend = '1000000'; // uusdc (1 USDC)
  const gasAmount = '400000'; // Gas amount in uusdc for the transaction
  // https://developers.circle.com/stablecoins/supported-domains
  const destinationDomain = 0; // Ethereum

  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic) {
    throw Error('mnemonic is not defined');
  }
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    prefix: 'noble',
  });

  const [account] = await wallet.getAccounts();

  const client = await SigningStargateClient.connectWithSigner(
    NOBLE_RPC,
    wallet,
    {
      registry: createDefaultRegistry(),
    },
  );

  // Left pad the mint recipient address with 0's to 32 bytes
  const rawMintRecipient = process.env.MINT_RECIPIENT;
  if (!rawMintRecipient) {
    throw Error('rawMintRecipient is not defined');
  }
  const cleanedMintRecipient = rawMintRecipient.replace(/^0x/, '');
  const zeroesNeeded = 64 - cleanedMintRecipient.length;
  const mintRecipient = '0'.repeat(zeroesNeeded) + cleanedMintRecipient;
  const buffer = Buffer.from(mintRecipient, 'hex');
  const mintRecipientBytes = new Uint8Array(buffer);

  const msg = {
    typeUrl: '/circle.cctp.v1.MsgDepositForBurn',
    value: {
      from: account.address,
      amount: amountToSend,
      destinationDomain,
      mintRecipient: mintRecipientBytes,
      burnToken: 'uusdc',
      // If using DepositForBurnWithCaller, add destinationCaller here
    },
  };

  const fee = {
    amount: [
      {
        denom: 'uusdc',
        amount: gasAmount,
      },
    ],
    gas: gasAmount,
  };
  const memo = '';
  const result = await client.signAndBroadcast(
    account.address,
    [msg],
    fee,
    memo,
  );

  console.log(
    `Burned on Noble: https://mintscan.io/noble-testnet/tx/${result.transactionHash}`,
  );
  console.log(
    `Minting on Ethereum to https://sepolia.etherscan.io/address/${rawMintRecipient}`,
  );
};

main();
