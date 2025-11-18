import { keccak_256 as keccak256 } from '@noble/hashes/sha3';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { encodeAbiParameters, type Hex } from 'viem';
import { Fail, q } from '@endo/errors';

const textEncoder = new TextEncoder();

const toHex = (bytes: Uint8Array): Hex => `0x${bytesToHex(bytes)}`;

const assertEvenLength = (value: string) =>
  value.length % 2 === 0 || Fail`hex ${q(`0x${value}`)} must have even length`;

const normalizeHex = (value: string, expectedBytes?: number): Hex => {
  const prefixed = value.startsWith('0x') ? value : `0x${value}`;
  const body = prefixed.slice(2);
  assertEvenLength(body);
  if (expectedBytes !== undefined) {
    const expectedChars = expectedBytes * 2;
    body.length === expectedChars ||
      Fail`expected ${expectedBytes}-byte hex, got ${body.length / 2} for ${q(prefixed)}`;
  }
  return `0x${body.toLowerCase()}` satisfies Hex;
};

const toBytes = (hex: Hex, expectedBytes?: number): Uint8Array => {
  const normalized = normalizeHex(hex, expectedBytes);
  return hexToBytes(normalized.slice(2));
};

const concatBytes = (...arrays: Uint8Array[]) => {
  const total = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    merged.set(arr, offset);
    offset += arr.length;
  }
  return merged;
};

const keccakHex = (bytes: Uint8Array): Hex => toHex(keccak256(bytes));

export const deriveWalletSalt = (owner: string): Hex => {
  owner.length > 0 || Fail`wallet owner string must not be empty`;
  const ownerBytes = textEncoder.encode(owner);
  return keccakHex(ownerBytes);
};

export const computeCreate2Address = ({
  deployer,
  salt,
  initCodeHash,
}: {
  deployer: Hex;
  salt: Hex;
  initCodeHash: Hex;
}): Hex => {
  const deployerBytes = toBytes(deployer, 20);
  const saltBytes = toBytes(salt, 32);
  const initHashBytes = toBytes(initCodeHash, 32);
  const payload = concatBytes(
    Uint8Array.of(0xff),
    deployerBytes,
    saltBytes,
    initHashBytes,
  );
  const digest = keccak256(payload);
  const addressBytes = digest.slice(12); // last 20 bytes
  return toHex(addressBytes);
};

export const computeWalletInitCodeHash = ({
  walletBytecode,
  gatewayAddress,
  gasServiceAddress,
  owner,
}: {
  walletBytecode: Hex;
  gatewayAddress: Hex;
  gasServiceAddress: Hex;
  owner: string;
}): Hex => {
  const constructorArgs = encodeAbiParameters(
    [{ type: 'address' }, { type: 'address' }, { type: 'string' }],
    [
      normalizeHex(gatewayAddress, 20),
      normalizeHex(gasServiceAddress, 20),
      owner,
    ],
  );

  const initCodeBytes = concatBytes(
    toBytes(walletBytecode),
    toBytes(normalizeHex(constructorArgs)),
  );
  return keccakHex(initCodeBytes);
};

export const predictWalletAddress = ({
  factoryAddress,
  walletBytecode,
  gatewayAddress,
  gasServiceAddress,
  owner,
}: {
  factoryAddress: Hex;
  walletBytecode: Hex;
  gatewayAddress: Hex;
  gasServiceAddress: Hex;
  owner: string;
}): Hex => {
  const salt = deriveWalletSalt(owner);
  const initCodeHash = computeWalletInitCodeHash({
    walletBytecode,
    gatewayAddress,
    gasServiceAddress,
    owner,
  });

  const out = computeCreate2Address({
    deployer: normalizeHex(factoryAddress, 20),
    salt,
    initCodeHash,
  });
  return out;
};
