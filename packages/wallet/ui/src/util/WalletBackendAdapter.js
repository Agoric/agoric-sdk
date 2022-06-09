import { E } from '@endo/eventual-send';
import { makeFollower, mapAsyncIterable, iterateLatest } from '@agoric/casting';
import { Far } from '@endo/marshal';
import { makeNotifierKit } from '@agoric/notifier';

const newId = kind => `${kind}${Math.random()}`;

export const makeBackendFromWalletBridge = (walletBridge, makeLeader) => {
  const { notifier: servicesNotifier } = makeNotifierKit(
    harden({
      board: E(walletBridge).getBoard(),
    }),
  );

  /**
   * @template T
   * @param {ERef<Notifier<T>>} notifier
   */
  const iterateNotifier = notifier => {
    const storeKey = E(notifier).getStoreKey();
    const follower = makeFollower(storeKey, makeLeader);
    return mapAsyncIterable(iterateLatest(follower), ({ value }) => value)[
      Symbol.asyncIterator
    ]();
  };

  /**
   * @param {AsyncIterator<any[], any[], undefined>} offersMembers
   */
  const wrapOffersIterator = offersMembers =>
    harden({
      next: async () => {
        const { done, value } = await offersMembers.next();
        return harden({
          done,
          value: value.map(({ id, ...rest }) =>
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
    dapps: iterateNotifier(E(walletBridge).getDappsNotifier()),
    contacts: iterateNotifier(E(walletBridge).getContactsNotifier()),
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
