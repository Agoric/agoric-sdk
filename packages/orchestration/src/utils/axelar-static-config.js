/**
 * @import {Brand} from '@agoric/ertp';
 * @import {Denom} from '@agoric/orchestration';
 */

/**
 * @typedef {object} DenomDetail
 * @property {string} baseName - name of issuing chain; e.g. cosmoshub
 * @property {Denom} baseDenom - e.g. uatom
 * @property {string} chainName - name of holding chain; e.g. agoric
 * @property {Brand<'nat'>} [brand] - vbank brand, if registered
 * @see {ChainHub} `registerAsset` method
 */

export const assetInfo = JSON.stringify([
  [
    'uist',
    {
      baseDenom: 'uist',
      baseName: 'agoric',
      chainName: 'agoric',
    },
  ],
  [
    'ubld',
    {
      baseDenom: 'ubld',
      baseName: 'agoric',
      chainName: 'agoric',
    },
  ],
  [
    'ibc/2CC0B1B7A981ACC74854717F221008484603BB8360E81B262411B0D830EDE9B0',
    {
      baseDenom: 'uaxl',
      baseName: 'axelar',
      chainName: 'agoric',
      brandKey: 'AXL',
    },
  ],
]);
