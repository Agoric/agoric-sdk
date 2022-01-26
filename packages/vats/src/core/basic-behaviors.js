// @ts-check
import { E, Far } from '@agoric/far';
import { makeIssuerKit } from '@agoric/ertp';

import { makeStore } from '@agoric/store';

import { makeNameHubKit } from '../nameHub.js';
import { BLD_ISSUER_ENTRY } from '../issuers.js';

import { feeIssuerConfig, collectNameAdmins, shared } from './utils.js';

const { keys } = Object;

/**
 * TODO: review behaviors carefully for powers that go out of scope,
 * since we may want/need them later.
 */

/** @param {BootstrapPowers} powers */
export const makeVatsFromBundles = ({
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
harden(makeVatsFromBundles);

/**
 * @param { BootstrapPowers & {
 *   consume: { loadVat: ERef<VatLoader<ZoeVat>> }
 * }} powers
 *
 * @typedef {ERef<ReturnType<import('../vat-zoe.js').buildRootObject>>} ZoeVat
 */
export const buildZoe = async ({
  consume: { agoricNames, vatAdminSvc, loadVat, client, nameAdmins },
  produce: { zoe, feeMintAccess },
}) => {
  const { zoeService, feeMintAccess: fma } = await E(
    E(loadVat)('zoe'),
  ).buildZoe(vatAdminSvc, feeIssuerConfig);

  zoe.resolve(zoeService);

  const runIssuer = await E(zoeService).getFeeIssuer();
  const runBrand = await E(runIssuer).getBrand();
  const [issuerAdmin, brandAdmin] = await collectNameAdmins(
    ['issuer', 'brand'],
    agoricNames,
    nameAdmins,
  );

  feeMintAccess.resolve(fma);
  return Promise.all([
    E(issuerAdmin).update('RUN', runIssuer),
    E(brandAdmin).update('RUN', runBrand),
    E(client).assignBundle({ zoe: _addr => zoeService }),
  ]);
};
harden(buildZoe);

/**
 * TODO: rename this to getBoard?
 *
 * @param {BootstrapPowers & {
 *   consume: { loadVat: ERef<VatLoader<BoardVat>>
 * }}} powers
 * @typedef {ERef<ReturnType<import('../vat-board.js').buildRootObject>>} BoardVat
 */
export const makeBoard = async ({
  consume: { loadVat, client },
  produce: {
    board: { resolve: resolveBoard },
  },
}) => {
  const board = E(E(loadVat)('board')).getBoard();
  resolveBoard(board);
  return E(client).assignBundle({ board: _addr => board });
};
harden(makeBoard);

/** @param {BootstrapPowers} powers */
export const makeAddressNameHubs = async ({ consume: { client }, produce }) => {
  const {
    nameHub: agoricNames,
    nameAdmin: agoricNamesAdmin,
  } = makeNameHubKit();

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
          keys(shared.assets).forEach(k => nameAdmin.reserve(k));
        } else if (['installation', 'instance'].includes(nm)) {
          keys(shared.contract).forEach(k => nameAdmin.reserve(k));
        }
      },
    ),
  );
  produce.nameAdmins.resolve(nameAdmins);
  produce.agoricNames.resolve(agoricNames);
  produce.agoricNamesAdmin.resolve(agoricNamesAdmin);

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
harden(makeAddressNameHubs);

/**
 * @param {BootstrapPowers & {
 *   consume: { loadVat: ERef<VatLoader<BankVat>> },
 * }} powers
 * @typedef {ERef<ReturnType<import('../vat-bank.js').buildRootObject>>} BankVat
 */
export const makeClientBanks = async ({
  consume: { loadVat, client, bridgeManager },
  produce: { bankManager },
}) => {
  const settledBridge = await bridgeManager; // ISSUE: why await? it's remote, no?
  const mgr = E(E(loadVat)('bank')).makeBankManager(settledBridge);
  bankManager.resolve(mgr);
  return E(client).assignBundle({
    bank: address => E(mgr).getBankForAddress(address),
  });
};
harden(makeClientBanks);

/** @param {BootstrapPowers} powers */
export const makeBLDKit = async ({
  consume: { agoricNames, bankManager, nameAdmins },
}) => {
  const [issuerName, { bankDenom, bankPurse, issuerArgs }] = BLD_ISSUER_ENTRY;
  assert(issuerArgs);
  const kit = makeIssuerKit(issuerName, ...issuerArgs); // TODO: should this live in another vat???
  await E(bankManager).addAsset(bankDenom, issuerName, bankPurse, kit);
  const { brand, issuer } = kit;
  const [issuerAdmin, brandAdmin] = await collectNameAdmins(
    ['issuer', 'brand'],
    agoricNames,
    nameAdmins,
  );
  return Promise.all([
    E(issuerAdmin).update(issuerName, issuer),
    E(brandAdmin).update(issuerName, brand),
  ]);
};
harden(makeBLDKit);
