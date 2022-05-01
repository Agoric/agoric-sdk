export * from './econ-behaviors.js';
export * from './sim-behaviors.js';
export * from './psm/startPSM.js';

const ECON_COMMITTEE_MANIFEST = harden({
  startEconomicCommittee: {
    consume: {
      zoe: true,
    },
    produce: { economicCommitteeCreatorFacet: 'economicCommittee' },
    installation: {
      consume: { committee: 'zoe' },
    },
    instance: {
      produce: { economicCommittee: 'economicCommittee' },
    },
  },
});

const SHARED_MAIN_MANIFEST = harden({
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

const SHARED_POST_BOOT_MANIFEST = harden({
  ...ECON_COMMITTEE_MANIFEST,
  ...SHARED_MAIN_MANIFEST,
});

const REWARD_MANIFEST = harden({
  startRewardDistributor: {
    consume: {
      chainTimerService: true,
      bankManager: true,
      loadVat: true,
      vaultFactoryCreator: true,
      ammCreatorFacet: true,
      runStakeCreatorFacet: true,
      zoe: true,
    },
    issuer: { consume: { RUN: 'zoe' } },
    brand: { consume: { RUN: 'zoe' } },
  },
});

const RUN_STAKE_MANIFEST = harden({
  startLienBridge: {
    consume: { bridgeManager: true },
    produce: { lienBridge: true },
    brand: {
      consume: { BLD: 'BLD' },
    },
  },
  startRunStake: {
    consume: {
      zoe: 'zoe',
      feeMintAccess: 'zoe',
      lienBridge: true,
      client: 'provisioning',
      chainTimerService: 'timer',
      economicCommitteeCreatorFacet: 'economicCommittee',
    },
    produce: {
      runStakeCreatorFacet: 'runStake',
      runStakeGovernorCreatorFacet: 'runStake',
    },
    installation: {
      consume: { contractGovernor: 'zoe', runStake: 'zoe' },
    },
    instance: {
      consume: { economicCommittee: 'economicCommittee' },
      produce: { runStake: 'runStake' },
    },
    brand: {
      consume: { BLD: 'BLD', RUN: 'zoe' },
      produce: { Attestation: 'runStake' },
    },
    issuer: {
      consume: { BLD: 'BLD' },
      produce: { Attestation: 'runStake' },
    },
  },
});

export const CHAIN_POST_BOOT_MANIFEST = harden({
  ...SHARED_POST_BOOT_MANIFEST,
  ...REWARD_MANIFEST,
  ...RUN_STAKE_MANIFEST,
});

export const PSM_MANIFEST = harden({
  makeAnchorAsset: {
    consume: { bankManager: 'bank', zoe: 'zoe' },
    installation: { consume: { mintHolder: 'zoe' } },
    issuer: {
      produce: { AUSD: true },
    },
    brand: {
      produce: { AUSD: true },
    },
  },
  startPSM: {
    consume: {
      zoe: 'zoe',
      feeMintAccess: 'zoe',
      economicCommitteeCreatorFacet: 'economicCommittee',
      chainTimerService: 'timer',
    },
    produce: { psmCreatorFacet: 'psm', psmGovernorCreatorFacet: 'psmGovernor' },
    installation: {
      consume: { contractGovernor: 'zoe', psm: 'zoe' },
    },
    instance: {
      consume: { economicCommittee: 'economicCommittee' },
      produce: { psm: 'psm', psmGovernor: 'psm' },
    },
    brand: {
      consume: { AUSD: 'bank', RUN: 'zoe' },
    },
    issuer: {
      consume: { AUSD: 'bank' },
    },
  },
});

const MAIN_MANIFEST = harden({
  ...SHARED_MAIN_MANIFEST,
  ...RUN_STAKE_MANIFEST,
  ...REWARD_MANIFEST,
  // XXX PSM work-around ...PSM_MANIFEST,
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
    installation: {
      consume: { centralSupply: 'zoe' },
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
  'run-preview': {
    ...ECON_COMMITTEE_MANIFEST,
    ...CHAIN_POST_BOOT_MANIFEST,
  },
  client: {},
});

export const getManifestForRunProtocol = (
  { restoreRef },
  { ROLE = 'chain', installKeys, vaultFactoryControllerAddress },
) => {
  return {
    manifest: roleToGovernanceActions[ROLE],
    installations: {
      amm: restoreRef(installKeys.amm),
      VaultFactory: restoreRef(installKeys.vaultFactory),
      liquidate: restoreRef(installKeys.liquidate),
      reserve: restoreRef(installKeys.reserve),
      runStake: restoreRef(installKeys.runStake),
      contractGovernor: restoreRef(installKeys.contractGovernor),
      committee: restoreRef(installKeys.committee),
      binaryVoteCounter: restoreRef(installKeys.binaryVoteCounter),
    },
    options: {
      vaultFactoryControllerAddress,
    },
  };
};

export const getManifestForEconCommittee = (
  { restoreRef },
  { installKeys },
) => {
  return {
    manifest: ECON_COMMITTEE_MANIFEST,
    installations: {
      contractGovernor: restoreRef(installKeys.contractGovernor),
      committee: restoreRef(installKeys.committee),
      binaryVoteCounter: restoreRef(installKeys.binaryVoteCounter),
    },
  };
};

export const getManifestForMain = (
  { restoreRef },
  { installKeys, vaultFactoryControllerAddress, anchorDenom },
) => {
  return {
    manifest: MAIN_MANIFEST,
    installations: {
      amm: restoreRef(installKeys.amm),
      VaultFactory: restoreRef(installKeys.vaultFactory),
      liquidate: restoreRef(installKeys.liquidate),
      reserve: restoreRef(installKeys.reserve),
      runStake: restoreRef(installKeys.runStake),
      // psm: restoreRef(installKeys.psm),
      // mintHolder: restoreRef(installKeys.mintHolder),
    },
    options: {
      vaultFactoryControllerAddress,
      denom: anchorDenom,
    },
  };
};
