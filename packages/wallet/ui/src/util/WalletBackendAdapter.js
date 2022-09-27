import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import {
  makeAsyncIterableFromNotifier,
  makeNotifierKit,
} from '@agoric/notifier';
import { iterateEach, iterateReverse } from '@agoric/casting';
import { getScopedBridge } from '../service/ScopedBridge.js';
import { getDappService } from '../service/Dapps.js';
import { getOfferService } from '../service/Offers.js';
import { getIssuerService } from '../service/Issuers.js';

const newId = kind => `${kind}${Math.random()}`;
export const NO_SMART_WALLET_ERROR = 'no smart wallet';

/** @typedef {{actions: object, issuerSuggestions: Promise<AsyncIterator>}} BackendSchema */

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

  /** @type {BackendSchema} */
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
  /** @type {NotifierKit<BackendSchema>} */
  const { notifier: backendNotifier, updater: backendUpdater } =
    makeNotifierKit(firstSchema);

  const backendIt = iterateNotifier(backendNotifier);

  const cancel = e => {
    backendUpdater.fail(e);
  };

  return { backendIt, cancel };
};

/**
 * @param {import('@agoric/casting').Follower<any>} follower
 * @param {import('@agoric/casting').Leader} leader
 * @param {ReturnType<import('@endo/marshal').makeMarshal>} marshaller
 * @param {string} publicAddress
 * @param {object} keplrConnection
 * @param {string} networkConfig
 * @param {(e: unknown) => void} [errorHandler]
 * @param {() => void} [firstCallback]
 */
export const makeWalletBridgeFromFollower = (
  follower,
  leader,
  marshaller,
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
  const pursePetnameToBrand = new Map();

  const updatePurses = () => {
    const purses = [];
    for (const [brand, purse] of brandToPurse.entries()) {
      if (purse.currentAmount && purse.brandPetname) {
        pursePetnameToBrand.set(purse.pursePetname, brand);
        purses.push(purse);
      }
    }
    notifierKits.purses.updater.updateState(harden(purses));
  };

  const followLatest = async () => {
    /** @type {number} */
    let firstHeight;
    for await (const { blockHeight } of iterateReverse(follower)) {
      // TODO: Only set firstHeight and break if the value contains all our state.
      firstHeight = blockHeight;
    }
    assert(firstHeight, NO_SMART_WALLET_ERROR);
    for await (const { value } of iterateEach(follower, {
      height: firstHeight,
    })) {
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
            pursePetname: descriptor.petname,
            displayInfo: descriptor.displayInfo,
          };
          brandToPurse.set(descriptor.brand, purseObj);
          updatePurses();
          break;
        }
        case 'balance': {
          // TODO: Don't assume just one purse per brand.
          // https://github.com/Agoric/agoric-sdk/issues/6126
          const { currentAmount } = updateRecord;
          const purseObj = {
            ...brandToPurse.get(currentAmount.brand),
            currentAmount,
            value: currentAmount.value,
          };
          brandToPurse.set(currentAmount.brand, purseObj);
          updatePurses();
          break;
        }
        case 'offerStatus': {
          const { status } = updateRecord;
          console.log('offerStatus', { status, offers });
          const oldOffer = offers[status.id];
          if (!oldOffer) {
            console.warn('Update for unknown offer, doing nothing.');
            break;
          }
          if ('error' in status) {
            offers[status.id] = {
              ...oldOffer,
              id: `${status.id}`,
              status: 'rejected',
              error: `${status.error}`,
            };
          } else if (
            oldOffer.status !== 'accept' &&
            'numWantsSatisfied' in status
          ) {
            offers[status.id] = {
              ...oldOffer,
              id: `${status.id}`,
              status: 'accept',
            };
          }
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

  const retry = () => {
    followLatest().catch(e => {
      if (e.message === NO_SMART_WALLET_ERROR) {
        setTimeout(retry, 5000);
      } else {
        errorHandler(e);
      }
    });
  };

  followLatest().catch(e => {
    errorHandler(e);
    if (e.message === NO_SMART_WALLET_ERROR) {
      setTimeout(retry, 5000);
    }
  });

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

  // We override addOffer to adapt the old proposalTemplate format to the new
  // smart-wallet format.
  const addOfferPSMHack = async details => {
    const {
      id,
      instanceHandleBoardId: instance, // This actually is the instance handle, not an ID.
      invitationMaker: { method },
      proposalTemplate: { give, want },
    } = details;

    const mapPurses = obj =>
      Object.fromEntries(
        Object.entries(obj).map(([kw, { brand, pursePetname, value }]) => [
          kw,
          {
            brand: brand || pursePetnameToBrand.get(pursePetname),
            value: BigInt(value),
          },
        ]),
      );
    const offer = {
      id: new Date().getTime(),
      invitationSpec: {
        source: 'contract',
        instance,
        publicInvitationMaker: method,
      },
      proposal: {
        give: mapPurses(give),
        want: mapPurses(want),
      },
    };
    const spendAction = await E(marshaller).serialize(
      harden({
        method: 'executeOffer',
        offer,
      }),
    );

    // Recover the instance's boardId.
    const {
      slots: [instanceBoardId],
    } = await E(marshaller).serialize(instance);

    const fullOffer = {
      ...details,
      instancePetname: `instance@${instanceBoardId}`,
      spendAction: JSON.stringify(spendAction),
    };
    offerService.addOffer(fullOffer);
    offers[id] = fullOffer;
    return id;
  };

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
        offerService: { ...offerService, addOffer: addOfferPSMHack },
        leader,
        unserializer: marshaller,
        publicAddress,
        issuerService,
        networkConfig,
        ...getNotifierMethods,
      }),
  });

  return walletBridge;
};
