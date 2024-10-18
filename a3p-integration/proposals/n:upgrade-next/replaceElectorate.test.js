import test from 'ava';
import '@endo/init';
import {
  GOV1ADDR,
  evalBundles,
  agops,
  waitForBlock,
} from '@agoric/synthetic-chain';
import { passStyleOf } from '@endo/marshal';
import { queryVstorageFormatted, acceptInvitation } from './agoric-tools.js';

const UPGRADE_PP_DIR = 'replace-electorate';

test.skip('what', async t => {
  await evalBundles(UPGRADE_PP_DIR);
  await waitForBlock(2);
  t.pass();
});

test.serial('should be able to accept the new invitations', async t => {
  // await acceptInvitation(
  //   GOV1ADDR,
  //   'economicCommittee',
  //   'Voter0',
  //   committeeOfferId,
  // );
  // await acceptInvitation(
  //   GOV1ADDR,
  //   'econCommitteeCharter',
  //   'charter member invitation',
  //   charterOfferId,
  // );

  const instance = await queryVstorageFormatted(
    `published.agoricNames.instance`,
  );
  const instances = Object.fromEntries(instance);

  console.log(instances.econCommitteeCharter.getBoardId());
  console.log(instances.economicCommittee.getBoardId());

  const wallet = await queryVstorageFormatted(
    `published.wallet.${GOV1ADDR}.current`,
  );
  // const usedInvitations = wallet.offerToUsedInvitation.map(v => v[1]);
  console.log(
    wallet.offerToUsedInvitation.map(c => [
      c[0],
      c[1].value.map(p => p.instance.getBoardId()),
    ]),
  );
  console.log(
    wallet.purses[0].balance.value.map(p => [
      p.description,
      p.instance.getBoardId(),
    ]),
  );
  // await acceptInvitation(
  //   GOV1ADDR,
  //   'econCommitteeCharter',
  //   'charter member invitation',
  //   'charterOfferId',
  // );
  // await acceptInvitation(
  //   GOV1ADDR,
  //   'economicCommittee',
  //   'Voter0',
  //   'committeeOfferId',
  // );

  // await waitForBlock(1000);

  await agops.ec(
    'charter',
    '--send-from',
    GOV1ADDR,
    '--name',
    'econCommitteeCharter',
  );
  await agops.ec('committee', '--send-from', GOV1ADDR);

  const walletPostOffer = await queryVstorageFormatted(
    `published.wallet.${GOV1ADDR}.current`,
  );
  const usedInvitations = walletPostOffer.offerToUsedInvitation.map(v => v[1]);

  const totalCharterInvitations = usedInvitations.filter(
    v => v.value[0].description === 'charter member invitation',
  ).length;

  t.is(totalCharterInvitations, 2);

  const totalCommitteeInvitations = usedInvitations.filter(v =>
    v.value[0].description.startsWith('Voter'),
  ).length;
  t.is(totalCommitteeInvitations, 2);

  const charterInvitation = usedInvitations.find(
    v =>
      v.value[0].instance.getBoardId() ===
      instances.econCommitteeCharter.getBoardId(),
  );
  t.is(passStyleOf(charterInvitation), 'copyRecord');

  const committeeInvitation = usedInvitations.find(
    v =>
      v.value[0].instance.getBoardId() ===
      instances.economicCommittee.getBoardId(),
  );
  t.is(passStyleOf(committeeInvitation), 'copyRecord');
});
