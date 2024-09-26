/* global E */
// @ts-check
/// <reference types="@agoric/vats/src/core/core-eval-env"/>
/// <reference types="@agoric/vats/src/core/types-ambient"/>

/**
 * @import {NameAdmin} from '@agoric/vats';
 */

/**
 * @file Script to replace the econ governance committee in a SwingSet Core Eval
 *   (aka big hammer)
 */

const runConfig = {
  committeeName: 'Economic Committee',
  economicCommitteeAddresses: {
    gov1: 'agoric1ldmtatp24qlllgxmrsjzcpe20fvlkp448zcuce',
    // gov2: 'agoric140dmkrz2e42ergjj7gyvejhzmjzurvqeq82ang',
    // gov3: 'agoric1w8wktaur4zf8qmmtn3n7x3r0jhsjkjntcm3u6h',
    gov4: 'agoric1rwwley550k9mmk6uq6mm6z4udrg8kyuyvfszjk',
  },
};

//#region Quasi-imports
const trace = (...args) => console.log('GovReplaceCommitee', ...args);

const { values } = Object;

/** @type {<X, Y>(xs: X[], ys: Y[]) => [X, Y][]} */
const zip = (xs, ys) => xs.map((x, i) => [x, ys[i]]);

const reserveThenGetNamePaths = async (nameAdmin, paths) => {
  const nextPath = async (nextAdmin, path) => {
    const [nextName, ...rest] = path;
    assert.typeof(nextName, 'string');

    // Ensure we wait for the next name until it exists.
    await E(nextAdmin).reserve(nextName);

    if (rest.length === 0) {
      // Now return the readonly lookup of the name.
      const nameHub = E(nextAdmin).readonly();
      return E(nameHub).lookup(nextName);
    }

    // Wait until the next admin is resolved.
    const restAdmin = await E(nextAdmin).lookupAdmin(nextName);
    return nextPath(restAdmin, rest);
  };

  return Promise.all(
    paths.map(async path => {
      Array.isArray(path) || 'WWWW';
      return nextPath(nameAdmin, path);
    }),
  );
};

const DEPOSIT_FACET = 'depositFacet';

const reserveThenDeposit = async (
  debugName,
  namesByAddressAdmin,
  addr,
  payments,
) => {
  console.info('waiting for', debugName);
  const [depositFacet] = await reserveThenGetNamePaths(namesByAddressAdmin, [
    [addr, DEPOSIT_FACET],
  ]);
  console.info('depositing to', debugName);
  await Promise.all(payments.map(payment => E(depositFacet).receive(payment)));
  console.info('confirmed deposit for', debugName);
};

const invitePSMCommitteeMembers = async (
  {
    consume: {
      namesByAddressAdmin,
      economicCommitteeCreatorFacet,
      econCharterKit,
    },
  },
  { options: { voterAddresses = {} } },
) => {
  console.log('fraz invitePSMCommitteeMembers');

  const invitations = await E(
    economicCommitteeCreatorFacet,
  ).getVoterInvitations();
  assert.equal(invitations.length, values(voterAddresses).length);

  console.log('fraz', 13333);
  await E(E.get(econCharterKit).creatorFacet).printId();

  const distributeInvitations = async addrInvitations => {
    await Promise.all(
      addrInvitations.map(async ([addr, invitationP]) => {
        const [voterInvitation, charterMemberInvitation] = await Promise.all([
          invitationP,
          E(E.get(econCharterKit).creatorFacet).makeCharterMemberInvitation(),
        ]);
        console.log('sending charter, voting invitations to', addr);
        await reserveThenDeposit(
          `econ committee member ${addr}`,
          namesByAddressAdmin,
          addr,
          [voterInvitation, charterMemberInvitation],
        );
        console.log('sent charter, voting invitations to', addr);
      }),
    );
  };

  await distributeInvitations(zip(values(voterAddresses), invitations));
};
harden(invitePSMCommitteeMembers);

async function makeStorageNodeChild(storageNodeRef, childName) {
  return E(storageNodeRef).makeChildNode(childName);
}

// TODO: Formalize segment constraints.
// Must be nonempty and disallow (unescaped) `.`, and for simplicity
// (and future possibility of e.g. escaping) we currently limit to
// ASCII alphanumeric plus underscore and dash.
const pathSegmentPattern = /^[a-zA-Z0-9_-]{1,100}$/;

/** @type {(name: string) => void} */
const assertPathSegment = name => {
  pathSegmentPattern.test(name) || '';
};
harden(assertPathSegment);

/** @type {(name: string) => string} */
const sanitizePathSegment = name => {
  const candidate = name.replace(/[ ,]/g, '_');
  assertPathSegment(candidate);
  return candidate;
};

//#endregion

// XXX can't use type imports without EVAL_CLEAN from cosmic Makefile
const startNewEconomicCommittee = async ({
  consume: { board, chainStorage, zoe },
  produce: { economicCommitteeCreatorFacet },
  installation: {
    consume: { committee },
  },
  instance: {
    produce: { economicCommittee },
  },
}) => {
  console.log('fraz startNewEconomicCommittee');

  const COMMITTEES_ROOT = 'committees';
  trace('startNewEconomicCommittee');
  const { committeeName } = runConfig;
  const committeeSize = Object.values(
    runConfig.economicCommitteeAddresses,
  ).length;

  const committeesNode = await makeStorageNodeChild(
    chainStorage,
    COMMITTEES_ROOT,
  );
  const storageNode = await E(committeesNode).makeChildNode(
    sanitizePathSegment(committeeName),
  );

  // NB: committee must only publish what it intended to be public
  const marshaller = await E(board).getPublishingMarshaller();

  const { instance, creatorFacet } = await E(zoe).startInstance(
    committee, // aka electorate
    {},
    { committeeName, committeeSize },
    {
      storageNode,
      marshaller,
      customId: 1,
    },
    'economicCommittee',
  );

  economicCommittee.reset();
  economicCommittee.resolve(instance);

  // reset because it's already been resolved
  economicCommitteeCreatorFacet.reset();
  economicCommitteeCreatorFacet.resolve(creatorFacet);
};
harden(startNewEconomicCommittee);

const startNewEconCharter = async ({
  consume: { zoe, econCharterKit },
  produce: { econCharterKit: econCharterKitWrite },
  installation: {
    consume: { binaryVoteCounter: counterP, econCommitteeCharter: installP },
  },
  instance: {
    produce: { econCommitteeCharter: instanceP },
  },
}) => {
  const [charterInstall, counterInstall] = await Promise.all([
    installP,
    counterP,
  ]);
  const terms = await harden({
    binaryVoteCounterInstallation: counterInstall,
  });
  console.log('fraz', 1222);
  await E(E.get(econCharterKit).creatorFacet).printId();

  const startResult = E(zoe).startInstance(
    charterInstall,
    undefined,
    terms,
    {
      customId: 2,
    },
    'econCommitteeCharter',
  );

  await E(E.get(startResult).creatorFacet).printId();

  instanceP.reset();
  instanceP.resolve(E.get(startResult).instance);

  econCharterKitWrite.reset();
  econCharterKitWrite.resolve(startResult);
};
harden(startNewEconCharter);

const addGovernorsToEconCharter = async ({
  consume: {
    reserveKit,
    vaultFactoryKit,
    econCharterKit,
    auctioneerKit,
    psmKit,
  },
  instance: {
    consume: { reserve, VaultFactory, auctioneer },
  },
}) => {
  const { creatorFacet } = E.get(econCharterKit);

  // Adding PSM Instances
  const psmKitMap = await psmKit;
  await Promise.all(
    [...psmKitMap.values()].map(async obj => {
      return E(creatorFacet).addInstance(
        obj.psm,
        obj.psmGovernorCreatorFacet,
        obj.label,
      );
    }),
  );

  // Add Instances for other contracts
  await Promise.all(
    [
      {
        label: 'reserve',
        instanceP: reserve,
        facetP: E.get(reserveKit).governorCreatorFacet,
      },
      {
        label: 'VaultFactory',
        instanceP: VaultFactory,
        facetP: E.get(vaultFactoryKit).governorCreatorFacet,
      },
      {
        label: 'auctioneer',
        instanceP: auctioneer,
        facetP: E.get(auctioneerKit).governorCreatorFacet,
      },
    ].map(async ({ label, instanceP, facetP }) => {
      const [instance, govFacet] = await Promise.all([instanceP, facetP]);

      return E(creatorFacet).addInstance(instance, govFacet, label);
    }),
  );
};

harden(addGovernorsToEconCharter);

const main = async permittedPowers => {
  // console.log("fraz in main")
  // await addGovernorsToEconCharter(permittedPowers)
  console.log('fraz before startNewEconomicCommittee');
  await startNewEconomicCommittee(permittedPowers);
  // await startNewEconCharter(permittedPowers);
  // await addGovernorsToEconCharter(permittedPowers);
  /*
   * put the new economic committee into agoricNames
   */

  /*
   * tell all the PSM contracts about it
   */
  const psmKitMap = await permittedPowers.consume.psmKit;
  // TODO make sure new PSMs get this committee (using ".reset" in the space?)

  const economicCommitteeCreatorFacet = await permittedPowers.consume.economicCommitteeCreatorFacet;
  const creatorFacets = [
    E.get(permittedPowers.consume.reserveKit).governorCreatorFacet,
    E.get(permittedPowers.consume.auctioneerKit).governorCreatorFacet,
    E.get(permittedPowers.consume.vaultFactoryKit).governorCreatorFacet,
    ...[...psmKitMap.values()].map(psmKit => psmKit.psmGovernorCreatorFacet),
  ];

  await Promise.all(
    creatorFacets.map(async creatorFacet => {
      const newElectoratePoser = await E(
        economicCommitteeCreatorFacet,
      ).getPoserInvitation();
      await E(creatorFacet).replaceElectorate(newElectoratePoser);
    }),
  );

  await invitePSMCommitteeMembers(permittedPowers, {
    options: { voterAddresses: runConfig.economicCommitteeAddresses },
  });
  // somethign with the PSM charter?

  /*
   * tell the provisionPool contract about it
   */

  // done
  console.log('installed new economic committee');
};

/**
 * How to test on chain
 *
 * Execute core eval with a dictorator (electorate n=1) Have the old electorate
 * and new electorate vote for different PSM param changes Verify the old's were
 * ignored and the new's were enacted
 */

// "export" from script
main;
