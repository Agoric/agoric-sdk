import { assertAllDefined } from '@agoric/internal';
import { atob } from '@endo/base64';
import { makeError, q } from '@endo/errors';
import { M } from '@endo/patterns';

import { addressTools } from '../utils/address.js';

/**
 * @import { FungibleTokenPacketData } from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
 * @import {Denom} from '@agoric/orchestration';
 * @import {IBCChannelID, VTransferIBCEvent} from '@agoric/vats';
 * @import {Zone} from '@agoric/zone';
 * @import { NobleAddress } from '../types.js';
 * @import {StatusManager} from './status-manager.js';
 */

/**
 * @param {Zone} zone
 * @param {object} caps
 * @param {StatusManager} caps.statusManager
 */
export const prepareSettler = (zone, { statusManager }) => {
  assertAllDefined({ statusManager });
  return zone.exoClass(
    'Fast USDC Settler',
    M.interface('SettlerI', {
      receiveUpcall: M.call(M.record()).returns(M.promise()),
    }),
    /**
     *
     * @param {{
     *   sourceChannel: IBCChannelID;
     *   remoteDenom: Denom
     * }} config
     */
    config => harden(config),
    {
      /** @param {VTransferIBCEvent} event */
      async receiveUpcall(event) {
        if (event.packet.source_channel !== this.state.sourceChannel) {
          // only interested in packets from the issuing chain
          return;
        }
        const tx = /** @type {FungibleTokenPacketData} */ (
          JSON.parse(atob(event.packet.data))
        );
        if (tx.denom !== this.state.remoteDenom) {
          // only interested in uusdc
          return;
        }

        if (!addressTools.hasQueryParams(tx.receiver)) {
          // only interested in receivers with query params
          return;
        }

        const { params } = addressTools.getQueryParams(tx.receiver);
        // TODO - what's the schema address parameter schema for FUSDC?
        if (!params?.EUD) {
          // only interested in receivers with EUD parameter
          return;
        }

        const hasPendingSettlement = statusManager.hasPendingSettlement(
          tx.sender,
          BigInt(tx.amount),
        );
        if (!hasPendingSettlement) {
          // TODO FAILURE PATH -> put money in recovery account or .transfer to receiver
          // TODO should we have a TxStatus for this?
          throw makeError(
            `🚨 No pending settlement found for ${q(tx.sender)} ${q(tx.amount)}`,
          );
        }

        // TODO disperse funds
        // ~1. fee to contractFeeAccount
        // ~2. remainder in poolAccount

        // update status manager, marking tx `SETTLED`
        statusManager.settle(
          /** @type {NobleAddress} */ (tx.sender),
          BigInt(tx.amount),
        );
      },
    },
    {
      stateShape: harden({
        sourceChannel: M.string(),
        remoteDenom: M.string(),
      }),
    },
  );
};
harden(prepareSettler);
