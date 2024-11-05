import { assertAllDefined } from '@agoric/internal';
import { VowShape } from '@agoric/vow';
import { makeError, q } from '@endo/errors';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { CctpTxEvidenceShape } from '../typeGuards.js';
import { addressTools } from '../utils/address.js';

/**
 * @import {HostInterface} from '@agoric/async-flow';
 * @import {ChainAddress, ChainHub, Denom, DenomAmount, OrchestrationAccount} from '@agoric/orchestration';
 * @import {VowTools} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {CctpTxEvidence, NobleAddress} from '../types.js';
 * @import {StatusManager} from './status-manager.js';
 * @import {TransactionFeed} from './transaction-feed.js';
 */

/**
 * @param {Zone} zone
 * @param {object} caps
 * @param {ChainHub} caps.chainHub
 * @param {TransactionFeed} caps.feed
 * @param {StatusManager} caps.statusManager
 * @param {VowTools} caps.vowTools
 */
export const prepareAdvancer = (
  zone,
  { chainHub, feed, statusManager, vowTools: { watch } },
) => {
  assertAllDefined({ feed, statusManager, watch });

  const transferHandler = zone.exo(
    'Fast USDC Advance Transfer Handler',
    M.interface('TransferHandlerI', {
      // TODO confirm undefined, and not bigint (sequence)
      onFulfilled: M.call(M.undefined(), {
        address: M.string(),
        amount: M.bigint(),
        index: M.number(),
      }).returns(M.undefined()),
      onRejected: M.call(M.error(), {
        address: M.string(),
        amount: M.bigint(),
        index: M.number(),
      }).returns(M.undefined()),
    }),
    {
      /**
       * @param {undefined} result
       * @param {{ address: NobleAddress; amount: bigint; index: number; }} ctx
       */
      onFulfilled(result, { address, amount, index }) {
        // TODO, endow with logger
        console.log('@@@fulfilled', { address, amount, index, result });
        statusManager.advance(address, amount, index);
      },
      onRejected(error) {
        // XXX retry logic?
        // What do we do if we fail, should we keep a Status?
        // TODO, endow with logger
        console.log('@@@rejected', { error });
      },
    },
  );

  return zone.exoClass(
    'Fast USDC Advancer',
    M.interface('AdvancerI', {
      handleEvent: M.call(CctpTxEvidenceShape).returns(VowShape),
    }),
    /**
     * @param {{
     *   localDenom: Denom;
     *   poolAccount: HostInterface<OrchestrationAccount<{ chainId: 'agoric' }>>;
     * }} config
     */
    config => harden(config),
    {
      /**
       * TODO riff on name. for now, assume this is invoked when a new entry is
       * observed via the EventFeed.
       *
       * @param {CctpTxEvidence} event
       */
      handleEvent(event) {
        // observe regardless of validation checks
        // TODO - should we only observe after validation checks?
        const entryIndex = statusManager.observe(event);

        const {
          params: { EUD },
        } = addressTools.getQueryParams(event.aux.recipientAddress);
        if (!EUD) {
          throw makeError(
            `'recipientAddress' does not contain EUD param: ${q(event.aux.recipientAddress)}`,
          );
        }

        // TODO validation checks:
        // 1. ensure there's enough $
        // 2. ensure we can find chainID
        // 3. ~~ensure valid PFM path~~ best observable via .transfer() vow rejection

        const { chainId } = chainHub.getChainInfoByAddress(EUD);

        /** @type {ChainAddress} */
        const destination = harden({
          chainId,
          value: EUD,
          encoding: /** @type {const} */ ('bech32'),
        });

        /** @type {DenomAmount} */
        const amount = harden({
          denom: this.state.localDenom,
          value: BigInt(event.tx.amount),
        });

        const transferV = E(this.state.poolAccount).transfer(
          destination,
          amount,
        );

        // onFulfilled, update StatusManger with `SETTLED`
        // onRejected, TBD
        return watch(transferV, transferHandler, {
          index: entryIndex,
          address: event.tx.forwardingAddress,
          amount: amount.value,
        });
      },
    },
    {
      stateShape: harden({
        localDenom: M.string(),
        poolAccount: M.remotable(),
      }),
    },
  );
};
harden(prepareAdvancer);
