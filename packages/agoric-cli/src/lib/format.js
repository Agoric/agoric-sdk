// @ts-check

// eslint-disable-next-line no-unused-vars -- typeof below
import { makeAgoricNames } from './rpc.js';

// ambient types
import '@agoric/ertp/src/types.js';

/** @typedef {import('@agoric/smart-wallet/src/offers').OfferStatus} OfferStatus */

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
 * Summarize the balances array as user-facing informative tuples
 
 * @param {Amount[]} balances
 * @param {AssetDescriptor[]} assets
 */
export const purseBalanceTuples = (balances, assets) => {
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

/**
 * Summarize the offerStatuses of the state as user-facing informative tuples
 *
 * @param {{ brands: import('./format').AssetDescriptor[], offers: Map<number, OfferStatus>}} state
 * @param {Awaited<ReturnType<typeof makeAgoricNames>>} agoricNames
 */
export const offerStatusTuples = (state, agoricNames) => {
  const { brands, offers } = state;
  const fmt = makeAmountFormatter(brands);
  const fmtRecord = r =>
    Object.fromEntries(
      Object.entries(r).map(([kw, amount]) => [kw, fmt(amount)]),
    );
  return [...offers.keys()].sort().map(id => {
    const o = offers.get(id);
    assert(o);
    assert(o.invitationSpec.source === 'contract');
    const {
      invitationSpec: { instance, publicInvitationMaker },
      proposal: { give, want },
      payouts,
    } = o;
    const entry = Object.entries(agoricNames.instance).find(
      // @ts-expect-error xxx RpcRemote
      ([_name, candidate]) => candidate === instance,
    );
    const instanceName = entry ? entry[0] : '???';
    return [
      instanceName,
      new Date(id).toISOString(),
      id,
      publicInvitationMaker,
      o.numWantsSatisfied,
      {
        give: fmtRecord(give),
        want: fmtRecord(want),
        ...(payouts ? { payouts: fmtRecord(payouts) } : {}),
      },
    ];
  });
};
