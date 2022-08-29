// @ts-check

/**
 * This file defines the vat launched by the spawner in the ../deploy.js script.
 * It is hooked into the existing ag-solo by that script.
 *
 * Most of the interface defined by this code is only used within this dapp
 * itself.  The parts that are relied on by other dapps are documented in the
 * types.js file.
 */
import { E } from '@endo/eventual-send';
import { makeNotifierKit, observeIteration } from '@agoric/notifier';
import { Far } from '@endo/marshal';

import { makeWalletRoot } from './lib-wallet.js';

import '@agoric/wallet-backend/src/internal-types.js';

// inlined '@agoric/wallet-backend/src/pubsub.js'
const pubsub = () => {
  let lastPublished;
  const subscribers = [];

  return harden({
    subscribe(s) {
      subscribers.push(s);
      if (lastPublished !== undefined) {
        E(s).notify(lastPublished);
      }
    },
    publish(m) {
      lastPublished = m;
      subscribers.forEach(s => {
        E(s).notify(m);
      });
    },
  });
};

/**
 * @typedef {{
 * agoricNames: ERef<NameHub>,
 * board: ERef<Board>,
 * cacheStorageNode: ERef<StorageNode>,
 * myAddressNameAdmin: ERef<MyAddressNameAdmin>,
 * namesByAddress: ERef<NameHub>,
 * zoe: ERef<ZoeService>,
 * }} StartupTerms
 */

export function makeHelper() {
  /** @type {import('./lib-wallet.js').WalletRoot} */
  let walletRoot;
  /** @type {WalletAdminFacet} */
  let walletAdmin;
  /** @type {Array<OfferState>} */
  let inboxState = [];
  let http;

  const offerSubscriptions = new Map();

  const httpSend = (obj, channelHandles) =>
    E(http).send(JSON.parse(JSON.stringify(obj)), channelHandles);

  const pushOfferSubscriptions = (channelHandle, offers) => {
    const subs = offerSubscriptions.get(channelHandle);
    (subs || []).forEach(({ origin, status }) => {
      // Filter by optional status and origin.
      const result = harden(
        offers.filter(
          offer =>
            (status === null || offer.status === status) &&
            offer.requestContext &&
            offer.requestContext.origin === origin,
        ),
      );
      httpSend(
        {
          type: 'walletOfferDescriptions',
          data: result,
        },
        [channelHandle],
      );
    });
  };

  const { publish: pursesPublish } = pubsub();
  const { updater: inboxUpdater, notifier: offerNotifier } =
    makeNotifierKit(inboxState);
  const { publish: inboxPublish, subscribe: inboxSubscribe } = pubsub();

  const notifiers = harden({
    getInboxNotifier() {
      return offerNotifier;
    },
  });

  /**
   * @param {StartupTerms} terms
   */
  async function startup({
    zoe,
    board,
    agoricNames,
    namesByAddress,
    myAddressNameAdmin,
  }) {
    assert(myAddressNameAdmin, 'missing myAddressNameAdmin');

    const w = makeWalletRoot({
      agoricNames,
      board,
      inboxStateChangeHandler: inboxPublish,
      myAddressNameAdmin,
      namesByAddress,
      pursesStateChangeHandler: pursesPublish,
      zoe,
    });
    console.debug('waiting for wallet to initialize');
    await w.initialized;
    console.debug('wallet initialized');
    walletAdmin = w.admin;
    walletRoot = w;
  }

  /**
   * Create a bridge that a dapp can use to interact with the wallet without
   * compromising the wallet's integrity.  This is the preferred way to use the
   * wallet.
   *
   * @param {() => Promise<void>} approve return a promise that resolves only
   * when the dapp is allowed to interact with the wallet.
   * @param {string} dappOrigin the Web origin of the connecting dapp
   * @param {Record<string, any>} meta metadata for this dapp's connection
   * @returns {WalletBridge} the bridge bound to a specific dapp
   */
  const makeBridge = (approve, dappOrigin, meta = {}) => {
    async function* makeApprovedNotifier(sourceNotifier) {
      await approve();
      for await (const state of sourceNotifier) {
        await approve();
        yield state;
      }
    }

    /** @type {WalletBridge} */
    const bridge = Far('bridge', {
      async getPursesNotifier() {
        await approve();
        const pursesNotifier = walletAdmin.getAttenuatedPursesNotifier();
        const { notifier, updater } = makeNotifierKit();
        observeIteration(makeApprovedNotifier(pursesNotifier), updater);
        return notifier;
      },
      async getCacheCoordinator() {
        await approve();
        return walletAdmin.getDappCacheCoordinator(dappOrigin);
      },
      async getIssuersNotifier() {
        await approve();
        return walletAdmin.getIssuersNotifier();
      },
      async addOffer(offer) {
        await approve();
        return walletAdmin.addOffer(offer, { ...meta, dappOrigin });
      },
      async getAccountState() {
        await approve();
        return walletAdmin.getAccountState();
      },
      async getOffersNotifier(status = null) {
        await approve();
        const { notifier, updater } = makeNotifierKit(inboxState);
        const filter = offer =>
          (status === null || offer.status === status) &&
          offer.requestContext &&
          offer.requestContext.dappOrigin === dappOrigin;
        const filteredOffers = offers => {
          return offers.filter(filter).map(({ rawId, ...v }) => ({
            ...v,
            id: rawId,
          }));
        };

        observeIteration(makeApprovedNotifier(offerNotifier), {
          updateState(offers) {
            updater.updateState(filteredOffers(offers));
          },
          finish(offers) {
            updater.finish(filteredOffers(offers));
          },
          fail(e) {
            updater.fail(e);
          },
        });
        return notifier;
      },
      async getDepositFacetId(brandBoardId) {
        await approve();
        return walletAdmin.getDepositFacetId(brandBoardId);
      },
      async suggestIssuer(petname, boardId) {
        await approve();
        return walletAdmin.suggestIssuer(petname, boardId, dappOrigin);
      },
      async suggestInstallation(petname, boardId) {
        await approve();
        return walletAdmin.suggestInstallation(petname, boardId, dappOrigin);
      },
      async suggestInstance(petname, boardId) {
        await approve();
        return walletAdmin.suggestInstance(petname, boardId, dappOrigin);
      },
      async getZoe() {
        await approve();
        return walletAdmin.getZoe();
      },
      async getBoard() {
        await approve();
        return walletAdmin.getBoard();
      },
      async getAgoricNames(...path) {
        await approve();
        return walletAdmin.getAgoricNames(...path);
      },
      async getNamesByAddress(...path) {
        await approve();
        return walletAdmin.getNamesByAddress(...path);
      },
      async getBrandPetnames(brands) {
        await approve();
        return walletAdmin.getBrandPetnames(brands);
      },
    });
    return bridge;
  };

  /**
   * This bridge doesn't wait for approvals before acting.  This can be obtained
   * from `home.wallet~.getBridge()` in the REPL as a WalletBridge to grab and
   * use for testing and exploration without having to think about approvals.
   *
   * @type {WalletBridge}
   */
  const preapprovedBridge = Far('preapprovedBridge', {
    /**
     * @param {unknown} offer
     * @param {{}} [meta]
     */
    addOffer(offer, meta) {
      return walletAdmin.addOffer(offer, meta);
    },
    getDepositFacetId(brandBoardId) {
      return walletAdmin.getDepositFacetId(brandBoardId);
    },
    async getOffersNotifier() {
      return walletAdmin.getOffersNotifier();
    },
    async getPursesNotifier() {
      return walletAdmin.getAttenuatedPursesNotifier();
    },
    async getIssuersNotifier() {
      return walletAdmin.getIssuersNotifier();
    },
    async getCacheCoordinator() {
      return walletAdmin.getCacheCoordinator();
    },
    suggestInstallation(petname, installationBoardId) {
      return walletAdmin.suggestInstallation(petname, installationBoardId);
    },
    suggestInstance(petname, instanceBoardId) {
      return walletAdmin.suggestInstance(petname, instanceBoardId);
    },
    suggestIssuer(petname, issuerBoardId) {
      return walletAdmin.suggestIssuer(petname, issuerBoardId);
    },
    getUINotifier(rawId) {
      return walletAdmin.getUINotifier(rawId);
    },
    getPublicNotifiers(rawId) {
      return walletAdmin.getPublicNotifiers(rawId);
    },
    async getZoe() {
      return walletAdmin.getZoe();
    },
    async getBoard() {
      return walletAdmin.getBoard();
    },
    async getAgoricNames(...path) {
      return walletAdmin.getAgoricNames(...path);
    },
    async getNamesByAddress(...path) {
      return walletAdmin.getNamesByAddress(...path);
    },
    async getBrandPetnames(brands) {
      return walletAdmin.getBrandPetnames(brands);
    },
  });
  harden(preapprovedBridge);

  async function getWallet(bank) {
    await walletRoot.importBankAssets(bank);

    /**
     * @type {WalletAdmin}
     */
    const wallet = Far('wallet', {
      addPayment: walletAdmin.addPayment,
      async getScopedBridge(suggestedDappPetname, dappOrigin) {
        const approve = async () => {
          await walletAdmin.waitForDappApproval(
            suggestedDappPetname,
            dappOrigin,
          );
        };

        return makeBridge(approve, dappOrigin);
      },
      async getBridge() {
        return preapprovedBridge;
      },
      getDepositFacetId: walletAdmin.getDepositFacetId,
      getAdminFacet() {
        return Far('adminFacet', {
          ...walletAdmin,
          ...notifiers,
          getScopedBridge: wallet.getScopedBridge,
        });
      },
      getPurse: walletAdmin.getPurse,
      getPurses: walletAdmin.getPurses,

      getMarshaller: walletAdmin.getMarshaller,

      lookup: walletAdmin.lookup,
    });
    return harden(wallet);
  }

  function startSubscriptions() {
    // console.debug(`subscribing to walletInboxState`);
    // This provokes an immediate update
    inboxSubscribe(
      harden({
        notify(m) {
          inboxState = JSON.parse(m);
          inboxUpdater.updateState(inboxState);
          if (http) {
            // Get subscribed offers, too.
            for (const channelHandle of offerSubscriptions.keys()) {
              pushOfferSubscriptions(channelHandle, inboxState);
            }
          }
        },
      }),
    );
  }

  startSubscriptions();

  return Far('root', {
    startup,
    getWallet,
  });
}

/**
 * Adapter for spawner.
 * See @agoric/spawner/src/vat-spawned.js
 *
 * @param {StartupTerms} terms
 * @param {*} _inviteMaker
 */
export default function spawn(terms, _inviteMaker) {
  const walletVat = makeHelper();
  return walletVat.startup(terms).then(_ => walletVat);
}
