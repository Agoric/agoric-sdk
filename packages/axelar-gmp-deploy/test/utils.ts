import { encodeAbiParameters, toBytes, type Hex } from 'viem';
import { encodeBase64 } from '@endo/base64';

export type CallResult = {
  success: boolean;
  result: Hex;
};

export type AgoricResponse = {
  isContractCallResult: boolean;
  data: CallResult[];
};

/**
 * Encodes a payload according to Agoric's response structure
 * @param {object} response - The response object matching AgoricResponse struct
 * @param {boolean} response.isContractCallResult
 * @param {Array<CallResult>} response.data
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
