// @ts-check
import { iterateEach } from '@agoric/casting';
import { AmountMath } from '@agoric/ertp';
import {
  makeAsyncIterableFromNotifier,
  makeNotifierKit,
} from '@agoric/notifier';
import {
  assertHasData,
  NO_SMART_WALLET_ERROR,
} from '@agoric/smart-wallet/src/utils.js';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { getDappService } from '../service/Dapps.js';
import { getIssuerService } from '../service/Issuers.js';
import { getOfferService } from '../service/Offers.js';

/** @typedef {import('@agoric/smart-wallet/src/types.js').Petname} Petname */

const newId = kind => `${kind}${Math.random()}`;

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
                actions: {
                  // Provide these synthetic actions since offers don't have any yet.
                  accept: () => E(walletBridge).acceptOffer(id),
                  decline: () => E(walletBridge).declineOffer(id),
                  cancel: () => E(walletBridge).cancelOffer(id),
                },
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
      // @ts-expect-error xxx
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
  /** @type {NotifierRecord<BackendSchema>} */
  const { notifier: backendNotifier, updater: backendUpdater } =
    makeNotifierKit(firstSchema);

  const backendIt = iterateNotifier(backendNotifier);

  const cancel = e => {
    backendUpdater.fail(e);
  };

  return { backendIt, cancel };
};

/**
 * @param {string} chainId
 * @param {ReturnType<import('@endo/marshal').makeMarshal>} marshaller
 * @param {import('@agoric/casting').ValueFollower<import('@agoric/smart-wallet/src/smartWallet').CurrentWalletRecord>} currentFollower
 * @param {import('@agoric/casting').ValueFollower<import('@agoric/smart-wallet/src/smartWallet').UpdateRecord>} updateFollower
 * @param {string} publicAddress
 * @param {object} keplrConnection
 * @param {(e: unknown) => void} [errorHandler]
 * @param {() => void} [firstCallback]
 */
export const makeWalletBridgeFromFollowers = (
  chainId,
  marshaller,
  currentFollower,
  updateFollower,
  publicAddress,
  keplrConnection,
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

  /** @type {Record<string, NotifierRecord<unknown>>} */
  const notifierKits = Object.fromEntries(
    Object.entries(notifiers).map(([_method, stateName]) => [
      stateName,
      makeNotifierKit(null),
    ]),
  );

  // We assume just one cosmos purse per brand.
  /**
   * @typedef {{
   *  brand?: Brand,
   *  brandPetname?: Petname,
   *  currentAmount: Amount,
   *  pursePetname?: Petname,
   *  displayInfo?: DisplayInfo,
   * }} PurseInfo
   * @type {Map<Brand, PurseInfo>}
   */
  const brandToPurse = new Map();
  /** @type {Map<Petname, Brand>} */
  const pursePetnameToBrand = new Map();

  const updatePurses = () => {
    const purses = [];
    for (const [brand, purse] of brandToPurse.entries()) {
      if (purse.currentAmount && purse.brandPetname) {
        assert(purse.pursePetname, 'missing purse.pursePetname');
        pursePetnameToBrand.set(purse.pursePetname, brand);
        purses.push(purse);
      }
    }
    notifierKits.purses.updater.updateState(harden(purses));
  };

  const signSpendAction = async data => {
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

  const getNotifierMethods = Object.fromEntries(
    Object.entries(notifiers).map(([method, stateName]) => {
      const { notifier } = notifierKits[stateName];
      return [method, () => notifier];
    }),
  );

  const offerService = getOfferService(
    chainId,
    publicAddress,
    signSpendAction,
    getNotifierMethods.getOffersNotifier(),
    marshaller,
  );

  const fetchCurrent = async () => {
    await assertHasData(currentFollower);
    const latestIterable = await E(currentFollower).getLatestIterable();
    const iterator = latestIterable[Symbol.asyncIterator]();
    const latest = await iterator.next();
    if (firstCallback) {
      firstCallback();
      Object.values(notifierKits).forEach(({ updater }) =>
        updater.updateState([]),
      );
      firstCallback = undefined;
    }
    /** @type {import('@agoric/casting').ValueFollowerElement<import('@agoric/smart-wallet/src/smartWallet').CurrentWalletRecord>} */
    const currentEl = latest.value;
    const wallet = currentEl.value;
    console.log('wallet current', wallet);
    for (const purse of wallet.purses) {
      console.debug('registering purse', purse);
      const brandDescriptor = wallet.brands.find(
        bd => purse.brand === bd.brand,
      );
      assert(brandDescriptor, `missing descriptor for brand ${purse.brand}`);
      /** @type {PurseInfo} */
      const purseInfo = {
        brand: purse.brand,
        currentAmount: purse.balance,
        brandPetname: brandDescriptor.petname,
        pursePetname: brandDescriptor.petname,
        displayInfo: brandDescriptor.displayInfo,
      };
      brandToPurse.set(purse.brand, purseInfo);
    }
    console.debug('brandToPurse map', brandToPurse);
    updatePurses();
    offerService.start(pursePetnameToBrand);
    return currentEl.blockHeight;
  };

  const followLatest = async startingHeight => {
    for await (const { value } of iterateEach(updateFollower, {
      height: startingHeight,
    })) {
      /** @type {import('@agoric/smart-wallet/src/smartWallet').UpdateRecord} */
      const updateRecord = value;
      switch (updateRecord.updated) {
        case 'brand': {
          const {
            descriptor: { brand, petname, displayInfo },
          } = updateRecord;
          const prior = brandToPurse.get(brand);
          const purseObj = {
            brand,
            brandPetname: petname,
            pursePetname: petname,
            displayInfo,
            currentAmount: prior?.currentAmount || AmountMath.makeEmpty(brand),
          };
          brandToPurse.set(brand, purseObj);
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
          notifierKits.offers.updater.updateState(status);
          break;
        }
        default: {
          // @ts-expect-error exhaustive switch
          throw Error(`Unknown updateRecord ${updateRecord.updated}`);
        }
      }
    }
  };

  const loadData = () => fetchCurrent().then(followLatest);

  const retry = () => {
    loadData().catch(e => {
      if (e.message === NO_SMART_WALLET_ERROR) {
        setTimeout(retry, 5000);
      } else {
        errorHandler(e);
      }
    });
  };

  loadData().catch(e => {
    errorHandler(e);
    if (e.message === NO_SMART_WALLET_ERROR) {
      setTimeout(retry, 5000);
    }
  });

  const makeEmptyPurse = () => {
    console.log('make empty purse');
  };

  const addContact = () => {
    console.log('add contact');
  };

  const addIssuer = () => {
    console.log('add issuer');
  };

  const issuerService = getIssuerService(signSpendAction);
  const dappService = getDappService(chainId, publicAddress);
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
  });

  return walletBridge;
};
