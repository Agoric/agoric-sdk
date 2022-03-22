// @ts-check
const SHARED_BOOTSTRAP_MANIFEST = harden({
  makeOracleBrands: {
    oracleBrand: {
      produce: {
        USD: true,
      },
    },
  },
  startPriceAuthority: {
    consume: { loadVat: true },
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
  makeClientBanks: {
    consume: {
      bankManager: 'bank',
      client: true,
    },
    home: { produce: { bank: 'bank' } },
  },
  shareBootContractBundles: {
    produce: {
      centralSupplyBundle: true,
      mintHolderBundle: true,
      pegasusBundle: true,
    },
  },
  mintInitialSupply: {
    vatParameters: {
      argv: { bootMsg: true },
    },
    consume: {
      centralSupplyBundle: true,
      feeMintAccess: true,
      zoe: true,
    },
    produce: {
      initialSupply: true,
    },
  },
  addBankAssets: {
    consume: {
      initialSupply: true,
      bridgeManager: true,
      // TODO: re-org loadVat to be subject to permits
      loadVat: true,
      zoe: true,
      mintHolderBundle: true,
    },
    produce: {
      bankManager: 'bank',
      bldIssuerKit: true,
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
  installPegasusOnChain: {
    consume: {
      namesByAddress: true,
      board: 'board',
      pegasusBundle: true,
      zoe: 'zoe',
    },
    installation: {
      produce: {
        Pegasus: 'zoe',
      },
    },
    instance: {
      produce: {
        Pegasus: 'Pegasus',
      },
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
      pegasusConnections: true,
      pegasusConnectionsAdmin: true,
    },
    instance: { consume: { Pegasus: 'Pegasus' } },
  },
});

export const CHAIN_BOOTSTRAP_MANIFEST = harden({
  ...SHARED_BOOTSTRAP_MANIFEST,
  bridgeCoreEval: true,
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
  ...SHARED_BOOTSTRAP_MANIFEST,
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
      centralSupplyBundle: true,
      client: true,
      feeMintAccess: true,
      loadVat: true,
      zoe: true,
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

const SHARED_POST_BOOT_MANIFEST = harden({
  shareEconomyBundles: {
    produce: {
      ammBundle: true,
      vaultBundles: true,
      governanceBundles: true,
    },
  },
  startEconomicCommittee: {
    consume: {
      zoe: true,
      governanceBundles: true,
    },
    produce: { economicCommitteeCreatorFacet: 'economicCommittee' },
    installation: {
      produce: {
        committee: 'zoe',
        noActionElectorate: 'zoe',
        contractGovernor: 'zoe',
        binaryVoteCounter: 'zoe',
      },
    },
    instance: {
      produce: { economicCommittee: 'economicCommittee' },
    },
  },
  setupAmm: {
    consume: {
      chainTimerService: 'timer',
      zoe: 'zoe',
      economicCommitteeCreatorFacet: 'economicCommittee',
      ammBundle: true,
    },
    produce: {
      ammCreatorFacet: 'amm',
      ammGovernorCreatorFacet: 'amm',
    },
    issuer: { consume: { RUN: 'zoe' } },
    installation: {
      consume: { contractGovernor: 'zoe' },
      produce: { amm: 'zoe' },
    },
    instance: {
      consume: { economicCommittee: 'economicCommittee' },
      produce: { amm: 'amm', ammGovernor: 'ammGovernor' },
    },
  },
  startVaultFactory: {
    consume: {
      feeMintAccess: 'zoe',
      vaultBundles: true,
      chainTimerService: 'timer',
      zoe: 'zoe',
      priceAuthority: 'priceAuthority',
      economicCommitteeCreatorFacet: 'economicCommittee',
    },
    produce: {
      vaultFactoryCreator: 'VaultFactory',
      vaultFactoryGovernorCreator: 'VaultFactory',
      vaultFactoryVoteCreator: 'VaultFactory',
    },
    brand: { consume: { RUN: 'zoe' } },
    oracleBrand: { consume: { USD: true } },
    installation: {
      consume: { contractGovernor: 'zoe' },
      produce: { VaultFactory: 'zoe', liquidate: 'zoe' },
    },
    instance: {
      consume: { amm: 'amm', economicCommittee: 'economicCommittee' },
      produce: {
        VaultFactory: 'VaultFactory',
        Treasury: 'VaultFactory',
        VaultFactoryGovernor: 'VaultFactoryGovernor',
      },
    },
  },
  grantVaultFactoryControl: {
    vatParameters: {
      argv: { vaultFactoryControllerAddress: true },
    },
    consume: {
      client: 'provisioning',
      priceAuthorityAdmin: 'priceAuthority',
      vaultFactoryCreator: 'VaultFactory',
    },
  },
  configureVaultFactoryUI: {
    consume: {
      board: true,
      zoe: true,
    },
    issuer: { consume: { RUN: 'zoe' } },
    brand: { consume: { RUN: 'zoe' } },
    installation: {
      consume: {
        amm: 'zoe',
        VaultFactory: 'zoe',
        contractGovernor: 'zoe',
        noActionElectorate: 'zoe',
        binaryVoteCounter: 'zoe',
        liquidate: 'zoe',
      },
    },
    instance: {
      consume: { amm: 'amm', VaultFactory: 'VaultFactory' },
    },
    uiConfig: { produce: { Treasury: true, VaultFactory: true } },
  },
});

export const CHAIN_POST_BOOT_MANIFEST = harden({
  ...SHARED_POST_BOOT_MANIFEST,
  startRewardDistributor: {
    consume: {
      chainTimerService: true,
      bankManager: true,
      loadVat: true,
      vaultFactoryCreator: true,
      ammCreatorFacet: true,
      zoe: true,
    },
    produce: {
      distributor: 'distributeFees',
    },
    issuer: { consume: { RUN: 'zoe' } },
    brand: { consume: { RUN: 'zoe' } },
  },
});

export const SIM_CHAIN_POST_BOOT_MANIFEST = harden({
  ...SHARED_POST_BOOT_MANIFEST,
  fundAMM: {
    consume: {
      centralSupplyBundle: true,
      mintHolderBundle: true,
      chainTimerService: 'timer',
      bldIssuerKit: true,
      feeMintAccess: true,
      loadVat: true,
      mints: 'mints',
      priceAuthorityVat: 'priceAuthority',
      priceAuthorityAdmin: 'priceAuthority',
      vaultFactoryCreator: 'VaultFactory',
      zoe: true,
    },
    issuer: {
      consume: { RUN: 'zoe' },
    },
    brand: {
      consume: { RUN: 'zoe' },
    },
    instance: {
      consume: { amm: 'amm' },
    },
  },
});
