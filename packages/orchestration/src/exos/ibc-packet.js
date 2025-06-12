import { makeTracer } from '@agoric/internal';
import { base64ToBytes, Shape as NetworkShape } from '@agoric/network';
import { M } from '@endo/patterns';
import { E } from '@endo/far';

// As specified in ICS20, the success result is a base64-encoded '\0x1' byte.
export const ICS20_TRANSFER_SUCCESS_RESULT = 'AQ==';

const trace = makeTracer('IBCP');

/**
 * @import {Key, Pattern} from '@endo/patterns';
 * @import {JsonSafe, TypedJson, ResponseTo} from '@agoric/cosmic-proto';
 * @import {Vow, VowTools} from '@agoric/vow';
 * @import {IBCEvent, IBCPacket} from '@agoric/vats';
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
        /**
         * @param {Vow<
         *   IBCEvent<'acknowledgementPacket'> | IBCEvent<'timeoutPacket'>
         * >} match
         * @param {PacketOptions} opts
         */
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
         * @param {{
         *   opts: PacketOptions;
         *   match: Vow<
         *     IBCEvent<'acknowledgementPacket'> | IBCEvent<'timeoutPacket'>
         *   >;
         * }} ctx
         */
        onFulfilled([{ sequence }], ctx) {
          const { match, opts } = ctx;
          const { transferMsg } = this.state;

          // sequence + sourceChannel uniquely identifies a transfer.
          // trace with receiver etc. for forensics
          trace('sequence', sequence, transferMsg);

          // Match the port/channel and sequence number.
          const replyPacketPattern = M.splitRecord({
            source_port: transferMsg.sourcePort,
            source_channel: transferMsg.sourceChannel,
            sequence: createSequencePattern(sequence),
          });

          const { resultV: ackDataV, ...rest } = makeIBCReplyKit(
            replyPacketPattern,
            match,
            { opName: 'transfer', ...opts },
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
          if (result === ICS20_TRANSFER_SUCCESS_RESULT) {
            return; // OK, transfer was successful, nothing to do
          }

          // Function to safely base64-decode and parse JSON
          const decodeAndParse = b64 => {
            try {
              return JSON.parse(atob(b64));
            } catch {
              Fail`Decoding of base64-encoded ack obj object failed: ${JSON.stringify(b64)}`;
            }
          };

          const outerDecoded = decodeAndParse(result);
          const ibcAck =
            outerDecoded?.ibc_ack && decodeAndParse(outerDecoded.ibc_ack);

          ibcAck?.result === ICS20_TRANSFER_SUCCESS_RESULT ||
            Fail`ICS20-1 transfer unsuccessful with ack result: ${outerDecoded}`;
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
 * `makeIBCReplyKit` creates a pattern for `acknowledgementPacket` and
 * `timeoutPacket` {@link IBCEvent}s using the provided {@link IBCPacket}
 * pattern.
 *
 * Returns a vow that settles when a match is found.
 *
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {VowTools} vowTools
 */
export const prepareIBCReplyKit = (zone, vowTools) => {
  const { watch } = vowTools;
  const ibcWatcher = zone.exo(
    'ibcResultWatcher',
    M.interface('processIBCWatcher', {
      onFulfilled: M.call(
        M.splitRecord({ event: M.string() }, { acknowledgement: M.string() }),
        M.splitRecord({}, { opName: M.string(), timeout: M.record() }),
      ).returns(Vow$(M.string())),
    }),
    {
      /**
       * @param {IBCEvent<'acknowledgementPacket'>
       *   | IBCEvent<'timeoutPacket'>} ibcEvent
       * @param {PacketOptions} ctx
       */
      onFulfilled(ibcEvent, { opName = 'unknown' }) {
        const { event } = ibcEvent;
        switch (event) {
          case 'acknowledgementPacket': {
            const { acknowledgement } = ibcEvent;
            acknowledgement ||
              Fail`acknowledgementPacket missing 'acknowledgement'`;
            return base64ToBytes(acknowledgement);
          }
          case 'timeoutPacket':
            throw Fail`${bare(opName)} operation received timeout packet`;
          default:
            throw Fail`Unexpected event: ${event}`;
        }
      },
    },
  );

  /**
   * @template {IBCEvent<'acknowledgementPacket'> | IBCEvent<'timeoutPacket'>} [E=IBCEvent<'acknowledgementPacket'>| IBCEvent<'timeoutPacket'>]
   * @param {Pattern} replyPacketPattern
   * @param {Vow<E>} matchV
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
