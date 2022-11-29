import { deeplyFulfilledObject } from '@agoric/internal';
import { E } from '@endo/far';
import { reserveThenDeposit } from './utils.js';

const { values } = Object;

/** @type { <X, Y>(xs: X[], ys: Y[]) => [X, Y][]} */
const zip = (xs, ys) => xs.map((x, i) => [x, ys[i]]);

/**
 * @param {import('./econ-behaviors').EconomyBootstrapPowers} powers
 * @param {{ options: { voterAddresses: Record<string, string> }}} param1
 */
export const inviteCommitteeMembers = async (
  { consume: { namesByAddressAdmin, economicCommitteeCreatorFacet } },
  { options: { voterAddresses } },
) => {
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
        await reserveThenDeposit(
          `econ committee member ${addr}`,
          namesByAddressAdmin,
          addr,
          [invitationP],
        );
      }),
    );
  };

  await distributeInvitations(zip(values(voterAddresses), invitations));
};

harden(inviteCommitteeMembers);

/**
 * @param {import('./econ-behaviors').EconomyBootstrapPowers} powers
 * @param {{ options: { voterAddresses: Record<string, string> }}} param1
 */
export const inviteToEconCharter = async (
  {
    consume: {
      zoe,
      agoricNames,
      namesByAddressAdmin,
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
  const terms = await deeplyFulfilledObject(
    harden({
      binaryVoteCounterInstallation: counterInstall,
    }),
  );
  // TODO: Add these facets dynamically when they are instantiated.
  // TODO: Follow PSM continuing invitation charter style.
  const privateFacets = {
    reserve: reserveGovernorCreatorFacet,
    amm: ammGovernorCreatorFacet,
    vaults: vaultFactoryGovernorCreator,
  };
  // TODO(6034): be sure to save the result of startInstance, especially adminFacet
  const { publicFacet: charterAPI } = E.get(
    E(zoe).startInstance(charterInstall, undefined, terms, privateFacets),
  );

  await Promise.all(
    values(voterAddresses).map(async addr =>
      reserveThenDeposit(
        `econ charter member ${addr}`,
        namesByAddressAdmin,
        addr,
        [E(charterAPI).makeNullInvitation()],
      ),
    ),
  );
};

harden(inviteToEconCharter);

export const getManifestForInviteCommittee = async (
  { restoreRef },
  { voterAddresses, econCommitteeCharterRef },
) => {
  const t = true;
  return {
    manifest: {
      [inviteCommitteeMembers.name]: {
        consume: { namesByAddressAdmin: t, economicCommitteeCreatorFacet: t },
      },
      [inviteToEconCharter.name]: {
        consume: {
          zoe: t,
          agoricNames: t,
          namesByAddressAdmin: t,
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
