// @ts-check

import { Fail } from '@agoric/assert';

// XXX support other decimal places
const COSMOS_UNIT = 1_000_000n;

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
const makeVaultProposal = (brands, opts) => {
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
 * @returns {import('@agoric/smart-wallet/src/offers.js').OfferSpec}
 */
const makeOpenOffer = (brands, opts) => {
  const proposal = makeVaultProposal(brands, opts);

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
 * @returns {import('@agoric/smart-wallet/src/offers.js').OfferSpec}
 */
const makeAdjustOffer = (brands, opts, previousOffer) => {
  // NB: not really a Proposal because the brands are not remotes
  // Instead they're copyRecord like  "{"boardId":"board0257","iface":"Alleged: IST brand"}" to pass through the boardId
  // mustMatch(harden(proposal), ProposalShape);
  const proposal = makeVaultProposal(brands, opts);

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
 * @returns {import('@agoric/smart-wallet/src/offers.js').OfferSpec}
 */
const makeCloseOffer = (brands, opts, previousOffer) => {
  const proposal = makeVaultProposal(brands, opts);
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

  for (const [offerId, publicSubscribers] of offerToPublicSubscriberPaths) {
    if (publicSubscribers.vault?.endsWith(vaultId)) {
      return offerId;
    }
  }
  throw Fail`vault ${vaultId} not found`;
};

/**
 * @param {Record<string, Brand>} brands
 * @param {({ wantMinted: number | undefined, giveMinted: number | undefined })} opts
 * @param {number} [fee=0]
 * @param {string} [anchor]
 * @returns {Proposal} XXX not a real proposal, uses BoardRemote
 */
const makePsmProposal = (brands, opts, fee = 0, anchor = 'AUSD') => {
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
 * @param {Instance} instance
 * @param {Record<string, Brand>} brands
 * @param {{ offerId: number, feePct?: number } &
 *         ({ wantMinted: number | undefined, giveMinted: number | undefined })} opts
 * @returns {import('@agoric/smart-wallet/src/offers.js').OfferSpec}
 */
const makePsmSwapOffer = (instance, brands, opts) => {
  const method = opts.wantMinted
    ? 'makeWantMintedInvitation'
    : 'makeGiveMintedInvitation'; // ref psm.js
  const proposal = makePsmProposal(
    brands,
    opts,
    opts.feePct ? opts.feePct / 100 : undefined,
    // @ts-expect-error please update types. Not sure where pair goees.
    opts.pair[1],
  );

  console.warn('psm spend give', proposal.give);
  console.warn('psm spend want', proposal.want);

  // NB: not really a Proposal because the brands are not remotes
  // Instead they're copyRecord like  "{"boardId":"board0257","iface":"Alleged: IST brand"}" to pass through the boardId
  // mustMatch(harden(proposal), ProposalShape);

  return {
    id: opts.offerId,
    invitationSpec: {
      source: 'contract',
      instance,
      publicInvitationMaker: method,
    },
    proposal,
  };
};

export const Offers = {
  psm: {
    // lowercase because it's not an invitation name. Instead it's an abstraction over two invitation makers.
    swap: makePsmSwapOffer,
  },
  vaults: {
    OpenVault: makeOpenOffer,
    AdjustBalances: makeAdjustOffer,
    CloseVault: makeCloseOffer,
  },
};
