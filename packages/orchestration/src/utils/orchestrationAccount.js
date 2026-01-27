import { BrandShape } from '@agoric/ertp';
import { Shape as NetworkShape } from '@agoric/network';
import { VowShape } from '@agoric/vow';
import { TopicsRecordShape } from '@agoric/zoe/src/contractSupport/topics.js';
import { M } from '@endo/patterns';
import { Fail } from '@endo/errors';
import {
  AccountIdArgShape,
  AmountArgShape,
  CosmosChainAddressShape,
  DenomAmountShape,
  IBCTransferOptionsShape,
} from '../typeGuards.js';

const { Vow$ } = NetworkShape; // TODO #9611

/**
 * @import {TypedPattern} from '@agoric/internal';
 * @import {IBCEndpoint} from '@agoric/vats/tools/ibc-utils.js';
 * @import {CaipChainId, IBCConnectionInfo, TrafficEntry} from '../types.js';
 */

/**
 * @typedef {object} SliceDescriptor
 * @property {number} start beginning index of the range (inclusive)
 * @property {number} end ending index of the range (exclusive)
 */
/** @type {TypedPattern<SliceDescriptor>} */
export const SliceDescriptorShape = M.splitRecord({
  start: M.number(),
  end: M.number(),
});
harden(SliceDescriptorShape);

/** @see {OrchestrationAccountCommon} */
export const orchestrationAccountMethods = {
  getAddress: M.call().returns(CosmosChainAddressShape),
  getBalance: M.call(M.or(BrandShape, M.string())).returns(
    Vow$(DenomAmountShape),
  ),
  getBalances: M.call().returns(Vow$(M.arrayOf(DenomAmountShape))),
  send: M.call(AccountIdArgShape, AmountArgShape)
    .optional(M.record())
    .returns(VowShape),
  sendAll: M.call(CosmosChainAddressShape, M.arrayOf(AmountArgShape))
    .optional(M.record())
    .returns(VowShape),
  transfer: M.call(AccountIdArgShape, AmountArgShape)
    .optional(IBCTransferOptionsShape)
    .returns(VowShape),
  transferSteps: M.call(AmountArgShape, M.any()).returns(VowShape),
  asContinuingOffer: M.call().returns(
    Vow$({
      publicSubscribers: TopicsRecordShape,
      invitationMakers: M.any(),
      holder: M.remotable(),
    }),
  ),
  getPublicTopics: M.call().returns(Vow$(TopicsRecordShape)),
  makeProgressTracker: M.call().returns(M.remotable('ProgressTracker')),
};

/**
 * @param {CaipChainId} srcChain
 * @param {CaipChainId} dstChain
 * @param {IBCConnectionInfo['transferChannel']} ibcChannel
 * @returns {(TrafficEntry<'ibc'> & { incomplete: true })[]}
 */
const startIbcTransfer = (srcChain, dstChain, ibcChannel) =>
  harden([
    {
      op: 'transfer',
      src: [
        'ibc',
        ['chain', srcChain],
        ['port', ibcChannel.portId],
        ['channel', ibcChannel.channelId],
      ],
      dst: [
        'ibc',
        ['chain', dstChain],
        ['port', ibcChannel.counterPartyPortId],
        ['channel', ibcChannel.counterPartyChannelId],
      ],
      seq: { status: 'pending' },
      incomplete: true,
    },
  ]);

/**
 * @template {TrafficEntry} T
 * @param {T} entry
 * @param {TrafficEntry['seq']} sequence
 * @returns {T}
 */
const attachGenericSequence = (entry, sequence) => {
  const baseSequence = entry.seq;
  Object(baseSequence)?.status === 'pending' ||
    Fail`expected entry.seq ${baseSequence} to be pending`;
  sequence != null || Fail`expected sequence ${sequence} to be non-nullish`;

  return {
    ...entry,
    seq: sequence,
  };
};

/**
 * @param {(TrafficEntry<'ibc'> & { incomplete?: any })[]} entries
 * @param {TrafficEntry<'ibc'>['seq']} sequence
 * @returns {TrafficEntry<'ibc'>[]}
 */
const finishIbcTransfer = (entries, sequence) => {
  entries.length === 1 || Fail`expected single traffic entry to finish`;
  const [{ incomplete, ...entry }] = entries;
  incomplete || Fail`expected incomplete traffic entry`;
  entry.op === 'transfer' ||
    Fail`expected transfer traffic entry, got ${entry.op}`;
  entry.src[0] === 'ibc' || Fail`expected ibc source in transfer traffic entry`;
  entry.dst[0] === 'ibc' || Fail`expected ibc dest in transfer traffic entry`;

  return harden([attachGenericSequence(entry, sequence)]);
};

/**
 * @param {CaipChainId} dstChain
 * @returns {(TrafficEntry<'ibc'> & { incomplete: true })[]}
 */
const startIbcICA = dstChain =>
  harden([
    {
      op: 'ICA',
      src: ['ibc'],
      dst: ['ibc', ['chain', dstChain]],
      // the rest is filled in by ICA processing
      seq: { status: 'pending' },
      incomplete: true,
    },
  ]);

/**
 * @param {(TrafficEntry<'ibc'> & { incomplete?: any })[]} entries
 * @param {CaipChainId} srcChain
 * @param {Pick<IBCEndpoint, 'portID' | 'channelID'>} srcEndpoint
 * @param {Pick<IBCEndpoint, 'portID' | 'channelID'>} dstEndpoint
 * @param {TrafficEntry<'ibc'>['seq']} sequence
 * @returns {TrafficEntry<'ibc'>[]}
 */
const finishIbcICA = (
  entries,
  srcChain,
  srcEndpoint,
  dstEndpoint,
  sequence,
) => {
  entries.length === 1 || Fail`expected single traffic entry to finish`;
  const [{ incomplete, ...entry }] = entries;
  incomplete || Fail`expected incomplete traffic entry`;
  entry.op === 'ICA' || Fail`expected ICA traffic entry`;

  entry.src.length === 1 || Fail`expected source length 1 in ICA traffic entry`;
  entry.src[0] === 'ibc' || Fail`expected ibc source in ICA traffic entry`;
  const src = /** @type {const} */ ([
    ...entry.src,
    ['chain', srcChain],
    ['port', srcEndpoint.portID],
    ['channel', srcEndpoint.channelID],
  ]);

  entry.dst.length === 2 || Fail`expected dest length 2 in ICA traffic entry`;
  entry.dst[0] === 'ibc' || Fail`expected ibc dest in ICA traffic entry`;
  const dst = /** @type {const} */ ([
    ...entry.dst,
    ['port', dstEndpoint.portID],
    ['channel', dstEndpoint.channelID],
  ]);
  return [
    attachGenericSequence(
      /** @type {TrafficEntry<'ibc'>} */ ({
        ...entry,
        src,
        dst,
      }),
      sequence,
    ),
  ];
};

export const trafficTransforms = /** @type {const} */ ({
  IbcTransfer: {
    start: startIbcTransfer,
    finish: finishIbcTransfer,
  },
  IbcICA: {
    start: startIbcICA,
    finish: finishIbcICA,
  },
});
harden(trafficTransforms);

/**
 * @param {TrafficEntry[] | undefined} priorTraffic
 * @param {TrafficEntry[]} newEntries
 * @returns {{ traffic: TrafficEntry[]; slice: SliceDescriptor }}
 */
export const addTrafficEntries = (priorTraffic, newEntries) => {
  const entries = priorTraffic ?? [];
  const start = entries.length;
  const end = start + newEntries.length;
  return harden({
    traffic: [...entries, ...newEntries],
    slice: {
      start,
      end,
    },
  });
};
harden(addTrafficEntries);

/**
 * @param {TrafficEntry[] | undefined} priorTraffic
 * @param {SliceDescriptor | undefined} sliceDescriptor
 * @param {(entries: TrafficEntry[]) => TrafficEntry[]} finisher
 * @returns {TrafficEntry[]}
 */
export const finishTrafficEntries = (
  priorTraffic,
  sliceDescriptor,
  finisher,
) => {
  const entries = priorTraffic ?? [];
  const slice = sliceDescriptor ?? { start: 0, end: entries.length };

  const toTransform = harden(entries.slice(slice.start, slice.end));
  toTransform.length > 0 || Fail`no traffic entries to finish`;

  const transformed = harden(finisher(toTransform));
  transformed.length === toTransform.length ||
    Fail`traffic entry transform must not change length; expected ${toTransform.length}, got ${transformed.length}`;

  const pre = entries.slice(0, slice.start);
  const post = entries.slice(slice.end);
  return harden([...pre, ...transformed, ...post]);
};
harden(finishTrafficEntries);
