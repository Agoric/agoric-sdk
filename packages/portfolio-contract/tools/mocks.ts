/// <reference types="ses" />
import type { AccountId } from '@agoric/orchestration';

type MockPendingTx = {
  type: string;
  amount?: bigint;
  status?: string;
  destinationAddress?: AccountId;
};

export const createMockPendingTxData = ({
  type,
  amount,
  status = 'pending',
  destinationAddress = 'eip155:42161:0x742d35Cc6635C0532925a3b8D9dEB1C9e5eb2b64',
}: MockPendingTx) => {
  const data: MockPendingTx = { type, status, destinationAddress };

  if (amount) {
    data.amount = amount;
  }

  return harden(data);
};
