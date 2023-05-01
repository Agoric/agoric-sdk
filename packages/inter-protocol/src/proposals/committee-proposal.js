import { deeplyFulfilledObject } from '@agoric/internal';
import { E } from '@endo/far';
import { reserveThenDeposit } from './utils.js';

const { values } = Object;

/** @type { <X, Y>(xs: X[], ys: Y[]) => [X, Y][]} */
const zip = (xs, ys) => xs.map((x, i) => [x, ys[i]]);

const EC_HIGH_PRIORITY_SENDERS_NAMESPACE = 'economicCommittee';

/**
 * @param {import('./econ-behaviors').EconomyBootstrapPowers} powers
 * @param {{ options: { voterAddresses: Record<string, string> }}} param1
 */
export const inviteCommitteeMembers = async (
  {
    consume: {
      namesByAddressAdmin,
      economicCommitteeCreatorFacet,
      highPrioritySendersManager,
    },
  },
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
        await E(highPrioritySendersManager)?.add(
          EC_HIGH_PRIORITY_SENDERS_NAMESPACE,
          addr,
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
  const startResult = E(zoe).startInstance(
    charterInstall,
    undefined,
    terms,
    undefined,
    'econCommitteeCharter',
  );
  instanceP.resolve(E.get(startResult).instance);
  econCharterKit.resolve(startResult);
};
harden(startEconCharter);

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
        consume: {
          namesByAddressAdmin: t,
          economicCommitteeCreatorFacet: t,
          highPrioritySendersManager: t,
        },
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
