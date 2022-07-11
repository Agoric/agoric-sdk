import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import {
  makeAsyncIterableFromNotifier,
  makeNotifierKit,
} from '@agoric/notifier';
import { iterateLatest } from '@agoric/casting';

const newId = kind => `${kind}${Math.random()}`;

export const makeBackendFromWalletBridge = walletBridge => {
  /**
   * @template T
   * @param {ERef<Notifier<T>>} notifier
   */
  const iterateNotifier = async notifier =>
    makeAsyncIterableFromNotifier(notifier)[Symbol.asyncIterator]();

  const { notifier: servicesNotifier } = makeNotifierKit(
    harden({
      board: E(walletBridge).getBoard(),
    }),
  );

  /**
   * @param {AsyncIterator<any[], any[], undefined>} offersMembers
   */
  const wrapOffersIterator = offersMembers =>
    harden({
      next: async () => {
        const { done, value } = await E(offersMembers).next();
        return harden({
          done,
          value:
            value &&
            value.map(({ id, ...rest }) =>
              harden({
                id,
                ...rest,
                actions: Far('offerActions', {
                  // Provide these synthetic actions since offers don't have any yet.
                  accept: () => E(walletBridge).acceptOffer(id),
                  decline: () => E(walletBridge).declineOffer(id),
                  cancel: () => E(walletBridge).cancelOffer(id),
                }),
              }),
            ),
        });
      },
      return: offersMembers.return,
      throw: offersMembers.throw,
    });

  const firstSchema = harden({
    actions: Far('schemaActions', {
      createPurse: (issuer, id = newId('Purse')) =>
        E(walletBridge).makeEmptyPurse(issuer?.issuerPetname, id),
      createContact: (depositFacet, id = newId('Contact')) =>
        E(walletBridge).addContact(id, depositFacet),
      createIssuer: (issuer, id = newId('Issuer')) =>
        E(walletBridge).addIssuer(id, issuer, true),
    }),
    services: iterateNotifier(servicesNotifier),
    contacts: iterateNotifier(E(walletBridge).getContactsNotifier()),
    dapps: iterateNotifier(E(walletBridge).getDappsNotifier()),
    issuers: iterateNotifier(E(walletBridge).getIssuersNotifier()),
    offers: wrapOffersIterator(
      iterateNotifier(E(walletBridge).getOffersNotifier()),
    ),
    payments: iterateNotifier(E(walletBridge).getPaymentsNotifier()),
    purses: iterateNotifier(E(walletBridge).getPursesNotifier()),
  });

  // Just produce a single update for the initial backend.
  // TODO: allow further updates.
  const { notifier: backendNotifier, updater: backendUpdater } =
    makeNotifierKit(firstSchema);

  const backendIt = iterateNotifier(backendNotifier);

  const cancel = e => {
    backendUpdater.fail(e);
  };

  return { backendIt, cancel };
};

/**
 * @param {import('@agoric/casting').Follower} follower
 * @param {(e: unknown) => void} [errorHandler]
 * @param {() => void} [firstCallback]
 */
export const makeWalletBridgeFromFollower = (
  follower,
  errorHandler = e => {
    // Make an unhandled rejection.
    throw e;
  },
  firstCallback,
) => {
  const notifiers = {
    getPursesNotifier: 'purses',
    getContactsNotifier: 'contacts',
    getDappsNotifier: 'dapps',
    getIssuersNotifier: 'issuers',
    getOffersNotifier: 'offers',
    getPaymentsNotifier: 'payments',
  };

  const notifierKits = Object.fromEntries(
    Object.entries(notifiers).map(([_method, stateName]) => [
      stateName,
      makeNotifierKit(null),
    ]),
  );

  const followLatest = async () => {
    for await (const { value: state } of iterateLatest(follower)) {
      if (firstCallback) {
        firstCallback();
        firstCallback = undefined;
      }
      Object.entries(notifierKits).forEach(([stateName, { updater }]) => {
        updater.updateState(state[stateName]);
      });
    }
  };
  followLatest().catch(errorHandler);
  const getNotifierMethods = Object.fromEntries(
    Object.entries(notifiers).map(([method, stateName]) => {
      const { notifier } = notifierKits[stateName];
      return [method, () => notifier];
    }),
  );
  const walletBridge = Far('follower wallet bridge', {
    ...getNotifierMethods,
  });
  return walletBridge;
};
