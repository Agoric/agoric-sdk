// @ts-check
import { E, Far } from '@endo/far';
import {
  makeStoredSubscription,
  makeSubscriptionKit,
  observeIteration,
} from '@agoric/notifier';
import '@agoric/deploy-script-support/exported.js';
import '@agoric/zoe/exported.js';
import spawn from '@agoric/wallet-backend/src/wallet.js';

import '@agoric/wallet-backend/src/types.js'; // TODO avoid ambient types

const { assign, entries, keys, fromEntries } = Object;

/**
 *
 * TODO: multi-tennant wallet
 *
 * @param {ZCF} zcf
 * @param {{
 *   storageNode?: ERef<StorageNode>,
 *   marshaller?: ERef<Marshaller>,
 * }} privateArgs
 */
export const start = async (zcf, privateArgs) => {
  const { agoricNames, bank, namesByAddress, myAddressNameAdmin, board } =
    zcf.getTerms();
  const zoe = zcf.getZoeService();
  const walletVat = spawn({
    agoricNames,
    namesByAddress,
    myAddressNameAdmin,
    zoe,
    board,
    localTimerService: undefined,
  });

  const wallet = await E(walletVat).getWallet(bank);
  // @ts-expect-error TODO: type for getMyAddress
  const address = await E(myAddressNameAdmin).getMyAddress();
  const { storageNode, marshaller } = privateArgs;

  const myWalletStorageNode =
    storageNode && E(storageNode).getChildNode(address);
  const admin = E(wallet).getAdminFacet();

  /** @type {Record<string, ERef<Notifier<unknown>>>} */
  const notifierParts = {
    contacts: E(admin).getContactsNotifier(),
    dapps: E(admin).getDappsNotifier(),
    issuers: E(admin).getIssuersNotifier(),
    offers: E(admin).getOffersNotifier(),
    payments: E(admin).getPaymentsNotifier(),
    purses: E(admin).getPursesNotifier(),
  };
  const mutableState = fromEntries(keys(notifierParts).map(key => [key, []]));
  const { subscription, publication } = makeSubscriptionKit();
  publication.updateState({ ...mutableState });

  entries(notifierParts).forEach(([key, notifier]) => {
    void observeIteration(notifier, {
      updateState: value =>
        publication.updateState({ ...assign(mutableState, { [key]: value }) }),
    });
  });

  const storedSubscription = makeStoredSubscription(
    subscription,
    myWalletStorageNode,
    marshaller,
  );
  return {
    creatorFacet: Far('SmartWallet', {
      ...wallet,
      getSubscription: () => storedSubscription,
    }),
  };
};
