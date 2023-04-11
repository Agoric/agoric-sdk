"use strict";

/**
 * Format amounts, prices etc. based on brand board Ids, displayInfo
 *
 * @param {AssetDescriptor[]} assets
 */
const makeFormatters = assets => {
  const br = asBoardRemote;
  const fmtAmtTuple = makeAmountFormatter(assets);
  /** @param {Amount} amt */
  const amount = amt => (([l, m]) => `${m} ${l}`)(fmtAmtTuple(br(amt)));
  /** @param {Record<string, Amount> | undefined} r */
  const record = r => (r ? objectMap(r, amount) : undefined);
  /** @param {Ratio} r */
  const price = r => {
    const [nl, nm] = fmtAmtTuple(br(r.numerator));
    const [dl, dm] = fmtAmtTuple(br(r.denominator));
    return `${Number(nm) / Number(dm)} ${nl}/${dl}`;
  };
  const discount = r =>
    100 - (Number(r.numerator.value) / Number(r.denominator.value)) * 100;
  return { amount, record, price, discount };
};

/**
 * { name: 'Electorate',
  type: 'invitation',
  value: 
   { brand: { getBoardId: [Function: getBoardId] },
     value: [ [Object] ] } }
3:15:41 PM	Info	{ name: 'EndorsedUI',
  type: 'string',
  value: 'bafybeidvpbtlgefi3ptuqzr2fwfyfjqfj6onmye63ij7qkrb4yjxekdh3e' }
3:15:41 PM	Info	{ name: 'MinInitialDebt',
  type: 'amount',
  value: { brand: { getBoardId: [Function: getBoardId] }, value: {} } }
3:15:41 PM	Info	{ name: 'ShortfallInvitation',
  type: 'invitation',
  value: 
   { brand: { getBoardId: [Function: getBoardId] },
     value: [ [Object] ] } }
 */

const getInvitationDetails = amt => {
  assert(amt.value.length === 1)
  return amt.value[0];
}

const fmtEntry = (fmtAmount, instance) => ([name, { type, value }]) => {
  const { entries } = Object;
  const fmt = fmtAmount;
  switch(type) {
    case 'invitation': {
      const amt = value;
      const d = getInvitationDetails(amt);
      const contractEntry = entries(instance).find(([n, v]) => v === d.instance);
      return [name, contractEntry ? contractEntry[0] : null, d.description]
    }
    case 'nat':
      return [name, Number(value) / 100 / 100, 'BP?'];  // XXX assume no overflow
    case 'string':
      return [name, value];
    case 'amount': {
      const [b, qty] = fmt(value)
      return [name, qty, b];
    }
    case 'ratio': {
      const { numerator, denominator } = value;
      const [bn, qn] = fmt(numerator);
      const [bd, qd] = fmt(denominator);
      if (numerator.brand === denominator.brand) {
        return [name, qn / qd];
      } else {
        return [name, qn / qd, `${bn}/${bd}`]
      }
    }
    case 'relativeTime': {
      return [name, Number(value.relValue), 'sec'];
    }
    default:
      throw Error(`not impl: ${type}`)
  }
}

/**
 * Format governance parameters
 *
 * @param {*} params
 * @param {*} assets values of agoricNames.vbankAsset
 */
const fmtGovParams = (params, agoricNames) => {
  const { entries, values } = Object;
  const { vbankAsset, instance } = agoricNames;
  const fmt1 = fmtEntry(makeAmountFormatter(values(vbankAsset)), instance);

  return entries(params).map(fmt1)
};

const bigintReplacer = (_n, v) => typeof v === 'bigint' ? Number(v) : v;

const fmtDetails = (metrics, agoricNames) => {
  const { entries, values } = Object;
  const { vbankAsset, instance } = agoricNames;
  const fmtAmt = makeAmountFormatter(values(vbankAsset));
  const fmt1 = fmtEntry(fmtAmt, instance);
  const assetName = brand => values(agoricNames.vbankAsset).find(d => d.brand === brand)?.issuerName;
  const priceEntry = (name, ratio) => fmt1([ name, { type: 'ratio', value: ratio } ])
  const grokEntry = ([name, value]) => {
    const isObject = typeof value === 'object' && value !== null;
    if (name === 'quoteAmount') {
        const { value: [{ amountIn, amountOut }] } = value;
        return [priceEntry(name, { numerator: amountOut, denominator: amountIn })];
    } else if (name === 'quotePayment') {
        return [[name, '...']];
    } else if (name === 'debtSnapshot') {
        return [[name, 'debt', ...fmtAmt(value.debt)],
                [name, ...priceEntry('interest', value.interest)]];
    // TODO: InterWallet function?
    } else if (name === 'closingRule') {
      return [[name, 'deadline', new Date(Number(value.deadline) * 1000)]]
    } else if (name === 'startedAt') {
      return [[name, new Date(Number(value) * 1000)]]
    } else if (name === 'positions') {
      return [...fmtDetails(value[0].changes, agoricNames).map(r => [name, 'changes', ...r]),
              [name, 'noChange', [value[1].noChange].join(',')]]
    } else if (name === 'issue') {
      const rows = [[name, 'contract', value.contract.getBoardId()], // TODO: instanceName
              ...fmtDetails(value.spec.changes, agoricNames).map(r => [name, 'spec.changes', ...r]),
              [name, 'paramPath.key', 'collateralBrand', assetName(value.spec.paramPath.key.collateralBrand)]];
      return rows;
    } else if (name === 'result') {
        return [[name, value]];
    } else if (name === 'purses') {
        return [[name, '...']];
    } else if (name === 'offerToUsedInvitation') {
        return value.map(([id, amt]) => [name, ...fmt1([id, { type: 'invitation', value: amt }])]);
    } else if (name === 'offerToPublicSubscriberPaths') {
      return value.map(([id, sp]) => [name, id, ...entries(sp).flat()]);
    } else if (name === 'invitationSpec') {
      return entries(value).map(e => [name, ...e]);      
    } else if (name === 'proposal') {
      return ['give', 'want'].filter(p => p in value).flatMap(p => entries(value[p]).map(([kw, amt]) => [name, p, ...fmtAmt(amt)]));
    } else if (isObject && 'brand' in value && 'value' in value && typeof value.value === 'bigint') {
      // amount
      return [fmt1([name, { type: 'amount', value }])];
    } else if (typeof value === 'number' || typeof value === 'string') {
      // number - e.g. numVaults
      return [[name, value]];
    } else if (Array.isArray(value) && value.length > 0 && assetName(value[0])) {
      // Array<brand> - e.g. collaterals
      return [[name, value.map(assetName).join(',')]];
    } else if (isObject && 'numerator' in value && 'denominator' in value) {
      // ratio - e.g. interest
      return [priceEntry(name, value)];
    } else if (isObject && values(value).length > 0 && assetName(values(value)[0].brand)) {
      // Record<string, Amount> - e.g. rewardPoolAllocation
      return entries(value).map(([kw, amt]) => [name, kw, ...fmtAmt(amt).reverse()]);
    } else if (isObject && values(value).length === 0) {
      // empty Record<string, Amount> - e.g. rewardPoolAllocation
      return [[name]];
    } else if (isObject && 'getBoardId' in value) {
      return [[name, 'boardId', value.getBoardId()]];
    } else {
      return [[name, '???', JSON.stringify(value, bigintReplacer, 2)]]
    }
  }
  return entries(metrics).flatMap(grokEntry);
};

const fmtPriceFeed = (name, detail) => {
  const d = detail;
  const price = Number(d.amountOut.value) / Number(d.amountIn.value);
  return [[name, 'price', price],
          [name, 'timestamp', new Date(Number(d.timestamp) * 1000)]]
}

const PriceFeed = async (base, quote) => {
  const { board } = await rpcBoardKit_();

  const detail = await board.readLatestHead(`published.priceFeed.${base}-${quote}_price_feed`);
  const rows = fmtPriceFeed(`${base}-${quote}`, detail);
  return rows;
}

const testPriceFeed = async () => {
  const actual = await PriceFeed("ATOM", "USD");
  console.log(actual);
}

/**
 * Format amounts in vaultManager metrics for JSON output.
 *
 * @param {*} metrics manager0.metrics
 * @param {*} quote manager0.quote
 * @param {*} assets agoricNames.vbankAsset
 */
const fmtMetrics = (metrics, quote, assets) => {
  const fmt = makeFormatters(assets);
  const { liquidatingCollateral, liquidatingDebt } = metrics;

  const {
    quoteAmount: {
      value: [{ amountIn, amountOut }],
    },
  } = quote;
  const price = fmt.price({ numerator: amountOut, denominator: amountIn });

  const amounts = objectMap(
    { liquidatingCollateral, liquidatingDebt },
    fmt.amount,
  );
  return { ...amounts, price };
};

const netAccess = async ({ fetch, env: { AGORIC_NET }, store }) => {
  const qLocal = makeQueryClient({ fetch });
  const qClient = await (
    AGORIC_NET && AGORIC_NET !== 'local'
      ? qLocal.withConfig(AGORIC_NET)
      : qLocal);
  const keys = ['brand', 'instance', 'vbankAsset'].map(child => `published.agoricNames.${child}`);
  const qCache = withCache(qClient, keys, store);
  const board = makeBoardClient(qCache);
  return { qClient: qCache, board };
}

const makeInterClient = ({ board, tui }) => {
  const { freeze, values } = Object;

  const getContractParams = (vPath) => {
    const { readLatestHead } = board;
    return readLatestHead(`published.${vPath}.governance`).then(({ current }) => current)
  }

  const liquidationStatus = async opts => {
    const agoricNames = await board.provideAgoricNames();
    const { readLatestHead } = board;

    const [metrics, quote] = await Promise.all([
      readLatestHead(`published.vaultFactory.manager${opts.manager}.metrics`),
      readLatestHead(`published.vaultFactory.manager${opts.manager}.quotes`),
    ]);
    const info = fmtMetrics(metrics, quote, values(agoricNames.vbankAsset));
    tui.show(info, true);
  }
  return freeze({ liquidationStatus, getContractParams })
}

const testNamedRanges = () => {
  console.warn('AMBIENT: SpreadsheetApp')
  const doc = SpreadsheetApp.getActiveSpreadsheet();
  const rpc = doc.getRangeByName('RPC').getValue();
  console.log({ rpc })
}

const testLiquidationStatus = async () => {
  const fetch = makeFetch();
  console.warn('AMBIENT: SpreadsheetApp')
  const doc = SpreadsheetApp.getActiveSpreadsheet();

  const rpc = doc.getRangeByName('RPC').getValue();
  const { board } = await netAccess({ fetch, env: { AGORIC_NET: `${rpc},agoriclocal` } });

  const tui = { show: (x, indent = false) => console.log(JSON.stringify(x, null, indent ? 2 : undefined))}

  const inter = makeInterClient({ board, tui });
  const status = await inter.liquidationStatus({ manager: 0 });
  console.log(status)
}

const rpcBoardKit_ = async () => {
  const fetch = makeFetch();
  console.warn('AMBIENT: SpreadsheetApp')
  const doc = SpreadsheetApp.getActiveSpreadsheet();
  const rpc = doc.getRangeByName('RPC').getValue();
  return netAccess({ fetch, env: { AGORIC_NET: `${rpc},agoriclocal` } });
}

const GovParams = async (vPath) => {
  const { board } = await rpcBoardKit_();
  const agoricNames = await board.provideAgoricNames();

  const inter = makeInterClient({ board });
  const params = await inter.getContractParams(vPath);
  const rows = fmtGovParams(params, agoricNames);
  return rows;
}

const InterMetrics = async (vPath) => {
  const { board } = await rpcBoardKit_();
  const agoricNames = await board.provideAgoricNames();

  const metrics = await board.readLatestHead(`published.${vPath}.metrics`)

  const rows = fmtDetails(metrics, agoricNames);
  return rows;
}

const InterDetails = async (vPath) => {
  const { board } = await rpcBoardKit_();
  const agoricNames = await board.provideAgoricNames();

  const details = await board.readLatestHead(`published.${vPath.replace(/^published./, '')}`);
  if (details?.updated === 'offerStatus') {
    return fmtDetails(details.status, agoricNames);
  }
  const rows = fmtDetails(details, agoricNames);
  return rows;
}

const testGovParams = async () => {
  const rows = await GovParams('auction');
  console.log(rows)
}

const testInterMetrics = async () => {
  const rows = await InterMetrics('vaultFactory');
  console.log(rows)
}

const testInterDetails = async () => {
  const paths = [
    //'published.priceFeed.ATOM-USD_price_feed.latestRound',
    //'published.committees.Economic_Committee.latestQuestion',
    //'published.vaultFactory.manager0.vaults.vault0',
    'wallet.agoric1ldmtatp24qlllgxmrsjzcpe20fvlkp448zcuce',
    'wallet.agoric1ldmtatp24qlllgxmrsjzcpe20fvlkp448zcuce.current',
    'vaultFactory.manager0.quotes',
  ];
  for (const vPath of paths) {
    console.log('details for', vPath);
    const rows = await InterDetails(vPath);
    console.log(rows)
  }
}

const BlockInfo = async () => {
  const { qClient } = await rpcBoardKit_();
  const status = await qClient.getStatus();
  const { result: { sync_info: { latest_block_height: height, latest_block_time: time } } } = status; 
  return [[height, new Date(Date.parse(time))]];
}