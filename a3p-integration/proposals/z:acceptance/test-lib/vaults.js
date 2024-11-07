/* eslint-env node */

import {
  boardSlottingMarshaller,
  makeFromBoard,
  retryUntilCondition,
} from '@agoric/client-utils';
import { AmountMath } from '@agoric/ertp';
import {
  agops,
  agoric,
  executeOffer,
  getContractInfo,
  GOV1ADDR,
  GOV2ADDR,
} from '@agoric/synthetic-chain';
import {
  ceilMultiplyBy,
  makeRatio,
} from '@agoric/zoe/src/contractSupport/ratio.js';
import { E } from '@endo/far';
import { walletUtils } from './index.js';
import { listVaults, vstorageKitP } from './utils.js';

const fromBoard = makeFromBoard();
const marshaller = boardSlottingMarshaller(fromBoard.convertSlotToVal);

/**
 * @param {string} address
 * @returns {Promise<{ vaultID: string, debt: bigint, collateral: bigint, state: string }>}
 */
export const getLastVaultFromAddress = async address => {
  const activeVaults = await listVaults(address, walletUtils);
  const vaultPath = activeVaults[activeVaults.length - 1];
  const vaultID = vaultPath.split('.').pop();

  if (!vaultID) {
    throw new Error(`No vaults found for ${address}`);
  }

  const vaultData = await getContractInfo(vaultPath, { agoric, prefix: '' });

  const debt = vaultData.debtSnapshot.debt.value;
  const collateral = vaultData.locked.value;
  const state = vaultData.vaultState;

  return { vaultID, debt, collateral, state };
};

/**
 * @param {string} vaultManager
 * @returns {Promise<{ availableDebtForMint: bigint, debtLimit: bigint, totalDebt: bigint }>}
 */
export const getAvailableDebtForMint = async vaultManager => {
  const governancePath = `published.vaultFactory.managers.${vaultManager}.governance`;
  const governance = await getContractInfo(governancePath, {
    agoric,
    prefix: '',
  });

  const metricsPath = `published.vaultFactory.managers.${vaultManager}.metrics`;
  const metrics = await getContractInfo(metricsPath, {
    agoric,
    prefix: '',
  });

  const debtLimit = governance.current.DebtLimit.value;
  const totalDebt = metrics.totalDebt;
  // @ts-expect-error
  const availableDebtForMint = (debtLimit.value - totalDebt.value) / 1_000_000n;

  return {
    availableDebtForMint,
    debtLimit: debtLimit.value,
    totalDebt: totalDebt.value,
  };
};

/**
 * @returns {Promise<bigint>}
 */
export const getMinInitialDebt = async () => {
  const governancePath = `published.vaultFactory.governance`;
  const governance = await getContractInfo(governancePath, {
    agoric,
    prefix: '',
  });

  const minInitialDebt = governance.current.MinInitialDebt.value.value;

  return minInitialDebt / 1_000_000n;
};

/**
 * @param {bigint} toMintValue
 * @param {string} vaultManager
 * @returns {Promise<{ mintFee: import('@agoric/ertp/src/types.js').NatAmount, adjustedToMintAmount: import('@agoric/ertp/src/types.js').NatAmount }>}
 */
export const calculateMintFee = async (toMintValue, vaultManager) => {
  const { brand } = await E.get(vstorageKitP).agoricNames;

  const governancePath = `published.vaultFactory.managers.${vaultManager}.governance`;
  const governance = await getContractInfo(governancePath, {
    agoric,
    prefix: '',
  });

  const mintFee = governance.current.MintFee;
  const { numerator, denominator } = mintFee.value;

  const mintFeeRatio = makeRatio(
    numerator.value,
    brand.IST,
    denominator.value,
    brand.IST,
  );

  // @ts-expect-error XXX BoardRemote not Brand
  const toMintAmount = AmountMath.make(brand.IST, toMintValue * 1_000_000n);
  const expectedMintFee = ceilMultiplyBy(toMintAmount, mintFeeRatio);
  const adjustedToMintAmount = AmountMath.add(toMintAmount, expectedMintFee);

  return { mintFee, adjustedToMintAmount };
};

/**
 * @param {Array<string>} accounts
 * @param {number} position
 */
const voteForNewParams = (accounts, position) => {
  console.log('ACTIONS voting for position', position, 'using', accounts);
  return Promise.all(
    accounts.map(account =>
      agops.ec(
        'vote',
        '--forPosition',
        String(position),
        '--send-from',
        account,
      ),
    ),
  );
};

/**
 *
 * @param {string} previousOfferId
 * @param {number} voteDur
 * @param {number} debtLimit
 */
const paramChangeOfferGeneration = async (
  previousOfferId,
  voteDur,
  debtLimit,
) => {
  const ISTunit = 1_000_000n; // aka displayInfo: { decimalPlaces: 6 }

  const { brand } = await E.get(vstorageKitP).agoricNames;
  assert(brand.IST);
  assert(brand.ATOM);

  const { instance } = await E.get(vstorageKitP).agoricNames;
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
        deadline,
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

/**
 *
 * @param {string} address
 * @param {*} debtLimit
 * @returns
 */
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

export const GOV4ADDR = 'agoric1c9gyu460lu70rtcdp95vummd6032psmpdx7wdy';

/**
 *
 * @param {string} address
 * @param {bigint} debtLimit
 */
export const setDebtLimit = async (address, debtLimit) => {
  const govAccounts = [GOV1ADDR, GOV2ADDR, GOV4ADDR];

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
      setTimeout: global.setTimeout,
      ...pushPriceRetryOpts,
    },
  );
};
