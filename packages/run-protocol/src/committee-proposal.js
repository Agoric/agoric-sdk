// @ts-check
import { E } from '@endo/far';

// must match packages/wallet/api/src/lib-wallet.js
const DEPOSIT_FACET = 'depositFacet';

const { values } = Object;

/** @type { <X, Y>(xs: X[], ys: Y[]) => [X, Y][]} */
const zip = (xs, ys) => xs.map((x, i) => [x, ys[i]]);

/**
 * @param { import('../src/econ-behaviors').EconomyBootstrapPowers } powers
 * @param {{ options: { voterAddresses: Record<string, string> }}} param1
 */
export const inviteCommitteeMembers = async (
  {
    consume: {
      zoe,
      agoricNames,
      namesByAddress,
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
    const [voterInvitation, depositFacet] = await Promise.all([
      invitationP,
      E(namesByAddress).lookup(addr, DEPOSIT_FACET),
    ]);

    const nullInvitation = await E(votingAPI).makeNullInvitation();
    await Promise.all([
      E(depositFacet).receive(voterInvitation),
      E(depositFacet).receive(nullInvitation),
    ]);
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
      inviteCommitteeMembers: {
        consume: {
          zoe: t,
          agoricNames: t,
          namesByAddress: t,
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
