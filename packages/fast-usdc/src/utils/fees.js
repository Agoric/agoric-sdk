import { AmountMath } from '@agoric/ertp';
import { multiplyBy } from '@agoric/ertp/src/ratio.js';
import { Fail } from '@endo/errors';
import { mustMatch } from '@endo/patterns';
import { chainOfAccount } from '@agoric/orchestration/src/utils/address.js';
import { FeeConfigShape } from '../type-guards.js';

const { add, isGTE, subtract } = AmountMath;

/**
 * @import {Amount} from '@agoric/ertp';
 * @import {AccountId} from '@agoric/orchestration';
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

/**
 * @template {keyof Omit<FeeConfig, 'destinationOverrides'>} K
 * @param {FeeConfig} feeConfig
 * @param {K} key
 * @param {AccountId} destination
 * @returns {FeeConfig[K]}
 */
const getConfigValue = (feeConfig, key, destination) => {
  const chainId = chainOfAccount(destination);
  if (
    feeConfig.destinationOverrides?.[chainId] &&
    feeConfig.destinationOverrides[chainId][key] !== undefined
  ) {
    return feeConfig.destinationOverrides[chainId][key];
  }
  return feeConfig[key];
};

/**
 * @param {FeeConfig} feeConfig
 */
export const makeFeeTools = feeConfig => {
  mustMatch(feeConfig, FeeConfigShape, 'Must provide feeConfig');

  const feeTools = harden({
    /**
     * Calculate the net amount to advance after withholding fees.
     *
     * @param {Amount<'nat'>} requested
     * @param {AccountId} destination
     * @throws {Error} if requested does not exceed fees
     */
    calculateAdvance(requested, destination) {
      const fee = feeTools.calculateAdvanceFee(requested, destination);
      return subtract(requested, fee);
    },
    /**
     * Calculate the total fee to charge for the advance.
     *
     * @param {Amount<'nat'>} requested
     * @param {AccountId} destination
     * @throws {Error} if requested does not exceed fees
     */
    calculateAdvanceFee(requested, destination) {
      const flat = getConfigValue(feeConfig, 'flat', destination);
      const variableRate = getConfigValue(
        feeConfig,
        'variableRate',
        destination,
      );
      const fee = add(multiplyBy(requested, variableRate), flat);
      !isGTE(fee, requested) || Fail`Request must exceed fees.`;
      return fee;
    },
    /**
     * Calculate the split of fees between pool and contract.
     *
     * @param {Amount<'nat'>} requested
     * @param {AccountId} destination
     * @returns {RepayAmountKWR} an {@link AmountKeywordRecord}
     * @throws {Error} if requested does not exceed fees
     */
    calculateSplit(requested, destination) {
      const fee = feeTools.calculateAdvanceFee(requested, destination);
      const Principal = subtract(requested, fee);
      const ContractFee = multiplyBy(fee, feeConfig.contractRate);
      const PoolFee = subtract(fee, ContractFee);
      return harden({ Principal, PoolFee, ContractFee });
    },
  });
  return feeTools;
};
