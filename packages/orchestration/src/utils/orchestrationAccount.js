import { M } from '@endo/patterns';
import { PaymentShape } from '@agoric/ertp';
import { Shape as NetworkShape } from '@agoric/network';
import { AmountArgShape, ChainAddressShape, CoinShape } from '../typeGuards.js';

/** @import {OrchestrationAccountI} from '../orchestration-api.js'; */

/** @see {OrchestrationAccountI} */
export const orchestrationAccountMethods = {
  // TODO LOA should return ChainAddressShape
  getAddress: M.call().returns(M.or(ChainAddressShape, M.string())),
  getBalance: M.callWhen(M.any()).returns(NetworkShape.Vow$(CoinShape)),
  getBalances: M.callWhen().returns(NetworkShape.Vow$(M.arrayOf(CoinShape))),
  send: M.callWhen(ChainAddressShape, AmountArgShape).returns(
    NetworkShape.Vow$(M.undefined()),
  ),
  transfer: M.callWhen(AmountArgShape, ChainAddressShape)
    .optional(M.record())
    .returns(NetworkShape.Vow$(M.undefined())),
  transferSteps: M.callWhen(AmountArgShape, M.any()).returns(M.undefined()),
  // TODO only should be available on LOA
  deposit: M.callWhen(PaymentShape).returns(NetworkShape.Vow$(M.undefined())),
};
