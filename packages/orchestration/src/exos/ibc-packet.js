import { assertAllDefined } from '@agoric/internal';
import { base64ToBytes, Shape as NetworkShape } from '@agoric/network';
import { M } from '@endo/patterns';
import { E } from '@endo/far';

// As specified in ICS20, the success result is a base64-encoded '\0x1' byte.
export const ICS20_TRANSFER_SUCCESS_RESULT = 'AQ==';

/**
 * @import {JsonSafe, TypedJson, ResponseTo} from '@agoric/cosmic-proto';
 * @import {Vow, VowTools} from '@agoric/vow';
 * @import {LocalChainAccount} from '@agoric/vats/src/localchain.js';
 * @import {PacketOptions} from './packet-tools.js';
 */

const { Fail, bare } = assert;
const { Vow$ } = NetworkShape; // TODO #9611

/**
 * Create a pattern for alterative representations of a sequence number.
 *
 * @param {any} sequence
 * @returns {Pattern}
 */
export const createSequencePattern = sequence => {
  const sequencePatterns = [];

  try {
    const bintSequence = BigInt(sequence);
    bintSequence > 0n && sequencePatterns.push(bintSequence);
  } catch (e) {
    // ignore
  }

  const numSequence = Number(sequence);
  numSequence > 0 &&
    Number.isSafeInteger(numSequence) &&
    sequencePatterns.push(numSequence);

  const strSequence = String(sequence);
  strSequence && sequencePatterns.push(strSequence);

  if (!sequencePatterns.find(seq => seq === sequence)) {
    sequencePatterns.push(sequence);
  }

  switch (sequencePatterns.length) {
    case 0:
      throw Fail`sequence ${sequence} is not valid`;
    case 1:
      return sequencePatterns[0];
    default:
      return M.or(...sequencePatterns);
  }
};
harden(createSequencePattern);

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {VowTools & { makeIBCReplyKit: MakeIBCReplyKit }} powers
 */
export const prepareIBCTransferSender = (zone, { watch, makeIBCReplyKit }) => {
  const makeIBCTransferSenderKit = zone.exoClassKit(
    'IBCTransferSenderKit',
    {
      public: M.interface('IBCTransferSender', {
        sendPacket: M.call(Vow$(M.any()), M.any()).returns(Vow$(M.record())),
      }),
      responseWatcher: M.interface('responseWatcher', {
        onFulfilled: M.call([M.record()], M.record()).returns(M.any()),
      }),
      verifyTransferSuccess: M.interface('verifyTransferSuccess', {
        onFulfilled: M.call(M.any()).returns(),
      }),
    },
    /**
     * @param {{
     *   executeTx: LocalChainAccount['executeTx'];
     * }} txExecutor
     * @param {TypedJson<'/ibc.applications.transfer.v1.MsgTransfer'>} transferMsg
     */
    (txExecutor, transferMsg) => ({
      txExecutor,
      transferMsg: harden(transferMsg),
    }),
    {
      public: {
        sendPacket(match, opts) {
          const { txExecutor, transferMsg } = this.state;
          return watch(
            E(txExecutor).executeTx([transferMsg]),
            this.facets.responseWatcher,
            { opts, match },
          );
        },
      },
      responseWatcher: {
        /**
         * Wait for successfully sending the transfer packet.
         *
         * @param {[
         *   JsonSafe<
         *     ResponseTo<
         *       TypedJson<'/ibc.applications.transfer.v1.MsgTransfer'>
         *     >
         *   >,
         * ]} response
         * @param {Record<string, any>} ctx
         */
        onFulfilled([{ sequence }], ctx) {
          const { match } = ctx;
          const { transferMsg } = this.state;

          // Match the port/channel and sequence number.
          const replyPacketPattern = M.splitRecord({
            source_port: transferMsg.sourcePort,
            source_channel: transferMsg.sourceChannel,
            sequence: createSequencePattern(sequence),
          });

          const { resultV: ackDataV, ...rest } = makeIBCReplyKit(
            replyPacketPattern,
            match,
            ctx,
          );
          const resultV = watch(ackDataV, this.facets.verifyTransferSuccess);
          return harden({ resultV, ...rest });
        },
      },
      verifyTransferSuccess: {
        onFulfilled(ackData) {
          let obj;
          try {
            obj = JSON.parse(ackData);
          } catch {
            Fail`ICS20-1 transfer ack data is not JSON: ${ackData}`;
          }
          const { result, error } = obj;
          error === undefined || Fail`ICS20-1 transfer error ${error}`;
          result ?? Fail`Missing result in ICS20-1 transfer ack ${obj}`;
          result === ICS20_TRANSFER_SUCCESS_RESULT ||
            Fail`ICS20-1 transfer unsuccessful with ack result ${result}`;
        },
      },
    },
  );

  /**
   * @param {Parameters<typeof makeIBCTransferSenderKit>} args
   */
  return (...args) => makeIBCTransferSenderKit(...args).public;
};
harden(prepareIBCTransferSender);

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {VowTools} vowTools
 */
export const prepareIBCReplyKit = (zone, vowTools) => {
  const { watch } = vowTools;
  const ibcWatcher = zone.exo(
    'ibcResultWatcher',
    M.interface('processIBCWatcher', {
      onFulfilled: M.call(M.record(), M.record()).returns(Vow$(M.string())),
    }),
    {
      onFulfilled({ event, acknowledgement }, { opName = 'unknown' }) {
        assertAllDefined({ event, acknowledgement });
        switch (event) {
          case 'acknowledgementPacket':
            return base64ToBytes(acknowledgement);
          case 'timeoutPacket':
            throw Fail`${bare(opName)} operation received timeout packet`;
          default:
            throw Fail`Unexpected event: ${event}`;
        }
      },
    },
  );

  /**
   * @param {Pattern} replyPacketPattern
   * @param {Vow<any>} matchV
   * @param {PacketOptions} opts
   */
  const makeIBCReplyKit = (replyPacketPattern, matchV, opts) => {
    const eventPattern = M.or(
      M.splitRecord({
        event: 'acknowledgementPacket',
        packet: replyPacketPattern,
        acknowledgement: M.string(),
      }),
      M.splitRecord({
        event: 'timeoutPacket',
        packet: replyPacketPattern,
      }),
    );
    const resultV = watch(matchV, ibcWatcher, opts);
    return harden({ eventPattern, resultV });
  };

  return makeIBCReplyKit;
};
harden(prepareIBCReplyKit);
/** @typedef {ReturnType<typeof prepareIBCReplyKit>} MakeIBCReplyKit */

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {VowTools} vowTools
 */
export const prepareIBCTools = (zone, vowTools) => {
  const makeIBCReplyKit = prepareIBCReplyKit(zone, vowTools);
  const makeIBCTransferSender = prepareIBCTransferSender(zone, {
    makeIBCReplyKit,
    ...vowTools,
  });
  return harden({ makeIBCTransferSender, makeIBCReplyKit });
};
harden(prepareIBCTools);
