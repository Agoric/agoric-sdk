import { M } from '@endo/patterns';
import { makeError, q } from '@endo/errors';

import { CctpTxEvidenceShape, StatusManagerEntryShape } from '../typeGuards.js';
import { TxStatus } from '../constants.js';

/**
 * @import {Zone} from '@agoric/zone';
 * @import {CctpTxEvidence, NobleAddress, StatusManagerEntry} from '../types.js';
 */

/** @param {CctpTxEvidence} evidence */
export const getStatusKey = evidence => {
  const {
    tx: { amount, forwardingAddress },
  } = evidence;
  return `${forwardingAddress}-${amount}`;
};

/**
 * @param {Zone} zone
 */
export const prepareStatusManager = zone => {
  const txs = zone.mapStore('txs', {
    keyShape: M.string(),
    valueShape: M.arrayOf(StatusManagerEntryShape),
  });

  return zone.exo(
    'Fast USDC Status Manager',
    M.interface('StatusManagerI', {
      observe: M.call(CctpTxEvidenceShape).returns(M.number()),
      advance: M.call(M.string(), M.bigint(), M.number()).returns(
        M.undefined(),
      ),
      hasPendingSettlement: M.call(M.string(), M.bigint()).returns(M.boolean()),
      settle: M.call(M.string(), M.bigint()).returns(M.undefined()),
      view: M.call(M.string(), M.bigint())
        .optional(M.number())
        .returns(
          M.or(
            StatusManagerEntryShape,
            M.arrayOf(StatusManagerEntryShape),
            M.undefined(),
          ),
        ),
    }),
    {
      /**
       * Queue a transaction before initiating a transfer. Receive
       * the entry index in return.
       *
       * @param {CctpTxEvidence} evidence
       * @returns {number}
       */
      observe(evidence) {
        // XXX like `appendToStoredArray`, but returns index. consider
        // upstreaming the change if it doesn't affect existing consumers
        const key = getStatusKey(evidence);
        const entry = { ...evidence, status: TxStatus.OBSERVED };
        if (!txs.has(key)) {
          // XXX append to store helper
          txs.init(key, harden([entry]));
          return 0;
        }
        const current = txs.get(key);
        // XXX do we need defensive logic to ensure multiple entries don't have
        // the same txHash+chainId?
        txs.set(key, harden([...current, entry]));
        return current.length;
      },
      /**
       * Mark an `OBSERVED` transaction as `ADVANCED`.
       *
       * @param {string} address
       * @param {bigint} amount
       * @param {number} index
       */
      advance(address, amount, index) {
        const key = `${address}-${amount}`;
        const mutableEntries = [...txs.get(key)];
        if (mutableEntries[index].status !== TxStatus.OBSERVED) {
          throw makeError(
            `Invalid status ${q(mutableEntries[index].status)} for ${q(key)}`,
          );
        }
        mutableEntries[index] = {
          ...mutableEntries[index],
          status: TxStatus.ADVANCED,
        };
        txs.set(key, harden(mutableEntries));
      },
      /**
       * Find an `ADVANCED` tx waiting to be `SETTLED`
       *
       * @param {string} address
       * @param {bigint} amount
       * @returns {boolean}
       */
      hasPendingSettlement(address, amount) {
        const key = `${address}-${amount}`;
        const entries = txs.get(key);
        const unsettledIdx = entries.findIndex(
          ({ status }) => status === TxStatus.ADVANCED,
        );
        // TODO: if OBSERVED -> SETTLED is a valid transition, so if the below
        // is false we should probably also check for `OBSERVED`
        return unsettledIdx > -1;
      },
      /**
       * Mark an `ADVANCED` transaction as `SETTLED`.
       *
       * TODO - does this need to support `OBSERVED` -> `SETTLED`?
       *
       * @param {NobleAddress} address
       * @param {bigint} amount
       */
      settle(address, amount) {
        const key = `${address}-${amount}`;
        const mutableEntries = [...txs.get(key)];
        const unsettledIdx = mutableEntries.findIndex(
          ({ status }) => status === TxStatus.ADVANCED,
        );
        if (unsettledIdx === -1) {
          throw makeError(`No pending advance found for ${q(key)}`);
        }
        mutableEntries[unsettledIdx] = {
          ...mutableEntries[unsettledIdx],
          status: TxStatus.SETTLED,
        };
        txs.set(key, harden(mutableEntries));
      },
      /**
       * View a StatusManagerEntry or a list of them
       *
       * TODO primarily used for testing, consider if this is actually needed
       *
       * @param {NobleAddress} address
       * @param {bigint} amount
       * @param {number} [index] - optional index to return single entry
       * @returns {index extends undefined ? StatusManagerEntry[] : StatusManagerEntry}
       */
      view(address, amount, index) {
        const key = `${address}-${amount}`;
        const entries = txs.get(key);
        return index === undefined ? entries : entries[index];
      },
    },
  );
};
harden(prepareStatusManager);

/** @typedef {ReturnType<typeof prepareStatusManager>} StatusManager */
