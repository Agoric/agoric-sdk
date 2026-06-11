#!/usr/bin/env -S node --import ts-blank-space/register
import { Bip39, Random, stringToPath } from '@cosmjs/crypto';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { pathToFileURL } from 'node:url';

const main = async () => {
  const mnemonic = Bip39.encode(Random.getBytes(16)).toString();

  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    prefix: 'agoric',
    hdPaths: [stringToPath(`m/44'/564'/0'/0/0`)],
  });

  const [{ address }] = await wallet.getAccounts();
  console.log('export AGENT_ADDRESS=%s', address);
  console.log('export MNEMONIC=%s', mnemonic);
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
