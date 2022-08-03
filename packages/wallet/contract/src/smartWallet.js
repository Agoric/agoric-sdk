// @ts-check
import { E, Far } from '@endo/far';
import {
  makeStoredSubscription,
  makeSubscriptionKit,
  observeIteration,
} from '@agoric/notifier';
import spawn from '@agoric/wallet-backend/src/wallet.js';

const { assign, entries, keys, fromEntries } = Object;

/**
 * @param {{
 * address: string,
 * bank: ERef<import('@agoric/vats/src/vat-bank').Bank>,
 * myAddressNameAdmin: ERef<MyAddressNameAdmin>,
 * }} unique
 * @param {{
 * agoricNames: NameHub,
 * board: Board
 * namesByAddress: NameHub,
 * storageNode?: ERef<StorageNode>,
 * zoe: ERef<ZoeService>,
 * }} shared
 */
export const makeSmartWallet = async (
  { address, bank, myAddressNameAdmin },
  { agoricNames, board, namesByAddress, storageNode, zoe },
) => {
  assert.typeof(address, 'string', 'invalid address');
  assert(bank, 'missing bank');
  assert(myAddressNameAdmin, 'missing myAddressNameAdmin');

  const walletVat = spawn({
    agoricNames,
    namesByAddress,
    // ??? why do we make this instead of passing the address itself?
    myAddressNameAdmin,
    zoe,
    board,
  });

  const wallet = await E(walletVat).getWallet(bank);
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
        publication.updateState({
          ...assign(mutableState, { [key]: value }),
        }),
    });
  });

  const marshaller = wallet.getMarshaller();

  const myWalletStorageNode =
    storageNode && E(storageNode).getChildNode(address);
  const storedSubscription = makeStoredSubscription(
    subscription,
    myWalletStorageNode,
    marshaller,
  );

  return Far('SmartWallet', {
    ...wallet,
    getSubscription: () => storedSubscription,
    performAction: obj => E(admin).performAction(obj),
  });
};
harden(makeSmartWallet);
/** @typedef {Awaited<ReturnType<typeof makeSmartWallet>>} SmartWallet */
