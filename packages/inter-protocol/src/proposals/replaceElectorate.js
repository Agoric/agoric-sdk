// @ts-check
import { E } from '@endo/eventual-send';
import { reserveThenDeposit } from './utils.js';
const { Fail } = assert;

const runConfig = {
  committeeName: 'Economic Committee',
  voterAddresses: {
    gov1: 'agoric1ee9hr0jyrxhy999y755mp862ljgycmwyp4pl7q',
  },
  highPrioritySendersConfig: {
    addressesToAdd: [],
    addressesToRemove: ['agoric1wrfh296eu2z34p6pah7q04jjuyj3mxu9v98277'],
  },
};

const trace = (...args) => console.log('GovReplaceCommiteeAndCharter', ...args);

const { values } = Object;

/** @type {<X, Y>(xs: X[], ys: Y[]) => [X, Y][]} */
const zip = (xs, ys) => xs.map((x, i) => [x, ys[i]]);

const pathSegmentPattern = /^[a-zA-Z0-9_-]{1,100}$/;

/** @type {(name: string) => void} */
const assertPathSegment = name => {
  pathSegmentPattern.test(name) ||
    Fail`Path segment names must consist of 1 to 100 characters limited to ASCII alphanumerics, underscores, and/or dashes: ${name}`;
};

/** @type {(name: string) => string} */
const sanitizePathSegment = name => {
  const candidate = name.replace(/[ ,]/g, '_');
  assertPathSegment(candidate);
  return candidate;
};

const handlehighPrioritySendersList = async ({
  consume: { highPrioritySendersManager: highPrioritySendersManagerP },
}) => {
  const HIGH_PRIORITY_SENDERS_NAMESPACE = 'economicCommittee';
  const highPrioritySendersManager = await highPrioritySendersManagerP;

  if (!highPrioritySendersManager) {
    throw Error('highPrioritySendersManager is not defined');
  }

  const { addressesToAdd, addressesToRemove } =
    runConfig.highPrioritySendersConfig;

  for (let addr of addressesToAdd) {
    trace(`Adding ${addr} to High Priority Senders list`);
    await E(highPrioritySendersManager).add(
      HIGH_PRIORITY_SENDERS_NAMESPACE,
      addr,
    );
  }

  for (let addr of addressesToRemove) {
    trace(`Removing ${addr} from High Priority Senders list`);
    await E(highPrioritySendersManager).remove(
      HIGH_PRIORITY_SENDERS_NAMESPACE,
      addr,
    );
  }
};

const inviteECMembers = async (
  { consume: { namesByAddressAdmin, economicCommitteeCreatorFacet } },
  { options: { voterAddresses = {} } },
) => {
  trace('Create invitations for new committee');

  const invitations = await E(
    economicCommitteeCreatorFacet,
  ).getVoterInvitations();
  assert.equal(invitations.length, values(voterAddresses).length);

  trace('Distribute invitations');
  /** @param {[string, Promise<Invitation>][]} addrInvitations */
  const distributeInvitations = async addrInvitations => {
    await Promise.all(
      addrInvitations.map(async ([addr, invitationP]) => {
        const [voterInvitation] = await Promise.all([invitationP]);
        trace('Sending voting invitations to', addr);
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
  trace(`committeeName ${committeeName}`);

  const committeeSize = values(runConfig.voterAddresses).length;
  trace(`committeeSize ${committeeSize}`);

  const committeesNode = await E(chainStorage).makeChildNode(COMMITTEES_ROOT);

  const storageNode = await E(committeesNode).makeChildNode(
    sanitizePathSegment(committeeName),
  );

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

  economicCommittee.reset();
  economicCommittee.resolve(instance);

  economicCommitteeCreatorFacet.reset();
  economicCommitteeCreatorFacet.resolve(creatorFacet);
};

export const replaceElectorate = async permittedPowers => {
  await startNewEconomicCommittee(permittedPowers);

  const psmKitMap = await permittedPowers.consume.psmKit;

  const creatorFacets = [
    E.get(permittedPowers.consume.reserveKit).governorCreatorFacet,
    E.get(permittedPowers.consume.auctioneerKit).governorCreatorFacet,
    E.get(permittedPowers.consume.vaultFactoryKit).governorCreatorFacet,
    ...[...psmKitMap.values()].map(psmKit => psmKit.psmGovernorCreatorFacet),
  ];

  const economicCommitteeCreatorFacet =
    await permittedPowers.consume.economicCommitteeCreatorFacet;

  await Promise.all(
    creatorFacets.map(async creatorFacet => {
      const newElectoratePoser = await E(
        economicCommitteeCreatorFacet,
      ).getPoserInvitation();
      await E(creatorFacet).replaceElectorate(newElectoratePoser);
    }),
  );

  await inviteECMembers(permittedPowers, {
    options: {
      voterAddresses: runConfig.voterAddresses,
    },
  });

  await handlehighPrioritySendersList(permittedPowers);

  trace('Installed New Economic Committee');
};

harden(replaceElectorate);

export const getManifestForReplaceElectorate = async ({
  economicCommitteeRef: _economicCommitteeRef,
}) => ({
  manifest: {
    [replaceElectorate.name]: {
      consume: {
        board: true,
        chainStorage: true,
        economicCommitteeCreatorFacet: true,
        highPrioritySendersManager: true,
        namesByAddressAdmin: true,
        zoe: true,
        reserveKit: true,
        auctioneerKit: true,
        vaultFactoryKit: true,
        psmKit: true,
      },
      produce: {
        economicCommittee: true,
        economicCommitteeCreatorFacet: true,
      },
      installation: {
        consume: {
          committee: true,
        },
      },
      instance: {
        produce: {
          economicCommittee: true,
        },
      },
    },
  },
});
