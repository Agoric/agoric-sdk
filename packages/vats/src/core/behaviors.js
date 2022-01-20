// @ts-check
import { E, Far } from '@agoric/far';
import { AssetKind, makeIssuerKit } from '@agoric/ertp';
import { makeNotifierKit } from '@agoric/notifier';
import { installOnChain as installVaultFactoryOnChain } from '@agoric/run-protocol/bundles/install-on-chain.js';

import { makeStore } from '@agoric/store';
import { makeNameHubKit } from '../nameHub.js';
import { BLD_ISSUER_ENTRY } from '../issuers.js';

const { entries, fromEntries } = Object;

// TODO: phase out ./issuers.js
export const CENTRAL_ISSUER_NAME = 'RUN';

/** @type { FeeIssuerConfig } */
export const feeIssuerConfig = {
  name: CENTRAL_ISSUER_NAME,
  assetKind: AssetKind.NAT,
  displayInfo: { decimalPlaces: 6, assetKind: AssetKind.NAT },
};

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
 *     nameAdmins: ERef<Record<string, NameAdmin>>,
 *     client: ERef<ClientConfig>
 *   },
 *   produce: { zoe: Producer<ZoeService>, feeMintAccess: Producer<FeeMintAccess> },
 * }} powers
 *
 * @typedef {ERef<ReturnType<import('../vat-zoe.js').buildRootObject>>} ZoeVat
 */
const buildZoe = async ({
  consume: { vatAdminSvc, loadVat, client, nameAdmins },
  produce: { zoe, feeMintAccess },
}) => {
  const { zoeService, feeMintAccess: fma } = await E(
    E(loadVat)('zoe'),
  ).buildZoe(vatAdminSvc, feeIssuerConfig);

  zoe.resolve(zoeService);
  const runIssuer = await E(zoeService).getFeeIssuer();
  const runBrand = await E(runIssuer).getBrand();
  E(E(nameAdmins).get('issuer')).update('RUN', runIssuer);
  E(E(nameAdmins).get('brand')).update('RUN', runBrand);

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
 * @typedef {ERef<ReturnType<import('../vat-board.js').buildRootObject>>} BoardVat
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
        } else if (['issuer', 'brand'].includes(nm)) {
          nameAdmin.reserve('BLD');
          nameAdmin.reserve('RUN');
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
 *     bridgeManager: import('../bridge.js').BridgeManager,
 *   },
 *   produce: { bankManager: Producer<unknown> },
 * }} powers
 * @typedef {ERef<ReturnType<import('../vat-bank.js').buildRootObject>>} BankVat
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
 *   consume: {
 *     bankManager: Promise<BankManager>,
 *     nameAdmins: Promise<Record<string, NameAdmin>>,
 *   },
 * }} powers
 * @typedef {*} BankManager // TODO
 */
const makeBLDKit = async ({ consume: { bankManager, nameAdmins } }) => {
  const [issuerName, { bankDenom, bankPurse, issuerArgs }] = BLD_ISSUER_ENTRY;
  assert(issuerArgs);
  const kit = makeIssuerKit(issuerName, ...issuerArgs); // TODO: should this live in another vat???
  await E(bankManager).addAsset(bankDenom, issuerName, bankPurse, kit);
  // How to be clear that this "kit" has no mint? Do we have a name for brand and issuer?
  const { brand, issuer } = kit;
  E(E(nameAdmins).get('issuer')).update('BLD', issuer);
  E(E(nameAdmins).get('brand')).update('BLD', brand);
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

  /** @typedef {ERef<ReturnType<import('../vat-priceAuthority.js').buildRootObject>>} PriceAuthorityVat todo */
  const { priceAuthority, adminFacet: _priceAuthorityAdmin } = await E(
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
  makeBLDKit,
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
  makeBLDKit,
  startVaultFactory,
};
