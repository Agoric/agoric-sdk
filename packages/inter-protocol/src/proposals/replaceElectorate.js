// @ts-check
import { E } from '@endo/eventual-send';
import { reserveThenDeposit } from './utils.js';
import {
  assertPathSegment,
  makeStorageNodeChild,
} from '@agoric/internal/src/lib-chainStorage.js';

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

  for (const addr of addressesToAdd) {
    trace(`Adding ${addr} to High Priority Senders list`);
    await E(highPrioritySendersManager).add(
      HIGH_PRIORITY_SENDERS_NAMESPACE,
      addr,
    );
  }

  for (const addr of addressesToRemove) {
    trace(`Removing ${addr} from High Priority Senders list`);
    await E(highPrioritySendersManager).remove(
      HIGH_PRIORITY_SENDERS_NAMESPACE,
      addr,
    );
  }
};

const inviteECMembers = async (
  { consume: { namesByAddressAdmin } },
  { options: { voterAddresses = {}, economicCommitteeCreatorFacet } },
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
  produce: { economicCommitteeCreatorFacet, economicCommitteeKit },
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

  const committeesNode = await makeStorageNodeChild(
    chainStorage,
    COMMITTEES_ROOT,
  );
  const storageNode = await E(committeesNode).makeChildNode(
    sanitizePathSegment(committeeName),
  );

  const marshaller = await E(board).getPublishingMarshaller();

  trace('Starting new EC Committee Instance');

  const privateArgs = {
    storageNode,
    marshaller,
  };

  const startResult = await E(zoe).startInstance(
    committee,
    {},
    { committeeName, committeeSize },
    privateArgs,
    'economicCommittee',
  );
  const { instance, creatorFacet } = startResult;

  trace('Started new EC Committee Instance Successfully');

  economicCommitteeKit.reset();
  economicCommitteeKit.resolve(
    harden({ ...startResult, label: 'economicCommittee' }),
  );

  economicCommittee.reset();
  economicCommittee.resolve(instance);

  economicCommitteeCreatorFacet.reset();
  economicCommitteeCreatorFacet.resolve(creatorFacet);

  return creatorFacet;
};

export const replaceElectorate = async permittedPowers => {
  const economicCommitteeCreatorFacet =
    await startNewEconomicCommittee(permittedPowers);

  const psmKitMap = await permittedPowers.consume.psmKit;

  const creatorFacets = [
    E.get(permittedPowers.consume.reserveKit).governorCreatorFacet,
    E.get(permittedPowers.consume.auctioneerKit).governorCreatorFacet,
    E.get(permittedPowers.consume.vaultFactoryKit).governorCreatorFacet,
    E.get(permittedPowers.consume.provisionPoolStartResult)
      .governorCreatorFacet,
    ...[...psmKitMap.values()].map(psmKit => psmKit.psmGovernorCreatorFacet),
  ];

  await Promise.all(
    creatorFacets.map(async creatorFacet => {
      trace(
        'Getting PoserInvitation from economicCommitteeCreatorFacet...',
        creatorFacet,
      );
      const newElectoratePoser = await E(
        economicCommitteeCreatorFacet,
      ).getPoserInvitation();
      trace('Successfully received newElectoratePoser');

      trace('Replace electorate');
      await E(creatorFacet).replaceElectorate(newElectoratePoser);
      trace('Successfully replaced electorate');
    }),
  );

  await inviteECMembers(permittedPowers, {
    options: {
      voterAddresses: runConfig.voterAddresses,
      economicCommitteeCreatorFacet,
    },
  });

  await handlehighPrioritySendersList(permittedPowers);

  trace('Installed New Economic Committee');
};

harden(replaceElectorate);

export const getManifestForReplaceElectorate = async (
  { economicCommitteeRef: _economicCommitteeRef },
  options,
) => ({
  manifest: {
    [replaceElectorate.name]: {
      consume: {
        reserveKit: true,
        auctioneerKit: true,
        vaultFactoryKit: true,
        psmKit: true,

        board: true,
        chainStorage: true,
        diagnostics: true,
        zoe: true,
        highPrioritySendersManager: true,
        namesByAddressAdmin: true,
      },
      produce: {
        economicCommitteeKit: true,
        economicCommitteeCreatorFacet: 'economicCommittee',
      },
      installation: {
        consume: { committee: 'zoe' },
      },
      instance: {
        produce: { economicCommittee: 'economicCommittee' },
      },
    },
  },
  options: { ...options },
});
