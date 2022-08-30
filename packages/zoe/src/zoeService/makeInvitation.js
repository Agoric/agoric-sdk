// @ts-check
import { assert, details as X } from '@agoric/assert';
import { AmountMath, makeDurableIssuerKit, AssetKind } from '@agoric/ertp';
import { InvitationElementShape } from '../typeGuards.js';

/**
 * @param {import('@agoric/vat-data').Baggage} baggage
 * @param {ShutdownWithFailure | undefined} shutdownZoeVat
 */
export const vivifyInvitationKit = (baggage, shutdownZoeVat = undefined) => {
  const invitationKit = makeDurableIssuerKit(
    baggage,
    'Zoe Invitation',
    AssetKind.SET,
    undefined,
    shutdownZoeVat,
    { elementShape: InvitationElementShape },
  );

  /**
   * @param {Instance} instance
   * @param {Installation} installation
   * @param {WeakMapStore<InvitationHandle, Pattern>} proposalShapes
   * @returns {ZoeInstanceAdminMakeInvitation}
   */
  const setupMakeInvitation = (instance, installation, proposalShapes) => {
    assert.typeof(instance, 'object');
    assert.typeof(installation, 'object');

    /** @type {ZoeInstanceAdminMakeInvitation} */
    const makeInvitation = async (
      invitationHandle,
      description,
      customProperties = undefined,
      proposalShape = undefined,
    ) => {
      assert.typeof(invitationHandle, 'object');
      assert.typeof(
        description,
        'string',
        X`The description ${description} must be a string`,
      );

      // If the contract-provided customProperties include the
      // properties 'description', 'handle', 'instance',
      // 'installation', their corresponding
      // values will be overwritten with the actual values. For
      // example, the value for `instance` will always be the actual
      // instance for the contract, even if customProperties includes
      // a property called `instance`.
      const invitationAmount = AmountMath.make(
        invitationKit.brand,
        harden([
          {
            ...customProperties,
            description,
            handle: invitationHandle,
            instance,
            installation,
          },
        ]),
      );
      if (proposalShape !== undefined) {
        proposalShapes.init(invitationHandle, proposalShape);
      }
      return invitationKit.mint.mintPayment(invitationAmount);
    };
    return makeInvitation;
  };

  return harden({
    setupMakeInvitation,
    invitationIssuer: invitationKit.issuer,
  });
};
