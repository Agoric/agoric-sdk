import { M } from '@endo/patterns';
import { PaymentShape } from '@agoric/ertp';
import { Shape as NetworkShape } from '@agoric/network';
import { VowShape } from '@agoric/vow';
import { AmountArgShape, ChainAddressShape, CoinShape } from '../typeGuards.js';

/** @import {OrchestrationAccountI} from '../orchestration-api.js'; */

const { Vow$ } = NetworkShape; // TODO #9611

/** @see {OrchestrationAccountI} */
export const orchestrationAccountMethods = {
  getAddress: M.call().returns(ChainAddressShape),
  getBalance: M.call(M.any()).returns(Vow$(CoinShape)),
  getBalances: M.call().returns(Vow$(M.arrayOf(CoinShape))),
  send: M.call(ChainAddressShape, AmountArgShape).returns(VowShape),
  transfer: M.call(AmountArgShape, ChainAddressShape)
    .optional(M.record())
    .returns(VowShape),
  transferSteps: M.call(AmountArgShape, M.any()).returns(VowShape),
  deposit: M.call(PaymentShape).returns(VowShape),
};
