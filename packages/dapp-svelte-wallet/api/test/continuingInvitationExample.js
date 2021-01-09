// @ts-check

import { makeNotifierKit } from '@agoric/notifier';

import '@agoric/zoe/exported';

export const start = zcf => {
  const { notifier, updater } = makeNotifierKit();

  const secondOfferHandler = seat => {
    updater.updateState('second offer made');
    seat.exit();
    return 'done';
  };

  const makeDoSecondThingInvitation = () =>
    zcf.makeInvitation(secondOfferHandler, 'SecondThing');

  const offerHandler = seat => {
    seat.exit();
    updater.updateState('first offer made');
    return harden({
      uiNotifier: notifier,
      invitationMakers: {
        SecondThing: makeDoSecondThingInvitation,
      },
    });
  };

  const creatorInvitation = zcf.makeInvitation(offerHandler, 'FirstThing');

  return harden({ creatorInvitation });
};
