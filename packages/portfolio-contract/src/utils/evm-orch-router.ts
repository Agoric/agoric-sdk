/**
 * @file Utilities for using Factory.sol to emulate orchestration
 * `chain.makeAccount()` behavior on EVM chains (CREATE2 prediction, etc.).
 */
import { assert } from '@endo/errors';
import type { Bech32Address } from '@agoric/orchestration';
import { keccak_256 as keccak256 } from '@noble/hashes/sha3';
import { hexToBytes } from '@noble/hashes/utils';
import type { Abi, Address, Hex } from 'viem';
import { computeCreate2Address } from './create2.ts';
import type { AbiContract } from '../evm-facade.ts';

export const toUtf8 = (() => {
  // TextEncoder has state. encapsulate it.
  const textEncoder = new TextEncoder();
  return (s: string) => textEncoder.encode(s);
})();

export const toInitCodeHash = (bytecodeHash: Hex): Uint8Array =>
  hexToBytes(bytecodeHash.replace(/^0x/, ''));

export const predictRemoteAccountAddress = ({
  factoryAddress,
  remoteAccountInitCodeHash,
  owner,
}: {
  factoryAddress: Hex;
  remoteAccountInitCodeHash: Uint8Array;
  owner: Bech32Address;
}): Hex => {
  assert(owner.length > 0);
  const salt = keccak256(toUtf8(owner));

  const out = computeCreate2Address({
    deployer: factoryAddress,
    salt,
    initCodeHash: remoteAccountInitCodeHash,
  });
  return out;
};

export const contractWithTarget = <T extends AbiContract<Abi, Hex>>(
  contract: T,
  target: Address,
): T extends AbiContract<infer U, Hex>
  ? AbiContract<U, { target: Address; data: Hex }>
  : never => {
  const wrapped = Object.fromEntries(
    Object.entries(contract).map(([fnName, fn]) => [
      fnName,
      (...args: unknown[]) => ({ target, data: fn(...args) }),
    ]),
  );

  return wrapped as any;
};
