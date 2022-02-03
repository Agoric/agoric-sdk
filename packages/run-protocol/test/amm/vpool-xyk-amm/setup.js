// @ts-check

import bundleSource from '@endo/bundle-source';
import { E } from '@agoric/eventual-send';
import { makeLoopback } from '@endo/captp';

import { resolve as importMetaResolve } from 'import-meta-resolve';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';

import { makeZoeKit } from '@agoric/zoe';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { makeAmmTerms } from '../../../src/vpool-xyk-amm/params.js';

const ammRoot = '../../../src/vpool-xyk-amm/multipoolMarketMaker.js';

const contractGovernorRoot = '@agoric/governance/src/contractGovernor.js';
const committeeRoot = '@agoric/governance/src/committee.js';
const voteCounterRoot = '@agoric/governance/src/binaryVoteCounter.js';

const makeBundle = async sourceRoot => {
  const url = await importMetaResolve(sourceRoot, import.meta.url);
  const path = new URL(url).pathname;
  const contractBundle = await bundleSource(path);
  console.log(`makeBundle ${sourceRoot}`);
  return contractBundle;
};

// makeBundle is a slow step, so we do it once for all the tests.
const ammBundleP = makeBundle(ammRoot);
const contractGovernorBundleP = makeBundle(contractGovernorRoot);
const committeeBundleP = makeBundle(committeeRoot);
const voteCounterBundleP = makeBundle(voteCounterRoot);

const setUpZoeForTest = async () => {
  const { makeFar } = makeLoopback('zoeTest');

  const { zoeService, feeMintAccess: nonFarFeeMintAccess } = makeZoeKit(
    makeFakeVatAdmin(() => {}).admin,
  );
  /** @type {ERef<ZoeService>} */
  const zoe = makeFar(zoeService);
  const feeMintAccess = await makeFar(nonFarFeeMintAccess);
  return {
    zoe,
    feeMintAccess,
  };
};

const installBundle = (zoe, contractBundle) => E(zoe).install(contractBundle);

// called separately by each test so AMM/zoe/priceAuthority don't interfere
const setupAmmServices = async (
  electorateTerms,
  centralR,
  timer = buildManualTimer(console.log),
  zoe,
) => {
  if (!zoe) {
    ({ zoe } = await setUpZoeForTest());
  }

  // XS doesn't like top-level await, so do it here. this should be quick
  const [
    ammBundle,
    contractGovernorBundle,
    committeeBundle,
    voteCounterBundle,
  ] = await Promise.all([
    ammBundleP,
    contractGovernorBundleP,
    committeeBundleP,
    voteCounterBundleP,
  ]);

  const [constProductAmm, governor, electorate, counter] = await Promise.all([
    installBundle(zoe, ammBundle),
    installBundle(zoe, contractGovernorBundle),
    installBundle(zoe, committeeBundle),
    installBundle(zoe, voteCounterBundle),
  ]);
  const installs = {
    amm: constProductAmm,
    governor,
    electorate,
    counter,
  };

  const {
    creatorFacet: committeeCreator,
    instance: electorateInstance,
  } = await E(zoe).startInstance(installs.electorate, {}, electorateTerms);

  const poserInvitationP = E(committeeCreator).getPoserInvitation();
  const [poserInvitation, poserInvitationAmount] = await Promise.all([
    poserInvitationP,
    E(E(zoe).getInvitationIssuer()).getAmountOf(poserInvitationP),
  ]);
  const governorTerms = {
    timer,
    electorateInstance,
    governedContractInstallation: installs.amm,
    governed: {
      terms: makeAmmTerms(timer, poserInvitationAmount),
      issuerKeywordRecord: { Central: centralR.issuer },
      privateArgs: { initialPoserInvitation: poserInvitation },
    },
  };

  const {
    instance: governorInstance,
    publicFacet: governorPublicFacet,
    creatorFacet: governorCreatorFacet,
  } = await E(zoe).startInstance(installs.governor, {}, governorTerms);

  const ammCreatorFacetP = E(governorCreatorFacet).getCreatorFacet();
  const ammPublicP = E(governorCreatorFacet).getPublicFacet();

  const [ammCreatorFacet, ammPublicFacet] = await Promise.all([
    ammCreatorFacetP,
    ammPublicP,
  ]);

  const g = { governorInstance, governorPublicFacet, governorCreatorFacet };
  const governedInstance = E(governorPublicFacet).getGovernedContract();

  const amm = { ammCreatorFacet, ammPublicFacet, instance: governedInstance };

  return {
    zoe,
    installs,
    electorate,
    committeeCreator,
    electorateInstance,
    governor: g,
    amm,
    invitationAmount: poserInvitationAmount,
  };
};

harden(setupAmmServices);
harden(setUpZoeForTest);
export { setupAmmServices, setUpZoeForTest };
