import { agops, agoric, getContractInfo } from '@agoric/synthetic-chain';
import { AmountMath } from '@agoric/ertp';
import { ceilMultiplyBy } from './ratio.js';
import { getAgoricNamesBrands } from './utils.js';

/**
 *
 * @param {string} address
 * @returns {Promise<{ vaultID: string, debt: bigint, collateral: bigint, state: string }>}
 */
export const getLastVaultFromAddress = async address => {
  const activeVaults = await agops.vaults('list', '--from', address);
  const vaultPath = activeVaults[activeVaults.length - 1];
  const vaultID = vaultPath.split('.').pop();

  if (!vaultID) {
    throw new Error(`No vaults found for ${address}`);
  }

  const vaultData = await getContractInfo(vaultPath, { agoric, prefix: '' });
  console.log('vaultData: ', vaultData);

  const debt = vaultData.debtSnapshot.debt.value;
  const collateral = vaultData.locked.value;
  const state = vaultData.vaultState;

  return { vaultID, debt, collateral, state };
};

/**
 *
 * @param {string} vaultManager
 * @returns {Promise<{ availableDebtForMint: bigint, debtLimit: bigint, totalDebt: bigint }>}
 */
export const getAvailableDebtForMint = async vaultManager => {
  const governancePath = `published.vaultFactory.managers.${vaultManager}.governance`;
  const governance = await getContractInfo(governancePath, {
    agoric,
    prefix: '',
  });

  const debtLimit = governance.current.DebtLimit.value;
  console.log('debtLimit: ', debtLimit.value);

  const metricsPath = `published.vaultFactory.managers.${vaultManager}.metrics`;
  const metrics = await getContractInfo(metricsPath, {
    agoric,
    prefix: '',
  });

  const totalDebt = metrics.totalDebt;
  console.log('totalDebt: ', totalDebt.value);

  // @ts-expect-error
  const availableDebtForMint = (debtLimit.value - totalDebt.value) / 1_000_000n;
  console.log('availableDebtForMint: ', availableDebtForMint);

  return {
    availableDebtForMint,
    debtLimit: debtLimit.value,
    totalDebt: totalDebt.value,
  };
};

/**
 *
 * @returns {Promise<bigint>}
 */
export const getMinInitialDebt = async () => {
  const governancePath = `published.vaultFactory.governance`;
  const governance = await getContractInfo(governancePath, {
    agoric,
    prefix: '',
  });

  const minInitialDebt = governance.current.MinInitialDebt.value.value;
  console.log('minInitialDebt: ', minInitialDebt);

  return minInitialDebt / 1_000_000n;
};

/**
 *
 * @param {bigint} toMintValue
 * @param {string} vaultManager
 * @returns {Promise<{ mintFee: import('@agoric/ertp/src/types.js').NatAmount, adjustedToMintAmount: import('@agoric/ertp/src/types.js').NatAmount }>}
 */
export const calculateMintFee = async (toMintValue, vaultManager) => {
  const brands = await getAgoricNamesBrands();

  const governancePath = `published.vaultFactory.managers.${vaultManager}.governance`;
  const governance = await getContractInfo(governancePath, {
    agoric,
    prefix: '',
  });

  const mintFee = governance.current.MintFee;
  const { numerator, denominator } = mintFee.value;
  const mintFeeRatio = harden({
    numerator: AmountMath.make(brands.IST, numerator.value),
    denominator: AmountMath.make(brands.IST, denominator.value),
  });

  const toMintAmount = AmountMath.make(brands.IST, toMintValue * 1_000_000n);
  const expectedMintFee = ceilMultiplyBy(toMintAmount, mintFeeRatio);
  const adjustedToMintAmount = AmountMath.add(toMintAmount, expectedMintFee);

  console.log('mintFee: ', mintFee);
  console.log('adjustedToMintAmount: ', adjustedToMintAmount);

  return { mintFee, adjustedToMintAmount };
};
