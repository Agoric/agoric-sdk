import { Bip39, Random } from '@cosmjs/crypto';
import {
  DirectSecp256k1HdWallet,
  decodeOptionalPubkey,
} from '@cosmjs/proto-signing';
import { writeFile } from '../writeFile.js';

export const generateMnemonic = () =>
  Bip39.encode(Random.getBytes(16)).toString();

export const createWallet = async (
  bech32Prefix = 'agoric',
  mnemonic = generateMnemonic(),
) => {
  return DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    prefix: bech32Prefix,
  });
};

const createWallets = total =>
  Array.from({ length: total }, (x, i) => ({
    id: i,
    wallet: createWallet(),
  })).map(x =>
    x.wallet.then(res => {
      console.log(res);
      return res;
    }),
  );

const makeWallets = async ps => {
  const data = await Promise.all(ps); //?
  return data;
};

const defaultWallets = makeWallets(createWallets(10)).then(res => {
  console.log('------------------------');
  console.log('defaultWallz::', { res });
  return res;
});

writeFile(
  './wallets.txt',
  makeWallets(createWallets(10)).then(res => {
    console.log('------------------------');
    console.log('defaultWallz::', { res });
    return JSON.stringify(res);
  }),
);

export { makeWallets, createWallets, defaultWallets };
