import { assert, details } from '@agoric/assert';
import makeWeakStore from '@agoric/weak-store';
import '../../exported';

const { entries } = Object;

/**
 * @typedef {Object} SubContractResult
 *
 * Like a `StartInstanceResult` but with an `offerService` rather than an
 * `instance` facet.
 *
 * @property {any} creatorFacet
 * @property {ERef<Invitation>=} creatorInvitation
 * @property {any} publicFacet
 * @property {OfferService} offerService
 */

/**
 * @typedef {Object} OfferService
 *
 * Like the `ZoeService`, has a method for making an offer. But we call it
 * `offerNow` instead of `offer` to emphasize its synchronous nature.
 *
 * @property {OfferNow} offerNow
 */

/**
 * @callback OfferNow
 *
 * Like `Offer` but takes a `paymentStaging` instead of a
 * `paymentKeywordRecord`, does the reallocation and returns a new seatKit
 * immediately, rather than a promise for a userSeat.
 *
 * @param {Invitation} invitation
 * @param {Proposal=} proposal
 * @param {SeatStaging} paymentStaging
 * @returns {ZcfSeatKit} seatKit
 */

/**
 * `subContract` is like `ZoeService.startInstance`, but instead of an
 * installation, `subContract` takes a `startFn` and a `descriptionPrefix`.
 * The `startFn` is exactly the form of `start` function exported by a contract
 * module.
 *
 * `subContract` calls `startFn` with `subZCF`, a virtualization of the `zcf`
 * passed in. `subZCF` is not intended  a perfect virtualization. It is not
 * fully compatible with the `startFn` of any possible correct contract. Rather,
 * `subContract` is written to support the (hopefully) typical simple contracts
 * that work either standalone or as subContract components. To write such
 * contracts, be aware of the differences documented below.
 *
 * Some of the differences are opportunities --- enabling the subContract
 * component to collaborate with its parent, or with other local subContract
 * components, in ways that separate contracts cannot interact with each other.
 * For example, the virtualization mechanism is unaware of which seat came from
 * which component. They are just all seats to the underlying zcf they all
 * share. Thus, any component can do an atomic reallocate across any seats it
 * has access to. But for any seat it does not create it only has access if it
 * is explicitly granted access. The zcf API does not itself leak access to
 * seats, so the subZCF API naturally does not as well. This difference in
 * `reallocate` behavior is pure opportunity without virtualization flaw.
 *
 * @param {ContractFacet} zcf
 * @param {ContractStartFn} startFn
 * @param {string} prefix
 * @param {IssuerKeywordRecord=} issuerKeywordRecord is merged into the
 *   parent's contract-level keyword namespace with `prefix.` prepended to
 *   each keyword. The full parent keyword namespace is exposed by subZCF to the
 *   subContract. The prefixing is only to avoid accidental collisions, but
 *   this should be fine for most contracts.
 * @param {Object=} customTerms
 * @returns {SubContractResult} immediately, rather than a
 * `Promise<StartInstanceResult>`.
 */
const subContract = async (
  zcf,
  startFn,
  prefix,
  issuerKeywordRecord = undefined,
  customTerms = undefined,
) => {
  const baseKeyword = keyword => `${prefix}.${keyword}`;
  await Promise.all(
    entries(issuerKeywordRecord).map(([keyword, issuerP]) =>
      zcf.saveIssuer(issuerP, baseKeyword(keyword)),
    ),
  );

  /**
   * @callback Offerer
   *
   * Like `Offer` without the initial invitation, and with
   * a `paymentStaging` instead of a `paymentKeywordRecord`.
   * Like `MakeSeatKit` without the initial `offerHandler`.
   *
   * @param {Proposal=} proposal
   * @param {SeatStaging} paymentStaging
   * @returns {ZcfSeatKit} seatKit
   */

  /** @type {WeakMap<Invitation,Offerer>} */
  const offerers = makeWeakStore('invitation');

  /** @type {OfferService} */
  const offerService = harden({
    offerNow: (invitation, proposal, paymentStaging) => {
      if (offerers.has(invitation)) {
        return offerers.get(invitation)(proposal, paymentStaging);
      }
      throw assert.fail(details`offer already made`);
    },
  });

  /** @type {MakeInvitation} */
  const makeInvitation = (offerHandler, description, customProperties) => {
    let currentOfferHandler = seat => {
      // eslint-disable-next-line no-use-before-define
      offerers.delete(invitation);
      currentOfferHandler = _seat => {
        assert.fail(details`offer already made`);
      };
      return offerHandler(seat);
    };
    const offerHandlerWrapper = seat => currentOfferHandler(seat);

    const invitation = zcf.makeInvitation(
      offerHandlerWrapper,
      `${prefix}.${description}`,
      customProperties,
    );
    /** @type {Offerer} */
    const offerer = (proposal, paymentStaging) =>
      zcf.makeSeatKit(offerHandlerWrapper, proposal, paymentStaging);
    offerers.init(invitation, offerer);
    return invitation;
  };

  /** @type {ContractFacet} */
  const subZCF = harden({
    /**
     * Works on seatStagings independent of which component made them.
     */
    reallocate: zcf.reallocate,
    /**
     * The prefix is visibly prepended onto the keyword used.
     */
    saveIssuer: (issuerP, keyword) =>
      zcf.saveIssuer(issuerP, baseKeyword(keyword)),
    /**
     * Returns an invitation whose `instance` and `installation` visibly
     * describes only the contract as a whole. However, the actual invitation's
     * `description` will be this description prepended with `prefix`, which
     * should be adequate disambiguation for most uses.
     *
     * For seats that are only intended for purposeful local use only among
     * co-located components, `makeSeatKit` is likely to be a better choice than
     * `makeInvitation`. However, regular contract code used as a subContract
     * component will still call `makeInvitation` and return an invitation. To
     * accommodate such code, `subContract` returns an `offerService` instead of
     * an `instance`, where the offerService has an `offerNow` method for
     * immediately making an offer. This path is just a fancy wrapper around
     * `makeSeatKit`.
     */
    makeInvitation,
    /**
     * Does a lot less than an actual `shutdown`. Only denies any further
     * access to the parent `zcf`. But the state of the parent `zcf` is
     * unaffected.
     */
    shutdown: () => {
      zcf = null;
    },
    /**
     * The prefix is visibly prepended onto the keyword used.
     */
    assertUniqueKeyword: keyword =>
      zcf.assertUniqueKeyword(baseKeyword(keyword)),
    /** same as parent */
    getZoeService: zcf.getZoeService,
    /** same as parent */
    getInvitationIssuer: zcf.getInvitationIssuer,
    // Abstraction leaks the merged contract-level keyword namespace
    getTerms: () => {
      const { issuers, brands, maths } = zcf.getTerms();
      return harden({
        ...customTerms,
        issuers,
        brands,
        maths,
      });
    },
    /**
     * Works across entire contract, so it is another opportunity without
     * virtualization flaw.
     */
    getBrandForIssuer: zcf.getBrandForIssuer,
    /**
     * Works across entire contract, so it is another opportunity without
     * virtualization flaw.
     */
    getIssuerForBrand: zcf.getIssuerForBrand,
    /**
     * Works across entire contract, so it is another opportunity without
     * virtualization flaw.
     */
    getAmountMath: zcf.getAmountMath,

    /**
     * The prefix is visibly prepended onto the keyword used. Otherwise same
     * as parent. Can be used on any seat within this contract.
     */
    makeZCFMint: (keyword, amountMathKind) =>
      zcf.makeZCFMint(baseKeyword(keyword), amountMathKind),
    /** same as parent */
    makeEmptySeatKit: zcf.makeEmptySeatKit,
    /** same as parent */
    makeSeatKit: zcf.makeSeatKit,
    /** same as parent */
    setTestJig: zcf.setTestJig,
  });
  const { creatorFacet, publicFacet, creatorInvitation } = startFn(subZCF);
  return harden({
    creatorFacet,
    publicFacet,
    creatorInvitation,
    offerService,
  });
};
harden(subContract);
export { subContract };
