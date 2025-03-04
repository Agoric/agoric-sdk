// @ts-check
import { assertAllDefined } from '@agoric/internal';

/**
 * @import {USDCProposalShapes} from '@agoric/fast-usdc-worker/src/pool-share-math.js';
 */

/**
 * @param {Pick<
 *   import('@agoric/vats/tools/board-utils.js').AgoricNamesRemotes,
 *   'brand'
 * >} agoricNames
 * @param {object} opts
 * @param {string} opts.offerId
 * @param {bigint} opts.fastLPAmount
 * @param {bigint} opts.usdcAmount
 * @returns {import('@agoric/smart-wallet/src/offers.js').OfferSpec & {proposal: USDCProposalShapes['deposit']}}
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
 *   import('@agoric/vats/tools/board-utils.js').AgoricNamesRemotes,
 *   'brand'
 * >} agoricNames
 * @param {object} opts
 * @param {string} opts.offerId
 * @param {bigint} opts.fastLPAmount
 * @param {bigint} opts.usdcAmount
 * @returns {import('@agoric/smart-wallet/src/offers.js').OfferSpec}
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
 *   Record<string, import('@agoric/smart-wallet/src/types.js').OfferMaker>
 * >}
 */
export const Offers = {
  fastUsdc: {
    Deposit: makeDepositOffer,
    Withdraw: makeWithdrawOffer,
  },
};
