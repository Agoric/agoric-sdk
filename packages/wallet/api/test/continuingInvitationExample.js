// @ts-check

import { makeNotifierFromSubscriber, makePublishKit } from '@agoric/notifier';
import { Far } from '@endo/marshal';

export const start = zcf => {
  const { subscriber, publisher } = makePublishKit();
  const notifier = makeNotifierFromSubscriber(subscriber);

  const secondOfferHandler = seat => {
    publisher.publish('second offer made');
    seat.exit();
    return 'done';
  };

  const makeDoSecondThingInvitation = () =>
    zcf.makeInvitation(secondOfferHandler, 'SecondThing');

  const offerHandler = seat => {
    seat.exit();
    publisher.publish('first offer made');
    return harden({
      uiNotifier: notifier,
      publicSubscribers: { offers: subscriber },
      invitationMakers: Far('second thing inviter', {
        SecondThing: makeDoSecondThingInvitation,
      }),
    });
  };

  const creatorInvitation = zcf.makeInvitation(offerHandler, 'FirstThing');

  return harden({ creatorInvitation });
};
