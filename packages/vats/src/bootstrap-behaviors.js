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
    workspace: true,
  },
  buildZoe: {
    workspace: true,
  },
  makeBoard: {
    workspace: { vatAdminSvc: true, client: true },
  },
  makeAddressNameHubs: { workspace: true },
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
 *
 * @param {{
 *   vats: { vatAdmin: VatAdminVat },
 *   devices: { vatAdmin: unknown },
 *   workspace: import('./bootstrap-core').PromiseSpace,
 * }} powers
 */
const makeVatAdminService = async ({ vats, devices, workspace }) => {
  workspace.vatAdminSvc = E(vats.vatAdmin).createVatAdminService(
    devices.vatAdmin,
  );
};

/**
 * @param {{
 *   workspace: Record<string, ERef<any>>,
 * }} powers
 *
 * @typedef {ERef<ReturnType<import('./vat-zoe').buildRootObject>>} ZoeVat
 */
const buildZoe = async ({ workspace }) => {
  const { vatAdminSvc } = workspace;
  /** @type {{ root: ZoeVat }} */
  const { root } = await E(vatAdminSvc).createVatByName('zoe');
  const { zoeService: zoe, feeMintAccess: _2 } = await E(root).buildZoe(
    vatAdminSvc,
    feeIssuerConfig,
  );

  workspace.zoe = zoe;
  E(workspace.client).assignBundle({ zoe: _addr => zoe });
};

/**
 * @param {{
 *   workspace: { vatAdminSvc: VatAdminSvc, client: Record<string, unknown> }
 * }} powers
 */
const makeBoard = async ({ workspace: { vatAdminSvc, client } }) => {
  const { root } = await E(vatAdminSvc).createVatByName('board');

  const board = E(root).getBoard();
  return E(client).assignBundle({ board: _addr => board });
};

/**
 * @param {{ workspace: Record<string, unknown> }} powers
 */
const makeAddressNameHubs = async ({ workspace }) => {
  const {
    nameHub: agoricNames,
    nameAdmin: agoricNamesAdmin,
  } = makeNameHubKit();
  workspace.agoricNamesAdmin = agoricNamesAdmin;

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

  /* @ts-ignore TODO: cast client? */
  return E(workspace.client).assignBundle({
    agoricNames: _ => agoricNames,
    namesByAddress: _ => namesByAddress,
    myAddressNameAdmin: perAddress,
  });
};

const callProperties = (obj, ...args) =>
  fromEntries(entries(obj).map(([k, fn]) => [k, fn(...args)]));

/**
 * @param { string } addr
 * @param {{
 *   vats: {
 *     vattp: VattpVat,
 *     comms: CommsVatRoot,
 *   },
 *   workspace: Record<string, ERef<unknown>>,
 * }} powers
 *
 * @typedef {{ getChainBundle: () => unknown }} ChainBundler
 */
const installClientEgress = async (addr, { vats, workspace }) => {
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

  workspace.client = harden({
    assignBundle: newPropertyMakers => {
      const newProperties = callProperties(newPropertyMakers, addr);
      bundle = { ...bundle, ...newProperties };
      updater.updateState({ bundle });
    },
  });
};

harden({
  connectVattpWithMailbox,
  makeVatAdminService,
  buildZoe,
  makeBoard,
  makeAddressNameHubs,
  installClientEgress,
});
export {
  connectVattpWithMailbox,
  makeVatAdminService,
  buildZoe,
  makeBoard,
  makeAddressNameHubs,
  installClientEgress,
};
