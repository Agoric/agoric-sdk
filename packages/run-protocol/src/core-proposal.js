export * from './econ-behaviors.js';
export * from './sim-behaviors.js';

const SHARED_POST_BOOT_MANIFEST = harden({
  startEconomicCommittee: {
    consume: {
      zoe: true,
      governanceBundles: true,
    },
    produce: { economicCommitteeCreatorFacet: 'economicCommittee' },
    installation: {
      consume: { committee: 'zoe' },
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
    },
    produce: {
      ammCreatorFacet: 'amm',
      ammGovernorCreatorFacet: 'amm',
    },
    issuer: { consume: { RUN: 'zoe' } },
    installation: {
      consume: { contractGovernor: 'zoe', amm: 'zoe' },
    },
    instance: {
      consume: { economicCommittee: 'economicCommittee' },
      produce: { amm: 'amm', ammGovernor: 'ammGovernor' },
    },
  },
  startVaultFactory: {
    consume: {
      feeMintAccess: 'zoe',
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
      consume: {
        contractGovernor: 'zoe',
        VaultFactory: 'zoe',
        liquidate: 'zoe',
      },
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

  setupReserve: {
    consume: {
      feeMintAccess: 'zoe',
      chainTimerService: 'timer',
      zoe: 'zoe',
      economicCommitteeCreatorFacet: 'economicCommittee',
    },
    produce: {
      reserveCreatorFacet: 'reserve',
      reserveGovernorCreatorFacet: 'reserve',
      reservePublicFacet: 'reserve',
    },
    issuer: { consume: { RUN: 'zoe' } },
    brand: { consume: { RUN: 'zoe' } },
    installation: {
      consume: { contractGovernor: 'zoe', reserve: 'zoe' },
    },
    instance: {
      consume: { amm: 'amm', economicCommittee: 'economicCommittee' },
      produce: {
        reserve: 'reserve',
        reserveGovernor: 'ReserveGovernor',
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

const roleToGovernanceActions = harden({
  chain: CHAIN_POST_BOOT_MANIFEST,
  'sim-chain': SIM_CHAIN_POST_BOOT_MANIFEST,
  client: {},
});

export const getManifestForRunProtocol = (
  { restoreRef },
  { ROLE = 'chain', installKeys },
) => {
  return {
    manifest: roleToGovernanceActions[ROLE],
    installations: {
      runStake: restoreRef(installKeys.runStake),
      amm: restoreRef(installKeys.amm),
      VaultFactory: restoreRef(installKeys.vaultFactory),
      liquidate: restoreRef(installKeys.liquidate),
      reserve: restoreRef(installKeys.reserve),
      psm: restoreRef(installKeys.psm),
      contractGovernor: restoreRef(installKeys.contractGovernor),
      committee: restoreRef(installKeys.committee),
      binaryVoteCounter: restoreRef(installKeys.binaryVoteCounter),
    },
  };
};
