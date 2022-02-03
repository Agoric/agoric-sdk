// @ts-check

import bundleSource from '@endo/bundle-source';
import { E } from '@agoric/eventual-send';
import { makeLoopback } from '@endo/captp';

import { resolve as importMetaResolve } from 'import-meta-resolve';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';

import { makeZoeKit } from '@agoric/zoe';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import {
  collectNameAdmins,
  makeNameAdmins,
  makePromiseSpace,
} from '@agoric/vats/src/core/utils.js';
import { Collect } from '../../../src/collect.js';
import {
  setupAmm,
  startEconomicCommittee,
} from '../../../src/econ-behaviors.js';

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

export const setUpZoeForTest = async () => {
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
harden(setUpZoeForTest);

export const setupAMMBootstrap = async (
  timer = buildManualTimer(console.log),
  zoe,
) => {
  if (!zoe) {
    ({ zoe } = await setUpZoeForTest());
  }

  const space = /** @type {any} */ (makePromiseSpace());
  const { produce, consume } = /** @type { EconomyBootstrapPowers } */ (space);

  produce.chainTimerService.resolve(timer);
  produce.zoe.resolve(zoe);

  const { agoricNames, agoricNamesAdmin, nameAdmins } = makeNameAdmins();
  produce.agoricNames.resolve(agoricNames);
  produce.agoricNamesAdmin.resolve(agoricNamesAdmin);
  produce.nameAdmins.resolve(nameAdmins);

  /** @type {Record<string, Promise<{moduleFormat: string}>>} */
  const governanceBundlePs = {
    contractGovernor: contractGovernorBundleP,
    committee: committeeBundleP,
    binaryVoteCounter: voteCounterBundleP,
  };
  const bundles = await Collect.allValues(governanceBundlePs);
  produce.governanceBundles.resolve(bundles);

  return { produce, consume };
};

/**
 * NOTE: called separately by each test so AMM/zoe/priceAuthority don't interfere
 *
 * @param {{ committeeName: string, committeeSize: number}} electorateTerms
 * @param {{ brand: Brand, issuer: Issuer }} centralR
 * @param {ManualTimer | undefined=} timer
 * @param {ERef<ZoeService> | undefined=} zoe
 */
export const setupAmmServices = async (
  electorateTerms,
  centralR,
  timer = buildManualTimer(console.log),
  zoe,
) => {
  if (!zoe) {
    ({ zoe } = await setUpZoeForTest());
  }
  // XS doesn't like top-level await, so do it here. this should be quick
  const ammBundle = await ammBundleP;
  const { consume, produce } = await setupAMMBootstrap(timer, zoe);

  produce.ammBundle.resolve(ammBundle);
  const [brandAdmin, issuerAdmin] = await collectNameAdmins(
    ['brand', 'issuer'],
    consume.agoricNames,
    consume.nameAdmins,
  );
  await Promise.all([
    E(brandAdmin).update('RUN', centralR.brand),
    E(issuerAdmin).update('RUN', centralR.issuer),
    startEconomicCommittee({ produce, consume }, electorateTerms),
    setupAmm({ consume, produce }),
  ]);

  const agoricNames = consume.agoricNames;
  const installs = await Collect.allValues({
    amm: E(agoricNames).lookup('installation', 'amm'),
    governor: E(agoricNames).lookup('installation', 'contractGovernor'),
    electorate: E(agoricNames).lookup('installation', 'committee'),
    counter: E(agoricNames).lookup('installation', 'binaryVoteCounter'),
  });

  const governorCreatorFacet = consume.ammGovernorCreatorFacet;
  const governorInstance = await E(agoricNames).lookup(
    'instance',
    'ammGovernor',
  );
  const governorPublicFacet = await E(zoe).getPublicFacet(governorInstance);
  const g = {
    governorInstance,
    governorPublicFacet,
    governorCreatorFacet,
  };
  const governedInstance = E(governorPublicFacet).getGovernedContract();

  /** @type { XYKAMMPublicFacet & GovernedPublicFacet } */
  const ammPublicFacet = await E(governorCreatorFacet).getPublicFacet();
  const amm = {
    ammCreatorFacet: await consume.ammCreatorFacet,
    ammPublicFacet,
    instance: governedInstance,
  };

  const committeeCreator = await consume.economicCommitteeCreatorFacet;
  const electorateInstance = await E(agoricNames).lookup(
    'instance',
    'economicCommittee',
  );

  const poserInvitationP = E(committeeCreator).getPoserInvitation();
  const poserInvitationAmount = await E(
    E(zoe).getInvitationIssuer(),
  ).getAmountOf(poserInvitationP);
  return {
    zoe,
    installs,
    electorate: installs.electorate,
    committeeCreator,
    electorateInstance,
    governor: g,
    amm,
    invitationAmount: poserInvitationAmount,
    space: { consume, produce },
  };
};
harden(setupAmmServices);
