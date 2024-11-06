/// <reference types="node" />
/* eslint-env node */

import '@endo/init';
import { makePromiseKit } from '@endo/promise-kit';
import {
  addUser,
  agd,
  agops,
  agoric,
  executeOffer,
  getUser,
  agopsLocation,
  // xxx executeCommand,
  CHAINID,
  VALIDATORADDR,
  GOV1ADDR,
  mkTemp,
} from '@agoric/synthetic-chain';
import { AmountMath } from '@agoric/ertp';
import { deepMapObject } from '@agoric/internal';
import { spawn } from 'node:child_process';
import fsp from 'node:fs/promises';
import { Readable } from 'node:stream';
import { boardSlottingMarshaller, makeFromBoard } from './rpc.js';
import { getBalances } from './utils.js';
import {
  retryUntilCondition,
  waitUntilAccountFunded,
  waitUntilOfferResult,
} from './sync-tools.js';
import { NonNullish } from './errors.js';

// Export these from synthetic-chain?
const USDC_DENOM = NonNullish(process.env.USDC_DENOM);
const PSM_PAIR = NonNullish(process.env.PSM_PAIR).replace('.', '-');

const q = JSON.stringify;

/**
 * @typedef {object} SpawnResult
 * @property {number | null} status
 * @property {Buffer | null} stdout
 * @property {Buffer | null} stderr
 * @property {string | null} signal
 * @property {Error | null} error
 */

/**
 * Launch a child process with optional standard input, because I can't use
 * execa for some reason.
 *
 * @param { string[] } cmd
 * @param { {input?: Parameters<typeof Readable.from>[0]} & Parameters<typeof spawn>[2] } options
 * @returns { Promise<SpawnResult & ({error: Error} | {status: number} | {signal: string})> }
 */
const spawnKit = async ([cmd, ...args], { input, ...options } = {}) => {
  const child = spawn(cmd, args, options);
  /** @type {{stdout: Buffer[], stderr: Buffer[]}} */
  const outChunks = { stdout: [], stderr: [] };
  const exitKit = makePromiseKit();
  const inKit = child.stdin && makePromiseKit();
  const outKit = child.stdout && makePromiseKit();
  const errKit = child.stderr && makePromiseKit();
  // cf. https://nodejs.org/docs/latest/api/child_process.html#child_processspawnsynccommand-args-options
  /** @type {SpawnResult} */
  const result = {
    status: null,
    stdout: null,
    stderr: null,
    signal: null,
    error: null,
  };
  child.on('error', err => {
    result.error = err;
    // An exit event *might* be coming, so wait a tick.
    setImmediate(() => exitKit.resolve());
  });
  child.on('exit', (exitCode, signal) => {
    result.status = exitCode;
    result.signal = signal;
    exitKit.resolve();
  });
  /** @type {(emitter: import('node:events').EventEmitter, kit: PromiseKit, msg: string) => void} */
  const rejectOnError = (emitter, kit, msg) =>
    emitter.on('error', err => kit.reject(Error(msg, { cause: err })));
  /** @typedef {[string, Readable, Buffer[], PromiseKit]} ReadableKit */
  for (const [label, stream, chunks, kit] of /** @type {ReadableKit[]} */ ([
    ['stdout', child.stdout, outChunks.stdout, outKit],
    ['stderr', child.stderr, outChunks.stderr, errKit],
  ])) {
    if (!stream) continue;
    rejectOnError(stream, kit, `failed reading from ${q(cmd)} ${label}`);
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => kit.resolve());
  }
  if (child.stdin) {
    rejectOnError(child.stdin, inKit, `failed writing to ${q(cmd)} stdin`);
    Readable.from(input || []).pipe(child.stdin);
    child.stdin.on('finish', () => inKit.resolve());
  } else if (input) {
    throw Error(`missing ${q(cmd)} stdin`);
  }
  await Promise.all([exitKit, inKit, outKit, errKit].map(kit => kit?.promise));
  if (outKit) result.stdout = Buffer.concat(outChunks.stdout);
  if (errKit) result.stderr = Buffer.concat(outChunks.stderr);
  return result;
};

const spawnResultData = spawnResult => ({
  status: spawnResult.status,
  stdout: spawnResult.stdout?.toString(),
  stderr: spawnResult.stderr?.toString(),
  signal: spawnResult.signal,
  error: spawnResult.error,
});

/**
 * Given either an array of [key, value] or
 * { [labelKey]: string, [valueKey]: unknown } entries, or a
 * Record<LabelString, Value> object, log a concise representation similar to
 * the latter but hiding implementation details of any embedded remotables.
 *
 * @param {import('ava').ExecutionContext} t
 * @param {string} label
 * @param {Array<[string, unknown] | object> | Record<string, unknown>} data
 * @returns {void}
 */
export const logKeyedNumerics = (t, label, data) => {
  const entries = Array.isArray(data) ? [...data] : Object.entries(data);
  /** @type {[labelKey: PropertyKey, valueKey: PropertyKey]} */
  let shape;
  for (let i = 0; i < entries.length; i += 1) {
    let entry = entries[i];
    if (!Array.isArray(entry)) {
      // Determine which key of a two-property "entry object" (e.g.,
      // {denom, amount} or {brand, value} is the label and which is the value
      // (which may be of type object or number or bigint or string).
      if (!shape) {
        const entryKeys = Object.keys(entry);
        t.is(
          entryKeys.length,
          2,
          `not shaped like a record entry: {${entryKeys}}`,
        );
        const numericKeyIndex = entryKeys.findIndex(
          k =>
            typeof entry[k] === 'object' ||
            (entry[k] !== '' && !Number.isNaN(Number(entry[k]))),
        );
        t.not(
          numericKeyIndex,
          undefined,
          `no numeric-valued property: {${entryKeys}}={${Object.values(entry).map(String)}}`,
        );
        shape = numericKeyIndex === 1 ? entryKeys : entryKeys.reverse();
      }
      // Convert that object to a [key, value] entry array.
      entries[i] = shape.map(k => entry[k]);
      entry = entries[i];
    }
    // Simplify remotables in the value.
    entry[1] = deepMapObject(entry[1], value => {
      const tag =
        value && typeof value === 'object' && value[Symbol.toStringTag];
      return tag
        ? Object.defineProperty({}, Symbol.toStringTag, { value: tag })
        : value;
    });
  }
  t.log(
    label,
    shape ? `{ [${shape[0]}]: ${shape[1]} }` : '',
    Object.fromEntries(entries),
  );
  // TODO gibson: Remove this temporary hedge against t.log not being visible upon timeout.
  console.log(
    label,
    shape ? `{ [${shape[0]}]: ${shape[1]} }` : '',
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
 *
 * @typedef {Array<{ denom: string; amount: string; }>} CosmosBalances
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

  const offerSpec = {
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
  };

  /** @type {string | object} */
  const spendAction = {
    method: 'executeOffer',
    offer: offerSpec,
  };

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

const checkCommitteeElectionResult = (electionResult, expectedResult) => {
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

export const checkGovParams = async (t, expected, psmName) => {
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
 * @param {any} io
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
 * Similar to https://github.com/Agoric/agoric-3-proposals/blob/422b163fecfcf025d53431caebf6d476778b5db3/packages/synthetic-chain/src/lib/commonUpgradeHelpers.ts#L123-L139
 * However, in the case where "address" is not provisioned "agoric wallet send" is needed because
 * "agops perf satisfaction" tries to follow ":published.wallet.${address}" which blocks the execution because no such path exists in
 * vstorage. In situations like this "agoric wallet send" seems a better choice as it doesn't depend on following user's vstorage wallet path
 *
 * @param {string} address
 * @param {string | Promise<string>} offerPromise
 * @returns {Promise<string>}
 */
export const sendOfferAgoric = async (address, offerPromise) => {
  const offerPath = await mkTemp('agops.XXX');
  const offer = await offerPromise;
  await fsp.writeFile(offerPath, offer);

  // Dive below agoric.wallet(...).
  return spawnKit([
    'agoric',
    'wallet',
    '--keyring-backend=test',
    'send',
    '--offer',
    offerPath,
    '--from',
    address,
    '--verbose',
  ]);
};

/**
 * @param {string} address
 * @param {Array<any>} params
 * @param {{
 *   follow: (...params: string[]) => Promise<object>;
 *   setTimeout: (callback: Function, delay: number) => void;
 *   now: () => number
 * }} io
 */
export const psmSwap = async (address, params, io) => {
  const now = io.now();
  const offerId = `${address}-psm-swap-${now}`;
  const newParams = ['psm', ...params, '--offerId', offerId];
  // xxx const offerPromise = executeCommand(agopsLocation, newParams);
  const psmResult = await spawnKit([agopsLocation, ...newParams]);
  console.log(
    `psmSwap \`${agopsLocation} psm ${params[0]}\` results`,
    spawnResultData(psmResult),
  );
  const sendResult = await sendOfferAgoric(
    address,
    psmResult.stdout.toString(),
  );
  console.log(
    'psmSwap `agoric wallet send` results',
    spawnResultData(sendResult),
  );

  await waitUntilOfferResult(address, offerId, true, io, {
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
 * @param {CosmosBalances} balances
 * @param {string} targetDenom
 */
const extractBalance = (balances, targetDenom) => {
  const balance = balances.find(({ denom }) => denom === targetDenom);
  if (!balance) return 0;
  return Number(balance.amount);
};

/**
 * Checking IST balances can be tricky because of the execution fee mentioned in
 * https://github.com/Agoric/agoric-sdk/issues/6525. Here we first check with
 * whatever is passed in. If the first attempt fails we try again to see if
 * there was an execution fee charged. If still fails, we throw.
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
  t.is(actualBalance + 200000, expectedBalance);
};

/**
 *
 * @param {import('ava').ExecutionContext} t
 * @param {PsmMetrics} metricsBefore
 * @param {CosmosBalances} balancesBefore
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
