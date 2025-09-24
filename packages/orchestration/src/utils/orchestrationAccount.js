import { BrandShape } from '@agoric/ertp';
import { Shape as NetworkShape } from '@agoric/network';
import { VowShape } from '@agoric/vow';
import { TopicsRecordShape } from '@agoric/zoe/src/contractSupport/topics.js';
import { M } from '@endo/patterns';
import {
  AccountIdArgShape,
  AmountArgShape,
  CosmosChainAddressShape,
  DenomAmountShape,
  IBCTransferOptionsShape,
} from '../typeGuards.js';

const { Vow$ } = NetworkShape; // TODO #9611
// const EVow$ = shape => M.or(Vow$(shape), M.promise(/* shape */));

/** @see {OrchestrationAccountCommon} */
export const orchestrationAccountMethods = {
  getAddress: M.call().returns(CosmosChainAddressShape),
  getBalance: M.call(M.or(BrandShape, M.string())).returns(
    Vow$(DenomAmountShape),
  ),
  getBalances: M.call().returns(Vow$(M.arrayOf(DenomAmountShape))),
  send: M.call(AccountIdArgShape, AmountArgShape).returns(VowShape),
  sendAll: M.call(CosmosChainAddressShape, M.arrayOf(AmountArgShape)).returns(
    VowShape,
  ),
  transfer: M.call(AccountIdArgShape, AmountArgShape)
    .optional(IBCTransferOptionsShape)
    .returns(VowShape),
  transferWithMeta: M.call(AccountIdArgShape, AmountArgShape)
    .optional(IBCTransferOptionsShape)
    .returns(Vow$({ result: Vow$(M.any()), meta: M.record() })),
  transferSteps: M.call(AmountArgShape, M.any()).returns(VowShape),
  asContinuingOffer: M.call().returns(
    Vow$({
      publicSubscribers: TopicsRecordShape,
      invitationMakers: M.any(),
      holder: M.remotable(),
    }),
  ),
  getPublicTopics: M.call().returns(Vow$(TopicsRecordShape)),
};

export const pickData = {
  watcher: {
    /**
     * @template {PropertyKey} [K=PropertyKey]
     * @template {Record<PropertyKey, any>} [R=Record<PropertyKey, any>]
     * @param {R} record
     * @param {K} key
     * @returns {R[K]}
     */
    onFulfilled(record, key) {
      return harden(record[key]);
    },
  },
  shape: M.interface('pickDataWatcher', {
    onFulfilled: M.call(M.record(), M.key()).returns(M.any()),
  }),
};
