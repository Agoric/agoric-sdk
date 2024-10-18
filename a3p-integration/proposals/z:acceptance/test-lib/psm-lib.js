import '@endo/init';
import { boardSlottingMarshaller, makeFromBoard } from './rpc.js';
import {
  addUser,
  agd,
  agops,
  agoric,
  executeOffer,
  getUser,
  agopsLocation,
  executeCommand,
  CHAINID,
  VALIDATORADDR,
  GOV1ADDR,
  mkTemp,
} from '@agoric/synthetic-chain';
import { AmountMath } from '@agoric/ertp';
import { getBalances } from './utils.js';
import { PSM_PAIR, USDC_DENOM } from '../psm.test.js';
import fsp from 'node:fs/promises';

const fromBoard = makeFromBoard();
const marshaller = boardSlottingMarshaller(fromBoard.convertSlotToVal);

const VOTING_WAIT_MS = 65 * 1000;

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
 *   deadline: number
 *   offerId?: string
 * }} QuestionDetails
 */
export const buildProposePSMParamChangeOffer = async ({
  address,
  instanceName,
  newParams,
  deadline,
  offerId = Date.now().toString(),
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

  let params = {};
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
      deadline: BigInt(deadline * 60 + Math.round(Date.now() / 1000)),
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
 *   deadline: number
 *   offerId?: string
 * }} question
 *
 * @param {{
 *   committeeAddrs: Array<string>
 *   position: number
 * }} voting
 */
export const implementPsmGovParamChange = async (question, voting) => {
  await buildProposePSMParamChangeOffer(question);
  await voteForNewParams(voting);
  console.log('ACTIONS wait for the vote deadline to pass');
  await new Promise(r => setTimeout(r, VOTING_WAIT_MS));
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
 * @param {string} name
 * @param {{
 *   denom: string,
 *   value: string
 * }} fund
 */
export const initializeNewUser = async (name, fund) => {
  const psmTrader = await addUser(name);
  await Promise.all([
    bankSend(psmTrader, `20000000ubld,${fund.value}${fund.denom}`),
    bankSend(psmTrader, `1000000uist`, GOV1ADDR),
  ]);
};

/**
 *
 * @param {any} t
 * @param {string} userName
 * @param {{
 *   denom: string,
 *   value: string
 * }} expectedAnchorFunds
 */
export const checkUserInitializedSuccessfully = async (
  t,
  userName,
  expectedAnchorFunds,
) => {
  let userAddress;
  await t.notThrowsAsync(async () => {
    userAddress = await getUser(userName);
  });

  // @ts-expect-error initialization
  const balance = await getBalances([userAddress], expectedAnchorFunds.denom);
  t.is(balance >= BigInt(expectedAnchorFunds.value), true);
};

/**
 * Similar to https://github.com/Agoric/agoric-3-proposals/blob/422b163fecfcf025d53431caebf6d476778b5db3/packages/synthetic-chain/src/lib/commonUpgradeHelpers.ts#L123-L139
 * However, in the case where "address" is not provisioned "agoric wallet send" is needed because
 * "agops perf satisfaction" tries to follow ":published.wallet.${address}" which blocks the execution because no such path exists in
 * vstorage. In situations like this "agoric wallet send" seems a better choice as it doesn't depend on following user's vstorage wallet path
 *
 * @param {string} address
 * @param {Promise<string>} offerPromise
 */
export const sendOfferAgoric = async (address, offerPromise) => {
  const offerPath = await mkTemp('agops.XXX');
  const offer = await offerPromise;
  await fsp.writeFile(offerPath, offer);

  await agoric.wallet(
    '--keyring-backend=test',
    'send',
    '--offer',
    offerPath,
    '--from',
    address,
  );
};

/**
 * @param {string} address
 * @param {Array<any>} params
 */
export const agopsPsm = (address, params) => {
  const newParams = ['psm', ...params];
  const offerPromise = executeCommand(agopsLocation, newParams);
  return sendOfferAgoric(address, offerPromise);
};

const giveAnchor = (base, fee) => {
  return Math.ceil(base / (1 - fee));
};

const receiveAnchor = (base, fee) => {
  return Math.ceil(base * (1 - fee));
};

const extractBalance = (balances, targetDenom) => {
  const balance = balances.find(({ denom }) => denom === targetDenom);
  return Number(balance.amount);
};

/**
 *
 * @param {any} t
 * @param {any} metricsBefore
 * @param {any} balancesBefore
 * @param {{trader: string; fee: number} & (
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
    agoric
      .follow(
        '-lF',
        `:published.psm.IST.${PSM_PAIR?.split('-')[1]}.metrics`,
        '-o',
        'text',
      )
      .then(metricsRaw => marshaller.fromCapData(JSON.parse(metricsRaw))),
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

    t.deepEqual(
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

    t.deepEqual(
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

  let balancesAdjusted = [];

  balances.forEach(({ denom, amount }) => {
    if (denom === 'uist') {
      amount = (parseInt(amount) + 250000 - 1_000_000).toString(); // provision sends 250000uist to new accounts and 1 IST is charged
      balancesAdjusted.push({ denom, amount });
    } else {
      balancesAdjusted.push({ denom, amount });
    }
  });

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
    // @ts-expect-error we assume PSM_PAIR is set because of synthetic-chain environment
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
