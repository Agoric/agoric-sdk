import { encodeAbiParameters } from '@agoric/orchestration/src/vendor/viem/viem-abi.js';
import { keccak_256 as keccak256 } from '@noble/hashes/sha3';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import type { AbiParametersToPrimitiveTypes } from 'abitype';
import type { AbiParameter, Hex } from 'viem';

const toHex = (bytes: Uint8Array): Hex => `0x${bytesToHex(bytes)}`;

const toBytes = (hex: Hex, expectedBytes?: number): Uint8Array => {
  const bytes = hexToBytes(hex.replace(/^0x/, ''));
  if (expectedBytes) {
    assert.equal(bytes.length, expectedBytes);
  }
  return bytes;
};

const concatBytes = (...arrays: Uint8Array[]) => {
  const total = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    arr instanceof Uint8Array ||
      assert.fail(`expected Uint8Array; got: ${typeof arr}`);
    merged.set(arr, offset);
    offset += arr.length;
  }
  return merged;
};

export const computeCreate2Address = ({
  deployer,
  salt,
  initCodeHash,
}: {
  deployer: Hex;
  salt: Uint8Array;
  initCodeHash: Uint8Array;
}): Hex => {
  const deployerBytes = toBytes(deployer, 20);
  assert.equal(salt.length, 32);
  assert.equal(initCodeHash.length, 32);
  const payload = concatBytes(
    Uint8Array.of(0xff),
    deployerBytes,
    salt,
    initCodeHash,
  );
  const digest = keccak256(payload);
  const addressBytes = digest.slice(12); // last 20 bytes
  return toHex(addressBytes);
};

export const hashInitCode =
  <CTSig extends readonly AbiParameter[]>(
    byteCode: Uint8Array,
    params: CTSig,
  ) =>
  (values: AbiParametersToPrimitiveTypes<CTSig>) => {
    // Bridge viem's internal tuple typing to abitype's exported mapping.
    const encodeParams = encodeAbiParameters as <
      T extends readonly AbiParameter[],
    >(
      p: T,
      v: AbiParametersToPrimitiveTypes<T>,
    ) => Hex;
    const constructorArgs = encodeParams(params, values);
    const initCodeBytes = concatBytes(byteCode, toBytes(constructorArgs));
    return keccak256(initCodeBytes);
  };
