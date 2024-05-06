// @ts-check
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { makeNameHubKit } from '@agoric/vats';
import { mockChainInfo } from './mocks/chain-info.js';

/**
 * @import {Brand} from '@agoric/ertp/exported.js';
 * @import {IBCConnectionID} from '@agoric/vats';
 */

const test = anyTest;

/** @typedef {`channel-${number}`} IBCChannelID */
/** @typedef {`ibc/${string}`} IBCDenom */

/**
 * // TODO import from cosmic-proto?
 * @typedef {'STATE_OPEN' | 'STATE_TRYOPEN' | 'STATE_INIT' | 'STATE_CLOSED'} IBCConnectionState
 */

/**
 * @typedef {{
 *  counterpartyChannelId: IBCChannelID;
 *  counterpartyPortId: string;
 *  sourceChannelId: IBCChannelID;
 *  sourcePortId: string;
 *  version: string;
 *  state: IBCConnectionState;
 *  ordering: 'ORDER_UNORDERED' | 'ORDER_ORDERED';
 * }} IBChannelInfo
 */

/**
 * @typedef {{
 *  clientId: string;
 *  counterparty: {
 *    clientId: string;
 *    connectionId: string;
 *  };
 *  id: IBCConnectionID;
 *  state: IBCConnectionState
 *  revisionHeight: bigint;
 *  revisionNumber: bigint;
 * }} IBCConnectionInfo;
 */

/**
 * @type {{
 *  chainId: string;
 *  bondAsset: {
 *    brand: Brand;
 *    denom: IBCDenom;
 *  };
 *  brand: {
 *    [denom: IBCDenom]: Brand;
 *  };
 *  denom: {
 *    [allegedBrandName: string]: IBCDenom;
 *  }
 *  trace: {
 *    [denomOrBrand: IBCDenom|string]: {
 *      baseDenom: string;
 *      path: string;
 *    };
 *  };
 *  connection: {
 *    [allegedChainName: string]: {
 *      chainId: string;
 *      connectionInfo: IBCConnectionInfo;
 *      transferChannel: IBChannelInfo;
 *    };
 *  };
 * }} ChainInfoEntry
 */

/** @type {Record<string,string>} */
const denomsToBrandName = {
  uion: 'ION',
  ubld: 'BLD',
  uatom: 'ATOM',
  uosmo: 'OSMO',
  uist: 'IST',
};

/** @type {Record<string,string>} */
const chainIdToChainName = {
  'osmosis-test': 'osmosis',
  'gaia-test': 'cosmos',
  agoriclocal: 'agoric',
};

const makeChainNames = async () => {
  // XXX get a mock agoricNames.brands,
  const { nameHub: chainNames, nameAdmin: chainNamesAdmin } = makeNameHubKit();
  for (const [allegedChainName, value] of Object.entries(mockChainInfo)) {
    const { bondDenom, chainId, denoms, connections } = value;
    const child = await chainNamesAdmin.provideChild(allegedChainName, [
      'chainId',
      'bondAsset',
      'brand',
      'denom',
      'trace',
      'connection',
    ]);
    child.nameAdmin.update('chainId', chainId);
    child.nameAdmin.update(
      'bondAsset',
      harden({
        brand: 'XXX_agoricNames_brand', // FIXME, use ERTP brand
        denom: bondDenom,
      }),
    );
    const { nameHub: brandNames, nameAdmin: brandNamesAdmin } =
      makeNameHubKit();
    const { nameHub: denomNames, nameAdmin: denomNamesAdmin } =
      makeNameHubKit();
    const { nameHub: traceNames, nameAdmin: traceNamesAdmin } =
      makeNameHubKit();

    for (const { denom, path, baseDenom } of denoms) {
      const brandName = denomsToBrandName[baseDenom || denom];
      await brandNamesAdmin.provideChild(denom);
      brandNamesAdmin.update(denom, brandName); // FIXME, use ERTP Brand

      await denomNamesAdmin.provideChild(brandName);
      denomNamesAdmin.update(brandName, denom);

      await traceNamesAdmin.provideChild(denom);
      traceNamesAdmin.update(denom, harden({ baseDenom, path }));
      await traceNamesAdmin.provideChild(brandName);
      traceNamesAdmin.update(brandName, harden({ baseDenom, path }));
    }
    child.nameAdmin.update('brand', brandNames);
    child.nameAdmin.update('denom', denomNames);
    child.nameAdmin.update('trace', traceNames);

    const { nameHub: connectionNames, nameAdmin: connectionNamesAdmin } =
      makeNameHubKit();
    for (const {
      connectionInfo,
      transferChannels,
      chainId: lChainId,
      lastUpdated,
    } of connections) {
      const chainName = chainIdToChainName[lChainId];
      await connectionNamesAdmin.provideChild(chainName);
      connectionNamesAdmin.update(
        chainName,
        harden({
          chainId: lChainId,
          connectionInfo: {
            ...connectionInfo,
            ...lastUpdated,
          },
          // FIXME, there can be more than one, but typically only one canonical
          transferChannel: transferChannels[0],
        }),
      );
    }
    child.nameAdmin.update('connection', connectionNames);
  }
  return { chainNames, chainNamesAdmin };
};

test('chain-name-hub', async t => {
  const { chainNames } = await makeChainNames();

  const chainId = await chainNames.lookup('osmosis', 'chainId');
  t.is(chainId, 'osmosis-test');
  const bondAsset = await chainNames.lookup('osmosis', 'bondAsset');
  t.deepEqual(bondAsset, { brand: 'XXX_agoricNames_brand', denom: 'uosmo' });

  // lookup up Brand from denom
  const brand = await chainNames.lookup('osmosis', 'brand', 'uosmo');
  t.is(brand, 'OSMO', 'FIXME, use real ERTP Brand');

  // lookup denom from alleged brand name
  const denom = await chainNames.lookup('osmosis', 'denom', 'ATOM');
  t.regex(denom, /ibc\/27394/);

  // lookup denom trace from denom
  const traceFromDenom = await chainNames.lookup(
    'osmosis',
    'trace',
    'ibc/E7827844CB818EE9C4DB2C159F1543FF62B26213B44CE8029D5CEFE52F0EE596',
  );
  const expectedTrace = {
    baseDenom: 'ubld',
    path: 'transfer/channel-1',
  };
  t.deepEqual(traceFromDenom, expectedTrace);
  // lookup denom trace from brand name
  const traceFromBrandName = await chainNames.lookup('osmosis', 'trace', 'BLD');
  t.deepEqual(traceFromBrandName, expectedTrace);

  // lookup conneciton info for a chain
  const connection = await chainNames.lookup('osmosis', 'connection', 'agoric');
  t.like(connection, {
    chainId: 'agoriclocal',
    connectionInfo: {
      id: 'connection-1',
      counterparty: {
        connectionId: 'connection-0',
      },
    },
    transferChannel: {
      counterpartyChannelId: 'channel-0',
      counterpartyPortId: 'transfer',
      sourceChannelId: 'channel-1',
      version: 'ics20-1',
    },
  });
});
