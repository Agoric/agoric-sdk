import { Bip39, Random } from '@cosmjs/crypto';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';

export function generateMnemonic(getBytes = Random.getBytes): string {
  return Bip39.encode(getBytes(16)).toString();
}

export const createWallet = async (
  bech32Prefix: string,
  mnemonic: string = generateMnemonic(),
) => {
  return DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    prefix: bech32Prefix,
  });
};
