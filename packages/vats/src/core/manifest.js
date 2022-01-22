// @ts-check
export const CHAIN_BOOTSTRAP_MANIFEST = harden({
  connectVattpWithMailbox: {
    vatPowers: {
      D: true,
    },
    vats: {
      vattp: true,
    },
    devices: {
      mailbox: true,
    },
  },
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
  registerProvisioner: {
    consume: {
      loadVat: true,
      chainBundler: true,
    },
    vats: {
      comms: true,
      vattp: true,
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
    produce: { client: true, chainBundler: true },
  },
  connectFaucet: {
    consume: { zoe: true, client: true },
    produce: { bridgeManager: true },
  },
  grantRunBehaviors: {
    runBehaviors: true,
    consume: { client: true },
  },
});

export const GOVERNANCE_OPTIONS_MANIFEST = harden({
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
  },
  startAttestation: {
    consume: {
      agoricNames: true,
      bridgeManager: true,
      client: true,
      nameAdmins: true,
      zoe: true,
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
    },
  },
});
