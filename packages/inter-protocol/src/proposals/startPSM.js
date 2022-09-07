// @ts-check

import { AmountMath, AssetKind } from '@agoric/ertp';
import { CONTRACT_ELECTORATE, ParamTypes } from '@agoric/governance';
import { makeStorageNodeChild } from '@agoric/vats/src/lib-chainStorage.js';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';
import { E } from '@endo/far';
import { Stable } from '@agoric/vats/src/tokens.js';
import { deeplyFulfilledObject } from '@agoric/internal';
import { assert } from '@agoric/assert';
import { makeScalarMapStore } from '@agoric/vat-data';

import { reserveThenGetNamePaths } from './utils.js';

const BASIS_POINTS = 10000n;
const { details: X } = assert;

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
      chainStorage,
      chainTimerService,
      psmFacets,
    },
    installation: {
      consume: { contractGovernor, psm: psmInstall },
    },
    instance: {
      consume: { economicCommittee },
    },
    brand: {
      consume: { [Stable.symbol]: stableP },
    },
  },
  {
    options: { anchorOptions = {} } = {},
    WantMintedFeeBP = 1n,
    GiveMintedFeeBP = 3n,
    MINT_LIMIT = 20_000_000n * 1_000_000n,
  } = {},
) => {
  const { denom, keyword = 'AUSD' } = anchorOptions;
  assert.typeof(
    denom,
    'string',
    X`anchorOptions.denom must be a string, not ${denom}`,
  );
  const [stable, [anchorBrand, anchorIssuer], feeMintAccess] =
    await Promise.all([
      stableP,
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

  const mintLimit = AmountMath.make(anchorBrand, MINT_LIMIT);
  const terms = await deeplyFulfilledObject(
    harden({
      anchorBrand,
      anchorPerMinted: makeRatio(100n, anchorBrand, 100n, stable),
      governedParams: {
        [CONTRACT_ELECTORATE]: {
          type: ParamTypes.INVITATION,
          value: electorateInvitationAmount,
        },
        WantMintedFee: {
          type: ParamTypes.RATIO,
          value: makeRatio(WantMintedFeeBP, stable, BASIS_POINTS),
        },
        GiveMintedFee: {
          type: ParamTypes.RATIO,
          value: makeRatio(GiveMintedFeeBP, stable, BASIS_POINTS),
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
      economicCommittee,
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

  /** @typedef {import('./econ-behaviors.js').PSMFacets} PSMFacets */
  /** @type {PSMFacets} */
  const newPsmFacets = {
    psm,
    psmGovernor: governorFacets.instance,
    psmCreatorFacet,
    psmAdminFacet,
    psmGovernorCreatorFacet: governorFacets.creatorFacet,
  };

  /** @type {MapStore<Brand,PSMFacets>} */
  const psmFacetsMap = await psmFacets;

  psmFacetsMap.init(anchorBrand, newPsmFacets);
  const instanceKey = `psm.${Stable.symbol}.${keyword}`;
  const instanceAdmin = E(agoricNamesAdmin).lookupAdmin('instance');
  await E(instanceAdmin).update(instanceKey, newPsmFacets.psm);
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

/** @param {BootstrapSpace & EconomyBootstrapSpace & { devices: { vatAdmin: any }, vatPowers: { D: DProxy }, }} powers */
export const installGovAndPSMContracts = async ({
  vatPowers: { D },
  devices: { vatAdmin },
  consume: { zoe },
  produce: { psmFacets },
  installation: {
    produce: { contractGovernor, committee, binaryVoteCounter, psm },
  },
}) => {
  // In order to support multiple instances of the PSM, we store all the facets
  // indexed by the brand. Since each name in the BootstrapSpace can only be
  // produced  once, we produce an empty store here, and each time a PSM is
  // started up, the details are added to the store.
  psmFacets.resolve(makeScalarMapStore());

  return Promise.all(
    Object.entries({
      contractGovernor,
      committee,
      binaryVoteCounter,
      psm,
    }).map(async ([name, producer]) => {
      const bundleCap = D(vatAdmin).getNamedBundleCap(name);
      const bundle = D(bundleCap).getBundle();
      const installation = E(zoe).install(bundle);

      producer.resolve(installation);
    }),
  );
};

export const PSM_MANIFEST = harden({
  [makeAnchorAsset.name]: {
    consume: { agoricNamesAdmin: true, bankManager: 'bank', zoe: 'zoe' },
    installation: { consume: { mintHolder: 'zoe' } },
    issuer: {
      produce: { AUSD: true },
    },
    brand: {
      produce: { AUSD: true },
    },
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
      chainTimerService: 'timer',
      psmFacets: 'psm',
    },
    installation: {
      consume: { contractGovernor: 'zoe', psm: 'zoe' },
    },
    instance: {
      consume: { economicCommittee: 'economicCommittee' },
    },
    brand: {
      consume: { AUSD: 'bank', IST: 'zoe' },
    },
    issuer: {
      consume: { AUSD: 'bank' },
    },
  },
});

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
