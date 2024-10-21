import { Bip39, Random } from '@cosmjs/crypto';
import {
  DirectSecp256k1HdWallet,
  decodeOptionalPubkey,
} from '@cosmjs/proto-signing';

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
      // console.log(res);
      return res;
    }),
  );

const makeWallets = async (count = 5) => {
  const data = await Promise.all(createWallets(count)); //?
  return data;
};

const defaultWallets = [];

export { makeWallets, createWallets, defaultWallets };
