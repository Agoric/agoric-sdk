/**
 * @file utils/gmp.js GMP payload construction utilities
 */
import { ethers } from 'ethers';

export const GMPMessageType = {
  MESSAGE_ONLY: 1,
  MESSAGE_WITH_TOKEN: 2,
  TOKEN_ONLY: 3,
};
harden(GMPMessageType);

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
  const abiCoder = new ethers.utils.AbiCoder();

  const payload = abiCoder.encode(
    ['uint256', 'address', 'uint256', 'uint256', 'bytes'],
    [
      LOGIC_CALL_MSG_ID,
      evmContractAddress,
      nonce,
      deadline,
      ethers.utils.hexlify(
        ethers.utils.concat([functionSelector, encodedArgs]),
      ),
    ],
  );

  return Array.from(ethers.utils.arrayify(payload));
};
harden(buildGMPPayload);
