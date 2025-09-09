import test from 'ava';

import { matches } from '@endo/patterns';

import { boardSlottingMarshaller } from '@agoric/client-utils';
import type { AccountId } from '@agoric/orchestration';

import { TxType, type TxStatus } from '../src/resolver/constants.js';
import {
  PublishedTxShape,
  type PublishedTx,
  type TxId,
} from '../src/resolver/types.ts';

const marshaller = boardSlottingMarshaller();

type PendingTx = { txId: TxId } & PublishedTx;
const parsePendingTx = (txId: `tx${number}`, data): PendingTx | null => {
  if (!matches(data, PublishedTxShape)) return null;
  return { txId, ...data } as PendingTx;
};

export const createMockPendingTxData = ({
  type = TxType.CCTP_TO_EVM,
  status = 'pending',
  amount = 100_000n,
  destinationAddress = 'eip155:42161:0x742d35Cc6635C0532925a3b8D9dEB1C9e5eb2b64',
}: {
  type?: TxType;
  status?: TxStatus;
  amount?: bigint;
  destinationAddress?: AccountId;
} = {}) =>
  harden({
    type,
    status,
    amount,
    destinationAddress,
  });

test('parsePendingTx creates valid PendingTx from data', t => {
  const txId = 'tx1' as `tx${number}`;
  const txData = createMockPendingTxData({ type: TxType.CCTP_TO_EVM });
  const capData = marshaller.toCapData(txData);

  const result = parsePendingTx(txId, marshaller.fromCapData(capData));

  t.deepEqual(result, {
    txId,
    type: TxType.CCTP_TO_EVM,
    status: 'pending',
    amount: 1000_00n,
    destinationAddress:
      'eip155:42161:0x742d35Cc6635C0532925a3b8D9dEB1C9e5eb2b64',
  });
});

test('parsePendingTx returns null for invalid data shape', t => {
  const txId = 'tx3' as `tx${number}`;
  const invalidTxData = harden({
    someOtherField: 'value',
  });

  const result = parsePendingTx(txId, invalidTxData);

  t.is(result, null);
});

test('parsePendingTx returns null when CCTP transaction is missing amount field', t => {
  const txId = 'tx4' as `tx${number}`;
  const cctpWithoutAmount = harden({
    type: TxType.CCTP_TO_EVM,
    status: 'pending',
    destinationAddress:
      'eip155:42161:0x742d35Cc6635C0532925a3b8D9dEB1C9e5eb2b64',
  });

  const result = parsePendingTx(txId, cctpWithoutAmount);

  t.is(result, null);
});

test('parsePendingTx accepts GMP transaction without amount field', t => {
  const txId = 'tx5' as `tx${number}`;
  const gmpWithoutAmount = harden({
    type: TxType.GMP,
    status: 'pending',
    destinationAddress:
      'eip155:42161:0x742d35Cc6635C0532925a3b8D9dEB1C9e5eb2b64',
  });

  const result = parsePendingTx(txId, gmpWithoutAmount);

  t.deepEqual(result, {
    txId,
    type: TxType.GMP,
    status: 'pending',
    destinationAddress:
      'eip155:42161:0x742d35Cc6635C0532925a3b8D9dEB1C9e5eb2b64',
  });
});

test('parsePendingTx validates Noble withdraw transactions require amount', t => {
  const txId = 'tx1' as `tx${number}`;
  const nobleWithdrawData = harden({
    type: TxType.CCTP_TO_NOBLE,
    status: 'pending',
    destinationAddress: 'cosmos:noble:noble1abc123456789',
  });
  const capData = marshaller.toCapData(nobleWithdrawData);
  const unmarshalledData = marshaller.fromCapData(capData);

  const result = parsePendingTx(txId, unmarshalledData);

  t.is(result, null);
});

test('parsePendingTx creates valid Noble withdraw PendingTx from data', t => {
  const txId = 'tx1' as `tx${number}`;
  const nobleWithdrawData = createMockPendingTxData({
    type: TxType.CCTP_TO_NOBLE,
    amount: 500_000n,
    destinationAddress: 'cosmos:noble:noble1abc123456789',
  });
  const capData = marshaller.toCapData(nobleWithdrawData);

  const result = parsePendingTx(txId, marshaller.fromCapData(capData));

  t.deepEqual(result, {
    txId,
    type: TxType.CCTP_TO_NOBLE,
    status: 'pending',
    amount: 500_000n,
    destinationAddress: 'cosmos:noble:noble1abc123456789',
  });
});
