import { agd } from '@agoric/synthetic-chain';

export const BID_OFFER_ID = 'bid-vaultUpgrade-test3';

/** @param {string} path */
export const queryVstorage = path =>
  agd.query('vstorage', 'data', '--output', 'json', path);

export const getOracleInstance = async price => {
  const instanceRec = await queryVstorage(`published.agoricNames.instance`);

  const value = JSON.parse(instanceRec.value);
  const body = JSON.parse(value.values.at(-1));

  const feeds = JSON.parse(body.body.substring(1));
  const feedName = `${price}-USD price feed`;

  const key = Object.keys(feeds).find(k => feeds[k][0] === feedName);
  if (key) {
    return body.slots[key];
  }
  return null;
};
