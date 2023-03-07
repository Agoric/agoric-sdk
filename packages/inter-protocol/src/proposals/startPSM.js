import { AmountMath, AssetKind } from '@agoric/ertp';
import { CONTRACT_ELECTORATE, ParamTypes } from '@agoric/governance';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';
import { E } from '@endo/far';
import { Stable } from '@agoric/vats/src/tokens.js';
import { deeplyFulfilledObject } from '@agoric/internal';
import { makeScalarMapStore } from '@agoric/vat-data';

import { reserveThenGetNamePaths } from './utils.js';

import {
  inviteCommitteeMembers,
  startEconCharter,
  inviteToEconCharter,
} from './committee-proposal.js';

const BASIS_POINTS = 10000n;
const { details: X } = assert;

export { inviteCommitteeMembers, startEconCharter, inviteToEconCharter };

/**
 * @param {EconomyBootstrapPowers & WellKnownSpaces} powers
 * @param {object} [config]
 * @param {bigint} [config.WantMintedFeeBP]
 * @param {bigint} [config.GiveMintedFeeBP]
 * @param {bigint} [config.MINT_LIMIT]
 * @param {{ anchorOptions?: AnchorOptions } } [config.options]
 *
 * @typedef {import('./econ-behaviors.js').EconomyBootstrapPowers} EconomyBootstrapPowers
 */
export const startPSM = async (
  {
    consume: {
      agoricNamesAdmin,
      board,
      zoe,
      feeMintAccess: feeMintAccessP,
      economicCommitteeCreatorFacet,
      econCharterKit,
      provisionPoolStartResult,
      chainStorage,
      chainTimerService,
      psmKit,
    },
    produce: { psmKit: producepsmKit },
    installation: {
      consume: { contractGovernor, psm: psmInstall },
    },
    brand: {
      consume: { [Stable.symbol]: mintedP },
    },
  },
  {
    options: { anchorOptions = {} } = {},
    WantMintedFeeBP = 0n,
    GiveMintedFeeBP = 0n,
    MINT_LIMIT = 1_000n * 1_000_000n,
  } = {},
) => {
  const { denom, keyword = 'AUSD' } = anchorOptions;
  assert.typeof(
    denom,
    'string',
    X`anchorOptions.denom must be a string, not ${denom}`,
  );
  /** @type {[Brand<'nat'>, [Brand<'nat'>, Issuer<'nat'>], FeeMintAccess]} */
  // @ts-expect-error cast
  const [minted, [anchorBrand, anchorIssuer], feeMintAccess] =
    await Promise.all([
      mintedP,
      reserveThenGetNamePaths(agoricNamesAdmin, [
        ['brand', keyword],
        ['issuer', keyword],
      ]),
      feeMintAccessP,
    ]);

  const poserInvitationP = E(
    economicCommitteeCreatorFacet,
  ).getPoserInvitation();
  const [initialPoserInvitation, electorateInvitationAmount] =
    await Promise.all([
      poserInvitationP,
      E(E(zoe).getInvitationIssuer()).getAmountOf(poserInvitationP),
    ]);

  const [anchorInfo, mintedInfo] = await Promise.all(
    [anchorBrand, minted].map(b => E(b).getDisplayInfo()),
  );

  const mintLimit = AmountMath.make(minted, MINT_LIMIT);
  const anchorDecimalPlaces = anchorInfo.decimalPlaces || 1n;
  const mintedDecimalPlaces = mintedInfo.decimalPlaces || 1n;
  const terms = await deeplyFulfilledObject(
    harden({
      anchorBrand,
      anchorPerMinted: makeRatio(
        10n ** BigInt(anchorDecimalPlaces),
        anchorBrand,
        10n ** BigInt(mintedDecimalPlaces),
        minted,
      ),
      governedParams: {
        [CONTRACT_ELECTORATE]: {
          type: ParamTypes.INVITATION,
          value: electorateInvitationAmount,
        },
        WantMintedFee: {
          type: ParamTypes.RATIO,
          value: makeRatio(WantMintedFeeBP, minted, BASIS_POINTS),
        },
        GiveMintedFee: {
          type: ParamTypes.RATIO,
          value: makeRatio(GiveMintedFeeBP, minted, BASIS_POINTS),
        },
        MintLimit: { type: ParamTypes.AMOUNT, value: mintLimit },
      },
      [CONTRACT_ELECTORATE]: {
        type: ParamTypes.INVITATION,
        value: electorateInvitationAmount,
      },
    }),
  );

  const psmStorageNode = await makeStorageNodeChild(chainStorage, 'psm');
  const storageNode = E(
    E(psmStorageNode).makeChildNode(Stable.symbol),
  ).makeChildNode(keyword);

  const marshaller = await E(board).getPublishingMarshaller();

  const governorTerms = await deeplyFulfilledObject(
    harden({
      timer: chainTimerService,
      governedContractInstallation: psmInstall,
      governed: {
        terms,
        issuerKeywordRecord: { [keyword]: anchorIssuer },
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
        feeMintAccess,
        initialPoserInvitation,
        marshaller,
        storageNode,
      },
    }),
  );

  const [psm, psmCreatorFacet, psmAdminFacet] = await Promise.all([
    E(governorFacets.creatorFacet).getInstance(),
    E(governorFacets.creatorFacet).getCreatorFacet(),
    E(governorFacets.creatorFacet).getAdminFacet(),
  ]);

  /** @typedef {import('./econ-behaviors.js').PSMKit} psmKit */
  /** @type {psmKit} */
  const newpsmKit = {
    psm,
    psmGovernor: governorFacets.instance,
    psmCreatorFacet,
    psmAdminFacet,
    psmGovernorCreatorFacet: governorFacets.creatorFacet,
  };

  // Provide pattern with a promise.
  producepsmKit.resolve(makeScalarMapStore());

  /** @type {MapStore<Brand,psmKit>} */
  const psmKitMap = await psmKit;

  psmKitMap.init(anchorBrand, newpsmKit);
  const instanceKey = `psm-${Stable.symbol}-${keyword}`;
  const instanceAdmin = E(agoricNamesAdmin).lookupAdmin('instance');

  await Promise.all([
    E(instanceAdmin).update(instanceKey, newpsmKit.psm),
    E(E.get(econCharterKit).creatorFacet).addInstance(
      psm,
      governorFacets.creatorFacet,
      instanceKey,
    ),
    // @ts-expect-error TODO type for provisionPoolStartResult
    E(E.get(provisionPoolStartResult).creatorFacet).initPSM(
      anchorBrand,
      newpsmKit.psm,
    ),
  ]);
};
harden(startPSM);

/**
 * @typedef {object} AnchorOptions
 * @property {string} [denom]
 * @property {string} [keyword]
 * @property {number} [decimalPlaces]
 * @property {string} [proposedName]
 */

/**
 * Make anchor issuer out of a Cosmos asset; presumably
 * USDC over IBC. Add it to BankManager.
 *
 * @param {EconomyBootstrapPowers & WellKnownSpaces} powers
 * @param {{options?: { anchorOptions?: AnchorOptions } }} [config]
 */
export const makeAnchorAsset = async (
  {
    consume: { agoricNamesAdmin, bankManager, zoe },
    installation: {
      consume: { mintHolder },
    },
    produce: { testFirstAnchorKit },
  },
  { options: { anchorOptions = {} } = {} },
) => {
  assert.typeof(anchorOptions, 'object', X`${anchorOptions} must be an object`);
  const {
    denom,
    keyword = 'AUSD',
    decimalPlaces = 6,
    proposedName = 'AUSD',
  } = anchorOptions;
  assert.typeof(
    denom,
    'string',
    X`anchorOptions.denom must be a string, not ${denom}`,
  );

  const terms = await deeplyFulfilledObject(
    harden({
      keyword,
      assetKind: AssetKind.NAT,
      displayInfo: {
        decimalPlaces,
        assetKind: AssetKind.NAT,
      },
    }),
  );
  /** @type {{ creatorFacet: ERef<Mint<'nat'>>, publicFacet: ERef<Issuer<'nat'>> }} */
  // @ts-expect-error cast
  const { creatorFacet: mint, publicFacet: issuerP } = E.get(
    E(zoe).startInstance(mintHolder, {}, terms),
  );
  const issuer = await issuerP; // identity of issuers is important

  const brand = await E(issuer).getBrand();
  const kit = { mint, issuer, brand };

  testFirstAnchorKit.resolve(kit);

  return Promise.all([
    E(E(agoricNamesAdmin).lookupAdmin('issuer')).update(keyword, kit.issuer),
    E(E(agoricNamesAdmin).lookupAdmin('brand')).update(keyword, kit.brand),
    E(bankManager).addAsset(
      denom,
      keyword,
      proposedName,
      kit, // with mint
    ),
  ]);
};
harden(makeAnchorAsset);

/** @typedef {import('./econ-behaviors.js').EconomyBootstrapSpace} EconomyBootstrapSpace */

/** @param {BootstrapSpace & EconomyBootstrapSpace} powers */
export const installGovAndPSMContracts = async ({
  consume: { vatAdminSvc, zoe },
  produce: { psmKit },
  installation: {
    produce: {
      contractGovernor,
      committee,
      binaryVoteCounter,
      psm,
      econCommitteeCharter,
    },
  },
}) => {
  // In order to support multiple instances of the PSM, we store all the facets
  // indexed by the brand. Since each name in the BootstrapSpace can only be
  // produced  once, we produce an empty store here, and each time a PSM is
  // started up, the details are added to the store.
  psmKit.resolve(makeScalarMapStore());

  return Promise.all(
    Object.entries({
      contractGovernor,
      committee,
      binaryVoteCounter,
      psm,
      econCommitteeCharter,
    }).map(async ([name, producer]) => {
      const bundleID = await E(vatAdminSvc).getBundleIDByName(name);
      const installation = await E(zoe).installBundleID(bundleID);

      producer.resolve(installation);
    }),
  );
};

/**
 * PSM and gov contracts are available as
 * named swingset bundles only in
 * decentral-psm-config.json
 *
 * @type {import('@agoric/vats/src/core/manifest.js').BootstrapManifest}
 */
export const PSM_GOV_MANIFEST = {
  [installGovAndPSMContracts.name]: {
    consume: { vatAdminSvc: 'true', zoe: 'zoe' },
    produce: { psmKit: 'true' },
    installation: {
      produce: {
        contractGovernor: 'zoe',
        committee: 'zoe',
        binaryVoteCounter: 'zoe',
        psm: 'zoe',
        econCommitteeCharter: 'zoe',
      },
    },
  },
  [startEconCharter.name]: {
    consume: { zoe: 'zoe', agoricNames: true },
    produce: {
      econCharterKit: 'econCommitteeCharter',
    },
    installation: {
      consume: { binaryVoteCounter: 'zoe', econCommitteeCharter: 'zoe' },
    },
    instance: {
      produce: { econCommitteeCharter: 'econCommitteeCharter' },
    },
  },
};

export const INVITE_PSM_COMMITTEE_MANIFEST = harden(
  /** @type {import('@agoric/vats/src/core/manifest.js').BootstrapManifest} */
  ({
    [inviteCommitteeMembers.name]: {
      consume: {
        namesByAddressAdmin: true,
        economicCommitteeCreatorFacet: true,
        econCharterKit: true,
      },
    },
    [inviteToEconCharter.name]: {
      consume: {
        namesByAddressAdmin: true,
        econCharterKit: true,
      },
    },
  }),
);

/** @type {import('@agoric/vats/src/core/manifest.js').BootstrapManifest} */
export const PSM_MANIFEST = harden({
  /** @type {import('@agoric/vats/src/core/manifest.js').BootstrapManifestPermit} */
  [makeAnchorAsset.name]: {
    consume: { agoricNamesAdmin: true, bankManager: 'bank', zoe: 'zoe' },
    installation: { consume: { mintHolder: 'zoe' } },
    produce: { testFirstAnchorKit: true },
  },
  [startPSM.name]: {
    consume: {
      agoricNamesAdmin: true,
      board: true,
      chainStorage: true,
      zoe: 'zoe',
      feeMintAccess: 'zoe',
      economicCommitteeCreatorFacet: 'economicCommittee',
      provisionPoolStartResult: true,
      econCharterKit: 'econCommitteeCharter',
      chainTimerService: 'timer',
      psmKit: true,
    },
    produce: { psmKit: 'true' },
    installation: {
      consume: { contractGovernor: 'zoe', psm: 'zoe' },
    },
    instance: {
      consume: { economicCommittee: 'economicCommittee' },
    },
    brand: {
      consume: { [Stable.symbol]: 'zoe' },
    },
  },
});

export const getManifestForPsmGovernance = (
  { restoreRef },
  { installKeys },
) => {
  const { [installGovAndPSMContracts.name]: _, ...manifest } = PSM_GOV_MANIFEST;
  return {
    manifest,
    installations: {
      econCommitteeCharter: restoreRef(installKeys.econCommitteeCharter),
      contractGovernor: restoreRef(installKeys.contractGovernor),
      committee: restoreRef(installKeys.committee),
      binaryVoteCounter: restoreRef(installKeys.binaryVoteCounter),
    },
  };
};

export const getManifestForPsm = (
  { restoreRef },
  { installKeys, anchorOptions },
) => {
  return {
    manifest: PSM_MANIFEST,
    installations: {
      psm: restoreRef(installKeys.psm),
      mintHolder: restoreRef(installKeys.mintHolder),
    },
    options: {
      anchorOptions,
    },
  };
};
