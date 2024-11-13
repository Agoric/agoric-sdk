import { makeTracer } from '@agoric/internal';
import { prepareDurablePublishKit } from '@agoric/notifier';
import { M } from '@endo/patterns';
import { CctpTxEvidenceShape } from '../typeGuards.js';

/**
 * @import {Zone} from '@agoric/zone';
 * @import {CctpTxEvidence} from '../types.js';
 */

const trace = makeTracer('TxFeed', true);

export const INVITATION_MAKERS_DESC = 'transaction oracle invitation';

const TransactionFeedKitI = harden({
  admin: M.interface('Transaction Feed Admin', {
    submitEvidence: M.call(CctpTxEvidenceShape).returns(),
  }),
  public: M.interface('Transaction Feed Public', {
    getEvidenceStream: M.call().returns(M.remotable()),
  }),
});

/**
 * @param {Zone} zone
 */
export const prepareTransactionFeedKit = zone => {
  const kinds = zone.mapStore('Kinds');
  const makeDurablePublishKit = prepareDurablePublishKit(
    kinds,
    'Transaction Feed',
  );
  /** @type {PublishKit<CctpTxEvidence>} */
  const { publisher, subscriber } = makeDurablePublishKit();

  return zone.exoClassKit('Fast USDC Feed', TransactionFeedKitI, () => ({}), {
    admin: {
      /** @param {CctpTxEvidence } evidence */
      submitEvidence: evidence => {
        trace('TEMPORARY: Add evidence:', evidence);
        // TODO decentralize
        // TODO validate that it's valid to publish
        publisher.publish(evidence);
      },
    },
    public: {
      getEvidenceStream: () => subscriber,
    },
  });
};
harden(prepareTransactionFeedKit);

/** @typedef {ReturnType<typeof prepareTransactionFeedKit>} TransactionFeedKit */
