import {
  M,
  getCopyMapEntries,
  getInterfaceGuardPayload,
  mustMatch,
} from '@endo/patterns';
import { prepareExoClass } from '@agoric/vat-data';
import { OfferHandlerI } from '../typeGuards.js';

/** @typedef {import('@agoric/vat-data').Baggage} Baggage */

const { Fail, quote: q } = assert;
const { fromEntries } = Object;

const TransferProposalShape = M.splitRecord({
  give: {},
  want: {},
  exit: {
    onDemand: null,
  },
});

export const makePrepareOwnableClass = zcf => {
  /**
   * @template {object} CustomDetails
   * @template {object} State
   * @template {Record<PropertyKey, CallableFunction>} T methods
   * @param {Baggage} baggage
   * @param {string} kindName
   * @param {import('@endo/patterns').InterfaceGuard} interfaceGuard
   *   Does not itself provide guards for
   *   - `getCustomDetails`
   *   - `makeTranferInvitation`.
   *
   *   Rather, those guards are automatically added
   * @param {(customDetails: CustomDetails) => State} init
   *   A single-arg function of a `details` param that must
   *   match `detailsShape`
   * @param {T & ThisType<{
   *   self: T,
   *   state: State,
   * }>} methods
   *   Does not itself provide the
   *   - `makeTransferInvitation` method.
   *
   *   Rather, that method is automatically added.
   *   The `methods` parameter must contain a method for
   *   - `getCustomDetails`
   *   whose return result must match `detailsShape`,
   *   will be in the `customDetails` of the invitation, and
   *   will be used on the next call to the `init` function.
   * @param {import('@agoric/vat-data').DefineKindOptions<{
   *   self: T,
   *   state: State
   * }> & {
   *   detailsShape?: any,
   * }} [options]
   *   If `detailsShape` is provided, it will be used to guard the returns of
   *   `getCustomDetails`.
   *   A `receiveRevoker` is automatically added.
   * @returns {(customDetails: CustomDetails) => (T & import('@endo/eventual-send').RemotableBrand<{}, T>)}
   */
  const prepareOwnableClass = (
    baggage,
    kindName,
    interfaceGuard,
    init,
    methods,
    options = {},
  ) => {
    // ////////////////////////// ownableOptions ///////////////////////////////

    let revokeOwnableObject;

    const {
      detailsShape = M.any(),
      receiveRevoker = undefined,
      ...restOptions
    } = options;
    receiveRevoker === undefined ||
      Fail`Cannot override the automatically added receiveRevoker option in ${q(
        kindName,
      )}`;

    /**
     * Like the provided `options` but without the provided `detailsShape`
     * and with an automatically added `receiveRevoker`.
     */
    const ownableOptions = {
      ...restOptions,
      receiveRevoker(revoke) {
        revokeOwnableObject = revoke;
      },
    };

    // ///////////////////// ownableInterfaceGuard /////////////////////////////

    // TODO what about interfaceGuardPayload options?
    const {
      interfaceName,
      methodGuards: {
        getCustomDetails = undefined,
        makeTransferInvitation = undefined,
        ...methodGuards
      },
      symbolMethodGuards = undefined,
    } = getInterfaceGuardPayload(interfaceGuard);

    getCustomDetails === undefined ||
      Fail`Cannot override the automatically added getCustomDetails guard in ${q(
        kindName,
      )}`;
    makeTransferInvitation === undefined ||
      Fail`Cannot override the automatically added makeTransferInvitation guard in ${q(
        interfaceName,
      )}`;

    let ownableInterfaceMethodGuards;
    if (symbolMethodGuards === undefined) {
      ownableInterfaceMethodGuards = harden({
        ...methodGuards,
        getCustomDetails: M.call().returns(detailsShape),
        makeTransferInvitation: M.call().returns(M.promise()),
      });
    } else {
      ownableInterfaceMethodGuards = harden({
        ...methodGuards,
        ...fromEntries(getCopyMapEntries(symbolMethodGuards)),
        getCustomDetails: M.call().returns(detailsShape),
        makeTransferInvitation: M.call().returns(M.promise()),
      });
    }

    /**
     * Like the provided `interfaceGuard` both with automatically added
     * method guards for `getCustomDetails` and
     * `makeTransferInvitation`.
     */
    const ownableInterfaceGuard = M.interface(
      `Ownable_${interfaceName}`,
      ownableInterfaceMethodGuards,
    );

    // ////////////////////////// ownableInit //////////////////////////////////

    /**
     * Like the provided `init` function, but only passes through one argument
     * after verifying that it mustMatch the `detailsShape`
     *
     * @param {Passable} customDetails
     */
    const ownableInit = customDetails => {
      mustMatch(customDetails, detailsShape, `makeOwnable_${q(kindName)}`);
      return init(customDetails);
    };

    // /////////////////////// ownableMethods //////////////////////////////////

    const { makeTransferInvitation: mtiMethod = undefined, ...restMethods } =
      methods;

    mtiMethod === undefined ||
      Fail`Cannot override the automatically added makeTransferInvitation method in ${q(
        kindName,
      )}`;

    const ownableMethods = {
      ...restMethods,
      makeTransferInvitation() {
        const { self } = this;
        // @ts-expect-error FIXME self needs typing
        const customDetails = self.getCustomDetails();
        // eslint-disable-next-line no-use-before-define
        const transferHandler = makeTransferHandler(customDetails);

        const invitation = zcf.makeInvitation(
          transferHandler,
          'transfer',
          customDetails,
          TransferProposalShape,
        );
        revokeOwnableObject(self);
        return invitation;
      },
    };

    // /////////////////////////////////////////////////////////////////////////

    const makeOwnableObject = prepareExoClass(
      baggage,
      // Might be upgrading from a previous non-ownable class of the same
      // kindName.
      kindName,
      ownableInterfaceGuard,
      ownableInit,
      // @ts-expect-error Method typing
      ownableMethods,
      ownableOptions,
    );

    let revokeTransferHandler;

    const makeTransferHandler = prepareExoClass(
      baggage,
      'TransferHandler',
      OfferHandlerI,
      customDetails => ({
        customDetails,
      }),
      {
        handle(seat) {
          const {
            self,
            state: { customDetails },
          } = this;
          seat.exit();
          revokeTransferHandler(self);
          return makeOwnableObject(customDetails);
        },
      },
      {
        receiveRevoker(revoke) {
          revokeTransferHandler = revoke;
        },
      },
    );

    return makeOwnableObject;
  };
  return harden(prepareOwnableClass);
};
harden(makePrepareOwnableClass);
