/**
 * @param {CurrentWalletRecord} current
 * @param {AgoricNamesRemotes} agoricNames
 */
const findContinuingIds = (current, agoricNames) => {
  // XXX should runtime type-check
  /** @type {{ offerToUsedInvitation: [string, Amount<'set'>][]}} */
  const { offerToUsedInvitation: entries } = /** @type {any} */ (current);

  assert(Array.isArray(entries));

  const keyOf = (obj, val) => {
    const found = Object.entries(obj).find(e => e[1] === val);
    return found && found[0];
  };

  const found = [];
  for (const [offerId, { value }] of entries) {
    /** @type {{ description: string, instance: unknown }[]} */
    const [{ description, instance }] = value;
    const instanceName = keyOf(agoricNames.instance, instance);
    if (instanceName) {
      found.push({ instance, instanceName, description, offerId });
    }
  }
  return found;
};

const FindGovRight = async (address, instanceName, voter = 0) => {
  const { board } = await rpcBoardKit_();
  const agoricNames = await board.provideAgoricNames();
  const current = await board.readLatestHead(
    `published.wallet.${address}.current`,
  );
  const rights = findContinuingIds(current, agoricNames);
  return rights.find(r => r.instanceName === instanceName).offerId;
};

const testFGR = async () => {
  console.warn('AMBIENT: SpreadsheetApp');
  const doc = SpreadsheetApp.getActiveSpreadsheet();
  const address = doc.getRangeByName('ProposerAddress').getValue();
  const oracleId = await FindGovRight(address, 'ATOM-USD price feed');
  console.log(oracleId);
  const actual = await FindGovRight(address, 'econCommitteeCharter');
  console.log(actual);
};

const encodeGovParamEntry =
  agoricNames =>
  ([name, type, value]) => {
    switch (type) {
      case 'percent': {
        const brand = agoricNames.brand;
        // round to basis point
        const numerator = {
          brand: brand.IST,
          value: BigInt(Math.round(value * 100 * 100)),
        };
        const denominator = {
          brand: brand.IST,
          value: BigInt(100) * BigInt(100),
        };
        return [name, { numerator, denominator }];
      }
      case 'sec': {
        // RelativeTime
        const timerBrand = agoricNames.brand.timer;
        if (!timerBrand) throw Error('no timer brand???');
        return [name, { relValue: BigInt(value), timerBrand }];
      }
      case 'IST': {
        const assetInfo = agoricNames.vbankAsset.uist;
        const { decimalPlaces } = assetInfo.displayInfo;
        const scale = 10 ** decimalPlaces;
        const amount = {
          brand: agoricNames.brand.IST,
          value: BigInt(Math.round(value * scale)),
        };
        return [name, amount];
      }
      default:
        throw Error(`not impl: ${type}`);
    }
  };
const makeParamChangeAction = (rows, opts, agoricNames) => {
  console.log({ rows, opts });
  const params = Object.fromEntries(
    rows.filter(([name]) => name > '').map(encodeGovParamEntry(agoricNames)),
  );
  const instance = agoricNames.instance[opts.instanceName];
  const key = opts.collateralBrandKey
    ? { collateralBrand: agoricNames.brand[opts.collateralBrandKey] }
    : 'governedParams';
  /** @type {import('@agoric/smart-wallet/src/offers.js').OfferSpec} */
  const offer = {
    id: opts.offerId,
    invitationSpec: {
      source: 'continuing',
      previousOffer: opts.previousOfferId,
      invitationMakerName: 'VoteOnParamChange',
    },
    proposal: {},
    offerArgs: {
      instance,
      params,
      path: { paramPath: { key } },
      deadline: BigInt(Math.round(opts.deadline.getTime() / 1000)),
    },
  };
  return { method: 'executeOffer', offer };
};

const ParamChangeAction = async (paramRows, optRows) => {
  const opts = Object.fromEntries(optRows);
  const { board } = await rpcBoardKit_();
  const agoricNames = await board.provideAgoricNames();

  const action = makeParamChangeAction(
    paramRows,
    opts,
    agoricNames,
  );
  const capData = board.serialize(action);
  return JSON.stringify(capData);
};

const testPCO = async () => {
  console.warn('AMBIENT: SpreadsheetApp');
  const doc = SpreadsheetApp.getActiveSpreadsheet();
  const params = doc.getRangeByName('Gov: Auction!B3:D9').getValues();
  const opts = doc.getRange('Gov: Auction!A25:B29').getValues();
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
