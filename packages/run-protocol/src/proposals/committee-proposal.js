// @ts-check
import { E } from '@endo/far';

// must match packages/wallet/api/src/lib-wallet.js
const DEPOSIT_FACET = 'depositFacet';

const { details: X } = assert;

/**
 * @param {ERef<NameAdmin>} nameAdmin
 * @param {string[][]} paths
 */
const reserveThenGetNamePaths = async (nameAdmin, paths) => {
  /**
   *
   * @param {ERef<NameAdmin>} nextAdmin
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
      assert(Array.isArray(path), X`path ${path} is not an array`);
      return nextPath(nameAdmin, path);
    }),
  );
};

const { values } = Object;

/** @type { <X, Y>(xs: X[], ys: Y[]) => [X, Y][]} */
const zip = (xs, ys) => xs.map((x, i) => [x, ys[i]]);

/**
 * @param { import('./econ-behaviors').EconomyBootstrapPowers } powers
 * @param {{ options: { voterAddresses: Record<string, string> }}} param1
 */
export const inviteCommitteeMembers = async (
  {
    consume: {
      zoe,
      agoricNames,
      namesByAddressAdmin,
      economicCommitteeCreatorFacet,
      reserveGovernorCreatorFacet,
      ammGovernorCreatorFacet,
      vaultFactoryGovernorCreator,
    },
    installation: {
      consume: { binaryVoteCounter: counterP },
    },
  },
  { options: { voterAddresses } },
) => {
  /** @type {[Installation, Installation]} */
  const [charterInstall, counterInstall] = await Promise.all([
    E(agoricNames).lookup('installation', 'econCommitteeCharter'),
    counterP,
  ]);
  const terms = {
    binaryVoteCounterInstallation: counterInstall,
  };
  const privateFacets = {
    reserve: reserveGovernorCreatorFacet,
    amm: ammGovernorCreatorFacet,
    vaults: vaultFactoryGovernorCreator,
  };
  const { publicFacet: votingAPI } = E.get(
    E(zoe).startInstance(charterInstall, undefined, terms, privateFacets),
  );

  const invitations = await E(
    economicCommitteeCreatorFacet,
  ).getVoterInvitations();
  assert.equal(invitations.length, values(voterAddresses).length);

  /** @param {[string, Promise<Invitation>]} entry */
  const distributeInvitation = async ([addr, invitationP]) => {
    console.info('waiting for econ committee member', addr);
    const [voterInvitation, [depositFacet]] = await Promise.all([
      invitationP,
      reserveThenGetNamePaths(namesByAddressAdmin, [[addr, DEPOSIT_FACET]]),
    ]);

    console.info('depositing invitation for econ committee member', addr);
    const nullInvitation = await E(votingAPI).makeNullInvitation();
    await Promise.all([
      E(depositFacet).receive(voterInvitation),
      E(depositFacet).receive(nullInvitation),
    ]);
    console.info('confirmed deposit for econ committee member', addr);
  };

  await Promise.all(
    zip(values(voterAddresses), invitations).map(distributeInvitation),
  );
};

harden(inviteCommitteeMembers);

export const getManifestForInviteCommittee = async (
  { restoreRef },
  { voterAddresses, econCommitteeCharterRef },
) => {
  const t = true;
  return {
    manifest: {
      [inviteCommitteeMembers.name]: {
        consume: {
          zoe: t,
          agoricNames: t,
          namesByAddressAdmin: t,
          economicCommitteeCreatorFacet: t,
          reserveGovernorCreatorFacet: t,
          ammGovernorCreatorFacet: t,
          vaultFactoryGovernorCreator: t,
        },
        installation: {
          consume: { binaryVoteCounter: t },
        },
      },
    },
    installations: {
      econCommitteeCharter: restoreRef(econCommitteeCharterRef),
    },
    options: {
      voterAddresses,
    },
  };
};
