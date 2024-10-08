import test from 'ava';
import 'ses';
import '@endo/init';
import {
  agops,
  ATOM_DENOM,
  getISTBalance,
  GOV1ADDR,
  GOV2ADDR,
  GOV3ADDR,
  openVault,
  queryVstorage,
  USER1ADDR,
} from '@agoric/synthetic-chain';
import {
  acceptInvitation,
  marshaller,
  proposeVaultDirectorParamChange,
  voteOnProposedChanges,
  queryVstorageFormatted,
} from './agoric-tools.js';
import { waitUntil } from './utils.js';

test('new committee should be able to vote', async t => {
  const params = {
    ChargingPeriod: 400n,
  };

  const { fromCapData } = marshaller;
  const charterOfferId = 'newEcCharter';
  const committeeOfferId = 'newEcCommittee';

  const path = { paramPath: { key: 'governedParams' } };

  t.log('accept new invitations');
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

  t.log('propose a param change with the new invitation');
  await proposeVaultDirectorParamChange(GOV1ADDR, params, path, charterOfferId);

  // const wallet = await queryVstorageFormatted(
  //   `published.wallet.${GOV1ADDR}.current`,
  //   -1,
  //   fromCapData,
  // );
  // console.log('wallet', wallet);

  t.log('vote on proposed changes');
  await voteOnProposedChanges(GOV1ADDR, committeeOfferId);

  t.log('wait until the vote is closed');
  const latestQuestion = await queryVstorageFormatted(
    'published.committees.Economic_Committee.latestQuestion',
    -1,
    fromCapData,
  );
  await waitUntil(latestQuestion.closingRule.deadline);

  t.log('check if latest outcome is correct');
  const latestOutcome = await queryVstorageFormatted(
    'published.committees.Economic_Committee.latestOutcome',
    -1,
    fromCapData,
  );
  t.is(latestOutcome.outcome, 'win');
});
