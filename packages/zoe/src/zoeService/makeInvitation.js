// @ts-check
import { assert, details as X } from '@agoric/assert';
import { AmountMath, makeIssuerKit, AssetKind } from '@agoric/ertp';

export const createInvitationKit = () => {
  const invitationKit = makeIssuerKit('Zoe Invitation', AssetKind.SET);

  /**
   * @param {Instance} instance
   * @param {Installation} installation
   * @param {(relativeFee: FeeChoice) => { fee: Amount}} translateFee
   * @param {(relativeExpiration: ExpirationChoice) => { expiration: Timestamp}} translateExpiration
   * @returns {ZoeInstanceAdminMakeInvitation}
   */
  const setupMakeInvitation = (
    instance,
    installation,
    translateFee,
    translateExpiration,
  ) => {
    assert.typeof(instance, 'object');
    assert.typeof(installation, 'object');

    /** @type {ZoeInstanceAdminMakeInvitation} */
    const makeInvitation = (invitationHandle, config) => {
      assert.typeof(invitationHandle, 'object');
      assert.typeof(
        config.description,
        'string',
        X`The description ${config.description} must be a string`,
      );
      // If the contract-provided customProperties include the
      // required properties 'description', 'handle', 'instance' and
      // 'installation', the customProperties values will be
      // overwritten with the values in the required properties. For
      // example, the value for `instance` will always be the actual
      // instance for the contract, even if customProperties includes
      // a property called `instance`.

      // `config` can also include the properties 'expiration' and
      // 'fee'. If these are not included, no fee is quoted and there
      // is no expiration for the invitation.

      const expiresObj = translateExpiration(config.expiration);
      const feeObj = translateFee(config.fee);

      const invitationAmount = AmountMath.make(invitationKit.brand, [
        {
          ...config.customProperties,
          ...expiresObj,
          ...feeObj,
          description: config.description,
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
