/**
 * @file Type-safe EVM contract call builder for Axelar GMP integration.
 * @see {@link makeEVMSession} for creating contract call batches
 */
import type { NatValue } from '@agoric/ertp';
import { type ContractCall } from '@agoric/orchestration/src/axelar-types.js';
import { assert } from '@endo/errors';
import type {
  Abi,
  AbiStateMutability,
  ContractFunctionArgs,
  ContractFunctionName,
} from 'viem';

export type EVMT = {
  uint16: number;
  uint32: number;
  uint256: NatValue;
  address: `0x${string}`;
  bytes32: `0x${string}`;
  'address[]': Array<`0x${string}`>;
  bool: boolean;
  string: string;
  // ... others from the yellow book would go here.
  // We only use these, so far.
};

export type EVMInterface = { [name: string]: Array<keyof EVMT> };

export type ERC20I = {
  approve: ['address', 'uint256'];
  transfer: ['address', 'uint256'];
};

export const ERC20: ERC20I = {
  approve: ['address', 'uint256'],
  transfer: ['address', 'uint256'],
};

export type EVMParameters<KS extends Array<keyof EVMT>> = {
  [IX in keyof KS]: EVMT[KS[IX]];
};
type EVMMethod<P extends Array<keyof EVMT>> = (
  ...args: EVMParameters<P>
) => void;
type EVMContract<I extends EVMInterface> = { [M in keyof I]: EVMMethod<I[M]> };

export const makeEVMSession = () => {
  const calls: ContractCall[] = [];

  const finish = () => harden(calls);

  const makeContract = <I extends EVMInterface>(
    target: EVMT['address'],
    iface: I,
  ): EVMContract<I> => {
    const stubs = {} as EVMContract<I>;
    for (const name of Object.keys(iface) as Array<keyof I>) {
      const ps = iface[name];
      const functionSignature = `${name as string}(${ps.join(',')})`;
      const fn = (...args: EVMParameters<I[typeof name]>) => {
        calls.push({ target, args, functionSignature });
      };
      stubs[name] = fn;
    }
    return harden(stubs);
  };
  return harden({
    makeContract,
    finish,
  });
};

type AbiContractArgs<
  TAbi extends Abi,
  Name extends ContractFunctionName<TAbi, AbiStateMutability>,
> =
  ContractFunctionArgs<
    TAbi,
    AbiStateMutability,
    Name
  > extends readonly unknown[]
    ? ContractFunctionArgs<TAbi, AbiStateMutability, Name>
    : readonly unknown[];

type AbiContract<TAbi extends Abi> = {
  [Name in ContractFunctionName<TAbi, AbiStateMutability>]: (
    ...args: AbiContractArgs<TAbi, Name>
  ) => void;
};

/**
 * Build an ABI-typed EVM call batch for GMP payloads.
 *
 * This is a lightweight, type-safe stub: it does not connect to a node and
 * does not simulate or send transactions. It only records calls using ABI
 * signatures and typed args, returning a list of `ContractCall` payloads
 * suitable for `buildGMPPayload`.
 *
 * XXX: ABI overloads are not yet supported here. If we need them, add
 * overload disambiguation (e.g. key by full signature). For now, overloads
 * throw to avoid silent mis-encoding.
 *
 * @returns `{ makeContract, finish }`, similar to `viem.getContract(...).write`
 */
export const makeEvmAbiCallBatch = () => {
  const calls: ContractCall[] = [];

  const finish = () => harden(calls);

  const makeContract = <TAbi extends Abi>(
    target: EVMT['address'],
    abi: TAbi,
  ): AbiContract<TAbi> => {
    const stubs: Record<string, (...args: unknown[]) => void> = {};
    for (const item of abi) {
      if (item.type !== 'function') continue;
      const inputs = item.inputs ?? [];
      const signature = `${item.name}(${inputs
        .map(input => input.type)
        .join(',')})`;
      const fn = (...args: unknown[]) => {
        calls.push({ target, functionSignature: signature, args, abi: [item] });
      };
      if (stubs[item.name]) {
        assert.fail(
          `ABI overload for ${item.name} requires disambiguation (not supported)`,
        );
      }
      stubs[item.name] = fn;
    }
    return harden(stubs) as AbiContract<TAbi>;
  };

  return harden({
    makeContract,
    finish,
  });
};
