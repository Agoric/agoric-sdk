// @ts-check
import { E } from '@endo/far';
import { AmountMath, AssetKind, makeIssuerKit } from '@agoric/ertp';
import { CONTRACT_ELECTORATE, ParamTypes } from '@agoric/governance';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';

/**
 * @param {EconomyBootstrapPowers & WellKnownSpaces} powers
 * @param {Object} config
 * @param {bigint} config.WantStableFeeBP
 * @param {bigint} config.GiveStableFeeBP
 * @param {bigint} config.MINT_LIMIT
 * @typedef {import('../econ-behaviors.js').EconomyBootstrapPowers} EconomyBootstrapPowers
 */
export const startPSM = async (
  {
    consume: {
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
      consume: { AUSD: anchorBrandP, RUN: runBrandP },
    },
    issuer: {
      consume: { AUSD: anchorIssuerP },
    },
  },
  {
    WantStableFeeBP = 1n,
    GiveStableFeeBP = 3n,
    MINT_LIMIT = 20_000_000n * 1_000_000n,
  },
) => {
  const [
    feeMintAccess,
    runBrand,
    anchorBrand,
    anchorIssuer,
    governor,
    psmInstall,
    timer,
  ] = await Promise.all([
    feeMintAccessP,
    runBrandP,
    anchorBrandP,
    anchorIssuerP,
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
      WantStableFeeBP: { type: ParamTypes.NAT, value: WantStableFeeBP },
      GiveStableFeeBP: { type: ParamTypes.NAT, value: GiveStableFeeBP },
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
        issuerKeywordRecord: { AUSD: anchorIssuer },
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
 * Make anchor issuer out of a Cosmos asset; presumably
 * USDC over IBC. Add it to BankManager.
 *
 * @param {EconomyBootstrapPowers & WellKnownSpaces} powers
 * @param {{ options: {
 *   denom: string,
 *   name?: string,
 *   proposedName: string,
 *   decimalPlaces?: number,
 * }}} config
 */
export const makeAnchorAsset = async (
  {
    consume: { bankManager },
    issuer: {
      produce: { AUSD: issuerP },
    },
    brand: {
      produce: { AUSD: brandP },
    },
  },
  {
    options: {
      denom,
      proposedName = 'USDC Anchor',
      name = 'AUSD',
      decimalPlaces = 6,
    },
  },
) => {
  // ISSUE: use mintHolder?
  const kit = makeIssuerKit(name, AssetKind.NAT, { decimalPlaces });

  issuerP.resolve(kit.issuer);
  brandP.resolve(kit.brand);
  return E(bankManager).addAsset(
    denom,
    name,
    proposedName,
    kit, // with mint
  );
};
harden(makeAnchorAsset);
