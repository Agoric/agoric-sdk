import harden from '@agoric/harden';
import { assert, details } from '@agoric/assert';
import { sameStructure } from '@agoric/same-structure';

export const defaultRejectMsg = `The offer was invalid. Please check your refund.`;
export const defaultAcceptanceMsg = `The offer has been accepted. Once the contract has been completed, please check your payout`;

const getKeys = obj => harden(Object.getOwnPropertyNames(obj || {}));

export const makeZoeHelpers = zoe => {
  const { roles } = zoe.getInstanceRecord();
  const amountMaths = zoe.getAmountMathsForRoles(roles);
  const zoeService = zoe.getZoeService();

  const rejectOffer = (inviteHandle, msg = defaultRejectMsg) => {
    zoe.complete(harden([inviteHandle]));
    throw new Error(msg);
  };

  // Compare the keys of actual with expected keys and reject offer if
  // not sameStructure.
  const rejectIf = (
    inviteHandle,
    actual,
    expectedKeys,
    msg = defaultRejectMsg,
    // eslint-disable-next-line consistent-return
  ) => {
    if (expectedKeys !== undefined) {
      if (!sameStructure(getKeys(actual), expectedKeys)) {
        return rejectOffer(inviteHandle, msg);
      }
    }
  };
  // compare actual checks to expected keys. If expectedKeys is
  // undefined, return true trivially.
  const check = (inviteHandle, actual, expectedKeys) => {
    if (expectedKeys === undefined) {
      return true;
    }
    return sameStructure(getKeys(actual), expectedKeys);
  };
  const helpers = harden({
    makeInvite(seatFn, customProperties = undefined, expected = undefined) {
      const seat = harden({
        makeOffer: () => {
          // eslint-disable-next-line no-use-before-define
          helpers.rejectIfNotOfferRules(inviteHandle, harden(expected));
          // eslint-disable-next-line no-use-before-define
          return seatFn(inviteHandle, zoe.getOffer(inviteHandle));
        },
      });
      const { invite, inviteHandle } = zoe.makeInvite(seat, customProperties);
      return invite;
    },
    assertRoleNames: expected => {
      // 'actual' is sorted in alphabetical order by Zoe
      const { roleNames: actual } = zoe.getInstanceRecord();
      expected = [...expected]; // in case hardened
      expected.sort();
      assert(
        sameStructure(actual, harden(expected)),
        details`roleNames: ${actual} were not as expected: ${expected}`,
      );
    },
    rejectIfNotOfferRules: (inviteHandle, expected) => {
      const { offerRules: actual } = zoe.getOffer(inviteHandle);
      rejectIf(inviteHandle, actual.offer, expected && expected.offer);
      rejectIf(inviteHandle, actual.want, expected && expected.want);
      rejectIf(inviteHandle, actual.exit, expected && expected.exit);
    },
    checkIfOfferRules: (inviteHandle, expected) => {
      const { offerRules: actual } = zoe.getOffer(inviteHandle);
      return (
        // Check that the "offer" keys match expected keys.
        check(inviteHandle, actual.offer, expected.offer) &&
        // Check that the "want" keys match expected keys.
        check(inviteHandle, actual.want, expected.want) &&
        // Check that the "exit" key (i.e. "onDemand") matches the expected key.
        check(inviteHandle, actual.exit, expected.exit)
      );
    },
    getActiveOffers: handles =>
      zoe.getOffers(zoe.getOfferStatuses(handles).active),
    rejectOffer,
    canTradeWith: (leftInviteHandle, rightInviteHandle) => {
      const { offerRules: left } = zoe.getOffer(leftInviteHandle);
      const { offerRules: right } = zoe.getOffer(rightInviteHandle);
      const { roleNames } = zoe.getInstanceRecord();
      const satisfied = (wants, offers) =>
        roleNames.every(roleName => {
          if (wants[roleName]) {
            return amountMaths[roleName].isGTE(
              offers[roleName],
              wants[roleName],
            );
          }
          return true;
        });
      return (
        satisfied(left.want, right.offer) && satisfied(right.want, left.offer)
      );
    },
    swap: (
      keepHandle,
      tryHandle,
      keepHandleInactiveMsg = 'prior offer is unavailable',
    ) => {
      if (!zoe.isOfferActive(keepHandle)) {
        throw helpers.rejectOffer(tryHandle, keepHandleInactiveMsg);
      }
      if (!helpers.canTradeWith(keepHandle, tryHandle)) {
        throw helpers.rejectOffer(tryHandle);
      }
      const keepAmounts = zoe.getOffer(keepHandle).amounts;
      const tryAmounts = zoe.getOffer(tryHandle).amounts;
      // reallocate by switching the amount
      const handles = harden([keepHandle, tryHandle]);
      zoe.reallocate(handles, harden([tryAmounts, keepAmounts]));
      zoe.complete(handles);
      return defaultAcceptanceMsg;
    },
    makeEmptyOffer: () => {
      const { inviteHandle, invite } = zoe.makeInvite();
      return zoeService
        .redeem(invite, harden({}), harden({}))
        .then(() => inviteHandle);
    },
  });
  return helpers;
};
