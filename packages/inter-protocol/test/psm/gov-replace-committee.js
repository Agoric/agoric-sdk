/* global E */
// @ts-check
/// <reference types="@agoric/vats/src/core/core-eval-env" />
/**
 * @file Script to replace the econ governance committee in a SwingSet Core Eval
 *   (aka big hammer)
 */

import { Fail } from '@endo/errors';

const runConfig = {
  committeeName: 'Economic Committee',
  economicCommitteeAddresses: {
    // gov1: 'agoric1ldmtatp24qlllgxmrsjzcpe20fvlkp448zcuce',
    // gov2: 'agoric140dmkrz2e42ergjj7gyvejhzmjzurvqeq82ang',
    // gov3: 'agoric1w8wktaur4zf8qmmtn3n7x3r0jhsjkjntcm3u6h',
    gov4: 'agoric109q3uc0xt8aavne94rgd6rfeucavrx924e0ztf',
  },
};

//#region Quasi-imports
const trace = (...args) => console.log('GovReplaceCommitee', ...args);

const { values } = Object;

/** @type {<X, Y>(xs: X[], ys: Y[]) => [X, Y][]} */
const zip = (xs, ys) => xs.map((x, i) => [x, ys[i]]);

/**
 * @param {ERef<import('@agoric/vats').NameAdmin>} nameAdmin
 * @param {string[][]} paths
 */
const reserveThenGetNamePaths = async (nameAdmin, paths) => {
  /**
   * @param {ERef<import('@agoric/vats').NameAdmin>} nextAdmin
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
  const invitations = await E(
    economicCommitteeCreatorFacet,
  ).getVoterInvitations();
  assert.equal(invitations.length, values(voterAddresses).length);

  /** @param {[string, Promise<Invitation>][]} addrInvitations */
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

  const { creatorFacet } = await E(zoe).startInstance(
    committee, // aka electorate
    {},
    { committeeName, committeeSize },
    {
      storageNode,
      marshaller,
    },
  );

  const newPoserInvitationP = E(creatorFacet).getPoserInvitation();

  // reset because it's already been resolved
  economicCommitteeCreatorFacet.reset();
  economicCommitteeCreatorFacet.resolve(creatorFacet);
  return newPoserInvitationP;
};
harden(startNewEconomicCommittee);

const main = async permittedPowers => {
  console.log('starting new economic committee:', runConfig);
  const newElectoratePoser = await startNewEconomicCommittee(permittedPowers);

  /*
   * put the new economic committee into agoricNames
   */

  /*
   * tell all the PSM contracts about it
   */
  const psmKitMap = await permittedPowers.consume.psmKit;
  // TODO make sure new PSMs get this committee (using ".reset" in the space?)
  const replacements = [...psmKitMap.values()].map(psmKit =>
    E(psmKit.psmGovernorCreatorFacet).replaceElectorate(newElectoratePoser),
  );
  await Promise.all(replacements);

  /*
   * use economicCommitteeCreatorFacet in the space to invite those commitee members
   */
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
