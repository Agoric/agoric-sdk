import test from 'ava';
import '@endo/init';
import { GOV1ADDR } from '@agoric/synthetic-chain';
import { governanceDriver, walletUtils, waitUntil } from './test-lib/index.js';
import { getLastUpdate } from './test-lib/wallet.js';

test.serial(
  'economic committee can make governance proposal and vote on it',
  async t => {
    const { readLatestHead } = walletUtils;

    /** @type {any} */
    const instance = await readLatestHead(`published.agoricNames.instance`);
    const instances = Object.fromEntries(instance);

    /** @type {any} */
    const wallet = await readLatestHead(`published.wallet.${GOV1ADDR}.current`);
    const usedInvitations = wallet.offerToUsedInvitation;

    const charterInvitation = usedInvitations.find(
      v =>
        v[1].value[0].instance.getBoardId() ===
        instances.econCommitteeCharter.getBoardId(),
    );

    const committeeInvitation = usedInvitations.find(
      v =>
        v[1].value[0].instance.getBoardId() ===
        instances.economicCommittee.getBoardId(),
    );

    t.log('proposing on param change');
    const params = {
      ChargingPeriod: 400n,
    };
    const path = { paramPath: { key: 'governedParams' } };

    await governanceDriver.proposeVaultDirectorParamChange(
      GOV1ADDR,
      params,
      path,
      charterInvitation[0],
    );

    const questionUpdate = await getLastUpdate(GOV1ADDR, walletUtils);
    t.like(questionUpdate, {
      status: { numWantsSatisfied: 1 },
    });

    t.log('Voting on param change');
    await governanceDriver.voteOnProposedChanges(
      GOV1ADDR,
      committeeInvitation[0],
    );

    const voteUpdate = await getLastUpdate(GOV1ADDR, walletUtils);
    t.like(voteUpdate, {
      status: { numWantsSatisfied: 1 },
    });

    /** @type {any} */
    const latestQuestion = await readLatestHead(
      'published.committees.Economic_Committee.latestQuestion',
    );
    await waitUntil(latestQuestion.closingRule.deadline);

    t.log('check if latest outcome is correct');
    const latestOutcome = await readLatestHead(
      'published.committees.Economic_Committee.latestOutcome',
    );
    t.like(latestOutcome, { outcome: 'win' });
  },
);
