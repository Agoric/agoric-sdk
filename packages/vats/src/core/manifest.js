// @ts-check

// TODO: Describe the manifest schema and semantics.
const SHARED_CHAIN_BOOTSTRAP_MANIFEST = harden({
  bridgeCoreEval: true, // Needs all the powers.
  makeOracleBrands: {
    oracleBrand: {
      produce: {
        USD: true,
      },
    },
  },
  startPriceAuthority: {
    consume: { loadVat: true, client: true },
    produce: {
      priceAuthorityVat: 'priceAuthority',
      priceAuthority: 'priceAuthority',
      priceAuthorityAdmin: 'priceAuthority',
    },
  },
  makeVatsFromBundles: {
    vats: {
      vatAdmin: 'vatAdmin',
    },
    devices: {
      vatAdmin: true,
    },
    produce: {
      vatAdminSvc: 'vatAdmin',
      loadVat: true,
      vatStore: true,
    },
  },
  buildZoe: {
    consume: {
      vatAdminSvc: true,
      loadVat: true,
      client: true,
    },
    produce: {
      zoe: 'zoe',
      feeMintAccess: 'zoe',
    },
  },
  makeBoard: {
    consume: {
      loadVat: true,
      client: true,
    },
    produce: {
      board: 'board',
    },
  },
  makeBridgeManager: {
    devices: { bridge: true },
    vatPowers: { D: true },
    produce: { bridgeManager: true },
  },
  makeAddressNameHubs: {
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
  startTimerService: {
    devices: {
      timer: true,
    },
    vats: {
      timer: 'timer',
    },
    consume: { client: true },
    produce: {
      chainTimerService: 'timer',
    },
    home: { produce: { chainTimerService: 'timer' } },
  },
  makeChainStorage: {
    consume: {
      bridgeManager: true,
    },
    produce: {
      chainStorage: true,
    },
  },
  makeClientBanks: {
    consume: {
      bankManager: 'bank',
      client: true,
    },
    home: { produce: { bank: 'bank' } },
  },
  installBootContracts: {
    vatPowers: { D: true },
    devices: { vatAdmin: true },
    consume: { zoe: 'zoe' },
    installation: {
      produce: {
        centralSupply: 'zoe',
        mintHolder: 'zoe',
      },
    },
  },
  mintInitialSupply: {
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
  addBankAssets: {
    consume: {
      initialSupply: true,
      bridgeManager: true,
      // TODO: re-org loadVat to be subject to permits
      loadVat: true,
      zoe: true,
    },
    produce: {
      bankManager: 'bank',
      bldIssuerKit: true,
    },
    installation: {
      consume: { centralSupply: 'zoe', mintHolder: 'zoe' },
    },
    issuer: { produce: { BLD: 'BLD', RUN: 'zoe' } },
    brand: { produce: { BLD: 'BLD', RUN: 'zoe' } },
  },
  makeProvisioner: {
    consume: {
      loadVat: true,
      clientCreator: true,
    },
    produce: {
      provisioning: 'provisioning',
    },
    vats: {
      comms: true,
      vattp: true,
    },
  },
  bridgeProvisioner: {
    consume: {
      provisioning: true,
      bridgeManager: true,
    },
  },
  makeClientManager: {
    produce: {
      client: true,
      clientCreator: true,
    },
  },
  setupNetworkProtocols: {
    consume: {
      client: true,
      loadVat: true,
      bridgeManager: true,
      zoe: true,
      provisioning: true,
    },
    produce: {
      networkVat: true,
    },
  },
});

export const CHAIN_BOOTSTRAP_MANIFEST = harden({
  ...SHARED_CHAIN_BOOTSTRAP_MANIFEST,
  connectChainFaucet: {
    consume: {
      client: true,
    },
    home: { produce: { faucet: true } },
  },
});

export const CLIENT_BOOTSTRAP_MANIFEST = harden({
  makeVatsFromBundles: {
    vats: {
      vatAdmin: 'vatAdmin',
    },
    devices: {
      vatAdmin: true,
    },
    produce: {
      vatAdminSvc: 'vatAdmin',
      loadVat: true,
      vatStore: true,
    },
  },
  startClient: {
    vatParameters: {
      argv: { FIXME_GCI: true },
    },
    devices: { command: true, plugin: true, timer: true },
    vats: {
      comms: true,
      http: true,
      network: true,
      spawner: true,
      timer: true,
      uploads: true,
      vattp: true,
    },
    vatPowers: true,
    consume: { vatAdminSvc: true },
  },
});

export const SIM_CHAIN_BOOTSTRAP_MANIFEST = harden({
  ...SHARED_CHAIN_BOOTSTRAP_MANIFEST,
  installSimEgress: {
    vatParameters: { argv: { hardcodedClientAddresses: true } },
    vats: {
      vattp: true,
      comms: true,
    },
    consume: { clientCreator: true },
  },
  connectFaucet: {
    consume: {
      bankManager: true,
      bldIssuerKit: true,
      client: true,
      feeMintAccess: true,
      loadVat: true,
      zoe: true,
    },
    installation: {
      consume: { centralSupply: 'zoe' },
    },
    produce: { mints: true },
    home: { produce: { faucet: true } },
  },
  grantRunBehaviors: {
    runBehaviors: true,
    consume: { client: true },
    home: { produce: { runBehaviors: true, governanceActions: true } },
  },
});
