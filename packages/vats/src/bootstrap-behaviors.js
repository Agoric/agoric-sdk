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
  makeVatAdminService: {
    vats: { vatAdmin: true },
    devices: { vatAdmin: true },
    produce: { vatAdminSvc: true },
  },
  buildZoe: {
    consume: { vatAdminSvc: true, client: true },
    produce: { zoe: true, feeMintAccess: true },
  },
  makeBoard: {
    consume: { vatAdminSvc: true, client: true },
  },
  makeAddressNameHubs: {
    consume: { client: true },
    produce: { agoricNamesAdmin: true },
  },
  makeClientBanks: {
    consume: {
      vatAdminSvc: true,
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
 * TODO: { dynamicVats: { bank: true }} thingy?
 *
 * @param {{
 *   vats: { vatAdmin: VatAdminVat },
 *   devices: { vatAdmin: unknown },
 *   produce: { vatAdminSvc: Producer<ERef<VatAdminSvc>> },
 * }} powers
 */
const makeVatAdminService = async ({
  vats,
  devices,
  produce: { vatAdminSvc },
}) => {
  vatAdminSvc.resolve(E(vats.vatAdmin).createVatAdminService(devices.vatAdmin));
};

/**
 * @param {{
 *   consume: { vatAdminSvc: ERef<VatAdminSvc>, client: ERef<ClientConfig> },
 *   produce: { zoe: Producer<ZoeService>, feeMintAccess: Producer<FeeMintAccess> },
 * }} powers
 *
 * @typedef {ERef<ReturnType<import('./vat-zoe').buildRootObject>>} ZoeVat
 */
const buildZoe = async ({
  consume: { vatAdminSvc, client },
  produce: { zoe, feeMintAccess },
}) => {
  /** @type {{ root: ZoeVat }} */
  const { root } = await E(vatAdminSvc).createVatByName('zoe');
  const { zoeService, feeMintAccess: fma } = await E(root).buildZoe(
    vatAdminSvc,
    feeIssuerConfig,
  );

  zoe.resolve(zoeService);
  feeMintAccess.resolve(fma);
  E(client).assignBundle({ zoe: _addr => zoeService });
};

/**
 * @param {{
 *   consume: { vatAdminSvc: ERef<VatAdminSvc>, client: ERef<ClientConfig> }
 * }} powers
 */
const makeBoard = async ({ consume: { vatAdminSvc, client } }) => {
  const { root } = await E(vatAdminSvc).createVatByName('board');

  const board = E(root).getBoard();
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
 *     vatAdminSvc: ERef<VatAdminSvc>,
 *     client: ERef<ClientConfig>,
 *     bridgeManager: import('./bridge').BridgeManager,
 *   },
 *   produce: { bankManager: Producer<unknown> },
 * }} powers
 */
const makeClientBanks = async ({
  consume: { vatAdminSvc, client, bridgeManager },
  produce: { bankManager },
}) => {
  const { root: bankVat } = await E(vatAdminSvc).createVatByName('bank');
  const settledBridge = await bridgeManager;
  const mgr = E(bankVat).makeBankManager(settledBridge);
  bankManager.resolve(mgr);
  return E(client).assignBundle({
    bank: address => E(mgr).getBankForAddress(address),
  });
};

harden({
  connectVattpWithMailbox,
  makeVatAdminService,
  buildZoe,
  makeBoard,
  makeAddressNameHubs,
  installClientEgress,
  makeClientBanks,
});
export {
  connectVattpWithMailbox,
  makeVatAdminService,
  buildZoe,
  makeBoard,
  makeAddressNameHubs,
  installClientEgress,
  makeClientBanks,
};
