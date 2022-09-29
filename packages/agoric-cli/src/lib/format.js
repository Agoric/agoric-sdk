// @ts-check
/* eslint-disable @typescript-eslint/prefer-ts-expect-error -- https://github.com/Agoric/agoric-sdk/issues/4620 */
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
      if (value[0]?.handle?.iface?.includes('InvitationHandle')) {
        return [name, value.map(v => v.description)];
      }
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
 
 * @param {import('@agoric/smart-wallet/src/smartWallet').CurrentWalletRecord['purses']} purses
 * @param {AssetDescriptor[]} assets
 */
export const purseBalanceTuples = (purses, assets) => {
  const fmt = makeAmountFormatter(assets);
  return purses.map(b => fmt(b.balance));
};

/**
 * @param {Record<string, Array<unknown>>} record
 */
export const fmtRecordOfLines = record => {
  const { stringify } = JSON;
  const groups = Object.entries(record).map(([key, items]) => [
    key,
    items.map(item => `    ${stringify(item)}`),
  ]);
  const lineEntries = groups.map(
    // @ts-expect-error ???
    ([key, lines]) => `  ${stringify(key)}: [\n${lines.join(',\n')}\n  ]`,
  );
  return `{\n${lineEntries.join(',\n')}\n}`;
};

/**
 * Summarize the offerStatuses of the state as user-facing informative tuples
 *
 * @param {import('@agoric/smart-wallet/src/utils.js').CoalescedWalletState} state
 * @param {Awaited<ReturnType<typeof makeAgoricNames>>} agoricNames
 */
export const offerStatusTuples = (state, agoricNames) => {
  const { brands, offerStatuses } = state;
  const fmt = makeAmountFormatter(
    // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error -- https://github.com/Agoric/agoric-sdk/issues/4620 */
    // @ts-ignore xxx RpcRemote
    [...brands.values()],
  );
  const fmtRecord = r =>
    r
      ? Object.fromEntries(
          Object.entries(r).map(([kw, amount]) => [kw, fmt(amount)]),
        )
      : undefined;
  return Array.from(offerStatuses.values()).map(o => {
    assert(o);
    let when = '??';
    try {
      when = new Date(o.id).toISOString();
    } catch {
      console.debug('offer id', o.id, 'not a timestamp');
    }
    const {
      proposal: { give, want },
      payouts,
    } = o;
    const amounts = {
      give: give ? fmtRecord(give) : undefined,
      want: want ? fmtRecord(want) : undefined,
      payouts: fmtRecord(payouts),
    };
    switch (o.invitationSpec.source) {
      case 'contract': {
        const {
          invitationSpec: { instance, publicInvitationMaker },
        } = o;
        // xxx could be O(1)
        const entry = Object.entries(agoricNames.instance).find(
          // @ts-ignore minimarshal types are off by a bit
          ([_name, candidate]) => candidate === instance,
        );
        const instanceName = entry ? entry[0] : '???';
        return [
          instanceName,
          o.id,
          when,
          publicInvitationMaker,
          o.numWantsSatisfied,
          amounts,
        ];
      }
      default:
        return ['?', o.id, when, '?', o.numWantsSatisfied, amounts];
    }
  });
};

/**
 *
 * @param {import('@agoric/smart-wallet/src/smartWallet').CurrentWalletRecord} current
 * @param {ReturnType<import('@agoric/smart-wallet/src/utils.js').makeWalletStateCoalescer>['state']} coalesced
 * @param {Awaited<ReturnType<typeof makeAgoricNames>>} agoricNames
 */
export const summarize = (current, coalesced, agoricNames) => {
  return {
    lastOfferId: [current.lastOfferId],
    purses: purseBalanceTuples(
      // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error -- https://github.com/Agoric/agoric-sdk/issues/4620 */
      // @ts-ignore xxx RpcRemote
      [...current.purses.values()],
      // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error -- https://github.com/Agoric/agoric-sdk/issues/4620 */
      // @ts-ignore xxx RpcRemote
      [...current.brands.values()],
    ),
    usedInvitations: Object.entries(current.offerToUsedInvitation).map(
      ([offerId, invitationAmt]) => [
        agoricNames.reverse[invitationAmt.value[0].instance.boardId],
        invitationAmt.value[0].description,
        Number(offerId),
      ],
    ),
    offers: offerStatusTuples(coalesced, agoricNames),
  };
};
