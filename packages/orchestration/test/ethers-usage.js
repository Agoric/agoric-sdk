import { utils } from 'ethers';

// Test data matching your original use case
export const testData = {
  evmContractAddress: '0x1234567890123456789012345678901234567890',
  functionSelector: '0xabcdef12',
  encodedArgs: '0x1234567890',
  deadline: 1234567890,
  nonce: 42,
};

export const getContractInvocationPayload = ({
  evmContractAddress,
  functionSelector,
  encodedArgs,
  deadline,
  nonce,
}) => {
  const LOGIC_CALL_MSG_ID = 0;
  const abiCoder = new utils.AbiCoder();

  const payload = abiCoder.encode(
    ['uint256', 'address', 'uint256', 'uint256', 'bytes'],
    [
      LOGIC_CALL_MSG_ID,
      evmContractAddress,
      nonce,
      deadline,
      utils.hexlify(utils.concat([functionSelector, encodedArgs])),
    ],
  );

  return Array.from(utils.arrayify(payload));
};

console.log(testData);
console.log(getContractInvocationPayload(testData));
