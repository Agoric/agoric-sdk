import {
  agd,
  CHAINID,
  VALIDATORADDR,
  agoric as agoricAmbient,
  pushPrices,
} from '@agoric/synthetic-chain';
import { Fail, q } from '@endo/errors';
import { getTranscriptItemsForVat } from './vat-helpers.js';

/**
 * By the time we push prices to the new price feed vat, the old one might receive
 * some deliveries related to GC events. These delivery types might be; 'dropExports',
 * 'retireExports', 'retireImports', 'bringOutYourDead'.
 *
 * Even though we don't expect to receive all these types of deliveries at once;
 * choosing MAX_DELIVERIES_ALLOWED = 5 seems reasonable.
 */
const MAX_DELIVERIES_ALLOWED = 5;

export const scale6 = x => BigInt(x * 1000000);

/**
 * @typedef {Record<
 *   string,
 *   Record<string, number>
 * >} SnapshotItem
 *
 * @typedef {Record<string, SnapshotItem>} Snapshots
 */

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
  return parseInt(round.roundId, 10);
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

/**
 * @param {SnapshotItem} snapShotItem
 */
export const getQuiescentVats = snapShotItem => {
  const quiescentVats = {};
  [...Object.values(snapShotItem)].forEach(vats => {
    const keyOne = Object.keys(vats)[0];
    const keyTwo = Object.keys(vats)[1];

    return parseInt(keyOne.substring(1), 10) > parseInt(keyTwo.substring(1), 10)
      ? (quiescentVats[keyTwo] = vats[keyTwo])
      : (quiescentVats[keyOne] = vats[keyOne]);
  });

  return quiescentVats;
};

/**
 *
 * @param {Snapshots} snapshots
 * @param {{ getTranscriptItems?: () => Array}} io
 */
export const ensureGCDeliveryOnly = (snapshots, io = {}) => {
  const { getTranscriptItems = getTranscriptItemsForVat } = io;

  const { after, before } = snapshots;
  const quiescentVatsBefore = getQuiescentVats(before);
  const quiescentVatsAfter = getQuiescentVats(after);

  console.dir(quiescentVatsBefore, { depth: null });
  console.dir(quiescentVatsAfter, { depth: null });

  [...Object.entries(quiescentVatsBefore)].forEach(([vatId, position]) => {
    const afterPosition = quiescentVatsAfter[vatId];
    const messageDiff = afterPosition - position;
    console.log(vatId, messageDiff);

    if (messageDiff > MAX_DELIVERIES_ALLOWED)
      Fail`${q(messageDiff)} deliveries is greater than maximum allowed: ${q(MAX_DELIVERIES_ALLOWED)}`;
    else if (messageDiff === 0) return;

    const transcripts = getTranscriptItems(vatId, messageDiff);
    console.log('TRANSCRIPTS', transcripts);

    transcripts.forEach(({ item }) => {
      const deliveryType = JSON.parse(item).d[0];
      console.log('DELIVERY TYPE', deliveryType);
      if (deliveryType === 'notify' || deliveryType === 'message')
        Fail`DeliveryType ${q(deliveryType)} is not GC delivery`;
    });
  });
};

/**
 * @param {number} managerIndex
 */
export const getQuoteFromVault = async managerIndex => {
  const res = await agoricAmbient.follow(
    '-lF',
    `:published.vaultFactory.managers.manager${managerIndex}.quotes`,
  );
  return res.quoteAmount.value[0].amountOut.value;
};
