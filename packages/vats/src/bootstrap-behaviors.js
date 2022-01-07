// @ts-check
import { E, Far } from '@agoric/far';
import { AssetKind } from '@agoric/ertp';
import { makeNotifierKit } from '@agoric/notifier';
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
  },
  makeAddressNameHubs: {
    consume: { client: true },
    produce: { agoricNamesAdmin: true },
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
 * @param {{
 *   consume: { loadVat: ERef<VatLoader<BoardVat>>, client: ERef<ClientConfig> }
 * }} powers
 * @typedef {ERef<ReturnType<import('./vat-board').buildRootObject>>} BoardVat
 */
const makeBoard = async ({ consume: { loadVat, client } }) => {
  const board = E(E(loadVat)('board')).getBoard();
  return E(client).assignBundle({ board: _addr => board });
};

/**
 * @param {{
 *   consume: { client: ERef<ClientConfig> },
 *   produce: { agoricNamesAdmin: Producer<NameAdmin> },
 * }} powers
 */
const makeAddressNameHubs = async ({
  consume: { client },
  produce: { agoricNamesAdmin },
}) => {
  const { nameHub: agoricNames, nameAdmin } = makeNameHubKit();
  agoricNamesAdmin.resolve(nameAdmin);

  const {
    nameHub: namesByAddress,
    nameAdmin: namesByAddressAdmin,
  } = makeNameHubKit();

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

  // TODO: get rid of echoObj?
  let bundle = harden({
    echoer: Far('echoObj', { echo: message => message }),
    // TODO: echo: Far('echoFn', message => message),
  });
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

harden({
  connectVattpWithMailbox,
  makeVatsFromBundles,
  buildZoe,
  makeBoard,
  makeAddressNameHubs,
  installClientEgress,
  makeClientBanks,
});
export {
  connectVattpWithMailbox,
  makeVatsFromBundles,
  buildZoe,
  makeBoard,
  makeAddressNameHubs,
  installClientEgress,
  makeClientBanks,
};
