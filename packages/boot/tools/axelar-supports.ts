import { encodeAbiParameters, toBytes, type Hex } from 'viem';
import { encodeBase64 } from '@endo/base64';

type CallResult = {
  success: boolean;
  result: Hex;
};

/**
 * Standard response format for bidirectional cross-chain communication between
 * Agoric and EVM chains via Axelar GMP (General Message Passing).
 *
 * This type ensures consistent message structure when EVM contracts send
 * responses back to Agoric after executing operations like wallet creation
 * or contract calls.
 *
 * @property {boolean} isContractCallResult - Discriminator flag:
 *   - false: Response contains remote EVM account creation results
 *   - true: Response contains contract execution/multicall results
 * @property {Array<CallResult>} data - Array of operation results,
 *   supporting batch operations and multi-step contract interactions. Each
 *   CallResult contains success status and encoded result data.
 *
 * Used in conjunction with makeReceiveUpCallPayload() to encode responses as
 * Base64 payloads that are ABI-compatible with Solidity struct decoding.
 *
 * @see https://github.com/agoric-labs/dapp-evm/blob/main/solidity/contracts/Factory.sol
 */
export type AgoricResponse = {
  isContractCallResult: boolean;
  data: CallResult[];
};

/**
 * Helper function to simulate responses from EVM chain via Axelar to Agoric by encoding payloads according to Agoric's response structure
 * @param {AgoricResponse} response
 * @returns {string} Base64-encoded payload string
 */
export const makeReceiveUpCallPayload = ({
  isContractCallResult,
  data,
}: AgoricResponse): string => {
  if (!Array.isArray(data)) {
    throw new Error('Response data must be an array of CallResult objects');
  }

  const encodedPayloadHex = encodeAbiParameters(
    [
      {
        type: 'tuple',
        components: [
          { name: 'isContractCallResult', type: 'bool' },
          {
            name: 'data',
            type: 'tuple[]',
            components: [
              { name: 'success', type: 'bool' },
              { name: 'result', type: 'bytes' },
            ],
          },
        ],
      },
    ],
    [
      {
        isContractCallResult,
        data,
      },
    ],
  );

  const payloadBytes = toBytes(encodedPayloadHex);
  const payloadBase64 = encodeBase64(payloadBytes);

  return payloadBase64;
};
