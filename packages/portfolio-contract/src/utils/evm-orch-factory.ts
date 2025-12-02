import type { Hex } from 'viem';
import { keccak_256 as keccak256 } from '@noble/hashes/sha3';
import { computeCreate2Address, hashInitCode } from './create2.ts';

// TODO: refactor EVMInterface to use { type: 'address', name: '...' }
type FactoryI = {
  constructor: ['address', 'address', 'string'];
};
const Factory: FactoryI = {
  constructor: ['address', 'address', 'string'],
} as const;

const toUtf8 = (() => {
  // TextEncoder has state. encapsulate it.
  const textEncoder = new TextEncoder();
  return (s: string) => textEncoder.encode(s);
})();

export const predictWalletAddress = ({
  factoryAddress,
  walletBytecode,
  gatewayAddress,
  gasServiceAddress,
  owner,
}: {
  factoryAddress: Hex;
  walletBytecode: Uint8Array;
  gatewayAddress: Hex;
  gasServiceAddress: Hex;
  owner: string;
}): Hex => {
  assert(owner.length > 0);
  const salt = keccak256(toUtf8(owner));
  const initCodeHash = hashInitCode(
    walletBytecode,
    Factory.constructor,
  )([gatewayAddress, gasServiceAddress, owner]);

  const out = computeCreate2Address({
    deployer: factoryAddress,
    salt,
    initCodeHash,
  });
  return out;
};
