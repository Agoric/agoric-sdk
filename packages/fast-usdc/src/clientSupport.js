// @ts-check
import { AmountMath } from '@agoric/ertp';
import { assertAllDefined } from '@agoric/internal';

// Reusable amount scaling similar to inter-protocol's approach
const COSMOS_UNIT = 1_000_000n;
const scaleDecimals = num => BigInt(num * Number(COSMOS_UNIT));

/**
 * @param {Pick<
 *   import('@agoric/vats/tools/board-utils.js').AgoricNamesRemotes,
 *   'brand'
 * >} agoricNames
 * @param {Instance} instance
 * @param {object} opts
 * @param {string} opts.offerId
 * @param {number} opts.amount
 * @returns {import('@agoric/smart-wallet/src/offers.js').OfferSpec}
 */
const makeDepositOffer = ({ brand }, instance, { offerId, amount }) => {
  assertAllDefined({ offerId, amount });
  
  return {
    id: offerId,
    invitationSpec: {
      source: 'contract',
      instance,
      publicInvitationMaker: 'makeDepositInvitation',
    },
    proposal: {
      give: {
        Deposit: {
          brand: brand.USDC,
          value: scaleDecimals(amount)
        }
      }
    }
  };
};

/**
 * @param {Pick<
 *   import('@agoric/vats/tools/board-utils.js').AgoricNamesRemotes,
 *   'brand'
 * >} agoricNames
 * @param {Instance} instance
 * @param {object} opts
 * @param {string} opts.offerId
 * @param {number} opts.amount
 * @returns {import('@agoric/smart-wallet/src/offers.js').OfferSpec}
 */
const makeWithdrawOffer = ({ brand }, instance, { offerId, amount }) => ({
  id: offerId,
  invitationSpec: {
    source: 'contract',
    instance,
    publicInvitationMaker: 'makeWithdrawInvitation',
  },
  proposal: {
    want: {
      Withdrawal: {
        brand: brand.USDC,
        value: scaleDecimals(amount)
      }
    }
  }
});

/**
 * @param {Instance} instance
 * @param {object} opts
 * @param {string} opts.offerId
 * @param {string} opts.operatorId
 * @returns {import('@agoric/smart-wallet/src/offers.js').OfferSpec}
 */
const makeOperatorOffer = (instance, { offerId, operatorId }) => ({
  id: offerId,
  invitationSpec: {
    source: 'contract',
    instance,
    callPipe: [['makeOperatorInvitation', [operatorId]]]
  },
  proposal: {}
});

/**
 * @param {Instance} instance
 * @param {object} opts
 * @param {string} opts.offerId
 * @returns {import('@agoric/smart-wallet/src/offers.js').OfferSpec}
 */
const makeWithdrawFeesOffer = (instance, { offerId }) => ({
  id: offerId,
  invitationSpec: {
    source: 'contract',
    instance,
    publicInvitationMaker: 'makeWithdrawFeesInvitation',
  },
  proposal: {}
});

/** @satisfies {Record<string, import('@agoric/smart-wallet/src/types.js').OfferMaker>} */
export const Offers = {
  fastUsdc: {
    Deposit: makeDepositOffer,
    Withdraw: makeWithdrawOffer,
    BecomeOperator: makeOperatorOffer,
    WithdrawFees: makeWithdrawFeesOffer,
  }
};
