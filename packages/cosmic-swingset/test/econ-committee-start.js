/* global E */

// @ts-check (handy for dev, but disabled for deployment)
// import { E } from '@endo/far';
// import '@agoric/vats/src/core/types.js';

const memberInfo = [
  { address: 'agoric1gvtdcjkr2l58y65ed3rryhdcw5jztrl6z4sx3n' },
];

console.info({ memberInfo });

const DEPOSIT_FACET = 'depositFacet'; // TODO: cite external constraint from wallet etc.

const zip = (xs, ys) => xs.map((x, i) => [x, ys[i]]);

/** @param { BootstrapPowers } powers */
const seatCommitee = async ({
  consume: { economicCommitteeCreatorFacet, namesByAddress },
}) => {
  console.info('seatCommittee: await economicCommitteeCreatorFacet...');
  const cte = await economicCommitteeCreatorFacet;
  console.info('await invitatigetVoterInvitationsons...');
  const invitations = await E(cte).getVoterInvitations();
  console.info('invitatoins:', invitations.length);

  assert.equal(invitations.length, memberInfo.length);

  const sendOne = async ([invitation, mem], ix) => {
    console.info('lookup', ix, mem.address, DEPOSIT_FACET);
    const depositFacet = await E(namesByAddress).lookup(
      mem.address,
      DEPOSIT_FACET,
    );
    console.info(ix, 'receive...');
    await E(depositFacet).receive(invitation);
    console.info(ix, 'done');
    return undefined;
  };

  return Promise.all(zip(invitations, memberInfo).map(sendOne));
};

seatCommitee;
