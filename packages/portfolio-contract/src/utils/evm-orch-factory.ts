/**
 * @file Utilities for using Factory.sol to emulate orchestration
 * `chain.makeAccount()` behavior on EVM chains (CREATE2 prediction, etc.).
 */
import { assert } from '@endo/errors';
import { keccak_256 as keccak256 } from '@noble/hashes/sha3';
import type { AbiParameterToPrimitiveType, Hex } from 'viem';
import {
  depositFactoryABI,
  walletABI,
  walletMulticallABI,
} from '../interfaces/orch-factory.ts';
import { computeCreate2Address, hashInitCode } from './create2.ts';

const walletConstructor = walletABI[0];

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
    walletConstructor.inputs,
  )([gatewayAddress, gasServiceAddress, owner]);

  const out = computeCreate2Address({
    deployer: factoryAddress,
    salt,
    initCodeHash,
  });
  return out;
};

const depositFactoryCreateAndDeposit = depositFactoryABI.find(
  (
    item,
  ): item is Extract<
    (typeof depositFactoryABI)[number],
    { type: 'function'; name: 'createAndDeposit' }
  > => item.type === 'function' && item.name === 'createAndDeposit',
);
if (!depositFactoryCreateAndDeposit) {
  throw new Error('depositFactoryABI missing createAndDeposit');
}

export const depositFactoryCreateAndDepositInputs =
  depositFactoryCreateAndDeposit.inputs ?? [];

type DepositFactoryCreateAndDepositInput = NonNullable<
  (typeof depositFactoryCreateAndDeposit)['inputs']
>[0];
export type CreateAndDepositPayload =
  AbiParameterToPrimitiveType<DepositFactoryCreateAndDepositInput>;

export const walletCallMessageParams = walletMulticallABI[0].inputs ?? [];
