import assert from 'node:assert';
import {
  agops,
  agoric,
  executeOffer,
  queryVstorage,
} from '@agoric/synthetic-chain';
import { makeMarshal, Remotable } from '@endo/marshal';

/** @param {string} path */
export const queryVstorageFormatted = async (path, index, fromCapData) => {
  const data = await queryVstorage(path);
  const formattedData = JSON.parse(data.value);
  const formattedDataAtIndex = JSON.parse(formattedData.values.at(index));
  return fromCapData(formattedDataAtIndex);
};

const slotToRemotable = (_slotId, iface = 'Remotable') =>
  Remotable(iface, undefined, {
    getBoardId: () => _slotId,
  });

// /** @param {BoardRemote | object} val */
const boardValToSlot = val => {
  if ('getBoardId' in val) {
    return val.getBoardId();
  }
  throw Error(`unknown obj in boardSlottingMarshaller.valToSlot ${val}`);
};

const boardSlottingMarshaller = slotToVal => {
  return makeMarshal(boardValToSlot, slotToVal, {
    serializeBodyFormat: 'smallcaps',
  });
};

export const marshaller = boardSlottingMarshaller(slotToRemotable);

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
        deadline: deadline,
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

export const generateVoteOffer = async previousOfferId => {
  const id = `propose-${Date.now()}`;

  const latestQuestionRecord = await queryVstorageFormatted(
    'published.committees.Economic_Committee.latestQuestion',
    -1,
    marshaller.fromCapData,
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

export const proposeVaultDirectorParamChange = async (
  address,
  params,
  path,
  charterAcceptOfferId,
) => {
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

export const voteOnProposedChanges = async (
  address,
  committeeAcceptOfferId,
) => {
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

export const acceptInvitation = async (
  address,
  instanceName,
  description,
  offerId,
) => {
  const instanceDataRaw = await agoric.follow(
    '-lF',
    ':published.agoricNames.instance',
    '-o',
    'text',
  );
  const instance = Object.fromEntries(
    marshaller.fromCapData(JSON.parse(instanceDataRaw)),
  );
  assert(instance[instanceName]);
  const id = offerId || `econ-${Date.now()}`;
  const body = {
    method: 'executeOffer',
    offer: {
      id: id,
      invitationSpec: {
        source: 'purse',
        instance: instance[instanceName],
        description,
      },
      proposal: {},
    },
  };

  const capData = marshaller.toCapData(harden(body));
  return executeOffer(address, JSON.stringify(capData));
};
