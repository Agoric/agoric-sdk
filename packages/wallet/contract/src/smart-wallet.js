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

  const { subscription, publication } = makeSubscriptionKit();

  void observeIteration(E(admin).getContactsNotifier(), {
    updateState: state => publication.updateState({ contacts: state }),
  });
  void observeIteration(E(admin).getDappsNotifier(), {
    updateState: state => publication.updateState({ dapps: state }),
  });
  void observeIteration(E(admin).getIssuersNotifier(), {
    updateState: state => publication.updateState({ issuers: state }),
  });
  void observeIteration(E(admin).getOffersNotifier(), {
    updateState: state => publication.updateState({ offers: state }),
  });
  void observeIteration(E(admin).getPaymentsNotifier(), {
    updateState: state => publication.updateState({ payments: state }),
  });
  void observeIteration(E(admin).getPursesNotifier(), {
    updateState: state => publication.updateState({ purses: state }),
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
