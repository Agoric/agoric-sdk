import { agops, agoric, executeOffer } from '@agoric/synthetic-chain';
import { makeRpcUtils } from './rpc.js';

export const makeGovernanceDriver = async (fetch, networkConfig) => {
  const { readLatestHead, marshaller } = await makeRpcUtils(
    { fetch },
    networkConfig,
  );
  const generateVoteOffer = async previousOfferId => {
    const id = `propose-${Date.now()}`;

    /**
     * @type {object}
     */
    const latestQuestionRecord = await readLatestHead(
      'published.committees.Economic_Committee.latestQuestion',
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
            latestQuestionRecord.questionHandle,
          ]),
        },
        proposal: {},
      },
    };

    const capData = marshaller.toCapData(harden(body));
    return JSON.stringify(capData);
  };
  const voteOnProposedChanges = async (address, committeeAcceptOfferId) => {
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
  const generateVaultDirectorParamChange = async (
    previousOfferId,
    voteDur,
    params,
    paramsPath,
  ) => {
    const voteDurSec = BigInt(voteDur);
    const toSec = ms => BigInt(Math.round(ms / 1000));

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
