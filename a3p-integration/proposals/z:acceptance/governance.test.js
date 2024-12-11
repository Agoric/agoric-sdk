/* global fetch */

import test from 'ava';

import { GOV1ADDR, GOV2ADDR } from '@agoric/synthetic-chain';
import { makeGovernanceDriver } from './test-lib/governance.js';
import { networkConfig, walletUtils } from './test-lib/index.js';
import { upgradeContract } from './test-lib/utils.js';

const GOV4ADDR = 'agoric1c9gyu460lu70rtcdp95vummd6032psmpdx7wdy';
const governanceAddresses = [GOV4ADDR, GOV2ADDR, GOV1ADDR];

const { getLastUpdate, readLatestHead } = walletUtils;
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

test.serial(
  'VaultFactory governed parameters are intact following contract upgrade',
  async t => {
    /** @type {any} */
    const vaultFactoryParamsBefore = await readLatestHead(
      'published.vaultFactory.governance',
    );

    /*
     * At the previous test ('economic committee can make governance proposal and vote on it')
     * The value of ChargingPeriod was updated to 400
     * The 'published.vaultFactory.governance' node should reflect that change.
     */
    t.is(
      vaultFactoryParamsBefore.current.ChargingPeriod.value,
      400n,
      'vaultFactory ChargingPeriod parameter value is not the expected ',
    );

    await upgradeContract('upgrade-vaultFactory', 'zcf-b1-6c08a-vaultFactory');

    const vaultFactoryParamsAfter = await readLatestHead(
      'published.vaultFactory.governance',
    );

    t.deepEqual(
      vaultFactoryParamsAfter,
      vaultFactoryParamsBefore,
      'vaultFactory governed parameters did not match',
    );
  },
);

test.serial(
  'economic committee can make governance proposal for ProvisionPool',
  async t => {
    const charterInvitation = await governanceDriver.getCharterInvitation(
      governanceAddresses[0],
    );

    /** @type {any} */
    const brand = await readLatestHead(`published.agoricNames.brand`);
    const brands = Object.fromEntries(brand);

    const params = {
      PerAccountInitialAmount: { brand: brands.IST, value: 100_000n },
    };
    const path = { paramPath: { key: 'governedParams' } };
    const instanceName = 'provisionPool';

    await governanceDriver.proposeParamChange(
      governanceAddresses[0],
      params,
      path,
      instanceName,
      charterInvitation[0],
    );

    const questionUpdate = await getLastUpdate(governanceAddresses[0]);
    t.like(questionUpdate, {
      status: { numWantsSatisfied: 1 },
    });

    for (const address of governanceAddresses) {
      const committeeInvitationForVoter =
        await governanceDriver.getCommitteeInvitation(address);

      await governanceDriver.voteOnProposedChanges(
        address,
        committeeInvitationForVoter[0],
      );

      const voteUpdate = await getLastUpdate(address);
      t.like(voteUpdate, {
        status: { numWantsSatisfied: 1 },
      });
    }

    const { latestOutcome } = await governanceDriver.getLatestQuestion();
    t.log('Verifying latest outcome', latestOutcome);
    t.like(latestOutcome, { outcome: 'win' });
  },
);

test.serial(
  'ProvisionPool governed parameters are intact following contract upgrade',
  async t => {
    /** @type {any} */
    const provisionPoolParamsBefore = await readLatestHead(
      'published.provisionPool.governance',
    );

    /*
     * At the previous test ('economic committee can make governance proposal and vote on it')
     * The value of ChargingPeriod was updated to 400
     * The 'published.vaultFactory.governance' node should reflect that change.
     */
    t.is(
      provisionPoolParamsBefore.current.PerAccountInitialAmount.value.value,
      100_000n,
      'provisionPool PerAccountInitialAmount parameter value is not the expected ',
    );

    await upgradeContract(
      'upgrade-provisionPool',
      'zcf-b1-db93f-provisionPool',
    );

    /** @type {any} */
    const provisionPoolParamsAfter = await readLatestHead(
      'published.provisionPool.governance',
    );

    t.deepEqual(
      provisionPoolParamsAfter.current.PerAccountInitialAmount,
      provisionPoolParamsBefore.current.PerAccountInitialAmount,
      'provisionPool governed parameters did not match',
    );
  },
);
