// @ts-check
/* global globalThis */

const addresses = {
  Rowland: `agoric1qed57ae8k5cqr30u5mmd46jdxfr0juyggxv6ad`,
  Bill: `agoric1xgw4cknedau6xhrlyn6c8e40d02mejee8gwnef`,
  Dan: `agoric1yumvyl7f5nkalss7w59gs6n3jtqv5gmarudx55`,
};

// must match packages/wallet/api/src/lib-wallet.js
const DEPOSIT_FACET = 'depositFacet';

const { values } = Object;

/** @type {import('@endo/eventual-send').EProxy} */
// @ts-expect-error TODO: more straightforward declaration
const E = globalThis.E;

/** @type { <X, Y>(xs: X[], ys: Y[]) => [X, Y][]} */
const zip = (xs, ys) => xs.map((x, i) => [x, ys[i]]);

/** @param { import('../src/econ-behaviors').EconomyBootstrapPowers } powers */
const inviteCommitteeMembers = async ({
  consume: {
    zoe,
    namesByAddress,
    economicCommitteeCreatorFacet,
    reserveCreatorFacet: reserve,
    ammCreatorFacet: amm,
    vaultFactoryCreator: vaults,
  },
  installation: {
    consume: { voting: votingP, binaryVoteCounter: counterP },
  },
}) => {
  /** @type {[Installation, Installation]} */
  const [votingInstall, counterInstall] = await Promise.all([
    votingP,
    counterP,
  ]);
  const terms = {
    binaryVoteCounterInstallation: counterInstall,
  };
  const privateFacets = {
    reserve,
    amm,
    vaults,
  };
  const { publicFacet: votingAPI } = E.get(
    E(zoe).startInstance(votingInstall, undefined, terms, privateFacets),
  );
  const invitations = await E(
    economicCommitteeCreatorFacet,
  ).getVoterInvitations();
  assert.equal(invitations.length, values(addresses).length);

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
    zip(values(addresses), invitations).map(distributeInvitation),
  );
};

inviteCommitteeMembers; // "exported" completion value
