// @ts-check

import { COSMOS_UNIT } from './format.js';

/** @typedef {import('@agoric/smart-wallet/src/offers').OfferSpec} OfferSpec */
/** @typedef {import('@agoric/smart-wallet/src/offers').OfferStatus} OfferStatus */
/** @typedef {import('@agoric/smart-wallet/src/smartWallet').BridgeAction} BridgeAction */

/**
 * @param {Record<string, import('../types').Brand>} brands
 * @param {({ wantMinted: number | undefined, giveMinted: number | undefined })} opts
 * @param {number} [fee=0]
 * @param {string} [anchor]
 * @returns {import('../types').Proposal}
 */
export const makePSMProposal = (brands, opts, fee = 0, anchor = 'AUSD') => {
  const giving = opts.giveMinted ? 'minted' : 'anchor';
  const brand =
    giving === 'anchor'
      ? { in: brands[anchor], out: brands.IST }
      : { in: brands.IST, out: brands[anchor] };
  const value =
    Number(giving === 'anchor' ? opts.wantMinted : opts.giveMinted) *
    Number(COSMOS_UNIT);
  const adjusted = {
    in: BigInt(Math.ceil(giving === 'anchor' ? value / (1 - fee) : value)),
    out: BigInt(Math.ceil(giving === 'minted' ? value * (1 - fee) : value)),
  };
  return {
    give: {
      In: { brand: brand.in, value: adjusted.in },
    },
    want: {
      Out: { brand: brand.out, value: adjusted.out },
    },
  };
};

/**
 * @param {import('../types').Instance} instance
 * @param {Record<string, import('../types').Brand>} brands
 * @param {{ offerId: number, feePct?: number } &
 *         ({ wantMinted: number | undefined, giveMinted: number | undefined })} opts
 * @returns {BridgeAction}
 */
export const makePSMSpendAction = (instance, brands, opts) => {
  const method = opts.wantMinted
    ? 'makeWantMintedInvitation'
    : 'makeGiveMintedInvitation'; // ref psm.js
  const proposal = makePSMProposal(
    brands,
    opts,
    opts.feePct ? opts.feePct / 100 : undefined,
  );

  console.warn('psm spend give', proposal.give);
  console.warn('psm spend want', proposal.want);

  // NB: not really a Proposal because the brands are not remotes
  // Instead they're copyRecord like  "{"boardId":"board0257","iface":"Alleged: IST brand"}" to pass through the boardId
  // fit(harden(proposal), ProposalShape);

  /** @type {OfferSpec} */
  const offer = {
    id: opts.offerId,
    invitationSpec: {
      source: 'contract',
      instance,
      publicInvitationMaker: method,
    },
    proposal,
  };

  /** @type {BridgeAction} */
  const spendAction = {
    method: 'executeOffer',
    offer,
  };
  return harden(spendAction);
};
