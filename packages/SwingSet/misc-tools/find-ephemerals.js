#!/usr/bin/env node
// @ts-nocheck
/* eslint no-labels: "off", no-extra-label: "off", no-underscore-dangle: "off" */
import process from 'process';
import sqlite3 from 'better-sqlite3';
import yargsParser from 'yargs-parser';
import '@endo/init/debug.js';

const vatMap = {
  v1: 'bootstrap',
  v2: 'vatAdmin',
  v3: 'comms',
  v4: 'vattp',
  v5: 'timer',
  v6: 'agoricNames',
  v7: 'board',
  v8: 'priceAuthority',
  v9: 'zoe',
  v10: 'bridge',
  v11: 'provisioning',
  // v12 distributed tokens from the pismo era, deleted during vaults/bulldozer bootstrap
  v13: 'zcf-mintHolder-BLD',
  v14: 'bank',
  v15: 'zcf-b1-2371d-econCommitteeCharter',
  v16: 'zcf-mintHolder-ATOM',
  v17: 'zcf-mintHolder-USDC_axl',
  v18: 'zcf-mintHolder-USDC_grv',
  v19: 'zcf-mintHolder-USDT_axl',
  v20: 'zcf-mintHolder-USDT_grv',
  v21: 'zcf-mintHolder-DAI_axl',
  v22: 'zcf-mintHolder-DAI_grv',
  v23: 'zcf-b1-e9e0b-feeDistributor',
  v24: 'zcf-b1-941ef-economicCommittee',
  v25: 'zcf-b1-9f877-provisionPool-governor',
  v26: 'zcf-b1-9f877-ATOM-USD_price_feed-governor',
  v27: 'zcf-b1-9f877-reserve.governor',
  v28: 'zcf-b1-db93f-provisionPool',
  v29: 'zcf-b1-4522b-ATOM-USD_price_feed',
  v30: 'zcf-b1-9f877-psm-IST-USDC_axl.governor',
  v31: 'zcf-b1-9f877-psm-IST-USDC_grv.governor',
  v32: 'zcf-b1-9f877-psm-IST-USDT_axl.governor',
  v33: 'zcf-b1-9f877-psm-IST-USDT_grv.governor',
  v34: 'zcf-b1-9f877-psm-IST-DAI_axl.governor',
  v35: 'zcf-b1-9f877-psm-IST-DAI_grv.governor',
  v36: 'zcf-b1-92c07-reserve',
  v37: 'zcf-b1-c25fb-psm-IST-USDC_axl',
  v38: 'zcf-b1-c25fb-psm-IST-USDC_grv',
  v39: 'zcf-b1-c25fb-psm-IST-USDT_axl',
  v40: 'zcf-b1-c25fb-psm-IST-USDT_grv',
  v41: 'zcf-b1-c25fb-psm-IST-DAI_axl',
  v42: 'zcf-b1-c25fb-psm-IST-DAI_grv',
  v43: 'zcf-b1-94e20-walletFactory',
  v44: 'zcf-b1-9f877-auctioneer.governor',
  v45: 'zcf-b1-a5683-auctioneer',
  v46: 'zcf-b1-0b217-scaledPriceAuthority-ATOM',
  v47: 'zcf-b1-9f877-vaultFactory.governor',
  v48: 'zcf-b1-6c08a-vaultFactory',
  v49: 'zcf-b1-78999-voteCounter.1687287341',
  v50: 'zcf-b1-78999-voteCounter.1687335085',
  v51: 'zcf-b1-78999-voteCounter.1687426440',
  v52: 'zcf-b1-78999-voteCounter.1687426867',
  v53: 'zcf-b1-78999-voteCounter.1687426949',
  v54: 'zcf-b1-78999-voteCounter.1687808052',
  v55: 'zcf-b1-78999-voteCounter.1687809028',
  v56: 'zcf-b1-78999-voteCounter.1687915582',
  v57: 'zcf-b1-78999-voteCounter.1691808218',
  v58: 'zcf-b1-78999-voteCounter.1695077916',
  v59: 'zcf-b1-78999-voteCounter.1695198706',
  v60: 'zcf-b1-51085-kreadCommitteeCharter',
  v61: 'zcf-b1-941ef-kreadCommittee',
  v62: 'zcf-b1-9f877-KREAd-governor',
  v63: 'zcf-b1-853ac-KREAd',
  v64: 'zcf-b1-78999-voteCounter.1697649905',
  v65: 'zcf-b1-78999-voteCounter.1697651249',
  v66: 'zcf-mintHolder-stATOM',
  v67: 'zcf-b1-9f877-stATOM-USD_price_feed-governor',
  v68: 'zcf-b1-4522b-stATOM-USD_price_feed',
  v69: 'zcf-b1-0b217-scaledPriceAuthority-stATOM',
  v70: 'zcf-b1-78999-voteCounter.1697751150',
  v71: 'zcf-mintHolder-USDC',
  v72: 'zcf-b1-9f877-psm-IST-USDC.governor',
  v73: 'zcf-b1-c25fb-psm-IST-USDC',
  v74: 'zcf-mintHolder-USDT',
  v75: 'zcf-b1-9f877-psm-IST-USDT.governor',
  v76: 'zcf-b1-c25fb-psm-IST-USDT',
  v77: 'zcf-b1-78999-voteCounter.1698944868',
  v78: 'zcf-b1-78999-voteCounter.1698944950',
  v79: 'zcf-b1-78999-voteCounter.1699049156',
  v80: 'zcf-b1-78999-voteCounter.1699215618',
  v81: 'zcf-b1-78999-voteCounter.1700540726',
  v82: 'zcf-b1-78999-voteCounter.1700638821',
  v83: 'zcf-b1-78999-voteCounter.1700638922',
  v84: 'zcf-b1-78999-voteCounter.1700857048',
  v85: 'zcf-b1-941ef-CrabbleCommittee',
  v86: 'zcf-b1-0bfb8a-Crabble-governor',
  v87: 'zcf-b1-3af818-Crabble',
  v88: 'zcf-b1-78999-voteCounter.1702995108',
};

const main = rawArgv => {
  const { _: args, ...options } = yargsParser(rawArgv.slice(2));
  if (Reflect.ownKeys(options).length > 0 || args.length < 2) {
    const q = str => `'${str.replaceAll("'", String.raw`'\''`)}'`;
    console.error(
      [
        `Usage: ${rawArgv[1]} /path/to/clist.sqlite VATIDs..`,
        'Identifies ephemeral exports of the given vats.',
      ].join('\n'),
    );
    process.exitCode = 1;
    return;
  }

  const [clDBPAth, ...vatIDs] = args;
  const db = sqlite3(/** @type {string} */ (clDBPAth));
  const getEphemeralExports = db.prepare(
    `SELECT * FROM clist WHERE vatID=? AND durability=1 OR durability=2`,
  );
  const getImports = db.prepare(
    `SELECT * FROM clist WHERE kref=? AND exported=0`,
  );
  const edges = new Map(); // Map<exportingVatID, Map<importingVatID, Set<[importVref,kref,exportVref>>>
  for (const exportingVatID of vatIDs) {
    const exMap = new Map();
    edges.set(exportingVatID, exMap);
    for (const exportRow of getEphemeralExports.iterate(exportingVatID)) {
      if (exportRow.vref === 'o+0') {
        continue; // special case, root object is not actually ephemeral
      }
      const { kref } = exportRow;
      for (const importRow of getImports.iterate(kref)) {
        const importingVatID = importRow.vatID;
        if (!exMap.has(importingVatID)) {
          exMap.set(importingVatID, new Set());
        }
        exMap.get(importingVatID).add([importRow.vref, kref, exportRow.vref]);
      }
    }
  }

  // report
  for (const exportingVatID of [...edges.keys()].sort()) {
    const exMap = edges.get(exportingVatID);
    for (const importingVatID of [...exMap.keys()].sort()) {
      const paths = [...exMap.get(importingVatID)];
      const renderPath = path => `${path[0]}->${path[1]}->${path[2]}`;
      let examples = paths.slice(0, 5).map(renderPath).join(', ');
      if (paths.length > 5) {
        examples += '...';
      }
      console.log(
        `${importingVatID} -> ${exportingVatID}: (${paths.length}) ${examples}`,
      );
    }
  }
};

main(process.argv);
