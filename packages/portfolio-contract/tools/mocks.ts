/// <reference types="ses" />
import type { AccountId } from '@agoric/orchestration';

import { TxType, type TxStatus } from '../src/resolver/constants.js';

export const createMockPendingTxData = ({
  type = TxType.CCTP_TO_EVM,
  status = 'pending',
  amount = 100_000n,
  destinationAddress = 'eip155:42161:0x742d35Cc6635C0532925a3b8D9dEB1C9e5eb2b64',
  sourceAddress = 'cosmos:agoric-3:agoric1test',
}: {
  type?: TxType;
  status?: TxStatus;
  amount?: bigint;
  destinationAddress?: AccountId;
  sourceAddress?: AccountId;
} = {}) =>
  harden({
    type,
    status,
    amount,
    destinationAddress,
    ...(type === TxType.GMP ? { sourceAddress } : {}),
  });
