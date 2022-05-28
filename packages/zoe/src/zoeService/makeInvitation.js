// @ts-check
import { assert, details as X } from '@agoric/assert';
import { AmountMath, makeIssuerKit, AssetKind } from '@agoric/ertp';
import { InvitationElementShape } from '../typeGuards.js';

/**
 * @param {ShutdownWithFailure | undefined} shutdownZoeVat
 */
export const createInvitationKit = (shutdownZoeVat = undefined) => {
  const invitationKit = makeIssuerKit(
    'Zoe Invitation',
    AssetKind.SET,
    undefined,
    shutdownZoeVat,
    { elementSchema: InvitationElementShape },
  );

  /**
   * @param {Instance} instance
   * @param {Installation} installation
   * @param {MapStore<InvitationHandle, Pattern>} proposalSchemas
   * @returns {ZoeInstanceAdminMakeInvitation}
   */
  const setupMakeInvitation = (instance, installation, proposalSchemas) => {
    assert.typeof(instance, 'object');
    assert.typeof(installation, 'object');

    /** @type {ZoeInstanceAdminMakeInvitation} */
    const makeInvitation = async (
      invitationHandle,
      description,
      customProperties = undefined,
      proposalSchema = undefined,
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
      if (proposalSchema !== undefined) {
        proposalSchemas.init(invitationHandle, proposalSchema);
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
