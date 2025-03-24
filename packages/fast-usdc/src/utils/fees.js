import { AmountMath } from '@agoric/ertp';
import { multiplyBy } from '@agoric/zoe/src/contractSupport/ratio.js';
import { Fail } from '@endo/errors';
import { mustMatch } from '@endo/patterns';
import { FeeConfigShape } from '../type-guards.js';

const { add, isGTE, subtract } = AmountMath;

/**
 * @import {Amount} from '@agoric/ertp';
 * @import {FeeConfig} from '../types.js';
 */

/**
 * @typedef {{
 *  Principal: Amount<'nat'>;
 *  PoolFee: Amount<'nat'>;
 *  ContractFee: Amount<'nat'>;
 * }} RepayAmountKWR
 */

/**
 * @typedef {{
 *  Principal: Payment<'nat'>;
 *  PoolFee: Payment<'nat'>;
 *  ContractFee: Payment<'nat'>;
 * }} RepayPaymentKWR
 */

/** @param {FeeConfig} feeConfig */
export const makeFeeTools = feeConfig => {
  mustMatch(feeConfig, FeeConfigShape, 'Must provide feeConfig');
  const { flat, variableRate } = feeConfig;
  const feeTools = harden({
    /**
     * Calculate the net amount to advance after withholding fees.
     *
     * @param {Amount<'nat'>} requested
     * @throws {Error} if requested does not exceed fees
     */
    calculateAdvance(requested) {
      const fee = feeTools.calculateAdvanceFee(requested);
      return subtract(requested, fee);
    },
    /**
     * Calculate the total fee to charge for the advance.
     *
     * @param {Amount<'nat'>} requested
     * @throws {Error} if requested does not exceed fees
     */
    calculateAdvanceFee(requested) {
      const fee = add(multiplyBy(requested, variableRate), flat);
      !isGTE(fee, requested) || Fail`Request must exceed fees.`;
      return fee;
    },
    /**
     * Calculate the split of fees between pool and contract.
     *
     * @param {Amount<'nat'>} requested
     * @returns {RepayAmountKWR} an {@link AmountKeywordRecord}
     * @throws {Error} if requested does not exceed fees
     */
    calculateSplit(requested) {
      const fee = feeTools.calculateAdvanceFee(requested);
      const Principal = subtract(requested, fee);
      const ContractFee = multiplyBy(fee, feeConfig.contractRate);
      const PoolFee = subtract(fee, ContractFee);
      return harden({ Principal, PoolFee, ContractFee });
    },
  });
  return feeTools;
};
