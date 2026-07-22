/**
 * @file Utilities for using Factory.sol to emulate orchestration
 * `chain.makeAccount()` behavior on EVM chains (CREATE2 prediction, etc.).
 */
import { assert, Fail } from '@endo/errors';
import type { Bech32Address } from '@agoric/orchestration';
import { keccak_256 as keccak256 } from '@noble/hashes/sha3';
import { hexToBytes } from '@noble/hashes/utils';
import type {
  Abi,
  AbiStateMutability,
  Address,
  ContractFunctionName,
  Hex,
} from 'viem';
import { computeCreate2Address } from './create2.ts';
import type {
  AbiContract,
  AbiContractArgs,
  AbiSend,
  AbiTagged,
} from '../evm-facade.ts';
import type { ContractCall } from '../interfaces/orch-router.ts';

export const toUtf8 = (() => {
  // TextEncoder has state. encapsulate it.
  const textEncoder = new TextEncoder();
  return (s: string) => textEncoder.encode(s);
})();

/**
 * Compute the EIP-1167 minimal proxy init code hash for a given implementation address.
 * The init code is: 0x3d602d80600a3d3981f3363d3d373d3d3d363d73 ++ implementation ++ 5af43d82803e903d91602b57fd5bf3
 */
export const cloneInitCodeHash = (implementationAddress: Hex): Uint8Array =>
  keccak256(
    hexToBytes(
      `3d602d80600a3d3981f3363d3d373d3d3d363d73${implementationAddress.replace(/^0x/, '')}5af43d82803e903d91602b57fd5bf3`,
    ),
  );

export const predictRemoteAccountAddress = ({
  factoryAddress,
  implementationAddress,
  owner,
}: {
  factoryAddress: Hex;
  implementationAddress: Hex;
  owner: Bech32Address;
}): Hex => {
  assert(owner.length > 0);
  const salt = keccak256(toUtf8(owner));

  const out = computeCreate2Address({
    deployer: factoryAddress,
    salt,
    initCodeHash: cloneInitCodeHash(implementationAddress),
  });
  return out;
};

export type AbiExtendedContractMethod<TArgs extends readonly unknown[]> = {
  (...args: TArgs): ContractCall;

  with(
    metadata: Partial<Pick<ContractCall, 'value' | 'gasLimit'>>,
  ): (...args: TArgs) => ContractCall;
};

export type AbiExtendedContract<TAbi extends Abi> = {
  [Name in ContractFunctionName<
    TAbi,
    AbiStateMutability
  >]: AbiExtendedContractMethod<AbiContractArgs<TAbi, Name>>;
} & (Extract<TAbi[number], { type: 'receive' }> extends never
  ? {} // eslint-disable-line @typescript-eslint/no-empty-object-type
  : { [AbiSend]: AbiExtendedContractMethod<[]> });

type AbiFromContract<T> =
  T extends AbiTagged<infer U>
    ? U
    : T extends AbiContract<infer U, Hex>
      ? U
      : never;

export const contractWithCallMetadata = <T extends AbiContract<Abi, Hex>>(
  contract: T,
  target: Address,
): AbiExtendedContract<AbiFromContract<T>> => {
  const wrapped: Record<
    string | symbol,
    AbiExtendedContractMethod<readonly unknown[]>
  > = {};
  for (const fnName of Reflect.ownKeys(contract as AbiContract<Abi, Hex>)) {
    const fn = (contract as any)[fnName] as (
      ...args: readonly unknown[]
    ) => Hex;
    const withMetadata: AbiExtendedContractMethod<readonly unknown[]>['with'] =
      ({ value = BigInt(0), gasLimit = BigInt(0) }) =>
      (...args: readonly unknown[]) => ({
        target,
        data: fn(...args),
        value,
        gasLimit,
      });
    wrapped[fnName] = Object.assign(withMetadata({}), { with: withMetadata });
  }

  return harden(wrapped) as AbiExtendedContract<AbiFromContract<T>>;
};

export const padTxId = (txId: string, template: string) => {
  const paddingLength = template.length - txId.length;
  paddingLength >= 0 || Fail`Template must be at least as long as txId`;
  return txId + '\0'.repeat(paddingLength);
};
