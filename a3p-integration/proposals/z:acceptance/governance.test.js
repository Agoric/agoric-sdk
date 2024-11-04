/* global fetch setTimeout */

import '@endo/init';
import test from 'ava';

import { GOV1ADDR, GOV2ADDR } from '@agoric/synthetic-chain';
import { makeGovernanceDriver } from './test-lib/governance.js';
import { networkConfig, walletUtils } from './test-lib/index.js';
import { makeTimerUtils } from './test-lib/utils.js';
import { getLastUpdate } from './test-lib/wallet.js';

const GOV4ADDR = 'agoric1c9gyu460lu70rtcdp95vummd6032psmpdx7wdy';
const governanceAddresses = [GOV4ADDR, GOV2ADDR, GOV1ADDR];

test.serial(
  'economic committee can make governance proposal and vote on it',
  async t => {
    const { waitUntil } = makeTimerUtils({ setTimeout });
    const { readLatestHead } = walletUtils;
    const governanceDriver = await makeGovernanceDriver(fetch, networkConfig);

    /** @type {any} */
    const instance = await readLatestHead(`published.agoricNames.instance`);
    const instances = Object.fromEntries(instance);

    /** @type {any} */
    const wallet = await readLatestHead(
      `published.wallet.${governanceAddresses[0]}.current`,
    );
    const usedInvitations = wallet.offerToUsedInvitation;

    const charterInvitation = usedInvitations.find(
      v =>
        v[1].value[0].instance.getBoardId() ===
        instances.econCommitteeCharter.getBoardId(),
    );

    t.log('proposing on param change');
    const params = {
      ChargingPeriod: 400n,
    };
    const path = { paramPath: { key: 'governedParams' } };

    await governanceDriver.proposeVaultDirectorParamChange(
      governanceAddresses[0],
      params,
      path,
      charterInvitation[0],
    );

    const questionUpdate = await getLastUpdate(governanceAddresses[0], {
      readLatestHead,
    });
    t.like(questionUpdate, {
      status: { numWantsSatisfied: 1 },
    });

    t.log('Voting on param change');
    for (const address of governanceAddresses) {
      /** @type {any} */
      const voteWallet = await readLatestHead(
        `published.wallet.${address}.current`,
      );

      const usedInvitationsForVoter = voteWallet.offerToUsedInvitation;

      const committeeInvitationForVoter = usedInvitationsForVoter.find(
        v =>
          v[1].value[0].instance.getBoardId() ===
          instances.economicCommittee.getBoardId(),
      );
      await governanceDriver.voteOnProposedChanges(
        address,
        committeeInvitationForVoter[0],
      );

      const voteUpdate = await getLastUpdate(address, { readLatestHead });
      t.like(voteUpdate, {
        status: { numWantsSatisfied: 1 },
      });
    }

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
