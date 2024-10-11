import test from 'ava';
import '@endo/init';
import { GOV1ADDR } from '@agoric/synthetic-chain';
import { passStyleOf } from '@endo/marshal';
import { acceptInvitation, queryVstorageFormatted } from './agoric-tools.js';

test.serial('should have new invites for committee and charter', async t => {
  const wallet = await queryVstorageFormatted(
    `published.wallet.${GOV1ADDR}.current`,
  );

  const invitations = wallet.purses[0].balance.value;

  const charterInvitation = invitations.find(
    v => v.description === 'charter member invitation',
  );
  t.is(passStyleOf(charterInvitation), 'copyRecord');

  const committeeInvitation = invitations.find(v =>
    v.description.startsWith('Voter'),
  );
  t.is(passStyleOf(committeeInvitation), 'copyRecord');
});

test.serial('should be able to accept the new invitations', async t => {
  const charterOfferId = 'newEcCharter';
  const committeeOfferId = 'newEcCommittee';

  await acceptInvitation(
    GOV1ADDR,
    'econCommitteeCharter',
    'charter member invitation',
    charterOfferId,
  );

  await acceptInvitation(
    GOV1ADDR,
    'economicCommittee',
    'Voter0',
    committeeOfferId,
  );

  const wallet = await queryVstorageFormatted(
    `published.wallet.${GOV1ADDR}.current`,
  );

  const usedInvitations = wallet.offerToUsedInvitation;

  const usedCharterInvitation = usedInvitations.find(
    v => v[0] === charterOfferId,
  );
  t.is(passStyleOf(usedCharterInvitation), 'copyArray');

  const usedCommitteeInvitation = usedInvitations.find(
    v => v[0] === committeeOfferId,
  );
  t.is(passStyleOf(usedCommitteeInvitation), 'copyArray');
});
