// @ts-check

import { Fail } from '@agoric/assert';
import { COSMOS_UNIT } from './format.js';

/** @typedef {import('@agoric/smart-wallet/src/offers').OfferSpec} OfferSpec */
/** @typedef {import('@agoric/smart-wallet/src/offers').OfferStatus} OfferStatus */
/** @typedef {import('@agoric/smart-wallet/src/smartWallet').BridgeAction} BridgeAction */

// NB: not really a Proposal because the brands are not remotes
// Instead they're copyRecord like  "{"boardId":"board0257","iface":"Alleged: IST brand"}" to pass through the boardId
// mustMatch(harden(proposal), ProposalShape);
/**
 * Give/want
 *
 * @param {Record<string, Brand>} brands
 * @param {{ giveMinted?: number, wantMinted?: number } | { collateralBrandKey: string, giveCollateral?: number, wantCollateral?: number }} opts
 * @returns {Proposal}
 */
const makeProposal = (brands, opts) => {
  const proposal = { give: {}, want: {} };

  if ('giveCollateral' in opts && opts.giveCollateral) {
    const { collateralBrandKey } = opts;
    proposal.give.Collateral = {
      brand: brands[collateralBrandKey],
      value: BigInt(opts.giveCollateral * Number(COSMOS_UNIT)),
    };
  }
  if ('giveMinted' in opts && opts.giveMinted) {
    proposal.give.Minted = {
      brand: brands.IST,
      value: BigInt(opts.giveMinted * Number(COSMOS_UNIT)),
    };
  }

  if ('wantCollateral' in opts && opts.wantCollateral) {
    const { collateralBrandKey } = opts;
    proposal.want.Collateral = {
      brand: brands[collateralBrandKey],
      value: BigInt(opts.wantCollateral * Number(COSMOS_UNIT)),
    };
  }
  if ('wantMinted' in opts && opts.wantMinted) {
    proposal.want.Minted = {
      brand: brands.IST,
      value: BigInt(opts.wantMinted * Number(COSMOS_UNIT)),
    };
  }

  return harden(proposal);
};

// TODO factor out BridgeAction so that these functions just return OfferSpec
// That they are composed into a BridgeAction is the concern of the caller.
// Then these can be used in tests as arguments to `executeOffer()` without a bridge.

/**
 * @param {Record<string, Brand>} brands
 * @param {{ offerId: string, wantMinted: number, giveCollateral: number, collateralBrandKey: string }} opts
 * @returns {OfferSpec}
 */
export const makeOpenOffer = (brands, opts) => {
  const proposal = makeProposal(brands, opts);

  console.warn('vaults open give', proposal.give);
  console.warn('vaults open want', proposal.want);

  // NB: not really a Proposal because the brands are not remotes
  // Instead they're copyRecord like  "{"boardId":"board0257","iface":"Alleged: IST brand"}" to pass through the boardId
  // mustMatch(harden(proposal), ProposalShape);

  const collateralBrand = brands[opts.collateralBrandKey];

  return {
    id: opts.offerId,
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['VaultFactory'],
      callPipe: [
        ['getCollateralManager', [collateralBrand]],
        ['makeVaultInvitation'],
      ],
    },
    proposal,
  };
};

/**
 * @param {Record<string, Brand>} brands
 * @param {{ offerId: string, collateralBrandKey?: string, giveCollateral?: number, wantCollateral?: number, giveMinted?: number, wantMinted?: number }} opts
 * @param {string} previousOffer
 * @returns {OfferSpec}
 */
export const makeAdjustOffer = (brands, opts, previousOffer) => {
  // NB: not really a Proposal because the brands are not remotes
  // Instead they're copyRecord like  "{"boardId":"board0257","iface":"Alleged: IST brand"}" to pass through the boardId
  // mustMatch(harden(proposal), ProposalShape);
  const proposal = makeProposal(brands, opts);

  return {
    id: opts.offerId,
    invitationSpec: {
      source: 'continuing',
      previousOffer,
      invitationMakerName: 'AdjustBalances',
    },
    proposal,
  };
};

/**
 * @param {Record<string, Brand>} brands
 * @param {{ offerId: string, collateralBrandKey?: string, giveMinted: number }} opts
 * @param {string} previousOffer
 * @returns {OfferSpec}
 */
export const makeCloseOffer = (brands, opts, previousOffer) => {
  const proposal = makeProposal(brands, opts);
  console.warn('vaults close give', proposal.give);

  return {
    id: opts.offerId,
    invitationSpec: {
      source: 'continuing',
      previousOffer,
      invitationMakerName: 'CloseVault',
    },
    proposal,
  };
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
