// @ts-check

// ambient types
import '@agoric/ertp/src/types.js';

export const COSMOS_UNIT = 1_000_000n;

/**
 * Like @endo/nat but coerces
 *
 * @param {string} str
 * @returns {bigint}
 */
export const Natural = str => {
  const b = BigInt(str);
  if (b < 0) {
    throw new RangeError(`${b} is negative`);
  }
  return b;
};

// eslint-disable-next-line no-unused-vars
const exampleAsset = {
  brand: { boardId: 'board0425', iface: 'Alleged: BLD brand' },
  displayInfo: { assetKind: 'nat', decimalPlaces: 6 },
  issuer: { boardId: null, iface: undefined },
  petname: 'Agoric staking token',
};
/** @typedef {import('@agoric/smart-wallet/src/smartWallet').BrandDescriptor & {brand: import('./rpc').RpcRemote}} AssetDescriptor */

/** @param {AssetDescriptor[]} assets */
export const makeAmountFormatter = assets => amt => {
  const {
    brand: { boardId },
    value,
  } = amt;
  const asset = assets.find(a => a.brand.boardId === boardId);
  if (!asset) return [NaN, boardId];
  const {
    petname,
    displayInfo: { assetKind, decimalPlaces = 0 },
  } = asset;
  const name = Array.isArray(petname) ? petname.join('.') : petname;
  switch (assetKind) {
    case 'nat':
      /** @type {[petname: string, qty: number]} */
      return [name, Number(value) / 10 ** decimalPlaces];
    case 'set':
      return [name, value];
    default:
      return [name, ['?']];
  }
};

export const asPercent = ratio => {
  const { numerator, denominator } = ratio;
  assert(numerator.brand === denominator.brand);
  return (100 * Number(numerator.value)) / Number(denominator.value);
};

/**
 * @param {Array<import('../types').Amount>} balances
 * @param {AssetDescriptor[]} assets
 */
export const simplePurseBalances = (balances, assets) => {
  const fmt = makeAmountFormatter(assets);
  return balances.map(b => fmt(b));
};

export const fmtRecordOfLines = record => {
  const { stringify } = JSON;
  const groups = Object.entries(record).map(([key, items]) => [
    key,
    items.map(item => `    ${stringify(item)}`),
  ]);
  const lineEntries = groups.map(
    ([key, lines]) => `  ${stringify(key)}: [\n${lines.join(',\n')}\n  ]`,
  );
  return `{\n${lineEntries.join(',\n')}\n}`;
};
