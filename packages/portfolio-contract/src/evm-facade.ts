/**
 * @file Type-safe EVM contract call builder for Axelar GMP integration.
 * @see {@link makeEVMSession} for creating contract call batches
 */
import { type ContractCall } from '@agoric/orchestration/src/axelar-types.js';
import type { NatValue } from '@agoric/ertp';

export type EVMT = {
  uint16: number;
  uint32: number;
  uint256: NatValue;
  address: `0x${string}`;
  bytes32: `0x${string}`;
  'address[]': Array<`0x${string}`>;
  bool: boolean;
  // ... others from the yellow book would go here.
  // We only use these, so far.
};

export type EVMInterface = { [name: string]: Array<keyof EVMT> };

export type ERC20I = {
  approve: ['address', 'uint256'];
};

export const ERC20: ERC20I = {
  approve: ['address', 'uint256'],
};

type EVMParameters<KS extends Array<keyof EVMT>> = {
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
