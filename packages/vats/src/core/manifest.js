// @ts-check
export const CHAIN_BOOTSTRAP_MANIFEST = harden({
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
      agoricNames: true,
      nameAdmins: true,
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
      client: true,
    },
    produce: {
      agoricNames: true,
      agoricNamesAdmin: true,
      nameAdmins: true,
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
    produce: {
      chainTimerService: 'timer',
    },
  },
  makeClientBanks: {
    consume: {
      bankManager: 'bank',
      client: true,
    },
    home: { produce: { bank: 'bank' } },
  },
  shareBootContractBundles: {
    produce: { centralSupplyBundle: true, pegasusBundle: true },
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
    vatParameters: {
      argv: { bootMsg: true },
    },
    consume: {
      agoricNames: true,
      nameAdmins: true,
      initialSupply: true,
      bridgeManager: true,
      loadVat: true,
      zoe: true,
    },
    produce: {
      bankManager: 'bank',
      bldIssuerKit: true,
    },
    // TODO: re-org loadVat, agoricNames to be
    // subject to permits such as these:
    issuer: { produce: { BLD: true, RUN: 'zoe' } },
    brand: { produce: { BLD: true, RUN: 'zoe' } },
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
      agoricNames: true,
      nameAdmins: true,
      namesByAddress: true,
      board: 'board',
      pegasusBundle: true,
      zoe: 'zoe',
    },
  },
  setupNetworkProtocols: {
    consume: {
      agoricNames: true,
      nameAdmins: true,
      client: true,
      loadVat: true,
      bridgeManager: true,
      zoe: true,
      provisioning: true,
    },
  },
  // TODO: resolve conflict with demo connectFaucet
  // connectChainFaucet: {
  //   consume: {
  //     client: true,
  //   },
  //   home: { produce: { faucet: true } },
  // },
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
  ...CHAIN_BOOTSTRAP_MANIFEST,
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

export const GOVERNANCE_ACTIONS_MANIFEST = harden({
  shareEconomyBundles: {
    produce: {
      ammBundle: true,
      vaultBundles: true,
      governanceBundles: true,
    },
  },
  startEconomicCommittee: {
    consume: {
      agoricNames: true,
      nameAdmins: true,
      zoe: true,
      governanceBundles: true,
    },
    produce: { economicCommitteeCreatorFacet: 'economicCommittee' },
    installation: {
      produce: {
        contractGovernor: 'zoe',
        binaryVoteCounter: 'zoe',
      },
    },
    instance: {
      produce: { economicCommittee: 'zoe' },
    },
  },
  setupAmm: {
    consume: {
      chainTimerService: 'timer',
      agoricNames: true,
      nameAdmins: true,
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
    },
    instance: {
      consume: { economicCommittee: 'zoe' },
      produce: { amm: 'zoe' },
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
  startVaultFactory: {
    consume: {
      feeMintAccess: 'zoe',
      agoricNames: true,
      vaultBundles: true,
      nameAdmins: true,
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
    installation: { consume: { contractGovernor: 'zoe' } },
    instance: {
      consume: { amm: 'zoe', economicCommittee: 'zoe' },
      produce: { VaultFactory: 'zoe' },
    },
  },
  configureVaultFactoryUI: {
    consume: { agoricNames: true, nameAdmins: true, board: true, zoe: true },
  },

export const DEMO_ECONOMY = harden({
  fundAMM: {
    consume: {
      agoricNames: true,
      centralSupplyBundle: true,
      chainTimerService: 'timer',
      bldIssuerKit: true,
      feeMintAccess: true,
      loadVat: true,
      mints: 'mints',
      priceAuthorityVat: 'priceAuthority',
      priceAuthorityAdmin: 'priceAuthority',
      vaultFactoryCreator: 'vaultFactory',
      zoe: true,
    },
  },
});
