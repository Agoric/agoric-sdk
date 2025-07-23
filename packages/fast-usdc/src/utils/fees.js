import { AmountMath } from '@agoric/ertp';
import { multiplyBy } from '@agoric/ertp/src/ratio.js';
import { Fail } from '@endo/errors';
import { mustMatch } from '@endo/patterns';
import { chainOfAccount } from '@agoric/orchestration/src/utils/address.js';
import { FeeConfigShape } from '../type-guards.js';

const { add, isGTE, subtract, makeEmpty } = AmountMath;

/**
 * @import {Amount, Payment} from '@agoric/ertp';
 * @import {AccountId} from '@agoric/orchestration';
 * @import {FeeConfig} from '../types.js';
 */

/**
 * @typedef {{
 *  Principal: Amount<'nat'>;
 *  PoolFee: Amount<'nat'>;
 *  ContractFee: Amount<'nat'>;
 *  RelayFee: Amount<'nat'>;
 * }} RepayAmountKWR
 */

/**
 * @typedef {{
 *  Principal: Payment<'nat'>;
 *  PoolFee: Payment<'nat'>;
 *  ContractFee: Payment<'nat'>;
 *  RelayFee: Payment<'nat'>;
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
  const emptyAmount = makeEmpty(feeConfig.flat.brand);

  const feeTools = harden({
    /**
     * Calculate the base fee to charge for the advance (variable + flat).
     * Will be shared between the pool and the contract based on
     * {@link FeeConfig.contractRate}.
     *
     * @param {Amount<'nat'>} requested
     * @param {AccountId} destination
     * @returns {Amount<'nat'>}
     */
    calculateBaseFee(requested, destination) {
      const flat = getConfigValue(feeConfig, 'flat', destination);
      const variableRate = getConfigValue(
        feeConfig,
        'variableRate',
        destination,
      );
      return add(multiplyBy(requested, variableRate), flat);
    },
    /**
     * Calculate the optional relay fee charged for certain destinations.
     * Only disbursed to contract seat.
     *
     * @param {AccountId} destination
     * @returns {Amount<'nat'>}
     */
    calculateRelayFee(destination) {
      const relay = getConfigValue(feeConfig, 'relay', destination);
      return relay || emptyAmount;
    },
    /**
     * Calculate the total fee to charge for the advance.
     *
     * @param {Amount<'nat'>} requested
     * @param {AccountId} destination
     * @throws {Error} if requested does not exceed fees
     */
    calculateAdvanceFee(requested, destination) {
      const baseFee = feeTools.calculateBaseFee(requested, destination);
      const relayFee = feeTools.calculateRelayFee(destination);
      const fee = add(baseFee, relayFee);
      !isGTE(fee, requested) || Fail`Request must exceed fees.`;
      return fee;
    },
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
     * Calculate the split of fees between pool and contract.
     *
     * The `ContractFee` includes base fees plus the relay fee.
     *
     * @param {Amount<'nat'>} requested
     * @param {AccountId} destination
     * @returns {RepayAmountKWR} an {@link AmountKeywordRecord}
     * @throws {Error} if requested does not exceed fees
     */
    calculateSplit(requested, destination) {
      const baseFee = feeTools.calculateBaseFee(requested, destination);
      const relayFee = feeTools.calculateRelayFee(destination);
      const totalFee = add(baseFee, relayFee);
      !isGTE(totalFee, requested) || Fail`Request must exceed fees.`;

      const contractRate = getConfigValue(
        feeConfig,
        'contractRate',
        destination,
      );
      const Principal = subtract(requested, totalFee);
      const ContractFee = multiplyBy(baseFee, contractRate);
      const PoolFee = subtract(baseFee, ContractFee);

      return harden({ Principal, PoolFee, ContractFee, RelayFee: relayFee });
    },
  });
  return feeTools;
};
