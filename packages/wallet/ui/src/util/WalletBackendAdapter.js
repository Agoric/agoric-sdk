import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import {
  makeAsyncIterableFromNotifier,
  makeNotifierKit,
} from '@agoric/notifier';
import { iterateEach } from '@agoric/casting';
import { getScopedBridge } from '../service/ScopedBridge.js';
import { getDappService } from '../service/Dapps.js';
import { getOfferService } from '../service/Offers.js';
import { getIssuerService } from '../service/Issuers.js';

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
    issuerSuggestions: iterateNotifier(
      E(walletBridge).getIssuerSuggestionsNotifier(),
    ),
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
 * @param {import('@agoric/casting').Leader} leader
 * @param {import('@agoric/casting').Unserializer} unserializer
 * @param {string} publicAddress
 * @param {object} keplrConnection
 * @param {string} networkConfig
 * @param {(e: unknown) => void} [errorHandler]
 * @param {() => void} [firstCallback]
 */
export const makeWalletBridgeFromFollower = (
  follower,
  leader,
  unserializer,
  publicAddress,
  keplrConnection,
  networkConfig,
  errorHandler = e => {
    // Make an unhandled rejection.
    throw e;
  },
  firstCallback = () => {},
) => {
  const notifiers = {
    getPursesNotifier: 'purses',
    getContactsNotifier: 'contacts',
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

  // We assume just one cosmos purse per brand.
  const offers = {};
  const brandToPurse = new Map();

  const updatePurses = () => {
    const purses = [];
    for (const purse of brandToPurse.values()) {
      if (purse.currentAmount && purse.brandPetname) {
        console.log(purse.currentAmount);
        purses.push(purse);
      }
    }
    // console.log(purses);
    notifierKits.purses.updater.updateState(harden(purses));
  };

  const followLatest = async () => {
    for await (const { value } of iterateEach(follower)) {
      console.log('have value', value);
      /** @type {import('@agoric/smart-wallet/src/smartWallet').UpdateRecord} */
      const updateRecord = value;
      if (firstCallback) {
        firstCallback();
        Object.values(notifierKits).forEach(({ updater }) =>
          updater.updateState([]),
        );
        firstCallback = undefined;
      }
      switch (updateRecord.updated) {
        case 'brand': {
          const { descriptor } = updateRecord;
          const purseObj = {
            ...brandToPurse.get(descriptor.brand),
            brand: descriptor.brand,
            brandPetname: descriptor.petname,
            issuerPetname: descriptor.petname,
            displayInfo: descriptor.displayInfo,
          };
          brandToPurse.set(descriptor.brand, purseObj);
          updatePurses();
          break;
        }
        case 'balance': {
          // FIXME: We assume just one purse per brand.
          const { currentAmount } = updateRecord;
          const purseObj = {
            ...brandToPurse.get(currentAmount.brand),
            currentAmount,
          };
          brandToPurse.set(currentAmount.brand, purseObj);
          updatePurses();
          break;
        }
        case 'offerStatus': {
          const { status } = updateRecord;
          offers[status.id] = status;
          notifierKits.offers.updater.updateState(
            harden(Object.values(offers)),
          );
          break;
        }
        default: {
          throw Error(`Unknown updateRecord ${updateRecord.updated}`);
        }
      }
    }
  };

  followLatest().catch(errorHandler);

  const getNotifierMethods = Object.fromEntries(
    Object.entries(notifiers).map(([method, stateName]) => {
      const { notifier } = notifierKits[stateName];
      return [method, () => notifier];
    }),
  );

  const makeEmptyPurse = () => {
    console.log('make empty purse');
  };

  const addContact = () => {
    console.log('add contact');
  };

  const addIssuer = () => {
    console.log('add issuer');
  };

  const signSpendAction = data => {
    const {
      signers: { interactiveSigner },
    } = keplrConnection;
    if (!interactiveSigner) {
      throw new Error(
        'Cannot sign a transaction in read only mode, connect to keplr.',
      );
    }
    return interactiveSigner.submitSpendAction(data);
  };

  const issuerService = getIssuerService(signSpendAction);
  const dappService = getDappService(publicAddress);
  const offerService = getOfferService(
    publicAddress,
    signSpendAction,
    getNotifierMethods.getOffersNotifier(),
  );
  const { acceptOffer, declineOffer, cancelOffer } = offerService;

  const walletBridge = Far('follower wallet bridge', {
    ...getNotifierMethods,
    getDappsNotifier: () => dappService.notifier,
    getOffersNotifier: () => offerService.notifier,
    getIssuerSuggestionsNotifier: () => issuerService.notifier,
    acceptOffer,
    declineOffer,
    cancelOffer,
    makeEmptyPurse,
    addContact,
    addIssuer,
    getScopedBridge: (origin, suggestedDappPetname) =>
      getScopedBridge(origin, suggestedDappPetname, {
        dappService,
        offerService,
        leader,
        unserializer,
        publicAddress,
        issuerService,
        networkConfig,
        ...getNotifierMethods,
      }),
  });

  return walletBridge;
};
