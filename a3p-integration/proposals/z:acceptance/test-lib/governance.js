/* global fetch setTimeout */

import { agops, agoric, executeOffer } from '@agoric/synthetic-chain';
import {
  boardSlottingMarshaller,
  makeFromBoard,
  makeVstorageKit,
  retryUntilCondition,
} from '@agoric/client-utils';
import { makeAPI } from './makeHttpClient.js';
import { makeVStorage } from './rpc.js';
import { walletUtils } from './index.js';

/**
 * @param {typeof window.fetch} fetch
 * @param {import('@agoric/client-utils').MinimalNetworkConfig} networkConfig
 */
export const makeGovernanceDriver = async (fetch, networkConfig) => {
  const { readLatestHead, marshaller } = await makeVstorageKit(
    { fetch },
    networkConfig,
  );

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
    const deadline = BigInt(Math.ceil(msSinceEpoch / 1000)) + BigInt(voteDur);
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
   * @param {string} charterAcceptOfferId
   */
  const proposeParamChange = async (
    address,
    params,
    path,
    instanceName,
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
      generateParamChange(offerId, 10, params, path, instanceName),
    );
  };

  const getCharterInvitation = async address => {
    const { getCurrentWalletRecord } = walletUtils;

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

  return {
    voteOnProposedChanges,
    proposeParamChange,
    getCharterInvitation,
    getCommitteeInvitation,
  };
};

const apiAddress = 'http://0.0.0.0:1317';
const lcd = makeAPI(apiAddress, { fetch });
const { readHistory, readLatest } = makeVStorage(lcd);

const fromBoard = makeFromBoard();
const marshaller = boardSlottingMarshaller(fromBoard.convertSlotToVal);

export const getECLatestOutcome = async () => {
  const { values: question } = await readLatest(
    'published.committees.Economic_Committee.latestQuestion',
  );
  const latestQuestion = marshaller.fromCapData(JSON.parse(question[0]));
  const changedParams = JSON.stringify(
    Object.keys(latestQuestion.positions[0].changes),
  );

  const poolLatestOutcome = async () => {
    const { values: outcome } = await readLatest(
      'published.committees.Economic_Committee.latestOutcome',
    );
    const latestOutcome = marshaller.fromCapData(JSON.parse(outcome[0]));
    return latestOutcome;
  };

  const conditionMet = outcome => {
    const outcomeChanges = JSON.stringify(
      Object.keys(outcome.position.changes),
    );
    return outcomeChanges === changedParams;
  };

  const latestOutcome = await retryUntilCondition(
    () => poolLatestOutcome(),
    conditionMet,
    'LOG: Latest outcome not updated within limits.',
    {
      log: console.log,
      setTimeout,
      maxRetries: 10,
      retryIntervalMs: 5000,
    },
  );

  return latestOutcome;
};

export const getECLatestQuestionHistory = async () => {
  const nodePath = 'published.committees.Economic_Committee.latestQuestion';

  const historyIterator = await readHistory(nodePath);
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
