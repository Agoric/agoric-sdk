// @ts-check
import { assertAllDefined } from '@agoric/internal';

/**
 * @import {USDCProposalShapes} from './pool-share-math.js';
 * @import {AgoricNamesRemotes} from '@agoric/vats/tools/board-utils.js';
 * @import {OfferSpec} from '@agoric/smart-wallet/src/offers.js';
 * @import {OfferMaker} from '@agoric/smart-wallet/src/types.js';
 */

/**
 * @param {Pick<
 *   AgoricNamesRemotes,
 *   'brand'
 * >} agoricNames
 * @param {object} opts
 * @param {string} opts.offerId
 * @param {bigint} opts.fastLPAmount
 * @param {bigint} opts.usdcAmount
 * @returns {OfferSpec & {proposal: USDCProposalShapes['deposit']}}
 */
const makeDepositOffer = ({ brand }, { offerId, fastLPAmount, usdcAmount }) => {
  assertAllDefined({ offerId, fastLPAmount, usdcAmount });

  return {
    id: offerId,
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['fastUsdc'],
      callPipe: [['makeDepositInvitation']],
    },
    /** @type {USDCProposalShapes['deposit']} */
    // @ts-expect-error https://github.com/Agoric/agoric-sdk/issues/10491
    proposal: {
      give: {
        USDC: {
          brand: brand.USDC,
          value: usdcAmount,
        },
      },
      want: {
        PoolShare: {
          brand: brand.FastLP,
          value: fastLPAmount,
        },
      },
    },
  };
};

/**
 * @param {Pick<
 *   AgoricNamesRemotes,
 *   'brand'
 * >} agoricNames
 * @param {object} opts
 * @param {string} opts.offerId
 * @param {bigint} opts.fastLPAmount
 * @param {bigint} opts.usdcAmount
 * @returns {OfferSpec}
 */
const makeWithdrawOffer = (
  { brand },
  { offerId, fastLPAmount, usdcAmount },
) => ({
  id: offerId,
  invitationSpec: {
    source: 'agoricContract',
    instancePath: ['fastUsdc'],
    callPipe: [['makeWithdrawInvitation']],
  },
  proposal: {
    give: {
      PoolShare: {
        // @ts-expect-error https://github.com/Agoric/agoric-sdk/issues/10491
        brand: brand.FastLP,
        value: fastLPAmount,
      },
    },
    want: {
      USDC: {
        // @ts-expect-error https://github.com/Agoric/agoric-sdk/issues/10491
        brand: brand.USDC,
        value: usdcAmount,
      },
    },
  },
});

/**
 * @satisfies {Record<
 *   string,
 *   Record<string, OfferMaker>
 * >}
 */
export const Offers = {
  fastUsdc: {
    Deposit: makeDepositOffer,
    Withdraw: makeWithdrawOffer,
  },
};
