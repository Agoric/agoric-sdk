// @ts-check

import { COSMOS_UNIT } from './format.js';

/** @typedef {import('@agoric/smart-wallet/src/offers').OfferSpec} OfferSpec */
/** @typedef {import('@agoric/smart-wallet/src/offers').OfferStatus} OfferStatus */
/** @typedef {import('@agoric/smart-wallet/src/smartWallet').BridgeAction} BridgeAction */

/**
 * Open a vault
 *
 * @param {Record<string, Brand>} brands
 * @param {({ wantMinted: number, giveCollateral: number })} opts
 * @returns {Proposal}
 */
const makeOpenProposal = (brands, opts) => {
  return {
    give: {
      Collateral: {
        brand: brands.IbcATOM,
        value: BigInt(opts.giveCollateral * Number(COSMOS_UNIT)),
      },
    },
    want: {
      Minted: {
        brand: brands.IST,
        value: BigInt(opts.wantMinted * Number(COSMOS_UNIT)),
      },
    },
  };
};

/**
 * @param {Instance} instance
 * @param {Record<string, Brand>} brands
 * @param {{ offerId: number, wantMinted: number, giveCollateral: number }} opts
 * @returns {BridgeAction}
 */
export const makeOpenSpendAction = (instance, brands, opts) => {
  const proposal = makeOpenProposal(brands, opts);

  console.warn('vaults open give', proposal.give);
  console.warn('vaults open want', proposal.want);

  // NB: not really a Proposal because the brands are not remotes
  // Instead they're copyRecord like  "{"boardId":"board0257","iface":"Alleged: IST brand"}" to pass through the boardId
  // fit(harden(proposal), ProposalShape);

  /** @type {OfferSpec} */
  const offer = {
    id: opts.offerId,
    invitationSpec: {
      source: 'contract',
      instance,
      publicInvitationMaker: 'makeVaultInvitation',
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
