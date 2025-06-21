/* global fetch */

import test from 'ava';

import { bankSend, GOV1ADDR, GOV2ADDR } from '@agoric/synthetic-chain';
import {
  makeGovernanceDriver,
  runCommitteeElectionParamChange,
} from './test-lib/governance.js';
import { agdWalletUtils } from './test-lib/index.js';
import { upgradeContract } from './test-lib/utils.js';
import { networkConfig } from './test-lib/rpc.js';

const GOV4ADDR = 'agoric1c9gyu460lu70rtcdp95vummd6032psmpdx7wdy';
const governanceAddresses = [GOV4ADDR, GOV2ADDR, GOV1ADDR];

const { getLastUpdate, readLatestHead } = agdWalletUtils;
const governanceDriver = await makeGovernanceDriver(fetch, networkConfig);

/**
 * @typedef {{
 *   current: { ChargingPeriod: Amount },
 *  }} ChargingPeriodRecord
 */

test.before(async t => {
  t.log('funding economic committee transactions');
  await null;
  for (const address of governanceAddresses) {
    await bankSend(address, `${BigInt(100e6)}ubld`);
  }
});

test.serial(
  'economic committee can make governance proposal and vote on it',
  async t => {
    /** @type {ChargingPeriodRecord} */
    // @ts-expect-error cast
    const vaultFactoryParamsBefore = await readLatestHead(
      'published.vaultFactory.governance',
    );
    const newChargingPeriod =
      vaultFactoryParamsBefore.current.ChargingPeriod.value === 400n
        ? 300n
        : 400n;

    const params = {
      ChargingPeriod: newChargingPeriod,
    };
    const instanceName = 'VaultFactory';

    await runCommitteeElectionParamChange(
      t,
      governanceDriver,
      { instanceName, duration: 30, governanceAddresses, params },
      { getLastUpdate },
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

    await governanceDriver.waitForElection();

    /** @type {ChargingPeriodRecord} */
    // @ts-expect-error cast
    const vaultFactoryParamsAfter = await readLatestHead(
      'published.vaultFactory.governance',
    );

    t.is(
      vaultFactoryParamsAfter.current.ChargingPeriod.value,
      newChargingPeriod,
      'vaultFactory governed parameters did not match',
    );
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

    await upgradeContract('upgrade-vaultFactory', 'vaultFactory');

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
    /** @type {any} */
    const brand = await readLatestHead(`published.agoricNames.brand`);
    const brands = Object.fromEntries(brand);

    const params = {
      PerAccountInitialAmount: { brand: brands.BLD, value: 100_000n },
    };
    const instanceName = 'provisionPool';

    await runCommitteeElectionParamChange(
      t,
      governanceDriver,
      { instanceName, duration: 30, governanceAddresses, params },
      { getLastUpdate },
    );
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
     * At the previous test('economic committee can make governance proposal for ProvisionPool')
     * The value of PerAccountInitialAmount was updated to 100
     * The 'published.provisionPool.governance' node should reflect that change.
     */
    t.is(
      provisionPoolParamsBefore.current.PerAccountInitialAmount.value.value,
      100_000n,
      'provisionPool PerAccountInitialAmount parameter value is not the expected ',
    );

    await upgradeContract('upgrade-provisionPool', 'provisionPool');

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

test.serial(
  'make sure provisionPool governance works after governor upgrade',
  async t => {
    /** @type {any} */
    const brand = await readLatestHead(`published.agoricNames.brand`);
    const brands = Object.fromEntries(brand);

    const params = {
      PerAccountInitialAmount: { brand: brands.BLD, value: 300_000n },
    };
    const instanceName = 'provisionPool';

    await runCommitteeElectionParamChange(
      t,
      governanceDriver,
      { instanceName, duration: 30, governanceAddresses, params },
      { getLastUpdate },
    );

    /** @type {any} */
    const provisionPoolParams = await readLatestHead(
      'published.provisionPool.governance',
    );

    t.is(
      provisionPoolParams.current.PerAccountInitialAmount.value.value,
      300_000n,
      'provisionPool PerAccountInitialAmount parameter value is not as expected after governor upgrade',
    );
  },
);

test.serial('Governance proposals history is visible', async t => {
  /**
   * Chronologically ascending parameters changed by Economic Committee
   * governance prior to execution of this test.
   *
   * XXX a dynamic solution should replace this hardcoded list to ensure
   * the acceptance tests scalability
   */
  const expectedParametersChanges = [
    ['ClockStep', 'PriceLockPeriod', 'StartFrequency'], // agoric-3-proposals/proposals/34:upgrade-10/performActions.js
    ['DebtLimit'], // agoric-3-proposals/proposals/34:upgrade-10/performActions.js
    ['MintLimit'], // agoric-3-proposals/proposals/92:reset-psm-mintlimit/submission/psm-gov-reset.js
    ['ClockStep', 'PriceLockPeriod', 'StartFrequency'], // z:acceptance/scripts/test-vaults.mts
    ['DebtLimit'], // z:acceptance/scripts/test-vaults.mts
    ['GiveMintedFee', 'MintLimit', 'WantMintedFee'], // z:acceptance/psm.test.js
    ['DebtLimit'], // z:acceptance/vaults.test.js
    ['ChargingPeriod'], // z:acceptance/governance.test.js
    ['PerAccountInitialAmount'], // z:acceptance/governance.test.js
    ['PerAccountInitialAmount'], // z:acceptance/governance.test.js
  ];

  // history of Economic Committee parameters changes proposed since block height 0
  const history = (await governanceDriver.getLatestQuestionHistory()).reverse();
  t.true(
    history.length > 0,
    'published.committees.Economic_Committee.latestQuestion node should not be empty',
  );

  const actualParametersChanges = history.map(changes => Object.keys(changes));

  if (
    JSON.stringify(actualParametersChanges) ===
    JSON.stringify(expectedParametersChanges)
  ) {
    return;
  }

  t.log(
    'Economic_Committee parameters changes actual history:',
    actualParametersChanges.map(params => params.join(', ')),
  );
  t.log(
    'Economic_Committee parameters changes expected history:',
    expectedParametersChanges.map(params => params.join(', ')),
  );
  // If you see the below message and executed a contract governance parameter
  // change prior to this test, update expectedParametersChanges accordingly.
  t.fail(
    'Economic_Committee parameters changes history must match expectations',
  );
});
