// @ts-check
// TODO: factor out ambient authority from these
// or at least allow caller to supply authority.
import '@endo/init';
import {
  agd,
  agops,
  agopsLocation,
  agoric,
  dbTool,
  executeCommand,
  executeOffer,
  getContractInfo,
  makeAgd,
  makeFileRd,
  makeFileRW,
  waitForBlock,
} from '@agoric/synthetic-chain';
import {
  boardValToSlot,
  slotToBoardRemote
} from "@agoric/vats/tools/board-utils.js";
import { makeMarshal } from "@endo/marshal";
import processAmbient from "process";
import cpAmbient from "child_process";
import dbOpenAmbient from "better-sqlite3";
import fspAmbient from "fs/promises";
import pathAmbient from "path";
import { tmpName as tmpNameAmbient } from "tmp";
import { Liquidation } from "./spec.test.js";

const AdvanceTimeExactOfferSpec = ({ id, timestamp }) => ({
  id,
  invitationSpec: {
    source: "agoricContract",
    instancePath: ['manualTimerInstance'],
    callPipe: [["makeAdvanceTimeInvitation"]],
  },
  proposal: {},
  offerArgs: { timestamp },
});

const AdvanceTimeStepByStepOfferSpec = ({ id, steps, duration }) => ({
  id,
  invitationSpec: {
    source: "agoricContract",
    instancePath: ['manualTimerInstance'],
    callPipe: [["makeAdvanceTimeStepByStepInvitation"]],
  },
  proposal: {},
  offerArgs: { duration },
});

export const makeTestContext = async ({ io = {}, testConfig, srcDir }) => {
  const {
    process: { env, cwd } = processAmbient,
    child_process: { execFileSync } = cpAmbient,
    dbOpen = dbOpenAmbient,
    fsp = fspAmbient,
    path = pathAmbient,
    tmpName = tmpNameAmbient,
  } = io;

  const src = srcDir ? makeFileRd(`${cwd()}/${srcDir}`, { fsp, path }) : {};
  const tmpNameP = prefix =>
    new Promise((resolve, reject) =>
      tmpName({ prefix }, (err, x) => (err ? reject(err) : resolve(x))),
    );

  const config = {
    chainId: 'agoriclocal',
    ...testConfig,
  };

  // This agd API is based on experience "productizing"
  // the inter bid CLI in #7939
  const agd = makeAgd({ execFileSync: execFileSync }).withOpts({
    keyringBackend: 'test',
  });

  const dbPath = testConfig.swingstorePath.replace(/^~/, env.HOME);
  const swingstore = dbTool(dbOpen(dbPath, { readonly: true }));

  /* @param {string} baseName */
  const mkTempRW = async baseName =>
    makeFileRW(await tmpNameP(baseName), { fsp, path });
  return { agd, agoric, agops, swingstore, config, mkTempRW, src };
};

/** @param {number[]} xs */
export const sum = xs => xs.reduce((a, b) => a + b, 0);

/**
 *
 * @param {import('@agoric/synthetic-chain').FileRW} src
 * @param {string} fileName
 * @return {Promise<number>}
 */
export const getFileSize = async (src, fileName) => {
  const file = src.join(fileName);
  const { size } = await file.stat();
  return size;
};

export const poll = async (check, maxTries) => {
  for (let tries = 0; tries < maxTries; tries += 1) {
    const ok = await check();
    if (ok) return;
    await waitForBlock();
  }
  throw Error(`tried ${maxTries} times without success`);
};

/**
 * @typedef AgopsOfferParams
 * @property t
 * @property {string[]} agopsParams
 * @property {string[]} txParams Without --offer flag
 * @property {string} from
 * @property {import('@agoric/synthetic-chain').FileRW} src
 *
 * @param {AgopsOfferParams}
 */
export const agopsOffer = async ({
  t,
  agopsParams,
  txParams,
  from,
  src,
}) => {
  const { agops, agoric } = t.context;

  await src.mkdir(from);
  const fileRW = await src.join(from);

  try {
    const test = await agops.oracle(...agopsParams);
    await fileRW.writeText(test);
    t.log({ test })
    await agoric.wallet(...txParams, '--offer', fileRW.toString());
  } catch (e) {
    t.fail(e);
  }
};

/**
 *
 * @param {string} path
 * @return {Promise<string[]>}
 */
export const getStorageChildren = async path => {
  const { children } = await agd.query('vstorage',
    'children',
    path);

  return children;
};

/**
 * @return {Promise<number>}
 */
const getPriceRound = async () => {
  const children = await getStorageChildren('published.priceFeed.STARS-USD_price_feed');
  console.log({ children });
  const roundChild = [...children].find(element => element === 'latestRound');
  if (roundChild === undefined) return 0;

  const { roundId } = await getContractInfo('priceFeed.STARS-USD_price_feed.latestRound', { agoric });
  return Number(roundId);
};

/**
 *
 * @param t
 * @param price
 * @param {Array<{address, acceptId}>} oracles
 * @return {Promise<void>}
 */
export const pushPrice = async (t, price, oracles) => {
  const { mkTempRW } = t.context;
  const tmpRW = await mkTempRW('pushPrices');

  const curRound = await getPriceRound();

  const buildAgopsArgs = id => {
    return [
      'pushPriceRound',
      '--price',
      price,
      '--roundId',
      curRound + 1,
      '--oracleAdminAcceptOfferId',
      id,
    ]
  };

  const buildOfferArgs = from => {
    return [
      'send',
      '--from',
      from,
      '--keyring-backend=test',
    ]
  };

  for (const { address, acceptId } of oracles) {
    await agopsOffer({
        t,
        agopsParams: buildAgopsArgs(acceptId),
        txParams: buildOfferArgs(address),
        src: tmpRW,
        from: address
      }
    )
  }

  await waitForBlock(5);
};

export const acceptsOracleInvitations = async (t, oracles) => {
  const { mkTempRW } = t.context;
  const tmpRW = await mkTempRW('acceptInvites');

  const buildAgopsParams = (id = Date.now()) => {
    return ['accept', '--offerId', id, '--pair', 'STARS.USD'];
  };

  const buildOfferParams = from => {
    return ['send', '--from', from, '--keyring-backend=test'];
  };

  const offersP = [];
  for (const { address, acceptId } of oracles) {
    offersP.push(
      agopsOffer({ t, agopsParams: buildAgopsParams(acceptId), txParams: buildOfferParams(address), from: address, src: tmpRW}),
    )
  }

  await Promise.all(offersP);

  // Wait 5 blocks
  await waitForBlock(5);
};

/**
 *
 * @param {{
 *  src: string,
 *  dest: string
 * }[]} config dest must be absolute and src can be relative
 * @param fsp
 */
export const copyAll = (config, { fsp }) => {
  const copyPs = [];
  for (const { src, dest } of config) {
    const srcUrl = new URL(src, import.meta.url);
    copyPs.push(fsp.cp(srcUrl, dest));
  }

  return Promise.all(copyPs);
}

/**
 * Use this method when you need to extract filename from a path
 *
 * @param {string} filePath
 */
export const extractNameFromPath = filePath => filePath.split('/').at(-1)

export const makeBoardMarshaller = () => makeMarshal(boardValToSlot, slotToBoardRemote, { serializeBodyFormat: 'smallcaps'});


/**
 * Like getContractInfo from @agoric/synthetic-chain but also returns
 * the marshaller itself as well.
 *
 * @param io
 * @return {{data: any, marshaller: import('@endo/marshal').Marshal}}
 *
 */
export const makeStorageInfoGetter = io => {
  const {
    agoric
  } = io;

  const marshaller = makeBoardMarshaller();

  const getStorageInfo = async path => {
    const stdout = await agoric.follow('-lF', `:${path}`, '-o', 'text');
    const tx = JSON.parse(stdout);
    return marshaller.fromCapData(tx);
  };

  return { getStorageInfo, marshaller };
}

export const makeAuctionTimerDriver = async (context, from) => {
  const { mkTempRW, agoric } = context;
  const id = `manual-timer-${Date.now()}`;
  const tmpRW = await mkTempRW(id);

  const { getStorageInfo, marshaller } = makeStorageInfoGetter({ agoric });


  const startAuction = async () => {
    const { nextStartTime, nominalStart } = await calculateNominalStart({ agoric });

    // First move the timer to nominalStart
    await sendTimerOffer(from, marshaller, tmpRW, 'exact', { timestamp: nominalStart });

    // Now start the auction
    await sendTimerOffer(from, marshaller, tmpRW, 'exact', { timestamp: nextStartTime});

    return { nextStartTime, nominalStart };
  };

  const advanceAuctionStepByOne = async () => {
    const schedule = await getStorageInfo('published.fakeAuctioneer.schedule');

    const { nextDescendingStepTime } = schedule;
    console.log(schedule);

    // Now start the auction
    await sendTimerOffer(from, marshaller, tmpRW, 'exact', { timestamp: nextDescendingStepTime.absValue });
  };

  /**
   *
   * @param {BigInt} steps
   * @return {Promise<void>}
   */
  const advanceAuctionStepMulti = async steps => {
    const governance = await getStorageInfo('published.fakeAuctioneer.governance');

    const { ClockStep: {
      value: { relValue: clockStepVal }
    } } = governance.current;

    let currentStep = 0;
    while(currentStep < steps) {
      await sendTimerOffer(from, marshaller, tmpRW, 'step', { duration: clockStepVal });
      currentStep += 1;
      await waitForBlock(5);
    }
  }

  return {
    advanceAuctionStepByOne,
    advanceAuctionStepMulti,
    startAuction,
  };
}

export const sendTimerOffer = async (from, marshaller, fileSrc, type, offerArgs) => {
  let offerSpec;
  if (type === 'exact') {
    offerSpec = AdvanceTimeExactOfferSpec({ id: `${Date.now()}`, ...offerArgs });
  } else if(type === 'step') {
    offerSpec = AdvanceTimeStepByStepOfferSpec({ id: `${Date.now()}`, ...offerArgs });
  }

  const spendAction = {
    method: "executeOffer",
    offer: offerSpec,
  };

  const offer = JSON.stringify(marshaller.toCapData(harden(spendAction)));
  await fileSrc.writeText(offer);

  return agoric.wallet(
    'send',
    '--from',
    from,
    '--keyring-backend=test',
    '--offer',
    fileSrc.toString()
  );
}

// TODO Feature request: Open an issue asking for a parameterized collateral
//  brand
export const openVault = (address, mint, collateral, collateralBrand = "ATOM") => {
  return executeOffer(
    address,
    agops.vaults(
      'open',
      '--wantMinted',
      mint,
      '--giveCollateral',
      collateral,
      '--collateralBrand',
      collateralBrand
    ),
  );
};

const agopsInter = async (...params) => {
  const newParams = ['inter', ...params, '--keyring-backend=test'];
  return executeCommand(agopsLocation, newParams);
};

export const bidByPrice = (address, spend, colKeyword, price) => {
  /**
   * agops inter bid by-price --from user1 --give 90IST --price 9.2 --maxBuy
   * 10STARS --keyring-backend=test --generate-only
   */

  return executeOffer(
    address,
    agopsInter(
      'bid',
      'by-price',
      '--give',
      `${spend}`,
      `--maxBuy`,
      `10000${colKeyword}`, // 10k ATOM is the default, use the same forSTARS
      `--price`,
      price,
      `--from`,
      address,
      '--generate-only'
    ),
  );
}

export const bidByDiscount = (address, spend, colKeyword, discount) => {
  /**
   * agops inter bid by-discount --from user1 --give 150IST --maxBuy 10000STARS --discount 15 --keyring-backend=test --generate-only
   */

  return executeOffer(
    address,
    agopsInter(
      'bid',
      'by-discount',
      '--give',
      `${spend}`,
      `--maxBuy`,
      `10000${colKeyword}`, // 10k ATOM is the default, use the same forSTARS
      `--discount`,
      discount,
      `--from`,
      address,
      '--generate-only'
    ),
  );
};

/**
 *
 * priceLockWakeTime = nominalStart - priceLockPeriod
 *
 * @param {{
 *   agoric: any
 * }} io
 * @return {Promise<{nominalStart: number, nextStartTime: number}>}
 */
const calculateNominalStart = async ({ agoric }) => {
  const [schedule, governance] = await Promise.all([
    getContractInfo('fakeAuctioneer.schedule', { agoric }),
    getContractInfo('fakeAuctioneer.governance', { agoric }),
  ]);

  const { nextStartTime: { absValue: nextStartTimeVal } } = schedule;
  const {
    AuctionStartDelay: { value: { relValue: auctionStartDelay} },
  } = governance.current;

  const nominalStart = nextStartTimeVal - auctionStartDelay;

  return { nominalStart, nextStartTime: nextStartTimeVal };
};

export const scale6 = x => BigInt(Math.round(x * 1_000_000));

export const assertVisibility = async (t, managerIndex, base = 0, { nominalStart }) => {
  const { agoric } = t.context;

  const [preAuction, postAuction, auctionResult] = await Promise.all([
    getContractInfo(`vaultFactory.managers.manager${managerIndex}.liquidations.${nominalStart}.vaults.preAuction`, { agoric }),
    getContractInfo(`vaultFactory.managers.manager${managerIndex}.liquidations.${nominalStart}.vaults.postAuction`, { agoric }),
    getContractInfo(`vaultFactory.managers.manager${managerIndex}.liquidations.${nominalStart}.auctionResult`, { agoric }),
  ]);

  const expectedPreAuction = [];
  for (let i = 0; i < Liquidation.setup.vaults.length; i += 1) {
    expectedPreAuction.push([
      `vault${base + i}`,
      {
        collateralAmount: { value: scale6(Liquidation.setup.vaults[i].collateral) },
        debtAmount: { value: scale6(Liquidation.setup.vaults[i].debt) },
      },
    ]);
  }

  t.like(
    Object.fromEntries(preAuction),
    Object.fromEntries(expectedPreAuction),
  );

  const expectedPostAuction = [];
  // Iterate from the end because we expect the post auction vaults
  // in best to worst order.
  for (let i = Liquidation.outcome.vaults.length - 1; i >= 0; i -= 1) {
    expectedPostAuction.push([
      `vault${base + i}`,
      { Collateral: { value: scale6(Liquidation.outcome.vaults[i].locked) } },
    ]);
  }
  t.like(
    Object.fromEntries(postAuction),
    Object.fromEntries(expectedPostAuction),
  );

  t.like(auctionResult, {
    collateralOffered: { value: scale6(Liquidation.setup.auction.start.collateral) },
    istTarget: { value: scale6(Liquidation.setup.auction.start.debt) },
    collateralForReserve: { value: scale6(Liquidation.outcome.reserve.allocations.ATOM) },
    shortfallToReserve: { value: 0n },
    mintedProceeds: { value: scale6(Liquidation.setup.auction.start.debt) },
    collateralSold: {
      value:
        scale6(Liquidation.setup.auction.start.collateral) -
        scale6(Liquidation.setup.auction.end.collateral),
    },
    // endTime: { absValue: endTime.absValue }, Figure out how to read the
    // schedule
    collateralRemaining: { value: scale6(Liquidation.outcome.remaining.collateral) },
    debtToBurn: { value: scale6(Liquidation.setup.auction.start.debt) },
    mintedForReserve: { value: scale6(Liquidation.outcome.reserve.minted) },
    totalPenalty: { value: scale6(Liquidation.outcome.penalty) },
    // startTime: { absValue: startTime.absValue },
    // endTime: { absValue: endTime.absValue },
  });
};
