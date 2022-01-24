// @ts-check
export const CHAIN_BOOTSTRAP_MANIFEST = harden({
  makeVatsFromBundles: {
    vats: {
      vatAdmin: true,
    },
    devices: {
      vatAdmin: true,
    },
    produce: {
      vatAdminSvc: true,
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
      zoe: true,
      feeMintAccess: true,
    },
  },
  makeBoard: {
    consume: {
      loadVat: true,
      client: true,
    },
    produce: {
      board: true,
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
    },
  },
  startTimerService: {
    devices: {
      timer: true,
    },
    vats: {
      timer: true,
    },
    produce: {
      chainTimerService: true,
    },
  },
  makeClientBanks: {
    consume: {
      loadVat: true,
      client: true,
      bridgeManager: true,
    },
    produce: {
      bankManager: true,
    },
  },
  makeBLDKit: {
    consume: {
      agoricNames: true,
      bankManager: true,
      nameAdmins: true,
    },
  },
  makeProvisioner: {
    consume: {
      loadVat: true,
      clientCreator: true,
    },
    produce: {
      provisioning: true,
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
  connectChainFaucet: {
    consume: {
      client: true,
    },
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
    consume: { zoe: true, client: true },
  },
  grantRunBehaviors: {
    runBehaviors: true,
    consume: { client: true },
  },
});

export const GOVERNANCE_ACTIONS_MANIFEST = harden({
  startVaultFactory: {
    consume: {
      agoricNames: true,
      nameAdmins: true,
      board: true,
      chainTimerService: true,
      loadVat: true,
      zoe: true,
      feeMintAccess: true,
    },
    produce: {
      priceAuthorityAdmin: true,
    },
  },
  installEconomicGovernance: {
    consume: {
      zoe: true,
      agoricNames: true,
      nameAdmins: true,
    },
  },
  startGetRun: {
    consume: {
      zoe: true,
      feeMintAccess: true,
      agoricNames: true,
      chainTimerService: true,
      nameAdmins: true,
      bridgeManager: true,
      client: true,
    },
  },
});
