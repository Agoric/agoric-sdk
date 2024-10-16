import '@endo/init';
import {
  agops,
  agoric,
  executeOffer,
  getContractInfo,
  GOV1ADDR,
  GOV2ADDR,
  GOV3ADDR,
} from '@agoric/synthetic-chain';
import { AmountMath } from '@agoric/ertp';
import { ceilMultiplyBy } from './ratio.js';
import { getAgoricNamesBrands, getAgoricNamesInstances } from './utils.js';
import { boardSlottingMarshaller, makeFromBoard } from './rpc.js';
import { retryUntilCondition } from './sync-tools.js';

const fromBoard = makeFromBoard();
const marshaller = boardSlottingMarshaller(fromBoard.convertSlotToVal);

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

/**
 *
 * @param {string} brand
 * @returns {Promise<number>}
 */
export const getPriceFeedRoundId = async brand => {
  const latestRoundPath = `published.priceFeed.${brand}-USD_price_feed.latestRound`;
  const latestRound = await getContractInfo(latestRoundPath, {
    agoric,
    prefix: '',
  });

  console.log('latestRound: ', latestRound);
  return Number(latestRound.roundId);
};

const voteForNewParams = (accounts, position) => {
  console.log('ACTIONS voting for position', position, 'using', accounts);
  return Promise.all(
    accounts.map(account =>
      agops.ec('vote', '--forPosition', position, '--send-from', account),
    ),
  );
};

const paramChangeOfferGeneration = async (
  previousOfferId,
  voteDur,
  debtLimit,
) => {
  const ISTunit = 1_000_000n; // aka displayInfo: { decimalPlaces: 6 }

  const brand = await getAgoricNamesBrands();
  assert(brand.IST);
  assert(brand.ATOM);

  const instance = await getAgoricNamesInstances();
  assert(instance.VaultFactory);

  const voteDurSec = BigInt(voteDur);
  const debtLimitValue = BigInt(debtLimit) * ISTunit;
  const toSec = ms => BigInt(Math.round(ms / 1000));

  const id = `propose-${Date.now()}`;
  const deadline = toSec(Date.now()) + voteDurSec;

  const body = {
    method: 'executeOffer',
    offer: {
      id,
      invitationSpec: {
        invitationMakerName: 'VoteOnParamChange',
        previousOffer: previousOfferId,
        source: 'continuing',
      },
      offerArgs: {
        deadline: deadline,
        instance: instance.VaultFactory,
        params: {
          DebtLimit: {
            brand: brand.IST,
            value: debtLimitValue,
          },
        },
        path: {
          paramPath: {
            key: {
              collateralBrand: brand.ATOM,
            },
          },
        },
      },
      proposal: {},
    },
  };

  return JSON.stringify(marshaller.toCapData(harden(body)));
};

export const proposeNewDebtCeiling = async (address, debtLimit) => {
  const charterAcceptOfferId = await agops.ec(
    'find-continuing-id',
    '--for',
    `${'charter\\ member\\ invitation'}`,
    '--from',
    address,
  );

  return executeOffer(
    address,
    paramChangeOfferGeneration(charterAcceptOfferId, 30, debtLimit),
  );
};

export const setDebtLimit = async (address, debtLimit) => {
  const VOTING_WAIT_MS = 65 * 1000;
  const govAccounts = [GOV1ADDR, GOV2ADDR, GOV3ADDR];

  console.log('ACTIONS Setting debt limit');

  await proposeNewDebtCeiling(address, debtLimit);
  await voteForNewParams(govAccounts, 0);

  console.log('ACTIONS wait for the vote to pass');

  const pushPriceRetryOpts = {
    maxRetries: 10, // arbitrary
    retryIntervalMs: 5000, // in ms
  };

  await retryUntilCondition(
    () => getAvailableDebtForMint('manager0'),
    res => res.debtLimit === debtLimit * 1_000_000n,
    'debt limit not set yet',
    {
      log: console.log,
      setTimeout: globalThis.setTimeout,
      ...pushPriceRetryOpts,
    },
  );
};
