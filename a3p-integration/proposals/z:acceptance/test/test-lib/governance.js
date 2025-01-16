/* global setTimeout */

import { agops, agoric, executeOffer } from '@agoric/synthetic-chain';
import {
  retryUntilCondition,
  waitUntilElectionResult,
} from '@agoric/client-utils';
import { agdWalletUtils } from './index.js';
import {
  checkCommitteeElectionResult,
  fetchLatestEcQuestion,
} from './psm-lib.js';
import { makeVstorageKit } from './rpc.js';

/**
 * @param {typeof window.fetch} fetch
 * @param {import('./rpc.js').MinimalNetworkConfig} networkConfig
 */
export const makeGovernanceDriver = async (fetch, networkConfig) => {
  const { readLatestHead, marshaller, vstorage } = await makeVstorageKit(
    { fetch },
    networkConfig,
  );

  let deadline;

  /** @param {string} previousOfferId */
  const generateVoteOffer = async previousOfferId => {
    const latestQuestionRecord =
      /** @type {import('@agoric/governance/src/types.js').QuestionSpec} */ (
        await readLatestHead(
          'published.committees.Economic_Committee.latestQuestion',
        )
      );

    const id = `propose-${Date.now()}`;
    const chosenPositions = [latestQuestionRecord.positions[0]];
    const body = {
      method: 'executeOffer',
      offer: {
        id,
        invitationSpec: {
          invitationMakerName: 'makeVoteInvitation',
          previousOffer: previousOfferId,
          source: 'continuing',
          invitationArgs: harden([
            chosenPositions,
            // @ts-expect-error narrowing
            latestQuestionRecord.questionHandle,
          ]),
        },
        proposal: {},
      },
    };

    const capData = marshaller.toCapData(harden(body));
    return JSON.stringify(capData);
  };

  const voteOnProposedChanges = async (
    /** @type {string} */ address,
    /** @type {string} */ committeeAcceptOfferId,
  ) => {
    await null;
    const offerId =
      committeeAcceptOfferId ||
      (await agops.ec(
        'find-continuing-id',
        '--for',
        'Voter0',
        '--from',
        address,
      ));

    return executeOffer(address, generateVoteOffer(offerId));
  };

  /**
   * Generates a parameter change proposal as a `executeOffer` message
   * body.
   *
   * @param {string} previousOfferId - the `id` of the offer that this proposal is
   *   responding to
   * @param {string | number | bigint | boolean} voteDur - how long the vote should
   *   be open for (in seconds)
   * @param {any} params
   * @param {{ paramPath: any; }} paramsPath
   * @param {string} instanceName
   * @returns {Promise<string>} - the `executeOffer` message body as a JSON string
   */
  const generateParamChange = async (
    previousOfferId,
    voteDur,
    params,
    paramsPath,
    instanceName,
  ) => {
    const instancesRaw = await agoric.follow(
      '-lF',
      ':published.agoricNames.instance',
      '-o',
      'text',
    );
    const instances = Object.fromEntries(
      marshaller.fromCapData(JSON.parse(instancesRaw)),
    );
    const instance = instances[instanceName];
    assert(instance);

    const msSinceEpoch = Date.now();
    const id = `propose-${msSinceEpoch}`;
    deadline = BigInt(Math.ceil(msSinceEpoch / 1000)) + BigInt(voteDur);
    const body = {
      method: 'executeOffer',
      offer: {
        id,
        invitationSpec: {
          invitationMakerName: 'VoteOnParamChange',
          previousOffer: previousOfferId,
          source: 'continuing',
        },
        offerArgs: {
          deadline,
          instance,
          params,
          path: paramsPath,
        },
        proposal: {},
      },
    };

    const capData = marshaller.toCapData(harden(body));
    return JSON.stringify(capData);
  };

  /**
   *
   * @param {string} address
   * @param {any} params
   * @param {{paramPath: any}} path
   * @param {string} instanceName
   * @param {number} votingDuration
   * @param {string} [charterAcceptOfferId]
   */
  const proposeParamChange = async (
    address,
    params,
    path,
    instanceName,
    votingDuration,
    charterAcceptOfferId,
  ) => {
    await null;
    const offerId =
      charterAcceptOfferId ||
      (await agops.ec(
        'find-continuing-id',
        '--for',
        `${'charter\\ member\\ invitation'}`,
        '--from',
        address,
      ));

    return executeOffer(
      address,
      generateParamChange(offerId, votingDuration, params, path, instanceName),
    );
  };

  const getCharterInvitation = async address => {
    const { getCurrentWalletRecord } = agdWalletUtils;

    /** @type {any} */
    const instance = await readLatestHead(`published.agoricNames.instance`);
    const instances = Object.fromEntries(instance);

    const wallet = await getCurrentWalletRecord(address);
    const usedInvitations = wallet.offerToUsedInvitation;

    const charterInvitation = usedInvitations.find(
      v =>
        v[1].value[0].instance.getBoardId() ===
        instances.econCommitteeCharter.getBoardId(),
    );
    assert(charterInvitation, 'missing charter invitation');

    return charterInvitation;
  };

  const getCommitteeInvitation = async address => {
    /** @type {any} */
    const instance = await readLatestHead(`published.agoricNames.instance`);
    const instances = Object.fromEntries(instance);

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

    return committeeInvitationForVoter;
  };

  const getLatestQuestion = async () => {
    const { latestOutcome, latestQuestion } = await retryUntilCondition(
      () => fetchLatestEcQuestion({ follow: agoric.follow }),
      electionResult =>
        checkCommitteeElectionResult(electionResult, {
          outcome: 'win',
          deadline,
        }),
      'Governed param change election failed',
      { setTimeout, retryIntervalMs: 5000, maxRetries: 15 },
    );

    return { latestOutcome, latestQuestion };
  };

  const waitForElection = () =>
    waitUntilElectionResult(
      'published.committees.Economic_Committee',
      { outcome: 'win', deadline },
      // @ts-expect-error vstorage casting
      { vstorage: { readLatestHead }, log: console.log, setTimeout },
      {
        errorMessage: 'Governed param change election failed',
        retryIntervalMs: 5000,
        maxRetries: 15,
      },
    );

  const getLatestQuestionHistory = async () => {
    const nodePath = 'published.committees.Economic_Committee.latestQuestion';

    const historyIterator = await vstorage.readHistory(nodePath);
    const history = [];

    for await (const data of historyIterator) {
      if (data) {
        const question = marshaller.fromCapData(JSON.parse(data[0]));
        const changes = question.positions[0].changes;
        history.push(changes);
      }
    }

    return history;
  };

  return {
    voteOnProposedChanges,
    proposeParamChange,
    getCharterInvitation,
    getCommitteeInvitation,
    getLatestQuestion,
    waitForElection,
    getLatestQuestionHistory,
  };
};

/**
 *
 * @param {import('ava').ExecutionContext} t
 * @param {Awaited<ReturnType<makeGovernanceDriver>>} governanceDriver
 * @param {{
 *   instanceName: string;
 *   duration: number;
 *   governanceAddresses: string[];
 *   params: object
 * }} electionParams
 * @param {{ getLastUpdate: (addr: string) => Promise<import('@agoric/smart-wallet/src/smartWallet.js').UpdateRecord>}} io
 */
export const runCommitteeElectionParamChange = async (
  t,
  governanceDriver,
  { instanceName, duration, governanceAddresses, params },
  { getLastUpdate },
) => {
  const path = { paramPath: { key: 'governedParams' } };
  await governanceDriver.proposeParamChange(
    governanceAddresses[0],
    params,
    path,
    instanceName,
    duration,
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
};
