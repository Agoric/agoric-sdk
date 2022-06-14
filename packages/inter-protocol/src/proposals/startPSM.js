// @ts-check
import { E } from '@endo/far';
import { AmountMath, AssetKind } from '@agoric/ertp';
import { CONTRACT_ELECTORATE, ParamTypes } from '@agoric/governance';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';
import { reserveThenGetNamePaths } from './utils.js';

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
      zoe,
      feeMintAccess: feeMintAccessP,
      economicCommitteeCreatorFacet,
      chainTimerService,
    },
    produce: { psmCreatorFacet, psmGovernorCreatorFacet },
    installation: {
      consume: { contractGovernor, psm: psmInstallP },
    },
    instance: {
      consume: { economicCommittee },
      produce: { psm: psmInstanceR, psmGovernor: psmGovernorR },
    },
    brand: {
      consume: { RUN: runBrandP },
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
  const [
    feeMintAccess,
    runBrand,
    [anchorBrand, anchorIssuer],
    governor,
    psmInstall,
    timer,
  ] = await Promise.all([
    feeMintAccessP,
    runBrandP,
    reserveThenGetNamePaths(agoricNamesAdmin, [
      ['brand', keyword],
      ['issuer', keyword],
    ]),
    contractGovernor,
    psmInstallP,
    chainTimerService,
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
  const terms = {
    anchorBrand,
    anchorPerStable: makeRatio(100n, anchorBrand, 100n, runBrand),
    governedParams: {
      [CONTRACT_ELECTORATE]: {
        type: ParamTypes.INVITATION,
        value: electorateInvitationAmount,
      },
      WantStableFee: {
        type: ParamTypes.RATIO,
        value: makeRatio(WantStableFeeBP, runBrand, BASIS_POINTS),
      },
      GiveStableFee: {
        type: ParamTypes.RATIO,
        value: makeRatio(GiveStableFeeBP, runBrand, BASIS_POINTS),
      },
      MintLimit: { type: ParamTypes.AMOUNT, value: mintLimit },
    },
    [CONTRACT_ELECTORATE]: {
      type: ParamTypes.INVITATION,
      value: electorateInvitationAmount,
    },
  };

  const governorFacets = await E(zoe).startInstance(
    governor,
    {},
    {
      timer,
      economicCommittee,
      governedContractInstallation: psmInstall,
      governed: harden({
        terms,
        issuerKeywordRecord: { [keyword]: anchorIssuer },
        privateArgs: { feeMintAccess, initialPoserInvitation },
      }),
    },
    harden({ economicCommitteeCreatorFacet }),
  );

  const governedInstance = await E(governorFacets.creatorFacet).getInstance();
  const creatorFacet = E(governorFacets.creatorFacet).getCreatorFacet();

  psmInstanceR.resolve(governedInstance);
  psmGovernorR.resolve(governorFacets.instance);
  psmCreatorFacet.resolve(creatorFacet);
  psmGovernorCreatorFacet.resolve(governorFacets.creatorFacet);
  psmInstanceR.resolve(governedInstance);
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

  /** @type {import('@agoric/vats/src/mintHolder.js').AssetTerms} */
  const terms = {
    keyword,
    assetKind: AssetKind.NAT,
    displayInfo: {
      decimalPlaces,
      assetKind: AssetKind.NAT,
    },
  };
  const { creatorFacet: mint, publicFacet: issuer } = E.get(
    E(zoe).startInstance(mintHolder, {}, terms),
  );

  const brand = await E(issuer).getBrand();
  const kit = { mint, issuer, brand };
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
  },
  [startPSM.name]: {
    consume: {
      agoricNamesAdmin: true,
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
