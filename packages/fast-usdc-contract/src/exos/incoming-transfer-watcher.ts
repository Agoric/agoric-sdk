import type { FungibleTokenPacketData } from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
import type { Denom } from '@agoric/orchestration';
import type { SetStore } from '@agoric/store';
import type { IBCChannelID, VTransferIBCEvent } from '@agoric/vats';
import { VowShape, type Vow, type VowKit, type VowTools } from '@agoric/vow';
import type { Zone } from '@agoric/zone';
import { Fail } from '@endo/errors';
import { M } from '@endo/patterns';

type IncomingTransferWatcherPowers = {
  vowTools: VowTools;
};

export type IncomingTransferWatcherConfig = {
  sourceChannel: IBCChannelID;
  remoteDenom: Denom;
  /** the max number of sequences to track at any given time. will be pruned based on insertion order */
  cacheLimit?: number;
  incomingTransfers?: SetStore<bigint>;
  sequenceToVowKit?: MapStore<bigint, VowKit>;
};

/**
 * Exo that helps detect settlement of transfers from an ICA->LCA.
 *
 * Assumes there will only be ONE request about a particular packet/sequence
 * to simplify storage considerations.
 *
 * TODO: Cannot detect `timeoutPackets`.
 *
 *
 * TODO: should it watch all incoming transfers, tracking N 25 most recent?
 *   - storage can be light if we just use `sequence`
 *
 * FYI about transfer channels:
 *  - `timeoutPackets` only communicated to sender, not receiver (true ?)
 *  - channels are unordered, so sequences can arrive out of order at any time
 *  - The LCA is only one of many accounts in the channel; only a subset
 *    of packets (sequences) will be relevant and communicated to this exo
 *
 * FYI about implementation
 *  - might have some gaps in view if we don't get timeoutPackets
 *  - can ask our interested to communicate their timeout parameter(s)
 *    (MsgTransfer+ICAPacket) and we might be able to leverage this
 *      - we might want to add padding since the transfer can settle by
 *        the ica packet might be slow to be communicated back
 *
 */
export const prepareIncomingTransferWatcher = (
  zone: Zone,
  { vowTools }: IncomingTransferWatcherPowers,
  {
    sourceChannel,
    remoteDenom,
    cacheLimit = 25,
    incomingTransfers = zone
      .detached()
      .setStore('incomingTransfers') as SetStore<bigint>,
    sequenceToVowKit = zone
      .detached()
      .mapStore('sequenceToResolvers') as MapStore<bigint, VowKit>,
  }: IncomingTransferWatcherConfig,
) => {
  return zone.exoClassKit(
    'IncomingTransferWatcher',
    {
      tap: M.interface('IncomingTransferWatcherTapI', {
        receiveUpcall: M.call(M.record()).returns(),
      }),
      public: M.interface('IncomingTransferWatcherPublicI', {
        waitForAck: M.call(M.any()).returns(VowShape),
      }),
    },
    () => ({}),
    {
      tap: {
        receiveUpcall(upcall: VTransferIBCEvent) {
          const { event, packet } = upcall;

          // constrain to a particular source_channel
          // XXX consider making this check optional, so this can watch multiple sources
          if (sourceChannel !== packet.source_channel) return;

          // constrain to a particular denom
          const packetData: FungibleTokenPacketData | undefined = (() => {
            try {
              return JSON.parse(atob(packet.data));
            } catch {
              console.info('unable to parse packet data', packet.data);
              return undefined;
            }
          })();
          if (!packetData) return;

          if (packetData.denom !== remoteDenom) return;

          // only expecting to receive acknowledgementPackets (not `timeoutPacket`)
          event === 'acknowledgementPacket' || Fail`Unexpected event ${event}`;

          // ensure the packet has a sequence (not expecting this to throw)
          if (!packet.sequence)
            throw Fail`Missing sequence number in packet ${packet}`;
          const sequence = BigInt(packet.sequence);
          // check if we have any outstanding requests for this sequence

          if (sequenceToVowKit.has(sequence)) {
            const { resolver } = sequenceToVowKit.get(sequence);
            resolver.resolve();
            sequenceToVowKit.delete(sequence);
            // return early; we only expect one watcher for a sequence
            return;
          }

          // no one is waiting, store the sequence for later
          // unexpected; should only receive acknowledgement packets once
          !incomingTransfers.has(sequence) ||
            Fail`Already have sequence ${packet.sequence}`;
          incomingTransfers.add(sequence);

          // prune incoming transfers store, ensuring we have no more than `cacheLimit` members
          const storedIncomingTransfers = incomingTransfers.getSize();
          if (storedIncomingTransfers > cacheLimit) {
            // assumes SetStore preserves insertion order
            // FIXME: above logic doesn't sem to hold
            const { value } = incomingTransfers
              .values()
              [Symbol.iterator]()
              .next();
            incomingTransfers.delete(value);
          }
        },
      },
      public: {
        waitForAck(sequence: bigint): Vow {
          // see if we have already seen this sequence
          if (incomingTransfers.has(sequence)) {
            // prune store; assumes a sequence will only be awaited once
            incomingTransfers.delete(sequence);
            // return a resolved vow
            const vk = vowTools.makeVowKit();
            vk.resolver.resolve();
            return vk.vow;
          }
          if (sequenceToVowKit.has(sequence)) {
            console.warn(
              'already have a resolver registered for this sequence; exo assumes it will only be awaited once',
            );
            return sequenceToVowKit.get(sequence).vow;
          }
          // otherwise, create a new vow to settle when it arrives
          const vk = vowTools.makeVowKit();
          sequenceToVowKit.init(sequence, vk);
          return vk.vow;
        },
      },
    },
  );
};
harden(prepareIncomingTransferWatcher);
