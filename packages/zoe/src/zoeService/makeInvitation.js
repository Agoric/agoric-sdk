// @ts-check
import { assert, details as X } from '@agoric/assert';
import { AmountMath, makeIssuerKit, AssetKind } from '@agoric/ertp';

export const createInvitationKit = () => {
  const invitationKit = makeIssuerKit('Zoe Invitation', AssetKind.SET);

  /**
   * @param {Instance} instance
   * @param {Installation} installation
   * @returns {ZoeInstanceAdminMakeInvitation}
   */
  const setupMakeInvitation = (instance, installation) => {
    assert.typeof(instance, 'object');
    assert.typeof(installation, 'object');

    /** @type {ZoeInstanceAdminMakeInvitation} */
    const makeInvitation = (
      invitationHandle,
      description,
      customProperties,
    ) => {
      assert.typeof(invitationHandle, 'object');
      assert.typeof(
        description,
        'string',
        X`The description ${description} must be a string`,
      );
      const invitationAmount = AmountMath.make(invitationKit.brand, [
        {
          ...customProperties,
          description,
          handle: invitationHandle,
          instance,
          installation,
        },
      ]);
      return invitationKit.mint.mintPayment(invitationAmount);
    };
    return makeInvitation;
  };

  return harden({
    setupMakeInvitation,
    invitationIssuer: invitationKit.issuer,
  });
};
