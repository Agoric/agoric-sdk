// @ts-check
import {
  makePublishKit,
  makeStoredSubscriber,
  observeIteration,
} from '@agoric/notifier';
import { E, Far } from '@endo/far';
import { makeWallet } from './support.js';

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
 * storageNode: ERef<StorageNode>,
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
  assert(storageNode, 'missing storageNode');

  const cacheStorageNode = E(storageNode).makeChildNode('cache');

  const wallet = await makeWallet(bank, {
    agoricNames,
    cacheStorageNode,
    namesByAddress,
    // ??? why do we make this instead of passing the address itself?
    myAddressNameAdmin,
    zoe,
    board,
  });

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
  const { subscriber, publisher } = makePublishKit();
  publisher.publish({ ...mutableState });
  entries(notifierParts).forEach(([key, notifier]) => {
    void observeIteration(notifier, {
      updateState: value =>
        publisher.publish({
          ...assign(mutableState, { [key]: value }),
        }),
    });
  });

  const marshaller = wallet.getMarshaller();

  const myWalletStorageNode = E(storageNode).makeChildNode(address);
  const storedSubscriber = makeStoredSubscriber(
    subscriber,
    myWalletStorageNode,
    marshaller,
  );

  return Far('SmartWallet', {
    ...wallet,
    getSubscriber: () => storedSubscriber,
    performAction: obj => E(admin).performAction(obj),
  });
};
harden(makeSmartWallet);
/** @typedef {Awaited<ReturnType<typeof makeSmartWallet>>} SmartWallet */
