import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import {
  makeAsyncIterableFromNotifier,
  makeNotifierKit,
  observeIterator,
} from '@agoric/notifier';

const newId = kind => `${kind}${Math.random()}`;

/**
 * @template T
 * @param {ERef<Notifier<T>>} notifier
 */
const iterateNotifier = notifier =>
  makeAsyncIterableFromNotifier(notifier)[Symbol.asyncIterator]();

export const makeBackendFromWalletBridge = walletBridge => {
  const { notifier: servicesNotifier } = makeNotifierKit(
    harden({
      board: E(walletBridge).getBoard(),
    }),
  );

  /**
   * @param {AsyncIterator<any[], any[], undefined>} offersMembers
   */
  const wrapOffersMembers = offersMembers =>
    harden({
      next: async () => {
        const { done, value } = await offersMembers.next();
        return harden({
          done,
          value: value.map(({ offerId, ...rest }) =>
            harden({
              offerId,
              ...rest,
              actions: Far('offerActions', {
                // Provide these synthetic actions since offers don't have any yet.
                accept: () => E(walletBridge).acceptOffer(offerId),
                decline: () => E(walletBridge).declineOffer(offerId),
                cancel: () => E(walletBridge).cancelOffer(offerId),
              }),
            }),
          ),
        });
      },
      return: offersMembers.return,
      throw: offersMembers.throw,
    });

  const firstSchema = harden({
    services: {
      it: iterateNotifier(servicesNotifier),
    },
    dapps: {
      it: iterateNotifier(E(walletBridge).getDappsNotifier()),
    },
    contacts: {
      it: iterateNotifier(E(walletBridge).getContactsNotifier()),
      actions: Far('contactsActions', {
        create: (depositFacet, id = newId('Contact')) =>
          E(walletBridge).addContact(id, depositFacet),
      }),
    },
    issuers: {
      it: iterateNotifier(E(walletBridge).getIssuersNotifier()),
      actions: Far('issuersActions', {
        create: (issuer, id = newId('Issuer')) =>
          E(walletBridge).addIssuer(id, issuer, true),
      }),
    },
    offers: {
      it: wrapOffersMembers(
        iterateNotifier(E(walletBridge).getOffersNotifier()),
      ),
    },
    payments: {
      it: iterateNotifier(E(walletBridge).getPaymentsNotifier()),
    },
    purses: {
      it: iterateNotifier(E(walletBridge).getPursesNotifier()),
      actions: Far('pursesActions', {
        create: (issuer, id = newId('Purse')) =>
          E(walletBridge).makeEmptyPurse(issuer?.issuerPetname, id),
      }),
    },
  });

  // Just produce a single update for the initial backend.
  // TODO: allow further updates.
  const { notifier: backendNotifier } = makeNotifierKit(firstSchema);
  const backendIt = iterateNotifier(backendNotifier);

  // Finish all the other members iterators.
  observeIterator(backendIt, {
    finish: state => {
      Object.values(state).forEach(({ it }) => {
        if (it) {
          it.return && it.return();
        }
      });
    },
  });

  return backendIt;
};
