import {
  agd,
  CHAINID,
  VALIDATORADDR,
  agoric as agoricAmbient,
  pushPrices,
} from '@agoric/synthetic-chain';

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
 * Import from synthetic-chain when https://github.com/Agoric/agoric-3-proposals/pull/183 is in
 *
 * @param {string} price
 * @param {{
 *   agoric?: { follow: () => Promise<object>};
 *   prefix?: string
 * }} io
 * @returns
 */
export const getRoundId = async (price, io = {}) => {
  const { agoric = { follow: agoricAmbient.follow }, prefix = 'published.' } =
    io;
  const path = `:${prefix}priceFeed.${price}-USD_price_feed.latestRound`;
  const round = await agoric.follow('-lF', path);
  return parseInt(round.roundId);
};

/**
 *
 * @param {string} brandIn
 * @param {number} price
 * @param {import('../priceFeed.test.js').OraclesByBrand} oraclesByBrand
 */
export const pollRoundIdAndPushPrice = async (
  brandIn,
  price,
  oraclesByBrand,
) => {
  const roundId = await getRoundId(brandIn);
  await pushPrices(price, brandIn, oraclesByBrand, roundId + 1);
};
