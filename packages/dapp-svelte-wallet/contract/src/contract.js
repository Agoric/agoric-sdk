// @ts-check
import harden from '@agoric/harden';
import makeIssuerKit from '@agoric/ertp';
import { makeNotifierKit } from '@agoric/notifier';
import { makeZoeHelpers } from '@agoric/zoe/src/contractSupport/zoeHelpers';

/**
 * This contract provides encouragement. For a small donation it provides more.
 *
 * @typedef {import('@agoric/zoe').ContractFacet} ContractFacet
 * @param {ContractFacet} zcf
 */
const makeContract = zcf => {
  let count = 0;
  const messages = {
    basic: `You're doing great!`,
    premium: `Wow, just wow. I have never seen such talent!`,
  };
  const { notifier, updater } = makeNotifierKit(undefined);
  let adminOfferHandle;

  const { escrowAndAllocateTo, rejectOffer } = makeZoeHelpers(zcf);

  const { issuer, amountMath: assuranceAmountMath, mint } = makeIssuerKit(
    'Assurance',
    'set',
  );

  // Keep this promise for later, but track any error we get from it.
  const addAssuranceP = zcf.addNewIssuer(issuer, 'Assurance');
  addAssuranceP.catch(e => console.error('Cannot add Assurance issuer', e));

  const updateNotification = () => {
    updater.updateState({ messages, count });
  };
  updateNotification();

  const adminHook = offerHandle => {
    adminOfferHandle = offerHandle;
    return `admin invite redeemed`;
  };

  const encouragementHook = offerHandle => {
    // if the adminOffer is no longer active (i.e. the admin cancelled
    // their offer and retrieved their tips), we just don't give any
    // encouragement.
    if (!zcf.isOfferActive(adminOfferHandle)) {
      rejectOffer(offerHandle, `We are no longer giving encouragement`);
    }

    const userTipAllocation = zcf.getCurrentAllocation(offerHandle).Tip;
    const { brandKeywordRecord } = zcf.getInstanceRecord();
    const tipAmountMath = zcf.getAmountMath(brandKeywordRecord.Tip);
    let p = Promise.resolve();
    let encouragement = messages.basic;
    // if the user gives a tip, we provide a premium encouragement message
    if (
      userTipAllocation &&
      tipAmountMath.isGTE(userTipAllocation, tipAmountMath.make(1))
    ) {
      encouragement = messages.premium;
      // reallocate the tip to the adminOffer
      const adminTipAllocation = zcf.getCurrentAllocation(
        adminOfferHandle,
        brandKeywordRecord,
      ).Tip;
      const newAdminAllocation = {
        Tip: tipAmountMath.add(adminTipAllocation, userTipAllocation),
      };
      const newUserAllocation = {
        Tip: tipAmountMath.getEmpty(),
      };

      // Check if the user made a request for Assurance.
      const { proposal } = zcf.getOffer(offerHandle);
      if (proposal.want && proposal.want.Assurance) {
        // Just create a non-fungible serial number.
        const assuranceAmount = harden(
          assuranceAmountMath.make(harden([count + 1])),
        );
        p = addAssuranceP.then(_ =>
          escrowAndAllocateTo({
            amount: assuranceAmount,
            payment: mint.mintPayment(assuranceAmount),
            keyword: 'Assurance',
            recipientHandle: offerHandle,
          }),
        );
      }

      zcf.reallocate(
        harden([adminOfferHandle, offerHandle]),
        harden([newAdminAllocation, newUserAllocation]),
      );
    }
    return p.then(_ => {
      zcf.complete(harden([offerHandle]));
      count += 1;
      updateNotification();
      return encouragement;
    });
  };

  const makeInvite = () =>
    zcf.makeInvitation(encouragementHook, 'encouragement');

  zcf.initPublicAPI(
    harden({
      getNotifier() {
        return notifier;
      },
      makeInvite,
      getFreeEncouragement() {
        count += 1;
        updateNotification();
        return messages.basic;
      },
      getAssuranceIssuer() {
        return issuer;
      },
    }),
  );

  return zcf.makeInvitation(adminHook, 'admin');
};

harden(makeContract);
export { makeContract };
