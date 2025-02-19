import { encode } from '@metamask/abi-utils';
import { concatBytes, hexToBytes } from '@metamask/utils';

// Test data matching your original use case
export const testData = {
  evmContractAddress: '0x1234567890123456789012345678901234567890',
  functionSelector: '0xabcdef12',
  encodedArgs: '0x1234567890',
  deadline: 1234567890,
  nonce: 42,
};

export function getContractInvocationPayload({
  evmContractAddress,
  functionSelector,
  encodedArgs,
  deadline,
  nonce,
}) {
  const LOGIC_CALL_MSG_ID = 0;

  const payload = encode(
    ['uint256', 'address', 'uint256', 'uint256', 'bytes'],
    [
      LOGIC_CALL_MSG_ID,
      evmContractAddress,
      nonce,
      deadline,
      concatBytes([hexToBytes(functionSelector), hexToBytes(encodedArgs)]),
    ],
  );

  return Array.from(payload);
}
