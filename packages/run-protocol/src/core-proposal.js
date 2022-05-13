// @ts-check
import * as econBehaviors from './econ-behaviors.js';
import * as simBehaviors from './sim-behaviors.js';
import * as startPSM from './psm/startPSM.js';

export * from './econ-behaviors.js';
export * from './sim-behaviors.js';
// @ts-expect-error Module './econ-behaviors.js' has already exported a member
// named 'EconomyBootstrapPowers'.
export * from './psm/startPSM.js';

const ECON_COMMITTEE_MANIFEST = harden({
  [econBehaviors.startEconomicCommittee.name]: {
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
  [econBehaviors.setupAmm.name]: {
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
  [econBehaviors.startVaultFactory.name]: {
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
  [econBehaviors.grantVaultFactoryControl.name]: {
    consume: {
      client: 'provisioning',
      priceAuthorityAdmin: 'priceAuthority',
      vaultFactoryCreator: 'VaultFactory',
    },
  },

  [econBehaviors.setupReserve.name]: {
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

  [econBehaviors.configureVaultFactoryUI.name]: {
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

const REWARD_MANIFEST = harden({
  [econBehaviors.startRewardDistributor.name]: {
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
  [econBehaviors.startLienBridge.name]: {
    consume: { bridgeManager: true },
    produce: { lienBridge: true },
    brand: {
      consume: { BLD: 'BLD' },
    },
  },
  [econBehaviors.startRunStake.name]: {
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

export const PSM_MANIFEST = harden({
  [startPSM.makeAnchorAsset.name]: {
    consume: { bankManager: 'bank', zoe: 'zoe' },
    installation: { consume: { mintHolder: 'zoe' } },
    issuer: {
      produce: { AUSD: true },
    },
    brand: {
      produce: { AUSD: true },
    },
  },
  [startPSM.startPSM.name]: {
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

export const SIM_CHAIN_MANIFEST = harden({
  [simBehaviors.fundAMM.name]: {
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

export const getManifestForEconCommittee = (
  { restoreRef },
  { installKeys, econCommitteeSize = 3 },
) => {
  return {
    manifest: ECON_COMMITTEE_MANIFEST,
    installations: {
      contractGovernor: restoreRef(installKeys.contractGovernor),
      committee: restoreRef(installKeys.committee),
      binaryVoteCounter: restoreRef(installKeys.binaryVoteCounter),
    },
    options: {
      econCommitteeSize,
    },
  };
};

export const getManifestForMain = (
  { restoreRef },
  {
    installKeys,
    vaultFactoryControllerAddress,
    anchorDenom,
    anchorDecimalPlaces,
    anchorKeyword,
    anchorProposedName,
  },
) => {
  return {
    manifest: {
      ...SHARED_MAIN_MANIFEST,
      ...(anchorDenom && PSM_MANIFEST),
    },
    installations: {
      amm: restoreRef(installKeys.amm),
      VaultFactory: restoreRef(installKeys.vaultFactory),
      liquidate: restoreRef(installKeys.liquidate),
      reserve: restoreRef(installKeys.reserve),
      ...(anchorDenom && {
        psm: restoreRef(installKeys.psm),
        mintHolder: restoreRef(installKeys.mintHolder),
      }),
    },
    options: {
      vaultFactoryControllerAddress,
      anchorDenom,
      anchorDecimalPlaces,
      anchorKeyword,
      anchorProposedName,
    },
  };
};

const roleToManifest = harden({
  chain: {
    ...REWARD_MANIFEST,
    ...RUN_STAKE_MANIFEST,
  },
  'sim-chain': SIM_CHAIN_MANIFEST,
  client: {},
});

export const getManifestForRunProtocol = (
  { restoreRef },
  {
    ROLE = 'chain',
    anchorDenom,
    anchorDecimalPlaces = 6,
    anchorKeyword = 'AUSD',
    anchorProposedName = 'AUSD',
    econCommitteeSize = 3,
    installKeys,
    vaultFactoryControllerAddress,
  },
) => {
  const econCommitteeManifest = getManifestForEconCommittee(
    { restoreRef },
    { installKeys, econCommitteeSize },
  );
  const mainManifest = getManifestForMain(
    { restoreRef },
    {
      installKeys,
      vaultFactoryControllerAddress,
      anchorDenom,
      anchorDecimalPlaces,
      anchorKeyword,
      anchorProposedName,
    },
  );
  return {
    manifest: {
      ...econCommitteeManifest.manifest,
      ...mainManifest.manifest,
      ...roleToManifest[ROLE],
    },
    installations: {
      ...econCommitteeManifest.installations,
      ...mainManifest.installations,
      runStake: restoreRef(installKeys.runStake),
    },
    options: {
      ...econCommitteeManifest.options,
      ...mainManifest.options,
      vaultFactoryControllerAddress,
    },
  };
};
