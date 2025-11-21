import type { BaseAccount } from '../src/codegen/cosmos/auth/v1beta1/auth.js';

export const createMockFetchAccount = (
  accountNumber: bigint,
  sequenceNumber: bigint,
) => {
  let callCount = 0;
  let currentSequence = sequenceNumber;

  const fetch = async (): Promise<BaseAccount> => {
    callCount += 1;
    return {
      address: 'agoric1test',
      accountNumber,
      sequence: currentSequence,
    };
  };

  return {
    fetch,
    setSequenceNumber: (newSequenceNumber: bigint) => {
      currentSequence = newSequenceNumber;
    },
    getCallCount: () => callCount,
    getNetworkSequence: () => currentSequence,
  };
};
