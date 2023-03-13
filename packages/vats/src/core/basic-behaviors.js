// @ts-check

import { Nat } from '@endo/nat';
import { E, Far } from '@endo/far';
import { AssetKind, makeIssuerKit } from '@agoric/ertp';
import { makeScalarMapStore } from '@agoric/store';
import { provideLazy } from '@agoric/store/src/stores/store-utils.js';
import { BridgeId, VBankAccount, WalletName } from '@agoric/internal';
import { makeNameHubKit } from '../nameHub.js';
import { feeIssuerConfig, makeMyAddressNameAdminKit } from './utils.js';
import { Stable, Stake } from '../tokens.js';
import { PowerFlags } from '../walletFlags.js';

const { details: X } = assert;

/**
 * In golang/cosmos/app/app.go, we define
 * cosmosInitAction with type AG_COSMOS_INIT,
 * with the following shape.
 *
 * The uist supplyCoins value is taken from genesis,
 * thereby authorizing the minting an initial supply of RUN.
 */
// eslint-disable-next-line no-unused-vars
const bootMsgEx = {
  type: 'AG_COSMOS_INIT',
  chainID: 'agoric',
  storagePort: 1,
  supplyCoins: [
    { denom: 'provisionpass', amount: '100' },
    { denom: 'sendpacketpass', amount: '100' },
    { denom: 'ubld', amount: '1000000000000000' },
    { denom: 'uist', amount: '50000000000' },
  ],
  vbankPort: 3,
  vibcPort: 2,
};

/**
 * TODO: review behaviors carefully for powers that go out of scope,
 * since we may want/need them later.
 */

/**
 * @param {BootstrapPowers & {
 *   produce: {vatStore: Producer<VatStore> }
 * }} powers
 *
 * @typedef {import('@agoric/swingset-vat').CreateVatResults} CreateVatResults as from createVatByName
 * @typedef {MapStore<string, Promise<CreateVatResults>>} VatStore
 */
export const makeVatsFromBundles = async ({
  vats,
  devices,
  produce: { vatAdminSvc, loadVat, loadCriticalVat, vatStore },
}) => {
  const svc = E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
  vatAdminSvc.resolve(svc);

  /** @type {VatStore} */
  const store = makeScalarMapStore();
  vatStore.resolve(store);

  const makeLazyVatLoader = (defaultVatCreationOptions = {}) => {
    return bundleName => {
      const vatInfoP = provideLazy(store, bundleName, _k => {
        console.info(`createVatByName(${bundleName})`);
        /** @type { Promise<CreateVatResults> } */
        const vatInfo = E(svc).createVatByName(bundleName, {
          ...defaultVatCreationOptions,
          name: bundleName,
        });
        return vatInfo;
      });
      return E.when(vatInfoP, vatInfo => vatInfo.root);
    };
  };

  loadVat.resolve(makeLazyVatLoader());

  const criticalVatKey = await E(vats.vatAdmin).getCriticalVatKey();
  loadCriticalVat.resolve(makeLazyVatLoader({ critical: criticalVatKey }));
};
harden(makeVatsFromBundles);

/**
 * @param { BootstrapPowers & {
 *   consume: { loadCriticalVat: ERef<VatLoader<ZoeVat>> }
 * }} powers
 *
 * @typedef {ERef<ReturnType<import('../vat-zoe.js').buildRootObject>>} ZoeVat
 */
export const buildZoe = async ({
  consume: { vatAdminSvc, loadCriticalVat, client },
  produce: { zoe, feeMintAccess },
  brand: {
    produce: { Invitation: invitationBrand },
  },
  issuer: {
    produce: { Invitation: invitationIssuer },
  },
}) => {
  const zcfBundleName = 'zcf'; // should match config.bundles.zcf=
  const { zoeService, feeMintAccess: fma } = await E(
    E(loadCriticalVat)('zoe'),
  ).buildZoe(vatAdminSvc, feeIssuerConfig, zcfBundleName);

  zoe.resolve(zoeService);
  const issuer = E(zoeService).getInvitationIssuer();
  const brand = E(issuer).getBrand();
  invitationIssuer.resolve(issuer);
  invitationBrand.resolve(brand);

  feeMintAccess.resolve(fma);
  await Promise.all([E(client).assignBundle([_addr => ({ zoe: zoeService })])]);
};
harden(buildZoe);

/**
 * @param {BootstrapPowers & {
 *   consume: { loadCriticalVat: ERef<VatLoader<PriceAuthorityVat>>},
 * }} powers
 *
 * @typedef {ERef<ReturnType<import('../vat-priceAuthority.js').buildRootObject>>} PriceAuthorityVat
 */
export const startPriceAuthorityRegistry = async ({
  consume: { loadCriticalVat, client },
  produce,
}) => {
  const vats = { priceAuthority: E(loadCriticalVat)('priceAuthority') };
  const { priceAuthority, adminFacet } = await E(
    vats.priceAuthority,
  ).getRegistry();

  produce.priceAuthorityVat.resolve(vats.priceAuthority);
  produce.priceAuthority.resolve(priceAuthority);
  produce.priceAuthorityAdmin.resolve(adminFacet);

  return E(client).assignBundle([_addr => ({ priceAuthority })]);
};
harden(startPriceAuthorityRegistry);

/**
 * Create inert brands (no mint or issuer) referred to by price oracles.
 *
 * @param {BootstrapPowers} powers
 */
export const makeOracleBrands = async ({
  oracleBrand: { produce: oracleBrandProduce },
}) => {
  const { brand } = makeIssuerKit(
    'USD',
    AssetKind.NAT,
    harden({ decimalPlaces: 6 }),
  );
  oracleBrandProduce.USD.resolve(brand);
};
harden(makeOracleBrands);

/**
 * TODO: rename this to getBoard?
 *
 * @param {BootstrapPowers & {
 *   consume: { loadCriticalVat: ERef<VatLoader<BoardVat>>
 * }}} powers
 * @typedef {ERef<ReturnType<import('../vat-board.js').buildRootObject>>} BoardVat
 */
export const makeBoard = async ({
  consume: { loadCriticalVat, client },
  produce: {
    board: { resolve: resolveBoard },
  },
}) => {
  const board = await E(E(loadCriticalVat)('board')).getBoard();
  resolveBoard(board);
  return E(client).assignBundle([_addr => ({ board })]);
};
harden(makeBoard);

/**
 * Make the agoricNames, namesByAddress name hierarchies.
 *
 * agoricNames are well-known items such as the IST issuer,
 * available as E(home.agoricNames).lookup('issuer', 'IST')
 *
 * namesByAddress is a NameHub for each provisioned client,
 * available, for example, as `E(home.namesByAddress).lookup('agoric1...')`.
 * `depositFacet` as in `E(home.namesByAddress).lookup('agoric1...', 'depositFacet')`
 * is reserved for use by the Agoric wallet. Each client
 * is given `home.myAddressNameAdmin`, which they can use to
 * assign (update / reserve) any other names they choose.
 *
 * @param {BootstrapSpace} powers
 */
export const makeAddressNameHubs = async ({
  consume: { agoricNames: agoricNamesP, client },
  produce,
}) => {
  const agoricNames = await agoricNamesP;

  const { nameHub: namesByAddress, nameAdmin: namesByAddressAdmin } =
    makeNameHubKit();
  produce.namesByAddress.resolve(namesByAddress);
  produce.namesByAddressAdmin.resolve(namesByAddressAdmin);

  const perAddress = address => {
    const { nameHub, myAddressNameAdmin } = makeMyAddressNameAdminKit(address);
    myAddressNameAdmin.reserve(WalletName.depositFacet);

    // This may race against walletFactory.js/publishDepositFacet, so we are
    // careful not to clobber the first nameHub that is used to update
    // namesByAddressAdmin.
    namesByAddressAdmin.default(address, nameHub, myAddressNameAdmin);

    const actualAdmin = namesByAddressAdmin.lookupAdmin(address);
    return { agoricNames, namesByAddress, myAddressNameAdmin: actualAdmin };
  };

  return E(client).assignBundle([perAddress]);
};
harden(makeAddressNameHubs);

/** @param {BootstrapSpace} powers */
export const makeClientBanks = async ({
  consume: {
    namesByAddressAdmin,
    client,
    bankManager,
    walletFactoryStartResult,
  },
}) => {
  const walletFactoryCreatorFacet = E.get(
    walletFactoryStartResult,
  ).creatorFacet;
  return E(client).assignBundle([
    (address, powerFlags) => {
      const bank = E(bankManager).getBankForAddress(address);
      if (!powerFlags.includes(PowerFlags.SMART_WALLET)) {
        return { bank };
      }
      assert(
        !powerFlags.includes(PowerFlags.REMOTE_WALLET),
        `REMOTE and SMART_WALLET are exclusive`,
      );
      /** @type {ERef<import('../types').MyAddressNameAdmin>} */
      const myAddressNameAdmin = E(namesByAddressAdmin).lookupAdmin(address);

      const smartWallet = E(walletFactoryCreatorFacet).provideSmartWallet(
        address,
        bank,
        myAddressNameAdmin,
      );

      // sets these values in REPL home by way of registerWallet
      return { bank, smartWallet };
    },
  ]);
};
harden(makeClientBanks);

/** @param {BootstrapSpace} powers */
export const installBootContracts = async ({
  consume: { vatAdminSvc, zoe },
  installation: {
    produce: { mintHolder },
  },
}) => {
  for (const [name, producer] of Object.entries({
    mintHolder,
  })) {
    const idP = E(vatAdminSvc).getBundleIDByName(name);
    const installationP = idP.then(bundleID =>
      E(zoe).installBundleID(bundleID, name),
    );
    producer.resolve(installationP);
  }
};

/**
 * Add IST, BLD (with mint) to BankManager.
 *
 * @param { BootstrapSpace & {
 *   consume: { loadCriticalVat: ERef<VatLoader<BankVat>> },
 * }} powers
 */
export const addBankAssets = async ({
  consume: {
    agoricNamesAdmin,
    bridgeManager: bridgeManagerP,
    loadCriticalVat,
    zoe,
  },
  produce: { bankManager, bldIssuerKit },
  installation: {
    consume: { mintHolder },
  },
  issuer: { produce: produceIssuer },
  brand: { produce: produceBrand },
}) => {
  const runIssuer = await E(zoe).getFeeIssuer();
  const runBrand = await E(runIssuer).getBrand();
  const runKit = { issuer: runIssuer, brand: runBrand };

  const { creatorFacet: bldMint, publicFacet: bldIssuer } = E.get(
    E(zoe).startInstance(
      mintHolder,
      harden({}),
      harden({
        keyword: Stake.symbol,
        assetKind: Stake.assetKind,
        displayInfo: Stake.displayInfo,
      }),
      undefined,
      Stake.symbol,
    ),
  );
  const bldBrand = await E(bldIssuer).getBrand();
  const bldKit = { mint: bldMint, issuer: bldIssuer, brand: bldBrand };
  bldIssuerKit.resolve(bldKit);

  const assetAdmin = E(agoricNamesAdmin).lookupAdmin('vbankAsset');
  const nameUpdater = Far('AssetHub', {
    update: (name, val) => E(assetAdmin).update(name, val),
  });

  const bridgeManager = await bridgeManagerP;
  const bankBridgeManager =
    bridgeManager && E(bridgeManager).register(BridgeId.BANK);
  const bankMgr = await E(E(loadCriticalVat)('bank')).makeBankManager(
    bankBridgeManager,
    nameUpdater,
  );
  bankManager.resolve(bankMgr);

  // Sanity check: the bank manager should have a reserve module account.
  const reserveAddress = await E(bankMgr).getModuleAccountAddress(
    VBankAccount.reserve.module,
  );
  if (reserveAddress !== null) {
    // bridgeManager is available, so we should have a legit reserve address.
    assert.equal(
      reserveAddress,
      VBankAccount.reserve.address,
      X`vbank address for reserve module ${VBankAccount.reserve.module} is ${reserveAddress}; expected ${VBankAccount.reserve.address}`,
    );
  }

  produceIssuer.BLD.resolve(bldKit.issuer);
  produceIssuer.IST.resolve(runKit.issuer);
  produceBrand.BLD.resolve(bldKit.brand);
  produceBrand.IST.resolve(runKit.brand);
  await Promise.all([
    E(bankMgr).addAsset(
      Stake.denom,
      Stake.symbol,
      Stake.proposedName,
      bldKit, // with mint
    ),
    E(bankMgr).addAsset(
      Stable.denom,
      Stable.symbol,
      Stable.proposedName,
      runKit, // without mint
    ),
  ]);
};
harden(addBankAssets);

/** @type {import('./lib-boot').BootstrapManifest} */
export const BASIC_BOOTSTRAP_PERMITS = {
  bridgeCoreEval: true, // Needs all the powers.
  [makeOracleBrands.name]: {
    oracleBrand: {
      produce: {
        USD: true,
      },
    },
  },
  [startPriceAuthorityRegistry.name]: {
    consume: { loadCriticalVat: true, client: true },
    produce: {
      priceAuthorityVat: 'priceAuthority',
      priceAuthority: 'priceAuthority',
      priceAuthorityAdmin: 'priceAuthority',
    },
  },
  [makeVatsFromBundles.name]: {
    vats: {
      vatAdmin: 'vatAdmin',
    },
    devices: {
      vatAdmin: 'kernel',
    },
    produce: {
      vatAdminSvc: 'vatAdmin',
      loadVat: true,
      loadCriticalVat: true,
      vatStore: true,
    },
  },
  [buildZoe.name]: {
    consume: {
      vatAdminSvc: true,
      loadCriticalVat: true,
      client: true,
    },
    produce: {
      zoe: 'zoe',
      feeMintAccess: 'zoe',
    },
    issuer: { produce: { Invitation: 'zoe' } },
    brand: { produce: { Invitation: 'zoe' } },
  },
  [makeBoard.name]: {
    consume: {
      loadCriticalVat: true,
      client: true,
    },
    produce: {
      board: 'board',
    },
  },

  [makeAddressNameHubs.name]: {
    consume: {
      agoricNames: true,
      client: true,
    },
    produce: {
      namesByAddress: true,
      namesByAddressAdmin: true,
    },
    home: {
      produce: { myAddressNameAdmin: true },
    },
  },
  [makeClientBanks.name]: {
    consume: {
      namesByAddressAdmin: true,
      bankManager: 'bank',
      client: true,
      walletFactoryStartResult: 'walletFactory',
    },
    home: { produce: { bank: 'bank' } },
  },
  [installBootContracts.name]: {
    consume: { zoe: 'zoe', vatAdminSvc: true },
    installation: {
      produce: {
        mintHolder: 'zoe',
      },
    },
  },
  [addBankAssets.name]: {
    consume: {
      agoricNamesAdmin: true,
      bridgeManager: 'bridge',
      // TODO: re-org loadCriticalVat to be subject to permits
      loadCriticalVat: true,
      zoe: true,
    },
    produce: {
      bankManager: 'bank',
      bldIssuerKit: true,
    },
    installation: {
      consume: { mintHolder: 'zoe' },
    },
    issuer: { produce: { BLD: 'BLD', IST: 'zoe' } },
    brand: { produce: { BLD: 'BLD', IST: 'zoe' } },
  },
};
harden(BASIC_BOOTSTRAP_PERMITS);
