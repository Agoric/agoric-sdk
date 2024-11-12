/* eslint-env node */

import { execa } from 'execa';
import { getNetworkConfig } from 'agoric/src/helpers.js';
import {
  boardSlottingMarshaller,
  makeFromBoard,
  retryUntilCondition,
  waitUntilAccountFunded,
  waitUntilOfferResult,
} from '@agoric/client-utils';
import { AmountMath } from '@agoric/ertp';
import {
  addUser,
  agd,
  agops,
  agopsLocation,
  agoric,
  CHAINID,
  executeCommand,
  executeOffer,
  getUser,
  GOV1ADDR,
  mkTemp,
  VALIDATORADDR,
} from '@agoric/synthetic-chain';
import fsp from 'node:fs/promises';
import { NonNullish } from './errors.js';
import { getBalances } from './utils.js';

/** @import {Result as ExecaResult, ExecaError} from 'execa'; */
/**
 * @typedef {ExecaResult & { all: string } & (
 *     | { failed: false }
 *     | Pick<
 *         ExecaError & { failed: true },
 *         'failed',
 *         | 'shortMessage'
 *         | 'cause'
 *         | 'exitCode'
 *         | 'signal'
 *         | 'signalDescription'
 *       >
 *   )} SendOfferResult
 */

// Export these from synthetic-chain?
const USDC_DENOM = NonNullish(process.env.USDC_DENOM);
const PSM_PAIR = NonNullish(process.env.PSM_PAIR).replace('.', '-');

/**
 * @import {Coin} from '@agoric/cosmic-proto/cosmos/base/v1beta1/coin.js';
 */

/**
 * @typedef {object} PsmMetrics
 * @property {import('@agoric/ertp').Amount<'nat'>} anchorPoolBalance
 * @property {import('@agoric/ertp').Amount<'nat'>} feePoolBalance
 * @property {import('@agoric/ertp').Amount<'nat'>} mintedPoolBalance
 * @property {import('@agoric/ertp').Amount<'nat'>} totalAnchorProvided
 * @property {import('@agoric/ertp').Amount<'nat'>} totalMintedProvided
 */

const fromBoard = makeFromBoard();
const marshaller = boardSlottingMarshaller(fromBoard.convertSlotToVal);

/**
 *  Import from synthetic-chain once it is updated
 *
 * @param {string} addr
 * @param {string} wanted
 * @param {string} [from]
 */
export const bankSend = (addr, wanted, from = VALIDATORADDR) => {
  const chain = ['--chain-id', CHAINID];
  const fromArg = ['--from', from];
  const testKeyring = ['--keyring-backend', 'test'];
  const noise = [...fromArg, ...chain, ...testKeyring, '--yes'];

  return agd.tx('bank', 'send', from, addr, wanted, ...noise);
};

/**
 *
 * @param {{
 *   address: string
 *   instanceName: string
 *   newParams: Params
 *   deadline: bigint
 *   offerId: string
 * }} QuestionDetails
 */
export const buildProposePSMParamChangeOffer = async ({
  address,
  instanceName,
  newParams,
  deadline,
  offerId,
}) => {
  const charterAcceptOfferId = await agops.ec(
    'find-continuing-id',
    '--for',
    `${'charter\\ member\\ invitation'}`,
    '--from',
    address,
  );
  console.log('charterAcceptOfferId', charterAcceptOfferId);
  const [brands, instances] = await Promise.all([
    agoric
      .follow('-lF', ':published.agoricNames.brand', '-o', 'text')
      .then(brandsRaw =>
        Object.fromEntries(marshaller.fromCapData(JSON.parse(brandsRaw))),
      ),
    agoric
      .follow('-lF', ':published.agoricNames.instance', '-o', 'text')
      .then(instancesRaw =>
        Object.fromEntries(marshaller.fromCapData(JSON.parse(instancesRaw))),
      ),
  ]);

  console.log('charterAcceptOfferId', charterAcceptOfferId);
  console.log('BRANDS', brands);
  console.log('INSTANCE', instances);

  /**
   * @param {bigint} numValInPercent
   */
  const toRatio = numValInPercent => {
    const commonDenominator = AmountMath.make(brands.IST, 10_000n);
    const numerator = AmountMath.make(brands.IST, numValInPercent * 100n); // Convert to bps

    return {
      numerator,
      denominator: commonDenominator,
    };
  };

  const params = {};
  if (newParams.giveMintedFeeVal) {
    params.GiveMintedFee = toRatio(newParams.giveMintedFeeVal);
  }

  if (newParams.wantMintedFeeVal) {
    params.WantMintedFee = toRatio(newParams.wantMintedFeeVal);
  }

  if (newParams.mintLimit) {
    params.MintLimit = AmountMath.make(brands.IST, newParams.mintLimit);
  }

  const offerSpec = /** @type {const} */ ({
    id: offerId,
    invitationSpec: {
      source: 'continuing',
      previousOffer: charterAcceptOfferId,
      invitationMakerName: 'VoteOnParamChange',
    },
    proposal: {},
    offerArgs: {
      instance: instances[instanceName],
      params,
      deadline,
    },
  });

  const spendAction = {
    method: 'executeOffer',
    offer: offerSpec,
  };

  // @ts-expect-error XXX Passable
  const offer = JSON.stringify(marshaller.toCapData(harden(spendAction)));
  console.log(offerSpec);
  console.log(offer);

  return executeOffer(address, offer);
};

/**
 *
 * @param {{
 *   committeeAddrs: Array<string>
 *   position: number | string
 * }} VotingDetails
 */
export const voteForNewParams = ({ committeeAddrs, position }) => {
  console.log('ACTIONS voting for position', position, 'using', committeeAddrs);
  return Promise.all(
    committeeAddrs.map(account =>
      // @ts-expect-error Casting
      agops.ec('vote', '--forPosition', position, '--send-from', account),
    ),
  );
};

/**
 * @param {{follow: (...params: string[]) => Promise<object> }} io
 */
export const fetchLatestEcQuestion = async io => {
  const { follow } = io;
  const pathOutcome = ':published.committees.Economic_Committee.latestOutcome';
  const pathQuestion =
    ':published.committees.Economic_Committee.latestQuestion';

  const [latestOutcome, latestQuestion] = await Promise.all([
    follow('-lF', pathOutcome, '-o', 'text').then(outcomeRaw =>
      marshaller.fromCapData(JSON.parse(outcomeRaw)),
    ),
    follow('-lF', pathQuestion, '-o', 'text').then(questionRaw =>
      marshaller.fromCapData(JSON.parse(questionRaw)),
    ),
  ]);

  return { latestOutcome, latestQuestion };
};

const checkCommitteeElectionResult = (
  /** @type {{ latestOutcome: { outcome: any; question: any; }; latestQuestion: { closingRule: { deadline: any; }; questionHandle: any; }; }} */ electionResult,
  /** @type {{ outcome: any; deadline: any; }} */ expectedResult,
) => {
  const {
    latestOutcome: { outcome, question },
    latestQuestion: {
      closingRule: { deadline },
      questionHandle,
    },
  } = electionResult;
  const { outcome: expectedOutcome, deadline: expectedDeadline } =
    expectedResult;

  return (
    expectedOutcome === outcome &&
    deadline === expectedDeadline &&
    question === questionHandle
  );
};

/**
 * @typedef {{
 *   giveMintedFeeVal: bigint;
 *   wantMintedFeeVal: bigint;
 *   mintLimit: bigint;
 * }} Params
 *
 *
 * @param {{
 *   address: string
 *   instanceName: string
 *   newParams: Params
 *   votingDuration: number
 *   offerId?: string
 * }} question
 *
 * @param {{
 *   committeeAddrs: Array<string>
 *   position: number
 * }} voting
 *
 * @param {{ now: () => number; follow: (...params: string[]) => Promise<object>}} io
 */
export const implementPsmGovParamChange = async (question, voting, io) => {
  const { now: getNow, follow } = io;
  const now = getNow();
  const deadline = BigInt(
    question.votingDuration * 60 + Math.round(now / 1000),
  );

  await buildProposePSMParamChangeOffer({
    ...question,
    deadline,
    offerId: now.toString(),
  });
  await voteForNewParams(voting);

  console.log('ACTIONS wait for the vote deadline to pass');
  await retryUntilCondition(
    () => fetchLatestEcQuestion({ follow }),
    electionResult =>
      checkCommitteeElectionResult(electionResult, {
        outcome: 'win',
        deadline,
      }),
    'PSM param change election failed',
    { setTimeout, retryIntervalMs: 5000, maxRetries: 15 },
  );
};

/**
 * @param {string} anchor
 */
export const getPsmGovernance = async anchor => {
  const governanceRaw = await agoric.follow(
    '-lF',
    `:published.psm.IST.${anchor}.governance`,
    '-o',
    'text',
  );
  const { current } = marshaller.fromCapData(JSON.parse(governanceRaw));
  return current;
};

/**
 * @param {string} anchor
 */
export const getPsmMetrics = async anchor => {
  const metricsRaw = await agoric.follow(
    '-lF',
    `:published.psm.IST.${anchor}.metrics`,
    '-o',
    'text',
  );

  return marshaller.fromCapData(JSON.parse(metricsRaw));
};

export const checkGovParams = async (
  /** @type {import("ava").ExecutionContext<unknown>} */ t,
  /** @type {any} */ expected,
  /** @type {string} */ psmName,
) => {
  const current = await getPsmGovernance(psmName);

  t.log({
    give: current.WantMintedFee.value,
    want: current.GiveMintedFee.value,
    mintLimit: current.MintLimit,
  });

  t.like(current, expected);
};

/**
 *
 * @param {string} userName
 * @param {{
 *   denom: string,
 *   value: string
 * }} expectedAnchorFunds
 */
export const checkUserInitializedSuccessfully = async (
  userName,
  expectedAnchorFunds,
) => {
  const userAddress = await getUser(userName);

  const balance = await getBalances([userAddress], expectedAnchorFunds.denom);
  assert(balance >= BigInt(expectedAnchorFunds.value));
};

/**
 *
 * @param {string} name
 * @param {{
 *   denom: string,
 *   value: string
 * }} fund
 * @param {{query: () => Promise<object>, setTimeout: typeof setTimeout}} io
 */
export const initializeNewUser = async (name, fund, io) => {
  const psmTrader = await addUser(name);
  await Promise.all([
    bankSend(psmTrader, `20000000ubld,${fund.value}${fund.denom}`),
    bankSend(psmTrader, `1000000uist`, GOV1ADDR),
  ]);

  await waitUntilAccountFunded(
    psmTrader,
    io,
    { denom: fund.denom, value: parseInt(fund.value, 10) },
    { errorMessage: `${psmTrader} not funded` },
  );

  await checkUserInitializedSuccessfully(name, fund);
};

/**
 * Similar to
 * https://github.com/Agoric/agoric-3-proposals/blob/422b163fecfcf025d53431caebf6d476778b5db3/packages/synthetic-chain/src/lib/commonUpgradeHelpers.ts#L123-L139
 * However, for an address that is not provisioned, `agoric wallet send` is
 * needed because `agops perf satisfaction` hangs when trying to follow
 * nonexistent vstorage path ":published.wallet.${address}".
 *
 * @param {string} address
 * @param {Promise<string>} offerPromise
 * @returns {Promise<SendOfferResult>}
 */
export const sendOfferAgoric = async (address, offerPromise) => {
  const offerPath = await mkTemp('agops.XXX');
  const offer = await offerPromise;
  await fsp.writeFile(offerPath, offer);

  const [settlement] = await Promise.allSettled([
    execa({
      all: true,
    })`agoric wallet --keyring-backend=test send --offer ${offerPath} --from ${address} --verbose`,
  ]);
  return settlement.status === 'fulfilled'
    ? settlement.value
    : settlement.reason;
};

/**
 * A variant of {@link sendOfferAgoric} that uses `agd` directly to e.g.
 * control gas calculation.
 *
 * @param {string} address
 * @param {Promise<string>} offerPromise
 * @returns {Promise<SendOfferResult>}
 */
export const sendOfferAgd = async (address, offerPromise) => {
  const offer = await offerPromise;
  const networkConfig = await getNetworkConfig({ env: process.env, fetch });
  const { chainName, rpcAddrs } = networkConfig;
  const args = [].concat(
    [`--node=${rpcAddrs[0]}`, `--chain-id=${chainName}`],
    [`--keyring-backend=test`, `--from=${address}`],
    ['tx', 'swingset', 'wallet-action', '--allow-spend', offer],
    '--yes',
    '-bblock',
    '-ojson',
  );

  const [settlement] = await Promise.allSettled([
    execa('agd', args, { all: true }),
  ]);

  // Upon successful exit, verify that the *output* also indicates success.
  // cf. https://github.com/Agoric/agoric-sdk/blob/master/packages/agoric-cli/src/lib/wallet.js
  if (settlement.status === 'fulfilled') {
    const result = settlement.value;
    try {
      const tx = JSON.parse(result.stdout);
      if (tx.code !== 0) {
        return { ...result, failed: true, shortMessage: `code ${tx.code}` };
      }
    } catch (err) {
      return {
        ...result,
        failed: true,
        shortMessage: 'unexpected output',
        cause: err,
      };
    }
  }

  return settlement.status === 'fulfilled'
    ? settlement.value
    : settlement.reason;
};

/**
 * @param {string} address
 * @param {Array<any>} params
 * @param {{
 *   follow: (...params: string[]) => Promise<object>;
 *   sendOffer?: (address: string, offerPromise: Promise<string>) => Promise<SendOfferResult>;
 *   setTimeout: typeof global.setTimeout;
 *   now: () => number
 * }} io
 */
export const psmSwap = async (address, params, io) => {
  const { now, sendOffer = sendOfferAgoric, ...waitIO } = io;
  const offerId = `${address}-psm-swap-${now()}`;
  const newParams = ['psm', ...params, '--offerId', offerId];
  const offerPromise = executeCommand(agopsLocation, newParams);
  const sendResult = await sendOffer(address, offerPromise);
  if (sendResult.failed) {
    const {
      command,
      durationMs,
      shortMessage,
      cause,
      exitCode,
      signal,
      signalDescription,
      all: output,
    } = sendResult;
    const summary = {
      command,
      durationMs,
      shortMessage,
      cause,
      exitCode,
      signal,
      signalDescription,
      output,
    };
    console.error('psmSwap tx send failed', summary);
    throw Error(
      `psmSwap tx send failed: ${JSON.stringify({ exitCode, signal, signalDescription })}`,
      { cause },
    );
  }
  console.log('psmSwap tx send results', sendResult.all);

  await waitUntilOfferResult(address, offerId, true, waitIO, {
    errorMessage: `${offerId} not succeeded`,
  });
};

/**
 *
 * @param {number} base
 * @param {number} fee
 */
const giveAnchor = (base, fee) => Math.ceil(base / (1 - fee));

/**
 *
 * @param {number} base
 * @param {number} fee
 */
const receiveAnchor = (base, fee) => Math.ceil(base * (1 - fee));

/**
 *
 * @param {Coin[]} balances
 * @param {string} targetDenom
 */
const extractBalance = (balances, targetDenom) => {
  const balance = balances.find(({ denom }) => denom === targetDenom);
  if (!balance) return 0;
  return Number(balance.amount);
};

/**
 * Checking IST balances can be tricky because of the execution fee mentioned in
 * https://github.com/Agoric/agoric-sdk/issues/6525. So we first check for
 * equality, but if that fails we recheck against an assumption that a fee of
 * the default "minFeeDebit" has been charged.
 *
 * @param {import('ava').ExecutionContext} t
 * @param {number} actualBalance
 * @param {number} expectedBalance
 */
export const tryISTBalances = async (t, actualBalance, expectedBalance) => {
  const firstTry = await t.try(tt => {
    tt.is(actualBalance, expectedBalance);
  });
  if (firstTry.passed) {
    firstTry.commit();
    return;
  }

  firstTry.discard();
  t.log('tryISTBalances assuming no batched IST fee', firstTry.errors);
  // See golang/cosmos/x/swingset/types/default-params.go
  // and `ChargeBeans` in golang/cosmos/x/swingset/keeper/keeper.go.
  const minFeeDebit = 200_000;
  t.is(actualBalance + minFeeDebit, expectedBalance);
};

/**
 *
 * @param {import('ava').ExecutionContext} t
 * @param {PsmMetrics} metricsBefore
 * @param {Coin[]} balancesBefore
 * @param {{trader: string; fee: number; anchor: string;} & (
 *   | {wantMinted: number}
 *   | {giveMinted: number}
 * )} tradeInfo
 */
export const checkSwapSucceeded = async (
  t,
  metricsBefore,
  balancesBefore,
  tradeInfo,
) => {
  const [metricsAfter, balancesAfter] = await Promise.all([
    getPsmMetrics(tradeInfo.anchor),
    getBalances([tradeInfo.trader]),
  ]);

  t.log('METRICS_AFTER', metricsAfter);
  t.log('BALANCES_AFTER', balancesAfter);

  if ('wantMinted' in tradeInfo) {
    const anchorPaid = giveAnchor(
      tradeInfo.wantMinted * 1000000,
      tradeInfo.fee,
    );
    const mintedReceived = tradeInfo.wantMinted * 1000000;
    const feePaid = anchorPaid - mintedReceived;

    t.deepEqual(
      extractBalance(balancesAfter, USDC_DENOM),
      extractBalance(balancesBefore, USDC_DENOM) - anchorPaid,
    );

    await tryISTBalances(
      t,
      extractBalance(balancesAfter, 'uist'),
      extractBalance(balancesBefore, 'uist') + mintedReceived,
    );

    t.like(metricsAfter, {
      anchorPoolBalance: {
        value: metricsBefore.anchorPoolBalance.value + BigInt(anchorPaid),
      },
      feePoolBalance: {
        value: metricsBefore.feePoolBalance.value + BigInt(feePaid),
      },
      mintedPoolBalance: {
        value: metricsBefore.mintedPoolBalance.value + BigInt(anchorPaid),
      },
      totalAnchorProvided: {
        value: metricsBefore.totalAnchorProvided.value,
      },
      totalMintedProvided: {
        value: metricsBefore.totalMintedProvided.value + BigInt(anchorPaid),
      },
    });
  } else if ('giveMinted' in tradeInfo) {
    const mintedPaid = tradeInfo.giveMinted * 1000000;
    const anchorReceived = receiveAnchor(
      tradeInfo.giveMinted * 1000000,
      tradeInfo.fee,
    );
    const feePaid = mintedPaid - anchorReceived;

    t.deepEqual(
      extractBalance(balancesAfter, USDC_DENOM),
      extractBalance(balancesBefore, USDC_DENOM) + anchorReceived,
    );

    await tryISTBalances(
      t,
      extractBalance(balancesAfter, 'uist'),
      extractBalance(balancesBefore, 'uist') - mintedPaid,
    );

    t.like(metricsAfter, {
      anchorPoolBalance: {
        value: metricsBefore.anchorPoolBalance.value - BigInt(anchorReceived),
      },
      feePoolBalance: {
        value: metricsBefore.feePoolBalance.value + BigInt(feePaid),
      },
      mintedPoolBalance: {
        value: metricsBefore.mintedPoolBalance.value - BigInt(anchorReceived),
      },
      totalAnchorProvided: {
        value: metricsBefore.totalAnchorProvided.value + BigInt(anchorReceived),
      },
      totalMintedProvided: {
        value: metricsBefore.totalMintedProvided.value,
      },
    });
  }
};

/**
 *
 * @param {Array<{ denom: string; amount: string }>} balances
 * @param {string} address
 */
export const adjustBalancesIfNotProvisioned = async (balances, address) => {
  const { children } = await agd.query(
    'vstorage',
    'children',
    'published.wallet',
    '-o',
    'json',
  );
  const addressProvisioned = children.includes(address);

  if (addressProvisioned === true) return balances;

  const balancesAdjusted = [];

  for (const { denom, amount } of balances) {
    if (denom === 'uist') {
      const startingAmount = (
        parseInt(amount, 10) +
        250000 -
        1_000_000
      ).toString(); // provision sends 250000uist to new accounts and 1 IST is charged
      balancesAdjusted.push({ denom, amount: startingAmount });
    } else {
      balancesAdjusted.push({ denom, amount });
    }
  }

  return balancesAdjusted;
};

/**
 *
 * @param {any} t
 * @param {string} address
 * @param {Record<any, any>} metricsBefore
 */
export const checkSwapExceedMintLimit = async (t, address, metricsBefore) => {
  const [offerResult, metricsAfter] = await Promise.all([
    agoric.follow('-lF', `:published.wallet.${address}`),
    getPsmMetrics(PSM_PAIR.split('-')[1]),
  ]);
  const { status, updated } = offerResult;

  t.is(updated, 'offerStatus');
  t.is(status.error, 'Error: Request would exceed mint limit');
  t.like(metricsBefore, {
    mintedPoolBalance: { value: metricsAfter.mintedPoolBalance.value },
  });
};

/**
 * @param {string} anchor
 * @returns {Promise<{ maxMintableValue: number; wantFeeValue: number; giveFeeValue: number; }>}
 */
export const maxMintBelowLimit = async anchor => {
  const [governance, metrics] = await Promise.all([
    getPsmGovernance(anchor),
    getPsmMetrics(anchor),
  ]);

  const mintLimitVal = Number(governance.MintLimit.value.value);
  const mintedPoolBalanceVal = Number(metrics.mintedPoolBalance.value);
  const maxMintableValue = mintLimitVal - mintedPoolBalanceVal - 1;

  const wantFeeRatio = governance.WantMintedFee.value;
  const giveFeeRatio = governance.GiveMintedFee.value;

  const wantFeeValue =
    Number(wantFeeRatio.numerator.value) /
    Number(wantFeeRatio.denominator.value);
  const giveFeeValue =
    Number(giveFeeRatio.numerator.value) /
    Number(giveFeeRatio.denominator.value);

  return { maxMintableValue, wantFeeValue, giveFeeValue };
};
