// @ts-check

import { Fail } from '@agoric/assert';
import { COSMOS_UNIT } from './format.js';

/** @typedef {import('@agoric/smart-wallet/src/offers').OfferSpec} OfferSpec */
/** @typedef {import('@agoric/smart-wallet/src/offers').OfferStatus} OfferStatus */
/** @typedef {import('@agoric/smart-wallet/src/smartWallet').BridgeAction} BridgeAction */

// TODO handle other collateral types
// NB: not really a Proposal because the brands are not remotes
// Instead they're copyRecord like  "{"boardId":"board0257","iface":"Alleged: IST brand"}" to pass through the boardId
// fit(harden(proposal), ProposalShape);
/**
 * Give/want, assuming IbcATOM collateral
 *
 * @param {Record<string, Brand>} brands
 * @param {({ giveCollateral?: number, wantCollateral?: number, giveMinted?: number, wantMinted?: number })} opts
 * @returns {Proposal}
 */
const makeProposal = (brands, opts) => {
  const proposal = { give: {}, want: {} };

  if (opts.giveCollateral) {
    proposal.give.Collateral = {
      brand: brands.IbcATOM,
      value: BigInt(opts.giveCollateral * Number(COSMOS_UNIT)),
    };
  }
  if (opts.giveMinted) {
    proposal.give.Minted = {
      brand: brands.IST,
      value: BigInt(opts.giveMinted * Number(COSMOS_UNIT)),
    };
  }

  if (opts.wantCollateral) {
    proposal.want.Collateral = {
      brand: brands.IbcATOM,
      value: BigInt(opts.wantCollateral * Number(COSMOS_UNIT)),
    };
  }
  if (opts.wantMinted) {
    proposal.want.Minted = {
      brand: brands.IST,
      value: BigInt(opts.wantMinted * Number(COSMOS_UNIT)),
    };
  }

  return harden(proposal);
};

/**
 * @param {Instance} instance
 * @param {Record<string, Brand>} brands
 * @param {{ offerId: string, wantMinted: number, giveCollateral: number }} opts
 * @returns {BridgeAction}
 */
export const makeOpenSpendAction = (instance, brands, opts) => {
  const proposal = makeProposal(brands, opts);

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

/**
 * @param {Record<string, Brand>} brands
 * @param {{ offerId: string, giveMinted: number }} opts
 * @param {string} previousOffer
 * @returns {BridgeAction}
 */
export const makeCloseSpendAction = (brands, opts, previousOffer) => {
  const proposal = makeProposal(brands, opts);
  console.warn('vaults close give', proposal.give);

  /** @type {OfferSpec} */
  const offer = {
    id: opts.offerId,
    invitationSpec: {
      source: 'continuing',
      previousOffer,
      invitationMakerName: 'CloseVault',
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

/**
 * @param {string} vaultId
 * @param {Promise<import('@agoric/smart-wallet/src/smartWallet').CurrentWalletRecord>} currentP
 * @returns {Promise<string>} offer id in which the vault was made
 */
export const lookupOfferIdForVault = async (vaultId, currentP) => {
  const { offerToPublicSubscriberPaths } = await currentP;

  for (const [offerId, publicSubscribers] of Object.entries(
    offerToPublicSubscriberPaths,
  )) {
    if (publicSubscribers.vault?.endsWith(vaultId)) {
      return offerId;
    }
  }
  throw Fail`vault ${vaultId} not found`;
};
