// @ts-check
import { E, Far } from '@agoric/far';
import { AssetKind } from '@agoric/ertp';
import { makeNotifierKit } from '@agoric/notifier';
import { installOnChain as installVaultFactoryOnChain } from '@agoric/run-protocol/bundles/install-on-chain.js';

import { makeStore } from '@agoric/store';
import { makeNameHubKit } from './nameHub';

const { entries, fromEntries } = Object;

// TODO: phase out ./issuers.js
export const CENTRAL_ISSUER_NAME = 'RUN';

/** @type { FeeIssuerConfig } */
export const feeIssuerConfig = {
  name: CENTRAL_ISSUER_NAME,
  assetKind: AssetKind.NAT,
  displayInfo: { decimalPlaces: 6, assetKind: AssetKind.NAT },
};

export const bootstrapManifest = harden({
  connectVattpWithMailbox: {
    vatPowers: { D: true },
    vats: { vattp: true },
    devices: { mailbox: true },
  },
  makeVatsFromBundles: {
    vats: { vatAdmin: true },
    devices: { vatAdmin: true },
    produce: { vatAdminSvc: true, loadVat: true },
  },
  buildZoe: {
    consume: { vatAdminSvc: true, loadVat: true, client: true },
    produce: { zoe: true, feeMintAccess: true },
  },
  makeBoard: {
    consume: { loadVat: true, client: true },
    produce: { board: true },
  },
  makeAddressNameHubs: {
    consume: { client: true },
    produce: { agoricNames: true, agoricNamesAdmin: true, nameAdmins: true },
  },
  makeClientBanks: {
    consume: {
      loadVat: true,
      client: true,
      bridgeManager: true,
    },
    produce: { bankManager: true },
  },
});

export const governanceActions = harden({
  startVaultFactory: {
    devices: { timer: true },
    vats: { timer: true },
    consume: {
      agoricNames: true,
      nameAdmins: true,
      board: true,
      loadVat: true,
      zoe: true,
      feeMintAccess: true,
    },
  },
});

/**
 * @param {{
 *   vatPowers: { D: EProxy }, // D type is approximate
 *   vats: { vattp: VattpVat },
 *   devices: { mailbox: MailboxDevice },
 * }} powers
 */
const connectVattpWithMailbox = ({
  vatPowers: { D },
  vats: { vattp },
  devices: { mailbox },
}) => {
  D(mailbox).registerInboundHandler(vattp);
  return E(vattp).registerMailboxDevice(mailbox);
};

/**
 * @param {{
 *   vats: { vatAdmin: VatAdminVat },
 *   devices: { vatAdmin: unknown },
 *   produce: {
 *     vatAdminSvc: Producer<ERef<VatAdminSvc>>,
 *     loadVat: Producer<VatLoader<unknown>>,
 *   },
 * }} powers
 */
const makeVatsFromBundles = ({
  vats,
  devices,
  produce: { vatAdminSvc, loadVat },
}) => {
  const svc = E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
  vatAdminSvc.resolve(svc);
  // TODO: getVat? do we need to memoize this by name?
  // TODO: rename loadVat to createVatByName?
  loadVat.resolve(bundleName => {
    console.info(`createVatByName(${bundleName})`);
    const root = E(svc)
      .createVatByName(bundleName)
      .then(r => r.root);
    return root;
  });
};

/**
 * @param {{
 *   consume: {
 *     vatAdminSvc: ERef<VatAdminSvc>,
 *     loadVat: ERef<VatLoader<ZoeVat>>,
 *     client: ERef<ClientConfig>
 *   },
 *   produce: { zoe: Producer<ZoeService>, feeMintAccess: Producer<FeeMintAccess> },
 * }} powers
 *
 * @typedef {ERef<ReturnType<import('./vat-zoe').buildRootObject>>} ZoeVat
 */
const buildZoe = async ({
  consume: { vatAdminSvc, loadVat, client },
  produce: { zoe, feeMintAccess },
}) => {
  const { zoeService, feeMintAccess: fma } = await E(
    E(loadVat)('zoe'),
  ).buildZoe(vatAdminSvc, feeIssuerConfig);

  zoe.resolve(zoeService);
  feeMintAccess.resolve(fma);
  E(client).assignBundle({ zoe: _addr => zoeService });
};

/**
 * TODO: rename this to getBoard?
 *
 * @param {{
 *   consume: { loadVat: ERef<VatLoader<BoardVat>>, client: ERef<ClientConfig> },
 *   produce: { board: Producer<ERef<Board>> },
 * }} powers
 * @typedef {ERef<ReturnType<import('./vat-board').buildRootObject>>} BoardVat
 */
const makeBoard = async ({
  consume: { loadVat, client },
  produce: {
    board: { resolve: resolveBoard },
  },
}) => {
  const board = E(E(loadVat)('board')).getBoard();
  resolveBoard(board);
  return E(client).assignBundle({ board: _addr => board });
};

/**
 * @param {{
 *   consume: { client: ERef<ClientConfig> },
 *   produce: {
 *     agoricNames: Producer<NameHub>,
 *     agoricNamesAdmin: Producer<NameAdmin>,
 *     nameAdmins: Producer<Store<NameHub, NameAdmin>>,
 *   },
 * }} powers
 */
const makeAddressNameHubs = async ({ consume: { client }, produce }) => {
  const {
    nameHub: agoricNames,
    nameAdmin: agoricNamesAdmin,
  } = makeNameHubKit();
  produce.agoricNames.resolve(agoricNames);
  produce.agoricNamesAdmin.resolve(agoricNamesAdmin);

  const {
    nameHub: namesByAddress,
    nameAdmin: namesByAddressAdmin,
  } = makeNameHubKit();

  /** @type {Store<NameHub, NameAdmin>} */
  const nameAdmins = makeStore('nameHub');
  await Promise.all(
    ['brand', 'installation', 'issuer', 'instance', 'uiConfig'].map(
      async nm => {
        const { nameHub, nameAdmin } = makeNameHubKit();
        await E(agoricNamesAdmin).update(nm, nameHub);
        nameAdmins.init(nameHub, nameAdmin);
        if (nm === 'uiConfig') {
          // Reserve the Vault Factory's config until we've populated it.
          nameAdmin.reserve('vaultFactory');
        }
      },
    ),
  );
  produce.nameAdmins.resolve(nameAdmins);

  const perAddress = address => {
    // Create a name hub for this address.
    const {
      nameHub: myAddressNameHub,
      nameAdmin: rawMyAddressNameAdmin,
    } = makeNameHubKit();
    // Register it with the namesByAddress hub.
    namesByAddressAdmin.update(address, myAddressNameHub);

    /** @type {MyAddressNameAdmin} */
    const myAddressNameAdmin = Far('myAddressNameAdmin', {
      ...rawMyAddressNameAdmin,
      getMyAddress: () => address,
    });
    return myAddressNameAdmin;
  };

  return E(client).assignBundle({
    agoricNames: _ => agoricNames,
    namesByAddress: _ => namesByAddress,
    myAddressNameAdmin: perAddress,
  });
};

/**
 * @param { string } addr
 * @param {{
 *   vats: {
 *     vattp: VattpVat,
 *     comms: CommsVatRoot,
 *   },
 *   produce: { client: Producer<ClientConfig> },
 * }} powers
 *
 * @typedef {{ getChainBundle: () => unknown }} ChainBundler
 */
const installClientEgress = async (addr, { vats, produce: { client } }) => {
  const PROVISIONER_INDEX = 1;

  let bundle = harden({});
  const { notifier, updater } = makeNotifierKit({ bundle });

  const chainProvider = Far('chainProvider', {
    getChainBundle: () =>
      notifier.getUpdateSince().then(({ value: { bundle: b } }) => b),
    getChainConfigNotifier: () => notifier,
  });

  const { transmitter, setReceiver } = await E(vats.vattp).addRemote(addr);
  await E(vats.comms).addRemote(addr, transmitter, setReceiver);
  await E(vats.comms).addEgress(addr, PROVISIONER_INDEX, chainProvider);

  const callProperties = (obj, ...args) =>
    fromEntries(entries(obj).map(([k, fn]) => [k, fn(...args)]));

  client.resolve(
    harden({
      assignBundle: newPropertyMakers => {
        const newProperties = callProperties(newPropertyMakers, addr);
        bundle = { ...bundle, ...newProperties };
        updater.updateState({ bundle });
      },
    }),
  );
};

/**
 * @param {{
 *   consume: {
 *     loadVat: ERef<VatLoader<BankVat>>,
 *     client: ERef<ClientConfig>,
 *     bridgeManager: import('./bridge').BridgeManager,
 *   },
 *   produce: { bankManager: Producer<unknown> },
 * }} powers
 * @typedef {ERef<ReturnType<import('./vat-bank').buildRootObject>>} BankVat
 */
const makeClientBanks = async ({
  consume: { loadVat, client, bridgeManager },
  produce: { bankManager },
}) => {
  const settledBridge = await bridgeManager;
  const mgr = E(E(loadVat)('bank')).makeBankManager(settledBridge);
  bankManager.resolve(mgr);
  return E(client).assignBundle({
    bank: address => E(mgr).getBankForAddress(address),
  });
};

/**
 * @param {{
 *   devices: { timer: unknown },
 *   vats: { timer: TimerVat },
 *   consume: {
 *    agoricNames: ERef<NameHub>,
 *    nameAdmins: ERef<Store<NameHub, NameAdmin>>,
 *    board: ERef<Board>,
 *    loadVat: ERef<VatLoader<unknown>>,
 *    zoe: ERef<ZoeService>,
 *    feeMintAccess: ERef<FeeMintAccess>,
 *   }
 * }} powers
 */
const startVaultFactory = async ({
  devices: { timer: timerDevice },
  vats: { timer: timerVat },
  consume: {
    agoricNames,
    nameAdmins: nameAdminsP,
    board,
    loadVat,
    zoe,
    feeMintAccess: feeMintAccessP,
  },
}) => {
  // TODO: Zoe should accept a promise, since the value is in that vat.
  const [feeMintAccess, nameAdmins] = await Promise.all([
    feeMintAccessP,
    nameAdminsP,
  ]);

  const chainTimerService = E(timerVat).createTimerService(timerDevice);

  /** @typedef { any } PriceAuthorityVat todo */
  const { priceAuthority, adminFacet: priceAuthorityAdmin } = await E(
    /** @type { PriceAuthorityVat } */ (E(loadVat)('priceAuthority')),
  ).makePriceAuthority();

  return installVaultFactoryOnChain({
    agoricNames,
    board,
    centralName: CENTRAL_ISSUER_NAME,
    chainTimerService,
    nameAdmins,
    priceAuthority,
    zoe,
    bootstrapPaymentValue: 0n, // TODO: this is obsolete, right?
    feeMintAccess,
  });
};

harden({
  connectVattpWithMailbox,
  makeVatsFromBundles,
  buildZoe,
  makeBoard,
  makeAddressNameHubs,
  installClientEgress,
  makeClientBanks,
  startVaultFactory,
});
export {
  connectVattpWithMailbox,
  makeVatsFromBundles,
  buildZoe,
  makeBoard,
  makeAddressNameHubs,
  installClientEgress,
  makeClientBanks,
  startVaultFactory,
};
