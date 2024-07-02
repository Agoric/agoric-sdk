// @ts-check

import { Fail, q } from '@endo/errors';
import { makeBoardRemote } from '@agoric/vats/tools/board-utils.js';

/** @import {BoardRemote} from '@agoric/vats/tools/board-utils.js' */
/** @import {VBankAssetDetail} from '@agoric/vats/tools/board-utils.js'; */

/**
 * Like @endo/nat but coerces
 *
 * @param {string} str
 * @returns {bigint}
 */
export const Natural = str => {
  const b = BigInt(str);
  if (b < 0) {
    throw RangeError(`${b} is negative`);
  }
  return b;
};

/**
 * JSON.stringify replacer to handle bigint
 *
 * @param {unknown} k
 * @param {unknown} v
 */
export const bigintReplacer = (k, v) => (typeof v === 'bigint' ? `${v}` : v);

/** @type {Partial<VBankAssetDetail>} */
// eslint-disable-next-line no-unused-vars
const exampleAsset = {
  brand: makeBoardRemote({ boardId: 'board0425', iface: 'Alleged: BLD brand' }),
  displayInfo: { assetKind: 'nat', decimalPlaces: 6 },
  issuer: makeBoardRemote({ boardId: null, iface: undefined }),
  proposedName: 'Agoric staking token',
};

/**
 * @param {VBankAssetDetail[]} assets
 * @returns {(a: Amount & { brand: BoardRemote }) => [string | null, number | any[]]}
 */
export const makeAmountFormatter = assets => amt => {
  const { brand, value } = amt;
  const boardId = brand.getBoardId();
  const asset = assets.find(a => a.brand.getBoardId() === boardId);
  if (!asset) return [boardId, Number(value)]; // don't crash
  const {
    displayInfo: { assetKind, decimalPlaces = 0 },
    issuerName,
  } = asset;
  switch (assetKind) {
    case 'nat':
      return [issuerName, Number(value) / 10 ** decimalPlaces];
    case 'set':
      assert(Array.isArray(value));
      // @ts-expect-error narrowed
      if (value[0]?.handle?.iface?.includes('InvitationHandle')) {
        // @ts-expect-error narrowed
        return [issuerName, value.map(v => v.description)];
      }
      return [issuerName, value];
    default:
      return [issuerName, [NaN]];
  }
};

export const asPercent = ratio => {
  const { numerator, denominator } = ratio;
  assert(numerator.brand === denominator.brand);
  return (100 * Number(numerator.value)) / Number(denominator.value);
};

const isObject = x => typeof x === 'object' && x !== null;

/**
 * @param {Amount} x
 * @returns {Amount & { brand: BoardRemote }}
 */
export const asBoardRemote = x => {
  isObject(x) || Fail`not object: ${q(x)}`;
  isObject(x.brand) || Fail`not object: ${q(x.brand)}`;
  'getBoardId' in x.brand || Fail`missing getBoardId: ${q(x.brand)}`;
  // @ts-expect-error dynamic check
  return x;
};

/**
 * Summarize the balances array as user-facing informative tuples
 *
 * @param {import('@agoric/smart-wallet/src/smartWallet.js').CurrentWalletRecord['purses']} purses
 * @param {VBankAssetDetail[]} assets
 */
export const purseBalanceTuples = (purses, assets) => {
  const fmt = makeAmountFormatter(assets);
  return purses.map(b => fmt(asBoardRemote(b.balance)));
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
 * @param {import('@agoric/vats/tools/board-utils.js').AgoricNamesRemotes} agoricNames
 */
export const offerStatusTuples = (state, agoricNames) => {
  const { offerStatuses } = state;
  const fmt = makeAmountFormatter(Object.values(agoricNames.vbankAsset));
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
      const timestamp = String(o.id).replace(/\D+/g, '');
      when = new Date(Number(timestamp)).toISOString();
    } catch {
      console.debug('offer id', o.id, 'does not contain a timestamp');
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
 * @param {import('@agoric/smart-wallet/src/smartWallet.js').CurrentWalletRecord} current
 * @param {ReturnType<import('@agoric/smart-wallet/src/utils.js').makeWalletStateCoalescer>['state']} coalesced
 * @param {import('@agoric/vats/tools/board-utils.js').AgoricNamesRemotes} agoricNames
 */
export const summarize = (current, coalesced, agoricNames) => {
  return {
    purses: purseBalanceTuples(
      [...current.purses.values()],
      Object.values(agoricNames.vbankAsset),
    ),
    usedInvitations: current.offerToUsedInvitation.map(
      ([offerId, invitationAmt]) => [
        agoricNames.reverse[invitationAmt.value[0].instance.boardId],
        invitationAmt.value[0].description,
        offerId,
      ],
    ),
    offers: offerStatusTuples(coalesced, agoricNames),
  };
};
