/* global fetch setTimeout */

import test from 'ava';

import { makeWalletUtils } from '@agoric/client-utils';
import { evalBundles, getDetailsMatchingVats, GOV1ADDR, GOV2ADDR, waitForBlock } from '@agoric/synthetic-chain';
import { makeGovernanceDriver } from './test-lib/governance.js';
import { networkConfig } from './test-lib/index.js';
import { makeTimerUtils } from './test-lib/utils.js';

const GOV4ADDR = 'agoric1c9gyu460lu70rtcdp95vummd6032psmpdx7wdy';
const governanceAddresses = [GOV4ADDR, GOV2ADDR, GOV1ADDR];

// TODO test-lib export `walletUtils` with this ambient authority like s:stake-bld has
/** @param {number} ms */
const delay = ms =>
  new Promise(resolve => setTimeout(() => resolve(undefined), ms));

test.serial(
  'economic committee can make governance proposal and vote on it',
  async t => {
    const { waitUntil } = makeTimerUtils({ setTimeout });
    const { readLatestHead, getLastUpdate, getCurrentWalletRecord } =
      await makeWalletUtils({ delay, fetch }, networkConfig);
    const governanceDriver = await makeGovernanceDriver(fetch, networkConfig);

    /** @type {any} */
    const instance = await readLatestHead(`published.agoricNames.instance`);
    const instances = Object.fromEntries(instance);

    const wallet = await getCurrentWalletRecord(governanceAddresses[0]);
    const usedInvitations = wallet.offerToUsedInvitation;

    const charterInvitation = usedInvitations.find(
      v =>
        v[1].value[0].instance.getBoardId() ===
        instances.econCommitteeCharter.getBoardId(),
    );
    assert(charterInvitation, 'missing charter invitation');

    const params = {
      ChargingPeriod: 400n,
    };
    const path = { paramPath: { key: 'governedParams' } };
    t.log('Proposing param change', { params, path });

    await governanceDriver.proposeVaultDirectorParamChange(
      governanceAddresses[0],
      params,
      path,
      charterInvitation[0],
    );

    const questionUpdate = await getLastUpdate(governanceAddresses[0]);
    t.log(questionUpdate);
    t.like(questionUpdate, {
      status: { numWantsSatisfied: 1 },
    });

    t.log('Voting on param change');
    for (const address of governanceAddresses) {
      const voteWallet =
        /** @type {import('@agoric/smart-wallet/src/smartWallet.js').CurrentWalletRecord} */ (
          await readLatestHead(`published.wallet.${address}.current`)
        );

      const usedInvitationsForVoter = voteWallet.offerToUsedInvitation;

      const committeeInvitationForVoter = usedInvitationsForVoter.find(
        v =>
          v[1].value[0].instance.getBoardId() ===
          instances.economicCommittee.getBoardId(),
      );
      assert(
        committeeInvitationForVoter,
        `${address} must have committee invitation`,
      );
      await governanceDriver.voteOnProposedChanges(
        address,
        committeeInvitationForVoter[0],
      );

      const voteUpdate = await getLastUpdate(address);
      t.log(`${address} voted`);
      t.like(voteUpdate, {
        status: { numWantsSatisfied: 1 },
      });
    }

    const latestQuestion =
      /** @type {import('@agoric/governance/src/types.js').QuestionSpec} */ (
        await readLatestHead(
          'published.committees.Economic_Committee.latestQuestion',
        )
      );
    t.log('Waiting for deadline', latestQuestion);
    /** @type {bigint} */
    // @ts-expect-error assume POSIX seconds since epoch
    const deadline = latestQuestion.closingRule.deadline;
    await waitUntil(deadline);

    const latestOutcome = await readLatestHead(
      'published.committees.Economic_Committee.latestOutcome',
    );
    t.log('Verifying latest outcome', latestOutcome);
    t.like(latestOutcome, { outcome: 'win' });
  },
);

test.only('dummy Reserve', async t => {

  console.log('Log: Before ', await getDetailsMatchingVats('reserve'));

  await evalBundles('upgrade-reserve');

  await waitForBlock(10);

  console.log('Log: After ', await getDetailsMatchingVats('reserve'));

  t.pass();
});
