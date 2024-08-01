import { BrandShape } from '@agoric/ertp';
import { Shape as NetworkShape } from '@agoric/network';
import { VowShape } from '@agoric/vow';
import { TopicsRecordShape } from '@agoric/zoe/src/contractSupport/topics.js';
import { M } from '@endo/patterns';
import {
  AmountArgShape,
  ChainAddressShape,
  DelegationShape,
  DenomAmountShape,
  IBCTransferOptionsShape,
} from '../typeGuards.js';

/** @import {OrchestrationAccountI} from '../orchestration-api.js'; */

const { Vow$ } = NetworkShape; // TODO #9611

/** @see {OrchestrationAccountI} */
export const orchestrationAccountMethods = {
  getAddress: M.call().returns(ChainAddressShape),
  getBalance: M.call(M.or(BrandShape, M.string())).returns(
    Vow$(DenomAmountShape),
  ),
  getBalances: M.call().returns(Vow$(M.arrayOf(DenomAmountShape))),
  send: M.call(ChainAddressShape, AmountArgShape).returns(VowShape),
  sendAll: M.call(ChainAddressShape, M.arrayOf(AmountArgShape)).returns(
    VowShape,
  ),
  transfer: M.call(AmountArgShape, ChainAddressShape)
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

export const orchestrationAccountInvitationMakers = {
  Delegate: M.call(ChainAddressShape, AmountArgShape).returns(M.promise()),
  Redelegate: M.call(
    ChainAddressShape,
    ChainAddressShape,
    AmountArgShape,
  ).returns(M.promise()),
  WithdrawReward: M.call(ChainAddressShape).returns(M.promise()),
  Undelegate: M.call(M.arrayOf(DelegationShape)).returns(M.promise()),
  DeactivateAccount: M.call().returns(M.promise()),
  ReactivateAccount: M.call().returns(M.promise()),
  TransferAccount: M.call().returns(M.promise()),
  Send: M.call().returns(M.promise()),
  SendAll: M.call().returns(M.promise()),
  Transfer: M.call().returns(M.promise()),
};
