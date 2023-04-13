import { netAccess } from '../lib/rpc.js';
import {
  findContinuingIds,
  makeParamChangeAction,
} from '../src/clientSupportGov.js';
import {
  fmtDetails,
  fmtGovParams,
  fmtPriceFeed,
  makeInterClient,
} from '../src/inter.js';
import { makeFetch } from './fetch.js';

// eslint-disable-next-line no-underscore-dangle
const rpcBoardKit_ = async () => {
  const fetch = makeFetch();
  console.warn('AMBIENT: SpreadsheetApp');
  const doc = SpreadsheetApp.getActiveSpreadsheet();
  const rpc = doc.getRangeByName('RPC').getValue();
  const store = PropertiesService.getDocumentProperties();
  return netAccess({ fetch, env: { AGORIC_NET: `${rpc},agoriclocal` }, store });
};

export const BlockInfo = async () => {
  const { qClient } = await rpcBoardKit_();
  const status = await qClient.getStatus();
  const {
    result: {
      node_info: { network },
      sync_info: { latest_block_height: height, latest_block_time: time },
    },
  } = status;
  return [[height, new Date(Date.parse(time)), network]];
};

const PriceFeed = async (base, quote) => {
  const { board } = await rpcBoardKit_();

  const detail = await board.readLatestHead(
    `published.priceFeed.${base}-${quote}_price_feed`,
  );
  const rows = fmtPriceFeed(`${base}-${quote}`, detail);
  return rows;
};

const GovParams = async vPath => {
  const { board } = await rpcBoardKit_();
  const agoricNames = await board.provideAgoricNames();

  const inter = makeInterClient({ board });
  const params = await inter.getContractParams(vPath);
  const rows = fmtGovParams(params, agoricNames);
  return rows;
};

const InterMetrics = async vPath => {
  const { board } = await rpcBoardKit_();
  const agoricNames = await board.provideAgoricNames();

  const metrics = await board.readLatestHead(`published.${vPath}.metrics`);

  const rows = fmtDetails(metrics, agoricNames);
  return rows;
};

const InterDetails = async vPath => {
  const { board } = await rpcBoardKit_();
  const agoricNames = await board.provideAgoricNames();

  const details = await board.readLatestHead(
    `published.${vPath.replace(/^published./, '')}`,
  );
  if (details?.updated === 'offerStatus') {
    return fmtDetails(details.status, agoricNames);
  }
  const rows = fmtDetails(details, agoricNames);
  return rows;
};

export const FindGovRight = async (address, instanceName, voter = 0) => {
  const { board } = await rpcBoardKit_();
  const agoricNames = await board.provideAgoricNames();
  const current = await board.readLatestHead(
    `published.wallet.${address}.current`,
  );
  const rights = findContinuingIds(current, agoricNames);
  return rights.find(r => r.instanceName === instanceName).offerId;
};

export const ParamChangeAction = async (paramRows, optRows) => {
  const opts = Object.fromEntries(optRows);
  const { board } = await rpcBoardKit_();
  const agoricNames = await board.provideAgoricNames();

  const current = await board.readLatestHead(
    `published.wallet.${opts.ProposerAddress}.current`,
  );
  const rights = findContinuingIds(current, agoricNames);
  const previousOfferId = rights.find(
    r => r.instanceName === 'econCommitteeCharter',
  ).offerId;

  const action = makeParamChangeAction(
    paramRows,
    { ...opts, previousOfferId },
    agoricNames,
  );
  const capData = board.serialize(action);
  return JSON.stringify(capData);
};
