import { agops, agoric, executeOffer } from '@agoric/synthetic-chain';
import { makeVstorageKit } from '@agoric/client-utils';

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
    const id = `propose-${Date.now()}`;

    const latestQuestionRecord =
      /** @type {import('@agoric/governance/src/types.js').QuestionSpec} */ (
        await readLatestHead(
          'published.committees.Economic_Committee.latestQuestion',
        )
      );

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
   * Generates a vault director parameter change proposal as a `executeOffer` message
   * body.
   *
   * @param {string} previousOfferId - the `id` of the offer that this proposal is
   *   responding to
   * @param {string | number | bigint | boolean} voteDur - how long the vote should
   *   be open for (in seconds)
   * @param {any} params
   * @param {{ paramPath: any; }} paramsPath
   * @returns {Promise<string>} - the `executeOffer` message body as a JSON string
   */
  const generateVaultDirectorParamChange = async (
    previousOfferId,
    voteDur,
    params,
    paramsPath,
  ) => {
    const voteDurSec = BigInt(voteDur);
    const toSec = (/** @type {number} */ ms) => BigInt(Math.round(ms / 1000));

    const id = `propose-${Date.now()}`;
    const deadline = toSec(Date.now()) + voteDurSec;

    const a = await agoric.follow(
      '-lF',
      ':published.agoricNames.instance',
      '-o',
      'text',
    );
    const instance = Object.fromEntries(marshaller.fromCapData(JSON.parse(a)));
    assert(instance.VaultFactory);

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
          instance: instance.VaultFactory,
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
   * @param {string} charterAcceptOfferId
   */
  const proposeVaultDirectorParamChange = async (
    address,
    params,
    path,
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
      generateVaultDirectorParamChange(offerId, 10, params, path),
    );
  };

  return {
    voteOnProposedChanges,
    proposeVaultDirectorParamChange,
  };
};
