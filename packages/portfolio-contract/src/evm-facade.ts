/**
 * @file Type-safe EVM contract call builder for Axelar GMP integration.
 * @see {@link makeEvmAbiCallBatch} for creating contract call batches
 */
import { type ContractCall } from '@agoric/orchestration/src/axelar-types.js';
import {
  encodeAbiParameters,
  encodeFunctionData,
} from '@agoric/orchestration/src/vendor/viem/viem-abi.js';
import { assert } from '@endo/errors';
import { hexToBytes } from '@noble/hashes/utils';
import type {
  Abi,
  AbiStateMutability,
  Address,
  ByteArray,
  ContractFunctionArgs,
  ContractFunctionName,
  Hex,
} from 'viem';

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

export type AbiContract<TAbi extends Abi, R = void> = {
  [Name in ContractFunctionName<TAbi, AbiStateMutability>]: (
    ...args: AbiContractArgs<TAbi, Name>
  ) => R;
};

type GmpBuilder = {
  makeContract: <TAbi extends Abi>(
    target: Address,
    abi: TAbi,
  ) => AbiContract<TAbi>;
  getPayload: () => ByteArray;
};

/**
 * Build a proxy from a contract ABI whose method returns the ABI encoded call data.
 */
export const makeEvmContract = <TAbi extends Abi>(
  abi: TAbi,
): AbiContract<TAbi, Hex> => {
  const stubs: Record<string, (...args: unknown[]) => Hex> = {};
  for (const item of abi) {
    if (item.type !== 'function') continue;
    // XXX: add and use prepareEncodeFunctionData to vendored viem
    const fn = (...args: unknown[]) => {
      // @ts-expect-error generic
      return encodeFunctionData({ abi, functionName: item.name, args });
    };
    if (stubs[item.name]) {
      // `encodeFunctionData` support overloads in most cases, but we need to
      // test disambiguation when the signature has the same number of
      // parameters (but different types).
      assert.fail(
        `ABI overload for ${item.name} requires disambiguation (not supported)`,
      );
    }
    stubs[item.name] = fn;
  }
  return harden(stubs) as AbiContract<TAbi, Hex>;
};

/**
 * Build an ABI-typed execute payload for Axelar GMP.
 *
 * The destination contract is invoked via Axelar's `execute(bytes)` entrypoint,
 * so this builder encodes the payload bytes (no function selector) using the
 * ABI inputs of the chosen method.
 *
 */
export const makeGmpBuilder = (): GmpBuilder => {
  let payloadHex: Hex | undefined;

  const makeContract = <TAbi extends Abi>(
    _target: Address,
    abi: TAbi,
  ): AbiContract<TAbi> => {
    const stubs: Record<string, (...args: unknown[]) => void> = {};
    for (const item of abi) {
      if (item.type !== 'function') continue;
      const inputs = item.inputs ?? [];
      const fn = (...args: unknown[]) => {
        if (payloadHex) {
          assert.fail('Axelar execute payload already set');
        }
        payloadHex = encodeAbiParameters(inputs, args);
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

  const getPayload = () => {
    assert(payloadHex, 'Axelar execute payload must be set');
    return harden(hexToBytes(payloadHex.slice(2)));
  };

  return harden({
    makeContract,
    getPayload,
  });
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
    target: Address,
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
