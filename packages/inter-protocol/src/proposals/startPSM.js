// @ts-check

import { AmountMath, AssetKind } from '@agoric/ertp';
import { CONTRACT_ELECTORATE, ParamTypes } from '@agoric/governance';
import { makeStorageNodeChild } from '@agoric/vats/src/lib-chainStorage.js';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';
import { E } from '@endo/far';
import { Stable } from '@agoric/vats/src/tokens.js';
import { deeplyFulfilledObject } from '@agoric/internal';
import { assert } from '@agoric/assert';
import { reserveThenDeposit, reserveThenGetNamePaths } from './utils.js';

const BASIS_POINTS = 10000n;
const { details: X } = assert;

/**
 * @param {EconomyBootstrapPowers & WellKnownSpaces} powers
 * @param {object} [config]
 * @param {bigint} [config.WantStableFeeBP]
 * @param {bigint} [config.GiveStableFeeBP]
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
    },
    produce: { psmCreatorFacet, psmGovernorCreatorFacet, psmAdminFacet },
    installation: {
      consume: { contractGovernor, psm: psmInstall },
    },
    instance: {
      consume: { economicCommittee },
      produce: { psm: psmInstanceR, psmGovernor: psmGovernorR },
    },
    brand: {
      consume: { [Stable.symbol]: stableP },
    },
  },
  {
    options: { anchorOptions = {} } = {},
    WantStableFeeBP = 1n,
    GiveStableFeeBP = 3n,
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
      anchorPerStable: makeRatio(100n, anchorBrand, 100n, stable),
      governedParams: {
        [CONTRACT_ELECTORATE]: {
          type: ParamTypes.INVITATION,
          value: electorateInvitationAmount,
        },
        WantStableFee: {
          type: ParamTypes.RATIO,
          value: makeRatio(WantStableFeeBP, stable, BASIS_POINTS),
        },
        GiveStableFee: {
          type: ParamTypes.RATIO,
          value: makeRatio(GiveStableFeeBP, stable, BASIS_POINTS),
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

  psmInstanceR.resolve(await E(governorFacets.creatorFacet).getInstance());
  psmGovernorR.resolve(governorFacets.instance);
  psmCreatorFacet.resolve(E(governorFacets.creatorFacet).getCreatorFacet());
  psmAdminFacet.resolve(E(governorFacets.creatorFacet).getAdminFacet());
  psmGovernorCreatorFacet.resolve(governorFacets.creatorFacet);
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

/** @param {BootstrapSpace & { devices: { vatAdmin: any }, vatPowers: { D: DProxy }, }} powers */
export const installGovAndPSMContracts = async ({
  vatPowers: { D },
  devices: { vatAdmin },
  consume: { zoe },
  installation: {
    produce: {
      contractGovernor,
      committee,
      binaryVoteCounter,
      psm,
      psmCharter,
    },
  },
}) => {
  return Promise.all(
    Object.entries({
      contractGovernor,
      committee,
      binaryVoteCounter,
      psm,
      psmCharter,
    }).map(async ([name, producer]) => {
      const bundleCap = D(vatAdmin).getNamedBundleCap(name);
      const bundle = D(bundleCap).getBundle();
      const installation = E(zoe).install(bundle);

      producer.resolve(installation);
    }),
  );
};

const { values } = Object;

/** @type { <X, Y>(xs: X[], ys: Y[]) => [X, Y][]} */
const zip = (xs, ys) => xs.map((x, i) => [x, ys[i]]);

/**
 * @param {import('./econ-behaviors').EconomyBootstrapPowers} powers
 * @param {{ options: { voterAddresses: Record<string, string> }}} param1
 */
export const invitePSMCommitteeMembers = async (
  {
    consume: {
      zoe,
      namesByAddressAdmin,
      economicCommitteeCreatorFacet,
      psmCreatorFacet,
    },
    installation: {
      consume: { binaryVoteCounter: counterP, psmCharter: psmCharterP },
    },
  },
  { options: { voterAddresses } },
) => {
  /** @type {[Installation, Installation]} */
  const [charterInstall, counterInstall] = await Promise.all([
    psmCharterP,
    counterP,
  ]);
  const terms = await deeplyFulfilledObject(
    harden({
      binaryVoteCounterInstallation: counterInstall,
    }),
  );
  const privateFacets = {
    psm: psmCreatorFacet,
  };
  const { creatorFacet } = E.get(
    E(zoe).startInstance(charterInstall, undefined, terms, privateFacets),
  );

  const invitations = await E(
    economicCommitteeCreatorFacet,
  ).getVoterInvitations();
  assert.equal(invitations.length, values(voterAddresses).length);

  /**
   * @param {[string, Promise<Invitation>][]} addrInvitations
   */
  const distributeInvitations = async addrInvitations => {
    await Promise.all(
      addrInvitations.map(async ([addr, invitationP]) => {
        const [voterInvitation, charterMemberInvitation] = await Promise.all([
          invitationP,
          E(creatorFacet).makeCharterMemberInvitation(),
        ]);
        console.log('@@@sending charter, voting invitations to', addr);
        await reserveThenDeposit(
          `econ committee member ${addr}`,
          namesByAddressAdmin,
          addr,
          [voterInvitation, charterMemberInvitation],
        );
        console.log('@@@sent charter, voting invitations to', addr);
      }),
    );
  };

  await distributeInvitations(zip(values(voterAddresses), invitations));
};

harden(invitePSMCommitteeMembers);

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
    },
    produce: {
      psmCreatorFacet: 'psm',
      psmAdminFacet: 'psm',
      psmGovernorCreatorFacet: 'psmGovernor',
    },
    installation: {
      consume: { contractGovernor: 'zoe', psm: 'zoe' },
    },
    instance: {
      consume: { economicCommittee: 'economicCommittee' },
      produce: { psm: 'psm', psmGovernor: 'psm' },
    },
    brand: {
      consume: { AUSD: 'bank', IST: 'zoe' },
    },
    issuer: {
      consume: { AUSD: 'bank' },
    },
  },
  [invitePSMCommitteeMembers.name]: {
    consume: {
      zoe: true,
      namesByAddressAdmin: true,
      economicCommitteeCreatorFacet: true,
      psmCreatorFacet: true,
    },
    installation: {
      consume: { binaryVoteCounter: true, psmCharter: true },
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
