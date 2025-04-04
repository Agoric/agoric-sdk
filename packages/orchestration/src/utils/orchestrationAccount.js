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

/** @import {OrchestrationAccountCommon} from '../orchestration-api.js'; */

const { Vow$ } = NetworkShape; // TODO #9611

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
