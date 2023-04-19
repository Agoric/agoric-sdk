import { assert, details as X } from '@agoric/assert';
import { E } from '@endo/eventual-send';
import {
  getTheSemifungibleElement,
  makeSemifungibleAmount,
} from '@agoric/ertp';

/**
 * @param {Amount<'copyBag'>} invitationAmount
 * @param {Brand} [invitationBrand]
 * If `invitationBrand` is provided, use it for further validation. Otherwise
 * proceed assuming that `invitationAmount.brand` is the correct
 * `invitationBrand`.
 * @returns {InvitationDetails}
 */
export const getInvitationAmountDetails = (
  invitationAmount,
  invitationBrand = invitationAmount.brand,
) => getTheSemifungibleElement(invitationAmount, invitationBrand);
harden(getInvitationAmountDetails);

/**
 * @type {(brand: Brand, ...elements: InvitationDetails[]) => Amount}
 */
export const makeInvitationAmount = (invitationBrand, ...details) =>
  makeSemifungibleAmount(invitationBrand, ...details);

/** @param {Issuer<'copyBag'>} invitationIssuer */
export const makeInvitationQueryFns = invitationIssuer => {
  /** @type {GetInvitationDetails} */
  const getInvitationDetails = async invitationP => {
    const onRejected = reason => {
      const err = assert.error(
        X`A Zoe invitation is required, not ${invitationP}`,
      );
      assert.note(err, X`Due to ${reason}`);
      throw err;
    };
    const amtP = E(invitationIssuer).getAmountOf(invitationP).catch(onRejected);
    return E.when(amtP, amt => getInvitationAmountDetails(amt));
  };

  /** @type {GetInstance} */
  const getInstance = invitationP =>
    E.get(getInvitationDetails(invitationP)).instance;

  /** @type {GetInstallation} */
  const getInstallation = invitationP =>
    E.get(getInvitationDetails(invitationP)).installation;

  return harden({
    getInstance,
    getInstallation,
    getInvitationDetails,
  });
};
