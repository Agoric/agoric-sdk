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
 */
export const startEconCharter = async ({
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
  const terms = await deeplyFulfilledObject(
    harden({
      binaryVoteCounterInstallation: counterInstall,
    }),
  );

  /** @type {Promise<import('./econ-behaviors').EconCharterStartResult>} */
  const startResult = E(zoe).startInstance(charterInstall, undefined, terms);
  instanceP.resolve(E.get(startResult).instance);
  econCharterKit.resolve(startResult);
};
harden(startEconCharter);

/**
 * @param {import('./econ-behaviors').EconomyBootstrapPowers} powers
 */
export const addGovernorsToEconCharter = async ({
  consume: { reserveKit, ammKit, vaultFactoryKit, econCharterKit },
  instance: {
    consume: { amm, reserve, VaultFactory },
  },
}) => {
  const { creatorFacet } = E.get(econCharterKit);

  // Introduce charter to governed creator facets.
  await Promise.all(
    [
      { instanceP: amm, facetP: E.get(ammKit).governorCreatorFacet },
      { instanceP: reserve, facetP: E.get(reserveKit).governorCreatorFacet },
      {
        instanceP: VaultFactory,
        facetP: E.get(vaultFactoryKit).governorCreatorFacet,
      },
    ].map(async ({ instanceP, facetP }) => {
      const [instance, govFacet] = await Promise.all([instanceP, facetP]);

      return E(creatorFacet).addInstance(instance, govFacet);
    }),
  );
};

harden(addGovernorsToEconCharter);

/**
 * @param {import('./econ-behaviors').EconomyBootstrapPowers} powers
 * @param {{ options: { voterAddresses: Record<string, string> }}} param1
 */
export const inviteToEconCharter = async (
  { consume: { namesByAddressAdmin, econCharterKit } },
  { options: { voterAddresses } },
) => {
  const { creatorFacet } = E.get(econCharterKit);

  await Promise.all(
    values(voterAddresses).map(async addr =>
      reserveThenDeposit(
        `econ charter member ${addr}`,
        namesByAddressAdmin,
        addr,
        [E(creatorFacet).makeCharterMemberInvitation()],
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
      [startEconCharter.name]: {
        consume: { zoe: t },
        produce: { econCharterKit: t },
        installation: {
          consume: { binaryVoteCounter: t, econCommitteeCharter: t },
        },
        instance: {
          produce: { econCommitteeCharter: t },
        },
      },
      [addGovernorsToEconCharter.name]: {
        consume: {
          reserveGovernorCreatorFacet: t,
          ammGovernorCreatorFacet: t,
          vaultFactoryGovernorCreator: t,
          econCharterKit: t,
          zoe: t,
          agoricNames: t,
          namesByAddressAdmin: t,
          economicCommitteeCreatorFacet: t,
          reserveKit: t,
          ammKit: t,
          vaultFactoryKit: t,
        },
        installation: {
          consume: { binaryVoteCounter: t },
        },
        instance: {
          consume: { amm: t, reserve: t, VaultFactory: t },
        },
      },
      [inviteToEconCharter.name]: {
        consume: { namesByAddressAdmin: t, econCharterKit: t },
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
