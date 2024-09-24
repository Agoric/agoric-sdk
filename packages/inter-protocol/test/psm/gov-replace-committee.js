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
const { Fail } = assert;
const runConfig = {
  committeeName: 'Economic Committee',
  economicCommitteeAddresses: {
    gov1: 'agoric1ldmtatp24qlllgxmrsjzcpe20fvlkp448zcuce',
    // gov2: 'agoric140dmkrz2e42ergjj7gyvejhzmjzurvqeq82ang',
    // gov3: 'agoric1w8wktaur4zf8qmmtn3n7x3r0jhsjkjntcm3u6h',
    // gov4: 'agoric1p2aqakv3ulz4qfy2nut86j9gx0dx0yw09h96md',
  },
};

//#region Quasi-imports
const trace = (...args) => console.log('GovReplaceCommitee', ...args);

const { values } = Object;

/** @type {<X, Y>(xs: X[], ys: Y[]) => [X, Y][]} */
const zip = (xs, ys) => xs.map((x, i) => [x, ys[i]]);

/**
 * @param {NameAdmin} nameAdmin
 * @param {string[][]} paths
 */
const reserveThenGetNamePaths = async (nameAdmin, paths) => {
  /**
   * @param {NameAdmin} nextAdmin
   * @param {string[]} path
   */
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
      Array.isArray(path) || Fail`path ${path} is not an array`;
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

const inviteECMembers = async (
  { consume: { namesByAddressAdmin, economicCommitteeCreatorFacet } },
  { options: { voterAddresses = {} } },
) => {
  const invitations = await E(
    economicCommitteeCreatorFacet,
  ).getVoterInvitations();
  assert.equal(invitations.length, values(voterAddresses).length);

  /** @param {[string, Promise<Invitation>][]} addrInvitations */
  const distributeInvitations = async addrInvitations => {
    await Promise.all(
      addrInvitations.map(async ([addr, invitationP]) => {
        const [voterInvitation] = await Promise.all([invitationP]);
        trace('sending charter, voting invitations to', addr);
        await reserveThenDeposit(
          `econ committee member ${addr}`,
          namesByAddressAdmin,
          addr,
          [voterInvitation],
        );
      }),
    );
  };

  await distributeInvitations(zip(values(voterAddresses), invitations));
};
harden(inviteECMembers);

const inviteToEconCharter = async (
  { consume: { namesByAddressAdmin, econCharterKit } },
  { options: { voterAddresses } },
) => {
  const { creatorFacet } = E.get(econCharterKit);

  void Promise.all(
    values(voterAddresses).map(async addr => {
      const debugName = `econ charter member ${addr}`;
      reserveThenDeposit(debugName, namesByAddressAdmin, addr, [
        E(creatorFacet).makeCharterMemberInvitation(),
      ]).catch(err => console.error(`failed deposit to ${debugName}`, err));
    }),
  );
};

harden(inviteToEconCharter);

/**
 * Convenience function for returning a storage node at or under its input,
 * falling back to an inert object with the correct interface (but incomplete
 * behavior) when that is unavailable.
 *
 * @param {ERef<StorageNode>} storageNodeRef
 * @param {string} childName
 * @returns {Promise<StorageNode>}
 */
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
  pathSegmentPattern.test(name) ||
    Fail`Path segment names must consist of 1 to 100 characters limited to ASCII alphanumerics, underscores, and/or dashes: ${name}`;
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

  trace('Starting new EC Committee Instance');
  const { instance, creatorFacet } = await E(zoe).startInstance(
    committee,
    {},
    { committeeName, committeeSize },
    {
      storageNode,
      marshaller,
    },
    'economicCommittee',
  );
  trace('Started new EC Committee Instance Successfully');

  const newPoserInvitationP = E(creatorFacet).getPoserInvitation();

  economicCommittee.reset();
  economicCommittee.resolve(instance);

  economicCommitteeCreatorFacet.reset();
  economicCommitteeCreatorFacet.resolve(creatorFacet);
  return newPoserInvitationP;
};
harden(startNewEconomicCommittee);

const startNewEconCharter = async ({
  consume: { zoe },
  produce: { econCharterKit },
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

  trace('Starting new EC Charter Instance');
  const startResult = await E(zoe).startInstance(
    charterInstall,
    undefined,
    terms,
    undefined,
    'econCommitteeCharter',
  );
  trace('Started new EC Charter Instance Successfully');

  instanceP.reset();
  instanceP.resolve(E.get(startResult).instance);

  econCharterKit.reset();
  econCharterKit.resolve(startResult);
};
harden(startNewEconCharter);

const addGovernorsToEconCharter = async ({
  consume: {
    zoe,
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

  const psmKitMap = await psmKit;

  // Adding PSM Instances

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
      // {
      //   label: 'reserve',
      //   instanceP: reserve,
      //   facetP: E.get(reserveKit).governorCreatorFacet,
      // },
      {
        label: 'VaultFactory',
        instanceP: VaultFactory,
        facetP: E.get(vaultFactoryKit).governorCreatorFacet,
      },
      // {
      //   label: 'auctioneer',
      //   instanceP: auctioneer,
      //   facetP: E.get(auctioneerKit).governorCreatorFacet,
      // },
    ].map(async ({ label, instanceP, facetP }) => {
      const [instance, govFacet] = await Promise.all([instanceP, facetP]);

      return E(creatorFacet).addInstance(instance, govFacet, label);
    }),
  );
};

harden(addGovernorsToEconCharter);

const shutdown = async ({
  consume: { economicCommitteeCreatorFacet, econCharterKit },
}) => {
  console.log('Shutting down old EC Committee');
  await E(economicCommitteeCreatorFacet).shutdown();
  console.log('EC Committee shutdown successful');

  console.log('Shutting down old EC Charter');
  const { creatorFacet } = E.get(econCharterKit);
  await E(creatorFacet).shutdown();
  console.log('EC Charter shutdown successful');
};

harden(shutdown);

const main = async permittedPowers => {
  await shutdown(permittedPowers);
  const newElectoratePoser = await startNewEconomicCommittee(permittedPowers);
  await startNewEconCharter(permittedPowers);
  await addGovernorsToEconCharter(permittedPowers);

  const psmKitMap = await permittedPowers.consume.psmKit;
  const replacements = [...psmKitMap.values()].map(psmKit =>
    E(psmKit.psmGovernorCreatorFacet).replaceElectorate(newElectoratePoser),
  );
  await Promise.all(replacements);

  await E(
    E.get(permittedPowers.consume.reserveKit).governorCreatorFacet,
  ).replaceElectorate(newElectoratePoser);

  await E(
    E.get(permittedPowers.consume.vaultFactoryKit).governorCreatorFacet,
  ).replaceElectorate(newElectoratePoser);

  await E(
    E.get(permittedPowers.consume.auctioneerKit).governorCreatorFacet,
  ).replaceElectorate(newElectoratePoser);

  await inviteECMembers(permittedPowers, {
    options: { voterAddresses: runConfig.economicCommitteeAddresses },
  });

  await inviteToEconCharter(permittedPowers, {
    options: { voterAddresses: runConfig.economicCommitteeAddresses },
  });

  trace('Installed New Economic Committee');
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
