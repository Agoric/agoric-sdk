import { M } from '@endo/patterns';
import { PaymentShape } from '@agoric/ertp';
import { AmountArgShape, ChainAddressShape, CoinShape } from '../typeGuards.js';

/** @import {OrchestrationAccountI} from '../orchestration-api.js'; */

/** @see {OrchestrationAccountI} */
export const orchestrationAccountMethods = {
  getAddress: M.call().returns(ChainAddressShape),
  getBalance: M.callWhen(M.any()).returns(CoinShape),
  getBalances: M.callWhen().returns(M.arrayOf(CoinShape)),
  send: M.callWhen(ChainAddressShape, AmountArgShape).returns(M.undefined()),
  transfer: M.callWhen(AmountArgShape, ChainAddressShape)
    .optional(M.record())
    .returns(M.undefined()),
  transferSteps: M.callWhen(AmountArgShape, M.any()).returns(M.undefined()),
  deposit: M.callWhen(PaymentShape).returns(M.undefined()),
};
