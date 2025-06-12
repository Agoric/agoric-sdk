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
import { deepMapObject } from '@agoric/internal';
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
import { NonNullish } from '@agoric/internal/src/errors.js';
import { getBalances } from './utils.js';

/** @import {Result as ExecaResult, ExecaError} from 'execa'; */
/**
 * @typedef {ExecaResult & { all: string } & (
 *     | { failed: false }
 *     | Pick<
 *         ExecaError & { failed: true },
 *         | 'failed'
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
 * Given either an array of [string, Value] or
 * { [labelKey]: string, [valueKey]: Value } entries, or a
 * Record<string, Value> object, log a concise representation similar to
 * the latter but hiding implementation details of any embedded remotables.
 *
 * Sample output from any of the following input data:
 * - { foo: { brand: FooBrand, value: '42' }, bar: { brand: BarBrand, value: '100' } }
 * - [['foo', { brand: FooBrand, value: '42' }], ['bar', { brand: BarBrand, value: '100' }]]
 * - [{ label: 'foo', amount: { brand: FooBrand, value: '42' } },
 *     { label: 'bar', amount: { brand: BarBrand, value: '100' } }]
 *
 *     $label $shape {
 *       foo: {
 *         brand: Object Alleged: Foo brand {},
 *         value: '42',
 *       },
 *       bar: {
 *         brand: Object Alleged: Bar brand {},
 *         value: '100',
 *       },
 *     }
 *
 * where $shape is `{ [label]: amount, ... }` for the third kind of input data
 * but is otherwise empty.
 * @deprecated should be in @agoric/client-utils?
 *
 * @template [Value=unknown]
 * @param {string} label
 * @param {Array<[string, Value] | object> | Record<string, Value>} data
 * @param {(...args: unknown[]) => void} [log]
 * @returns {void}
 */
export const logRecord = (label, data, log = console.log) => {
  const entries = Array.isArray(data) ? [...data] : Object.entries(data);
  /** @type {[labelKey: PropertyKey, valueKey: PropertyKey] | undefined} */
  let shape;
  for (let i = 0; i < entries.length; i += 1) {
    let entry = entries[i];
    if (!Array.isArray(entry)) {
      // Determine which key of a two-property "entry object" (e.g.,
      // {denom, amount} or {brand, value} is the label and which is the value
      // (which may be of type object or number or bigint or string).
      if (!shape) {
        const entryKeys = Object.keys(entry);
        if (entryKeys.length !== 2) {
          throw Error(
            `[INTERNAL logRecord] not shaped like a record entry: {${entryKeys}}`,
          );
        }
        const valueKeyIndex = entryKeys.findIndex(
          k =>
            typeof entry[k] === 'object' ||
            (entry[k].trim() !== '' && !Number.isNaN(Number(entry[k]))),
        );
        if (valueKeyIndex === undefined) {
          throw Error(
            `[INTERNAL logRecord] no value property: {${entryKeys}}={${Object.values(entry).map(String)}}`,
          );
        }
        shape = /** @type {[string, string]} */ (
          valueKeyIndex === 1 ? entryKeys : entryKeys.reverse()
        );
      }
      // Convert the entry object to a [key, value] entry array.
      entries[i] = shape.map(k => entry[k]);
      entry = entries[i];
    }
    // Simplify remotables in the value.
    entry[1] = deepMapObject(entry[1], value => {
      const tag =
        value && typeof value === 'object' && value[Symbol.toStringTag];
      return tag
        ? Object.defineProperty({}, Symbol.toStringTag, {
            value: tag,
            enumerable: false,
          })
        : value;
    });
  }
  log(
    label,
    shape ? `{ [${String(shape[0])}]: ${String(shape[1])}, ... }` : '',
    Object.fromEntries(entries),
  );
};

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
 * @param {string} path
 */
const objectFromVstorageEntries = async path => {
  const rawEntries = await agoric.follow('-lF', `:${path}`, '-o', 'text');
  return Object.fromEntries(marshaller.fromCapData(JSON.parse(rawEntries)));
};

const snapshotAgoricNames = async () => {
  const [brands, instances] = await Promise.all([
    objectFromVstorageEntries('published.agoricNames.brand'),
    objectFromVstorageEntries('published.agoricNames.instance'),
  ]);
  return { brands, instances };
};

/**
 * @param {import('@agoric/ertp').Brand} brand
 * @param {bigint} numValInPercent
 */
const toRatio = (brand, numValInPercent) => {
  const commonDenominator = AmountMath.make(brand, 10_000n);
  const numerator = AmountMath.make(brand, numValInPercent * 100n); // Convert to bps
  return {
    numerator,
    denominator: commonDenominator,
  };
};

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
 * @param {{follow: (...params: string[]) => Promise<object> }} io
 */
export const fetchLatestEcQuestion = async io => {
  const { follow } = io;
  const pathOutcome = ':published.committees.Economic_Committee.latestOutcome';
  const pathQuestion =
    ':published.committees.Economic_Committee.latestQuestion';

  const [latestOutcome, latestQuestion] = await Promise.all([
    follow('-lF', pathOutcome, '-o', 'text').then(outcomeRaw =>
      marshaller.fromCapData(JSON.parse(/** @type {any} */ (outcomeRaw))),
    ),
    follow('-lF', pathQuestion, '-o', 'text').then(questionRaw =>
      marshaller.fromCapData(JSON.parse(/** @type {any} */ (questionRaw))),
    ),
  ]);

  return { latestOutcome, latestQuestion };
};

export const checkCommitteeElectionResult = (
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

  // Read current state.
  const { address, instanceName, newParams, votingDuration } = question;
  const deadline = BigInt(votingDuration * 60 + Math.round(now / 1000));
  const offerId = now.toString();
  const charterAcceptOfferId = await agops.ec(
    'find-continuing-id',
    '--for',
    `${'charter\\ member\\ invitation'}`,
    '--from',
    address,
  );
  console.log(
    'PSM change gov params charterAcceptOfferId',
    charterAcceptOfferId,
  );
  const { brands, instances } = await snapshotAgoricNames();
  console.log('PSM change gov params BRANDS', Object.keys(brands));
  console.log('PSM change gov params INSTANCES', Object.keys(instances));

  // Construct and execute the offer.
  const params = {};
  if (newParams.giveMintedFeeVal) {
    params.GiveMintedFee = toRatio(brands.IST, newParams.giveMintedFeeVal);
  }
  if (newParams.wantMintedFeeVal) {
    params.WantMintedFee = toRatio(brands.IST, newParams.wantMintedFeeVal);
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
  console.log('PSM change gov params offer', offerSpec, offer);
  await executeOffer(address, offer);

  // Vote on the change.
  const { committeeAddrs, position } = voting;
  console.log(
    'PSM change gov params voting for position',
    position,
    'using',
    committeeAddrs,
  );
  await Promise.all(
    committeeAddrs.map(account =>
      agops.ec('vote', '--forPosition', `${position}`, '--send-from', account),
    ),
  );
  console.log('PSM change gov params waiting for vote deadline');
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
 * UNTIL https://github.com/Agoric/agoric-sdk/issues/10746 better to use {@link sendOfferAgd}
 *
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
  const args = /** @type {string[]} */ (
    // @ts-expect-error heterogeneous concat
    [].concat(
      [`--node=${rpcAddrs[0]}`, `--chain-id=${chainName}`],
      [`--keyring-backend=test`, `--from=${address}`],
      ['tx', 'swingset', 'wallet-action', '--allow-spend', offer],
      '--yes',
      '-ojson',
    )
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
  const { now, sendOffer = sendOfferAgd, ...waitIO } = io;
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
  t.log('tryISTBalances assuming no batched IST fee', ...firstTry.errors);
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

  logRecord('METRICS_AFTER', metricsAfter, t.log);
  logRecord('BALANCES_AFTER', balancesAfter, t.log);

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

  // provisioning currently costs 10 BLD and deposits 0.25 IST
  for (const { denom, amount } of balances) {
    let newAmount = amount;
    if (denom === 'ubld') {
      newAmount = (BigInt(amount) - BigInt(10e6)).toString();
    } else if (denom === 'uist') {
      newAmount = (BigInt(amount) + BigInt(0.25e6)).toString();
    }
    balancesAdjusted.push({ denom, amount: newAmount });
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
