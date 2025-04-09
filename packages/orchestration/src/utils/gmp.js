/**
 * @file utils/gmp.js GMP payload construction utilities
 */
import { hexlify, arrayify, concat } from '@ethersproject/bytes';
import { AbiCoder } from '@ethersproject/abi';
import sha3 from 'js-sha3';

export const GMPMessageType = {
  MESSAGE_ONLY: 1,
  MESSAGE_WITH_TOKEN: 2,
  TOKEN_ONLY: 3,
};
harden(GMPMessageType);

export const gmpAddresses = {
  AXELAR_GMP:
    'axelar1dv4u5k73pzqrxlzujxg3qp8kvc3pje7jtdvu72npnt5zhq05ejcsn5qme5',
  AXELAR_GAS: 'axelar1zl3rxpp70lmte2xr6c4lgske2fyuj3hupcsvcd',
  OSMOSIS_RECEIVER: 'osmo1yh3ra8eage5xtr9a3m5utg6mx0pmqreytudaqj',
};

const uint8ArrayToHex = uint8Array => {
  return `0x${Array.from(uint8Array)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')}`;
};

/**
 * Converts a hex string to a Uint8Array
 *
 * @param {string} hexString The hex string to convert
 * @returns {Uint8Array} The resulting Uint8Array
 */
export const hexToUint8Array = hexString => {
  if (hexString.startsWith('0x')) {
    hexString = hexString.slice(2);
  }
  const length = hexString.length / 2;
  const uint8Array = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    uint8Array[i] = parseInt(hexString.substr(i * 2, 2), 16);
  }
  return uint8Array;
};

export const encodeCallData = (functionSignature, paramTypes, params) => {
  const abiCoder = new AbiCoder();
  const functionHash = sha3.keccak256.digest(functionSignature);
  const functionHashHex = uint8ArrayToHex(functionHash);

  const encodedData = abiCoder.encode(paramTypes, params);
  return `0x${functionHashHex.slice(2)}${encodedData.slice(2)}`;
};

/**
 * Builds a GMP payload for contract invocation
 *
 * @param {object} params Contract invocation parameters
 * @param {number} params.type GMP message type
 * @param {string} params.evmContractAddress Target contract address
 * @param {string} params.functionSelector Function selector (4 bytes)
 * @param {string} params.encodedArgs ABI encoded arguments
 * @param {number} params.deadline
 * @param {number} params.nonce
 * @returns {number[] | null} Encoded payload as number array, or null for a
 *   pure token transfer
 */
export const buildGMPPayload = ({
  type,
  evmContractAddress,
  functionSelector,
  encodedArgs,
  deadline,
  nonce,
}) => {
  if (type === GMPMessageType.TOKEN_ONLY) {
    return null;
  }

  const LOGIC_CALL_MSG_ID = 0;
  const abiCoder = new AbiCoder();

  const payload = abiCoder.encode(
    ['uint256', 'address', 'uint256', 'uint256', 'bytes'],
    [
      LOGIC_CALL_MSG_ID,
      evmContractAddress,
      nonce,
      deadline,
      hexlify(concat([functionSelector, encodedArgs])),
    ],
  );

  return Array.from(arrayify(payload));
};
harden(buildGMPPayload);
