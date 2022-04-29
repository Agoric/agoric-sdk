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
  consume: { namesByAddress, economicCommitteeCreatorFacet },
}) => {
  const invitations = await E(
    economicCommitteeCreatorFacet,
  ).getVoterInvitations();
  assert.equal(invitations.length, values(addresses).length);

  /** @param {[string, Promise<Invitation>]} entry */
  const distributeInvitation = async ([addr, invitationP]) => {
    const [invitation, depositFacet] = await Promise.all([
      invitationP,
      E(namesByAddress).lookup(addr, DEPOSIT_FACET),
    ]);

    // for now, everybody gets the full poser invitation
    const poserInvitation = await E(
      economicCommitteeCreatorFacet,
    ).getPoserInvitation();
    await Promise.all([
      E(depositFacet).receive(invitation),
      E(depositFacet).receive(poserInvitation),
    ]);
  };

  await Promise.all(
    zip(values(addresses), invitations).map(distributeInvitation),
  );
};

inviteCommitteeMembers; // "exported" completion value
