// @ts-check
import { E, Far } from '@endo/far';
import {
  makeStoredSubscription,
  makeSubscriptionKit,
  observeIteration,
} from '@agoric/notifier';
import '@agoric/deploy-script-support/exported.js';
import '@agoric/zoe/exported.js';
import { makeWallet } from './support.js';

import '@agoric/wallet-backend/src/types.js'; // TODO avoid ambient types

const { assign, entries, keys, fromEntries } = Object;

/**
 * @typedef {{
 *   agoricNames: NameHub,
 *   bank: import('@agoric/vats/src/vat-bank').Bank,
 *   board: Board,
 *   myAddressNameAdmin: ERef<MyAddressNameAdmin>,
 *   namesByAddress: NameHub,
 * }} SmartWalletContractTerms
 */

/**
 * @param {ZCF<SmartWalletContractTerms>} zcf
 * @param {{
 *   storageNode?: ERef<StorageNode>,
 *   marshaller?: ERef<Marshaller>,
 * }} privateArgs
 */
export const start = async (zcf, privateArgs) => {
  const { agoricNames, bank, namesByAddress, myAddressNameAdmin, board } =
    zcf.getTerms();
  assert(board, 'missing board');
  assert(myAddressNameAdmin, 'missing myAddressNameAdmin');
  assert(namesByAddress, 'missing namesByAddress');
  assert(agoricNames, 'missing agoricNames');
  const zoe = zcf.getZoeService();

  const wallet = await makeWallet(bank, {
    agoricNames,
    namesByAddress,
    myAddressNameAdmin,
    zoe,
    board,
  });

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
    creatorFacet: Far('SingleWallet', {
      ...wallet,
      getSubscription: () => storedSubscription,
    }),
  };
};
