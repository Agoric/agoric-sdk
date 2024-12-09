/* global fetch */

import test from 'ava';

import { GOV1ADDR, GOV2ADDR } from '@agoric/synthetic-chain';
import { makeGovernanceDriver } from './test-lib/governance.js';
import { networkConfig, walletUtils } from './test-lib/index.js';

const GOV4ADDR = 'agoric1c9gyu460lu70rtcdp95vummd6032psmpdx7wdy';
const governanceAddresses = [GOV4ADDR, GOV2ADDR, GOV1ADDR];

const { getLastUpdate } = walletUtils;
const governanceDriver = await makeGovernanceDriver(fetch, networkConfig);

const testSkipXXX = test.skip; // same lenth as test.serial to avoid reformatting all lines

// z:acceptance governance fails/flakes: No quorum #10708
testSkipXXX(
  'economic committee can make governance proposal and vote on it',
  async t => {
    const charterInvitation = await governanceDriver.getCharterInvitation(
      governanceAddresses[0],
    );

    const params = {
      ChargingPeriod: 400n,
    };
    const path = { paramPath: { key: 'governedParams' } };
    t.log('Proposing param change', { params, path });
    const instanceName = 'VaultFactory';

    await governanceDriver.proposeParamChange(
      governanceAddresses[0],
      params,
      path,
      instanceName,
      charterInvitation[0],
    );

    const questionUpdate = await getLastUpdate(governanceAddresses[0]);
    t.log(questionUpdate);
    t.like(questionUpdate, {
      status: { numWantsSatisfied: 1 },
    });

    t.log('Voting on param change');
    for (const address of governanceAddresses) {
      const committeeInvitationForVoter =
        await governanceDriver.getCommitteeInvitation(address);

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

    const { latestOutcome } = await governanceDriver.getLatestQuestion();
    t.log('Verifying latest outcome', latestOutcome);
    t.like(latestOutcome, { outcome: 'win' });
  },
);
