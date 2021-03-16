// @ts-check
import '../../../exported';

import { makeIssuerKit, amountMath } from '@agoric/ertp';
import { Far } from '@agoric/marshal';

import { depositToSeat } from '../../../src/contractSupport';

/**
 * This is a a broken contact to test that
 * errors in offerHandlers are appropriately handled
 *
 * @type {ContractStartFn}
 */
const start = zcf => {
  const throwInOfferHandler = _seat => {
    throw Error('error thrown in offerHandler in contract');
  };

  const throwInDepositToSeat = async seat => {
    const issuerKit = makeIssuerKit('token');
    const tokens10 = amountMath.make(10n, issuerKit.brand);
    const payment = issuerKit.mint.mintPayment(tokens10);
    const amounts = harden({ Token: tokens10 });
    const payments = harden({ Tokens: payment });
    await depositToSeat(zcf, seat, amounts, payments);
    return 'Should not get here';
  };
  const makeThrowInOfferHandlerInvitation = () =>
    zcf.makeInvitation(throwInOfferHandler, 'throwInOfferHandler');

  const makeThrowInDepositToSeatInvitation = () =>
    zcf.makeInvitation(throwInDepositToSeat, 'throwInDepositToSeat');

  const creatorFacet = Far('creatorFacet', {
    makeThrowInOfferHandlerInvitation,
    makeThrowInDepositToSeatInvitation,
  });
  return harden({ creatorFacet });
};

harden(start);
export { start };
