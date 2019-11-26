import harden from '@agoric/harden';

export const rejectOffer = (
  zoe,
  offerHandle,
  message = `The offer was invalid. Please check your refund.`,
) => {
  zoe.complete(harden([offerHandle]));
  return Promise.reject(new Error(`${message}`));
};

export const defaultAcceptanceMsg = `The offer has been accepted. Once the contract has been completed, please check your payout`;
