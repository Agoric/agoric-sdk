import test from 'ava';
import '@endo/init';
import { GOV1ADDR } from '@agoric/synthetic-chain';
import { acceptInvitation, queryVstorageFormatted } from './agoric-tools.js';

test.serial(
  'should have new invites for committee and charter and should be able to accept them',
  async t => {
    const wallet = await queryVstorageFormatted(
      `published.wallet.${GOV1ADDR}.current`,
    );

    const invitations = wallet.purses[0].balance.value;

    const charterInvitation = invitations.find(
      v => v.description === 'charter member invitation',
    );
    t.truthy(charterInvitation);

    const committeeInvitation = invitations.find(v =>
      v.description.startsWith('Voter'),
    );
    t.truthy(committeeInvitation);
  },
);

test.serial('should be able to accept the new invitations', async t => {
  const charterOfferId = 'newEcCharter';
  const committeeOfferId = 'newEcCommittee';

  await acceptInvitation(
    GOV1ADDR,
    'economicCommittee',
    'Voter0',
    committeeOfferId,
  );

  await acceptInvitation(
    GOV1ADDR,
    'econCommitteeCharter',
    'charter member invitation',
    charterOfferId,
  );

  const wallet = await queryVstorageFormatted(
    `published.wallet.${GOV1ADDR}.current`,
  );

  const usedInvitations = wallet.offerToUsedInvitation;

  const usedCharterInvitation = usedInvitations.find(
    v => v[0] === charterOfferId,
  );
  t.truthy(usedCharterInvitation);

  const usedCommitteeInvitation = usedInvitations.find(
    v => v[0] === committeeOfferId,
  );
  t.truthy(usedCommitteeInvitation);
});
