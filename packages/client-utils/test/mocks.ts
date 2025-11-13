import type { AccountResponse } from '../src/sequence-manager.js';

export const createMockFetchAccountInfo = (
  accountNumber: `${bigint}`,
  sequenceNumber: `${bigint}`,
) => {
  let callCount = 0;
  const fetch = async (address: string): Promise<AccountResponse> => {
    callCount += 1;
    return {
      account: {
        '@type': '/cosmos.auth.v1beta1.BaseAccount',
        address,
        account_number: accountNumber,
        sequence: sequenceNumber,
      },
    };
  };
  return {
    fetch,
    setSequenceNumber: (newSequenceNumber: `${bigint}`) => {
      sequenceNumber = newSequenceNumber;
    },
    getCallCount: () => callCount,
    getNetworkSequence: () => Number(sequenceNumber),
  };
};
