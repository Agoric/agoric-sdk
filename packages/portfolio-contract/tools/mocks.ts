/// <reference types="ses" />
import type { AccountId } from '@agoric/orchestration';

export const createMockPendingTxData = ({
  type,
  amount,
  status = 'pending',
  destinationAddress = 'eip155:42161:0x742d35Cc6635C0532925a3b8D9dEB1C9e5eb2b64',
}: {
  type: string;
  status?: string;
  amount?: bigint;
  destinationAddress?: AccountId;
}) =>
  harden({
    type,
    status,
    amount,
    destinationAddress,
  });
