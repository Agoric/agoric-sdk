import { SpreadsheetApp } from 'google-apps-script';

import { FindGovRight } from '../app/CustomFunctions.js';
import { makeFetch } from '../app/fetch.js';
import { makeInterClient } from '../src/inter.js';
import { netAccess } from '../src/rpc.js';

const testFGR = async () => {
  console.warn('AMBIENT: SpreadsheetApp');
  const doc = SpreadsheetApp.getActiveSpreadsheet();
  const address = doc.getRangeByName('ProposerAddress').getValue();
  const oracleId = await FindGovRight(address, 'ATOM-USD price feed');
  console.log(oracleId);
  const actual = await FindGovRight(address, 'econCommitteeCharter');
  console.log(actual);
};

const testPCO = async () => {
  console.warn('AMBIENT: SpreadsheetApp');
  const doc = SpreadsheetApp.getActiveSpreadsheet();
  const params = doc.getRangeByName('Gov: Propose!B3:D4').getValues();
  const opts = doc.getRange('Gov: Propose!A21:B25').getValues();
  /*
      const params = [['LiquidationPadding', 'percent', 0.2]];
      const opts = Object.entries({
        offerId: 123,
        previousOfferId: 'ecCharter-1680754535937',
        instanceName: 'VaultFactory',
        collateralBrandKey: 'IbcATOM',
        deadline: new Date(Date.now() + 1 * 60 * 1000),
      });
     */
  const actual = await ParamChangeAction(params, opts);
  console.log(actual);
};

const testPriceFeed = async () => {
  const actual = await PriceFeed('ATOM', 'USD');
  console.log(actual);
};

const testGovParams = async () => {
  const rows = await GovParams('auction');
  console.log(rows);
};

const testInterMetrics = async () => {
  const rows = await InterMetrics('vaultFactory');
  console.log(rows);
};

const testInterDetails = async () => {
  const paths = [
    // 'published.priceFeed.ATOM-USD_price_feed.latestRound',
    // 'published.committees.Economic_Committee.latestQuestion',
    // 'published.vaultFactory.manager0.vaults.vault0',
    'wallet.agoric1ldmtatp24qlllgxmrsjzcpe20fvlkp448zcuce',
    'wallet.agoric1ldmtatp24qlllgxmrsjzcpe20fvlkp448zcuce.current',
    'vaultFactory.manager0.quotes',
  ];
  for (const vPath of paths) {
    console.log('details for', vPath);
    const rows = await InterDetails(vPath);
    console.log(rows);
  }
};

const testNamedRanges = () => {
  console.warn('AMBIENT: SpreadsheetApp');
  const doc = SpreadsheetApp.getActiveSpreadsheet();
  const rpc = doc.getRangeByName('RPC').getValue();
  console.log({ rpc });
};

const testLiquidationStatus = async () => {
  const fetch = makeFetch();
  console.warn('AMBIENT: SpreadsheetApp');
  const doc = SpreadsheetApp.getActiveSpreadsheet();

  const rpc = doc.getRangeByName('RPC').getValue();
  const { board } = await netAccess({
    fetch,
    env: { AGORIC_NET: `${rpc},agoriclocal` },
  });

  const tui = {
    show: (x, indent = false) =>
      console.log(JSON.stringify(x, null, indent ? 2 : undefined)),
  };

  const inter = makeInterClient({ board, tui });
  const status = await inter.liquidationStatus({ manager: 0 });
  console.log(status);
};
