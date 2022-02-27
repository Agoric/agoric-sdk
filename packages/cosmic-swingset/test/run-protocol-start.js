console.info('evaluating run-protocol-start.js ...');

const manifest = {
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
};

/**
 * Start the RUN protocol by running all permitted behaviors.
 * In run-protocol-permit.json, we enumerate them and the
 * powers permitted to each.
 *
 * @param {BootstrapPowers} powers
 */
const startRUNProtocol = powers => {
  const { runBehaviors } = powers;
  // const {
  //   vatParameters: {
  //     startEconomicCommittee: { economicComitteeAddresses },
  //   },
  // } = powers;
  console.info('startRUNProtocol: runBehaviors()...');

  return runBehaviors(manifest);
};

// "export" our behavior by way of the completion value of this script.
startRUNProtocol;
