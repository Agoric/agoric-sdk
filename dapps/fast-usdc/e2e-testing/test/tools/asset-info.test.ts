import test from '@endo/ses-ava/prepare-endo.js';
import type { Denom, DenomDetail } from '@agoric/orchestration';
import { makeAssetInfo } from '../../tools/asset-info.js';

const minChainInfo = {
  agoric: {
    chainId: 'agoriclocal',
    connections: {
      cosmoshublocal: {
        transferChannel: {
          channelId: 'channel-1',
        },
      },
      osmosislocal: {
        transferChannel: {
          channelId: 'channel-0',
        },
      },
    },
  },
  cosmoshub: {
    chainId: 'cosmoshublocal',
    connections: {
      agoriclocal: {
        transferChannel: {
          channelId: 'channel-1',
        },
      },
      osmosislocal: {
        transferChannel: {
          channelId: 'channel-0',
        },
      },
    },
  },
  osmosis: {
    chainId: 'osmosislocal',
    connections: {
      agoriclocal: {
        transferChannel: {
          channelId: 'channel-1',
        },
      },
      cosmoshublocal: {
        transferChannel: {
          channelId: 'channel-0',
        },
      },
    },
  },
};

const minTokenMap = {
  agoric: ['ubld', 'uist'],
  cosmoshub: ['uatom'],
  osmosis: ['uosmo'],
};

test('makeAssetInfo', async t => {
  const byDenom = (assetInfo: [Denom, DenomDetail][]) =>
    assetInfo.sort(([a], [b]) => a.localeCompare(b) * -1);

  const assetInfo = makeAssetInfo(
    /** @ts-expect-error minified mock */
    minChainInfo,
    minTokenMap,
  );

  t.deepEqual(byDenom([...assetInfo]), [
    [
      'uosmo',
      {
        baseDenom: 'uosmo',
        baseName: 'osmosis',
        chainName: 'osmosis',
      },
    ],
    [
      'uist',
      {
        baseDenom: 'uist',
        baseName: 'agoric',
        brandKey: 'IST',
        chainName: 'agoric',
      },
    ],
    [
      'ubld',
      {
        baseDenom: 'ubld',
        baseName: 'agoric',
        brandKey: 'BLD',
        chainName: 'agoric',
      },
    ],
    [
      'uatom',
      {
        baseDenom: 'uatom',
        baseName: 'cosmoshub',
        chainName: 'cosmoshub',
      },
    ],
    [
      'ibc/ED07A3391A112B175915CD8FAF43A2DA8E4790EDE12566649D0C2F97716B8518',
      {
        baseDenom: 'uosmo',
        baseName: 'osmosis',
        brandKey: 'OSMO',
        chainName: 'agoric',
      },
    ],
    [
      'ibc/ED07A3391A112B175915CD8FAF43A2DA8E4790EDE12566649D0C2F97716B8518',
      {
        baseDenom: 'uosmo',
        baseName: 'osmosis',
        chainName: 'cosmoshub',
      },
    ],
    [
      'ibc/E7827844CB818EE9C4DB2C159F1543FF62B26213B44CE8029D5CEFE52F0EE596',
      {
        baseDenom: 'ubld',
        baseName: 'agoric',
        chainName: 'cosmoshub',
      },
    ],
    [
      'ibc/E7827844CB818EE9C4DB2C159F1543FF62B26213B44CE8029D5CEFE52F0EE596',
      {
        baseDenom: 'ubld',
        baseName: 'agoric',
        chainName: 'osmosis',
      },
    ],
    [
      'ibc/C4CFF46FD6DE35CA4CF4CE031E643C8FDC9BA4B99AE598E9B0ED98FE3A2319F9',
      {
        baseDenom: 'uatom',
        baseName: 'cosmoshub',
        brandKey: 'ATOM',
        chainName: 'agoric',
      },
    ],
    [
      'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2',
      {
        baseDenom: 'uatom',
        baseName: 'cosmoshub',
        chainName: 'osmosis',
      },
    ],
    [
      'ibc/16CD81E12F05F5397CA2D580B4BA786A12A8F48B6FB3823D82EBE95D80B5287B',
      {
        baseDenom: 'uist',
        baseName: 'agoric',
        chainName: 'cosmoshub',
      },
    ],
    [
      'ibc/16CD81E12F05F5397CA2D580B4BA786A12A8F48B6FB3823D82EBE95D80B5287B',
      {
        baseDenom: 'uist',
        baseName: 'agoric',
        chainName: 'osmosis',
      },
    ],
  ]);
});
