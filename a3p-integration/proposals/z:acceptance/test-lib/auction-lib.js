import {
  addPreexistingOracles,
  agd,
  agopsInter,
  agoric,
  ATOM_DENOM,
  CHAINID,
  executeOffer,
  getPriceQuote,
  GOV1ADDR,
  pushPrices,
  VALIDATORADDR,
} from '@agoric/synthetic-chain';
import {
  retryUntilCondition,
  waitUntilAccountFunded,
  waitUntilOfferResult,
} from './sync-tools.js';
import { boardSlottingMarshaller, makeFromBoard } from './rpc.js';
import { AmountMath } from '@agoric/ertp';

/**
 * Typo will be fixed with https://github.com/Agoric/agoric-sdk/pull/10171
 * @typedef {import('./sync-tools.js').RetyrOptions} RetryOptions
 */

const ambientAuthority = {
  query: agd.query,
  follow: agoric.follow,
  setTimeout: globalThis.setTimeout,
};

export const scale6 = x => BigInt(x * 1_000_000);

const fromBoard = makeFromBoard();
const marshaller = boardSlottingMarshaller(fromBoard.convertSlotToVal);

// Import from synthetic-chain once it is updated
export const bankSend = (from, addr, wanted) => {
  const chain = ['--chain-id', CHAINID];
  const fromArg = ['--from', from];
  const testKeyring = ['--keyring-backend', 'test'];
  const noise = [...fromArg, ...chain, ...testKeyring, '--yes'];

  return agd.tx('bank', 'send', from, addr, wanted, ...noise);
};

export const pushPricesForAuction = async (t, price) => {
  const oraclesByBrand = new Map();
  await addPreexistingOracles('ATOM', oraclesByBrand);

  await pushPrices(price, 'ATOM', oraclesByBrand, t.context.roundId + 1);

  await retryUntilCondition(
    () => getPriceQuote('ATOM'),
    res => res === `+${scale6(price).toString()}`,
    'price not pushed yet',
    {
      log: t.log,
      setTimeout: globalThis.setTimeout,
      ...t.context.pushPriceRetryOpts,
    },
  );
};

/**
 * @param {any} t
 * @param {{
 *  name: string
 *  offerId: string,
 *  depositValue: string,
 * }} depositor
 * @param {Object<string, {
 *  bidder: string,
 *  bidderFund: {
 *   value: number,
 *   denom: string
 *  },
 *  offerId: string,
 *  give: string,
 *  price?: number
 *  discount?: string
 * }>} bidders
 */
export const fundAccts = async (t, depositor, bidders) => {
  const retryOpts = t.context.retryOpts.bankSendRetryOpts;

  await bankSend(
    VALIDATORADDR,
    GOV1ADDR,
    `${depositor.depositValue}${ATOM_DENOM}`,
  );
  await waitUntilAccountFunded(
    GOV1ADDR,
    ambientAuthority,
    { denom: ATOM_DENOM, value: Number(depositor.depositValue) },
    { errorMessage: `${depositor.name} not funded yet`, ...retryOpts },
  );

  for await (const [key, value] of [...Object.entries(bidders)]) {
    const fund = value.bidderFund;
    await bankSend(GOV1ADDR, value.bidder, `${fund.value}${fund.denom}`);
    await waitUntilAccountFunded(value.bidder, ambientAuthority, fund, {
      errorMessage: `${key} not funded yet`,
      ...retryOpts,
    });
  }
};

export const bidByPrice = (price, give, offerId, bidder, t) => {
  return agopsInter(
    'bid',
    'by-price',
    `--price ${price}`,
    `--give ${give}`,
    '--from',
    bidder,
    '--keyring-backend test',
    `--offer-id ${offerId}`,
  );
};

export const bidByDiscount = (discount, give, offerId, bidder, t) => {
  return agopsInter(
    'bid',
    'by-discount',
    `--discount ${discount}`,
    `--give ${give}`,
    '--from',
    bidder,
    '--keyring-backend test',
    `--offer-id ${offerId}`,
  );
};

export const placeBids = (t, bidsSetup) => {
  return [...Object.values(bidsSetup)].map(
    ({ bidder, offerId, price, give, discount }) => {
      if (price) return bidByPrice(price, give, offerId, bidder, t);
      return bidByDiscount(discount, give, offerId, bidder, t);
    },
  );
};

/**
 * Calculates retry options based on "nextStartTime"
 */
export const calculateRetryUntilNextStartTime = async () => {
  const schedule = await agoric.follow('-lF', ':published.auction.schedule');
  const nextStartTime = parseInt(schedule.nextStartTime.absValue);

  /** @type {RetryOptions} */
  const capturePriceRetryOpts = {
    maxRetries: Math.round((nextStartTime * 1000 - Date.now()) / 10000) + 2, // wait until next schedule
    retryIntervalMs: 10000, // 10 seconds in ms
  };

  return capturePriceRetryOpts;
};

/**
 *
 * @param {any} t
 * @param {{
 *  offerId: string,
 *  depositValue: string,
 *  addr: string
 * }} depositor
 */
export const depositCollateral = async (t, depositor) => {
  const [brandsRaw, retryOptions] = await Promise.all([
    agoric.follow('-lF', ':published.agoricNames.brand', '-o', 'text'),
    calculateRetryUntilNextStartTime(),
  ]);
  const brands = Object.fromEntries(
    marshaller.fromCapData(JSON.parse(brandsRaw)),
  );

  const offerSpec = {
    id: depositor.offerId,
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['auctioneer'],
      callPipe: [['makeDepositInvitation']],
    },
    proposal: {
      give: {
        Collateral: {
          brand: brands.ATOM,
          value: BigInt(depositor.depositValue),
        },
      },
    },
  };

  const spendAction = {
    method: 'executeOffer',
    offer: offerSpec,
  };

  const offer = JSON.stringify(marshaller.toCapData(harden(spendAction)));
  t.log('OFFER', offer);

  executeOffer(depositor.addr, offer);
  return waitUntilOfferResult(
    depositor.addr,
    depositor.offerId,
    true,
    ambientAuthority,
    {
      errorMessage: 'proceeds not distributed yet',
      ...retryOptions,
    },
  );
};

export const checkBidsOutcome = (t, settledBids, bidsOutcome, brands) => {
  [...Object.entries(settledBids)]
    .map(([key, bidResult]) => [key.split('.')[0], bidResult.status.payouts])
    .forEach(([key, { Bid, Collateral }]) => {
      t.log({ bidsOutcome });
      const {
        payouts: { Bid: outcomeBidVal, Collateral: outcomeColVal },
      } = bidsOutcome[key];
      t.log({ outcomeBidVal, outcomeColVal });
      t.is(
        AmountMath.isEqual(
          Bid,
          AmountMath.make(brands.IST, scale6(outcomeBidVal)),
        ),
        true,
      );
      t.is(
        AmountMath.isGTE(
          Collateral,
          AmountMath.make(brands.ATOM, scale6(outcomeColVal)),
        ),
        true,
      );
    });
};

export const checkDepositOutcome = (t, depositorPayouts, config, brands) => {
  // Assert depositor paid correctly
  const { Bid: depositorBid, Collateral: depositorCol } = depositorPayouts;
  const {
    depositor,
    longLivingBidSetup: { give: longLivingBidGive },
    currentBidsSetup,
    bidsOutcome,
  } = config;

  const getNumberFromGive = give =>
    parseInt(give.substring(0, give.length - 3));

  const calculateGiveTotal = () => {
    let currentBidSum = getNumberFromGive(longLivingBidGive);
    [...Object.values(currentBidsSetup)].forEach(({ give }) => {
      currentBidSum += getNumberFromGive(give);
    });

    return scale6(currentBidSum);
  };

  const calculateOutcomeTotal = () => {
    let total = 0n;
    [...Object.values(bidsOutcome)]
      .map(outcome => outcome.payouts.Collateral)
      .forEach(element => {
        t.log(element);
        total += scale6(element);
      });

    return total;
  };

  t.is(
    AmountMath.isEqual(
      depositorBid,
      AmountMath.make(brands.IST, calculateGiveTotal()),
    ),
    true,
  );
  t.is(
    AmountMath.isGTE(
      AmountMath.make(
        brands.ATOM,
        BigInt(depositor.depositValue) - calculateOutcomeTotal(),
      ),
      depositorCol,
    ),
    true,
  );
};

export const getCapturedPrice = async bookId => {
  const result = await agoric.follow('-lF', `:published.auction.${bookId}`);
  return result;
};

export const checkPrice = (res, expected) => {
  if (res.startPrice === null) return false;
  else if (res.startPrice.numerator.value === expected) return true;
  return false;
};
