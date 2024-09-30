// @ts-check
import { E } from '@endo/eventual-send';
import {
  assertPathSegment,
  makeStorageNodeChild,
} from '@agoric/internal/src/lib-chainStorage.js';
import { reserveThenDeposit } from './utils.js';

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

const handlehighPrioritySendersList = async (
  { consume: { highPrioritySendersManager: highPrioritySendersManagerP } },
  { options: { highPrioritySendersConfig } },
) => {
  const HIGH_PRIORITY_SENDERS_NAMESPACE = 'economicCommittee';
  const highPrioritySendersManager = await highPrioritySendersManagerP;

  if (!highPrioritySendersManager) {
    throw Error('highPrioritySendersManager is not defined');
  }

  const { addressesToAdd, addressesToRemove } = highPrioritySendersConfig;

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

const inviteToEconCharter = async (
  { consume: { namesByAddressAdmin } },
  { options: { voterAddresses, econCharterKit } },
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

const startNewEconomicCommittee = async (
  {
    consume: { board, chainStorage, diagnostics, zoe },
    produce: { economicCommitteeKit, economicCommitteeCreatorFacet },
    installation: {
      consume: { committee },
    },
    instance: {
      produce: { economicCommittee },
    },
  },
  { options: { committeeName, committeeSize } },
) => {
  const COMMITTEES_ROOT = 'committees';

  trace('startNewEconomicCommittee');

  trace(`committeeName ${committeeName}`);
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

  await E(diagnostics).savePrivateArgs(startResult.instance, privateArgs);

  economicCommittee.reset();
  economicCommittee.resolve(instance);

  economicCommitteeCreatorFacet.reset();
  economicCommitteeCreatorFacet.resolve(creatorFacet);

  return creatorFacet;
};

const startNewEconCharter = async ({
  consume: { zoe },
  produce: { econCharterKit },
  installation: {
    consume: { binaryVoteCounter: counterP, econCommitteeCharter: installP },
  },
  instance: {
    produce: { econCommitteeCharter },
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
  const startResult = E(zoe).startInstance(
    charterInstall,
    undefined,
    terms,
    undefined,
    'econCommitteeCharter',
  );
  trace('Started new EC Charter Instance Successfully');

  econCommitteeCharter.reset();
  econCommitteeCharter.resolve(E.get(startResult).instance);

  econCharterKit.reset();
  econCharterKit.resolve(startResult);
  return startResult;
};

const addGovernorsToEconCharter = async (
  {
    consume: {
      reserveKit,
      vaultFactoryKit,
      auctioneerKit,
      psmKit,
      provisionPoolStartResult,
    },
    instance: {
      consume: { reserve, VaultFactory, auctioneer, provisionPool },
    },
  },
  { options: { econCharterKit } },
) => {
  const { creatorFacet } = E.get(econCharterKit);

  const psmKitMap = await psmKit;

  for (const { psm, psmGovernorCreatorFacet, label } of psmKitMap.values()) {
    E(creatorFacet).addInstance(psm, psmGovernorCreatorFacet, label);
  }

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
      {
        label: 'provisionPool',
        instanceP: provisionPool,
        facetP: E.get(provisionPoolStartResult).governorCreatorFacet,
      },
    ].map(async ({ label, instanceP, facetP }) => {
      const [instance, govFacet] = await Promise.all([instanceP, facetP]);

      return E(creatorFacet).addInstance(instance, govFacet, label);
    }),
  );
};

export const replaceElectorate = async (permittedPowers, config) => {
  const { committeeName, voterAddresses, highPrioritySendersConfig } =
    config.options;

  const economicCommitteeCreatorFacet = await startNewEconomicCommittee(
    permittedPowers,
    {
      options: {
        committeeName,
        committeeSize: values(voterAddresses).length,
      },
    },
  );

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
      const newElectoratePoser = await E(
        economicCommitteeCreatorFacet,
      ).getPoserInvitation();
      await E(creatorFacet).replaceElectorate(newElectoratePoser);
    }),
  );

  await inviteECMembers(permittedPowers, {
    options: {
      voterAddresses,
      economicCommitteeCreatorFacet,
    },
  });

  await handlehighPrioritySendersList(permittedPowers, {
    options: {
      highPrioritySendersConfig,
    },
  });

  trace('Installed New Economic Committee');

  const econCharterKit = await startNewEconCharter(permittedPowers);
  await addGovernorsToEconCharter(permittedPowers, {
    options: { econCharterKit },
  });

  await inviteToEconCharter(permittedPowers, {
    options: { voterAddresses, econCharterKit },
  });

  trace('Installed New EC Charter');
};

harden(replaceElectorate);

export const getManifestForReplaceElectorate = async (_, options) => ({
  manifest: {
    [replaceElectorate.name]: {
      consume: {
        reserveKit: true,
        auctioneerKit: true,
        vaultFactoryKit: true,
        psmKit: true,
        provisionPoolStartResult: true,

        board: true,
        chainStorage: true,
        diagnostics: true,
        zoe: true,
        highPrioritySendersManager: true,
        namesByAddressAdmin: true,
      },
      produce: {
        econCharterKit: true,
        economicCommitteeKit: true,
        economicCommitteeCreatorFacet: true,
      },
      installation: {
        consume: {
          committee: true,
          binaryVoteCounter: true,
          econCommitteeCharter: true,
        },
      },
      instance: {
        produce: {
          economicCommittee: true,
          econCommitteeCharter: true,
        },
        consume: {
          reserve: true,
          VaultFactory: true,
          auctioneer: true,
          provisionPool: true,
        },
      },
    },
  },
  options: { ...options },
});
