// @ts-check

import { Nat } from '@endo/nat';
import { E } from '@endo/far';
import { AssetKind } from '@agoric/ertp';
import { makeScalarMapStore } from '@agoric/store';
import { provideLazy } from '@agoric/store/src/stores/store-utils.js';
import {
  BridgeId,
  deeplyFulfilledObject,
  VBankAccount,
  WalletName,
} from '@agoric/internal';
import { CONTRACT_ELECTORATE, ParamTypes } from '@agoric/governance';

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
  // NOTE: we rely on multiple createVatAdminService calls
  // to return cooperating services.
  const svc = E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
  vatAdminSvc.resolve(svc);

  /** @type {VatStore} */
  const store = makeScalarMapStore();
  vatStore.resolve(store);

  const makeLazyVatLoader = (defaultVatCreationOptions = {}) => {
    return async (vatName, bundleRef = { bundleName: vatName }) => {
      const { bundleID, bundleName } = bundleRef;
      const vatInfoP = provideLazy(store, vatName, async _k => {
        if (bundleName) {
          console.info(`createVatByName(${bundleName})`);
          /** @type { Promise<CreateVatResults> } */
          const vatInfo = E(svc).createVatByName(bundleName, {
            ...defaultVatCreationOptions,
            name: vatName,
          });
          return vatInfo;
        }
        console.info(`createVat(${bundleID})`);
        assert(bundleID);
        const bcap = await E(svc).getBundleCap(bundleID);
        /** @type { Promise<CreateVatResults> } */
        const vatInfo = E(svc).createVat(bcap, {
          ...defaultVatCreationOptions,
          name: vatName,
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

/** @param {BootstrapPowers} powers */
export const produceStartUpgradable = async ({
  consume: { zoe },
  produce, // startUpgradable
}) => {
  /** @type {startUpgradable} */
  const startUpgradable = async ({
    installation,
    issuerKeywordRecord,
    terms,
    privateArgs,
    label,
    produceResults,
  }) => {
    const startResult = E(zoe).startInstance(
      installation,
      issuerKeywordRecord,
      terms,
      privateArgs,
      label,
    );
    produceResults.resolve(startResult);
    return startResult;
  };

  produce.startUpgradable.resolve(startUpgradable);
};
harden(produceStartUpgradable);

/**
 * @template {GovernableStartFn} SF
 *
 * @param {{
 *   zoe: ERef<ZoeService>,
 *   governedContractInstallation: ERef<Installation<SF>>,
 *   issuerKeywordRecord?: IssuerKeywordRecord,
 *   terms: Record<string, unknown>,
 *   privateArgs: any, // TODO: connect with Installation type
 *   label: string,
 * }} zoeArgs
 * @param {{
 *   governedParams: Record<string, unknown>,
 *   timer: ERef<import('@agoric/time/src/types').TimerService>,
 *   contractGovernor: ERef<Installation>,
 *   economicCommitteeCreatorFacet: import('@agoric/inter-protocol/src/proposals/econ-behaviors.js').EconomyBootstrapPowers['consume']['economicCommitteeCreatorFacet']
 * }} govArgs
 * @returns {Promise<GovernanceFacetKit<SF>>}
 */
const startGovernedInstance = async (
  {
    zoe,
    governedContractInstallation,
    issuerKeywordRecord,
    terms,
    privateArgs,
    label,
  },
  { governedParams, timer, contractGovernor, economicCommitteeCreatorFacet },
) => {
  const poserInvitationP = E(
    economicCommitteeCreatorFacet,
  ).getPoserInvitation();
  const [initialPoserInvitation, electorateInvitationAmount] =
    await Promise.all([
      poserInvitationP,
      E(E(zoe).getInvitationIssuer()).getAmountOf(poserInvitationP),
    ]);

  const governorTerms = await deeplyFulfilledObject(
    harden({
      timer,
      governedContractInstallation,
      governed: {
        terms: {
          ...terms,
          governedParams: {
            [CONTRACT_ELECTORATE]: {
              type: ParamTypes.INVITATION,
              value: electorateInvitationAmount,
            },
            ...governedParams,
          },
        },
        issuerKeywordRecord,
        label,
      },
    }),
  );
  const governorFacets = await E(zoe).startInstance(
    contractGovernor,
    {},
    governorTerms,
    harden({
      economicCommitteeCreatorFacet,
      governed: {
        ...privateArgs,
        initialPoserInvitation,
      },
    }),
    `${label}-governor`,
  );
  const [instance, publicFacet, creatorFacet, adminFacet] = await Promise.all([
    E(governorFacets.creatorFacet).getInstance(),
    E(governorFacets.creatorFacet).getPublicFacet(),
    E(governorFacets.creatorFacet).getCreatorFacet(),
    E(governorFacets.creatorFacet).getAdminFacet(),
  ]);
  /** @type {GovernanceFacetKit<SF>} */
  const facets = {
    instance,
    publicFacet,
    governor: governorFacets.instance,
    creatorFacet,
    adminFacet,
    governorCreatorFacet: governorFacets.creatorFacet,
  };
  return facets;
};

export const produceStartGovernedUpgradable = async ({
  consume: { chainTimerService, economicCommitteeCreatorFacet, zoe },
  produce, // startGovernedUpgradable
  installation: {
    consume: { contractGovernor },
  },
}) => {
  /** @type {startGovernedUpgradable} */
  const startGovernedUpgradable = async ({
    installation,
    issuerKeywordRecord,
    governedParams,
    terms,
    privateArgs,
    label,
    produceResults,
  }) => {
    const facetsP = startGovernedInstance(
      {
        zoe,
        governedContractInstallation: installation,
        issuerKeywordRecord,
        terms,
        privateArgs,
        label,
      },
      {
        governedParams,
        timer: chainTimerService,
        contractGovernor,
        economicCommitteeCreatorFacet,
      },
    );
    produceResults.resolve(facetsP);
    return facetsP;
  };

  produce.startGovernedUpgradable.resolve(startGovernedUpgradable);
};
harden(produceStartGovernedUpgradable);

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
 * @param {BootstrapPowers & NamedVatPowers} powers
 */
export const makeOracleBrands = async ({
  namedVat: {
    consume: { agoricNames },
  },
  oracleBrand: {
    produce: { USD },
  },
}) => {
  const brand = await E(agoricNames).provideInertBrand(
    'USD',
    harden({ decimalPlaces: 6, assetKind: AssetKind.NAT }),
  );
  USD.resolve(brand);
};
harden(makeOracleBrands);

/**
 * @param {BootstrapPowers & NamedVatPowers} powers
 */
export const produceBoard = async ({
  consume: { client },
  produce: { board: pBoard },
  namedVat: {
    consume: { board: vatBoard },
  },
}) => {
  const board = await E(vatBoard).getBoard();
  pBoard.resolve(board);
  return E(client).assignBundle([_addr => ({ board })]);
};
harden(produceBoard);

/**
 * @deprecated use produceBoard
 *
 * @param {BootstrapPowers & {
 *   consume: { loadCriticalVat: ERef<VatLoader<BoardVat>>
 * }}} powers
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
 * Produce the remote namesByAddress hierarchy.
 *
 * namesByAddress is a NameHub for each provisioned client,
 * available, for example, as `E(home.namesByAddress).lookup('agoric1...')`.
 * `depositFacet` as in `E(home.namesByAddress).lookup('agoric1...', 'depositFacet')`
 * is reserved for use by the Agoric wallet. Each client
 * is given `home.myAddressNameAdmin`, which they can use to
 * assign (update / reserve) any other names they choose.
 *
 * @param {BootstrapPowers} powers
 */
export const produceNamesByAddress = async ({
  consume: { agoricNames, provisioning: provisioningOptP, client },
  produce: { namesByAddress, namesByAddressAdmin },
}) => {
  const provisioning = await provisioningOptP;
  if (!provisioning) {
    namesByAddress.reject('no provisioning vat');
    namesByAddressAdmin.reject('no provisioning vat');
    return;
  }
  const kit = await E(provisioning).getNamesByAddressKit();
  namesByAddress.resolve(kit.namesByAddress);
  namesByAddressAdmin.resolve(kit.namesByAddressAdmin);
  const agoricNamesR = await agoricNames;
  return E(client).assignBundle([
    _a => ({ agoricNames: agoricNamesR, namesByAddress: kit.namesByAddress }),
    addr => ({
      myAddressNameAdmin: E(kit.namesByAddressAdmin)
        .provideChild(addr, [WalletName.depositFacet])
        .then(myKit => myKit.nameAdmin),
    }),
  ]);
};

/**
 * Make the namesByAddress name hierarchy in the heap.
 *
 * @deprecated use produceNamesByAddress to avoid Far objects in bootstrap
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
  // @ts-expect-error deprecated type structure
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
    produce: { centralSupply, mintHolder },
  },
}) => {
  for (const [name, producer] of Object.entries({
    centralSupply,
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
 * Mint IST genesis supply.
 *
 * @param { BootstrapPowers & {
 *   vatParameters: { argv: { bootMsg?: typeof bootMsgEx }},
 * }} powers
 */
export const mintInitialSupply = async ({
  vatParameters: {
    argv: { bootMsg },
  },
  consume: { feeMintAccess: feeMintAccessP, zoe },
  produce: { initialSupply },
  installation: {
    consume: { centralSupply },
  },
}) => {
  const feeMintAccess = await feeMintAccessP;

  const { supplyCoins = [] } = bootMsg || {};
  const centralBootstrapSupply = supplyCoins.find(
    ({ denom }) => denom === Stable.denom,
  ) || { amount: '0' };
  const bootstrapPaymentValue = Nat(BigInt(centralBootstrapSupply.amount));

  /** @type {Awaited<ReturnType<typeof import('../centralSupply.js').start>>} */
  const { creatorFacet } = await E(zoe).startInstance(
    centralSupply,
    {},
    { bootstrapPaymentValue },
    { feeMintAccess },
    'centralSupply',
  );
  const payment = E(creatorFacet).getBootstrapPayment();
  // TODO: shut down the centralSupply contract, now that we have the payment?
  initialSupply.resolve(payment);
};
harden(mintInitialSupply);

/**
 * Add IST (with initialSupply payment), BLD (with mint) to BankManager.
 *
 * @param { BootstrapSpace & {
 *   consume: { loadCriticalVat: ERef<VatLoader<BankVat>> },
 * }} powers
 */
export const addBankAssets = async ({
  consume: {
    agoricNamesAdmin,
    initialSupply,
    bridgeManager: bridgeManagerP,
    loadCriticalVat,
    startUpgradable: startUpgradableP,
    zoe,
  },
  produce: { bankManager, bldIssuerKit, bldMintHolderKit },
  installation: {
    consume: { mintHolder },
  },
  issuer: { produce: produceIssuer },
  brand: { produce: produceBrand },
}) => {
  const runIssuer = await E(zoe).getFeeIssuer();
  const [runBrand, payment, startUpgradable] = await Promise.all([
    E(runIssuer).getBrand(),
    initialSupply,
    startUpgradableP,
  ]);
  const runKit = { issuer: runIssuer, brand: runBrand, payment };
  const terms = harden({
    keyword: Stake.symbol,
    assetKind: Stake.assetKind,
    displayInfo: Stake.displayInfo,
  });

  const { creatorFacet: bldMint, publicFacet: bldIssuer } =
    await startUpgradable({
      installation: mintHolder,
      label: Stake.symbol,
      terms,
      produceResults: bldMintHolderKit,
      privateArgs: undefined,
    });

  const bldBrand = await E(bldIssuer).getBrand();
  const bldKit = { mint: bldMint, issuer: bldIssuer, brand: bldBrand };
  bldIssuerKit.resolve(bldKit);

  const assetAdmin = E(agoricNamesAdmin).lookupAdmin('vbankAsset');

  const bridgeManager = await bridgeManagerP;
  const bankBridgeManager =
    bridgeManager && E(bridgeManager).register(BridgeId.BANK);
  const bankMgr = await E(E(loadCriticalVat)('bank')).makeBankManager(
    bankBridgeManager,
    assetAdmin,
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
      runKit, // without mint, with payment
    ),
  ]);
};
harden(addBankAssets);

/** @type {import('./lib-boot').BootstrapManifest} */
export const BASIC_BOOTSTRAP_PERMITS = {
  bridgeCoreEval: true, // Needs all the powers.
  [makeOracleBrands.name]: {
    oracleBrand: { produce: { USD: 'agoricNames' } },
    namedVat: { consume: { agoricNames: 'agoricNames' } },
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
  [produceBoard.name]: {
    consume: {
      client: true,
    },
    produce: {
      board: 'board',
    },
    namedVat: { consume: { board: 'board' } },
  },
  [produceNamesByAddress.name]: {
    consume: {
      agoricNames: 'agoricNames',
      client: true,
      provisioning: 'provisioning',
    },
    produce: {
      namesByAddress: 'provisioning',
      namesByAddressAdmin: 'provisioning',
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
        centralSupply: 'zoe',
        mintHolder: 'zoe',
      },
    },
  },
  [mintInitialSupply.name]: {
    vatParameters: {
      argv: { bootMsg: true },
    },
    consume: {
      feeMintAccess: true,
      zoe: true,
    },
    produce: {
      initialSupply: true,
    },
    installation: {
      consume: { centralSupply: 'zoe' },
    },
  },
  [addBankAssets.name]: {
    consume: {
      agoricNamesAdmin: true,
      initialSupply: true,
      bridgeManager: 'bridge',
      // TODO: re-org loadCriticalVat to be subject to permits
      loadCriticalVat: true,
      startUpgradable: true,
      zoe: true,
    },
    produce: {
      bankManager: 'bank',
      bldIssuerKit: true,
      bldMintHolderKit: true,
    },
    installation: {
      consume: { centralSupply: 'zoe', mintHolder: 'zoe' },
    },
    issuer: { produce: { BLD: 'BLD', IST: 'zoe' } },
    brand: { produce: { BLD: 'BLD', IST: 'zoe' } },
  },
  [produceStartUpgradable.name]: {
    consume: { zoe: 'zoe' },
    produce: { startUpgradable: true },
  },
  [produceStartGovernedUpgradable.name]: {
    consume: {
      chainTimerService: 'timer',
      economicCommitteeCreatorFacet: 'economicCommittee',
      zoe: 'zoe',
    },
    produce: { startGovernedUpgradable: true },
    installation: {
      consume: { contractGovernor: 'zoe' },
    },
  },
};
harden(BASIC_BOOTSTRAP_PERMITS);
