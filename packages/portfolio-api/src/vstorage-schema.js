/* eslint-disable jsdoc/require-param */
/**
 * Vstorage schema (paths, shapes, and helpers) for portfolio data.
 *
 * This module exists in `portfolio-api` so that services outside this repo can
 * validate and interpret portfolio vstorage entries without depending on the
 * contract package.
 */
// @ts-check

import { AnyNatAmountShape } from '@agoric/orchestration';
import { Fail } from '@endo/errors';
import { M } from '@endo/patterns';
import { YieldProtocol } from './constants.js';

/**
 * @import {NatValue}  from '@agoric/ertp';
 * @import {Brand} from '@agoric/ertp';
 * @import {Pattern} from '@endo/patterns';
 * @import {InstrumentId} from './instruments.js';
 * @import {AxelarChain} from './constants.js'
 * @import {FlowDetail}  from './types.js';
 * @import {FlowStep}  from './types.js';
 * @import {PortfolioKey}  from './types.js';
 * @import {StatusFor}  from './types.js';
 */

const { keys } = Object;

/**
 * @param {Brand<'nat'>} brand must be a 'nat' brand, not checked
 * @param {NatValue} [min]
 */
export const makeNatAmountShape = (brand, min) =>
  harden({ brand, value: min ? M.gte(min) : M.nat() });

/** @typedef {{ protocol: 'USDN'; vault: null | 1; chainName: 'noble' } | { protocol: keyof typeof YieldProtocol; chainName: AxelarChain }} PoolPlaceInfo */

// XXX special handling. What's the functional difference from other places?
export const BeefyPoolPlaces = {
  Beefy_re7_Avalanche: {
    protocol: 'Beefy',
    chainName: 'Avalanche',
  },
  Beefy_morphoGauntletUsdc_Ethereum: {
    protocol: 'Beefy',
    chainName: 'Ethereum',
  },
  Beefy_morphoSmokehouseUsdc_Ethereum: {
    protocol: 'Beefy',
    chainName: 'Ethereum',
  },
  Beefy_morphoSeamlessUsdc_Base: {
    protocol: 'Beefy',
    chainName: 'Base',
  },
  Beefy_compoundUsdc_Optimism: {
    protocol: 'Beefy',
    chainName: 'Optimism',
  },
  Beefy_compoundUsdc_Arbitrum: {
    protocol: 'Beefy',
    chainName: 'Arbitrum',
  },
};

export const PoolPlaces = {
  USDN: { protocol: 'USDN', vault: null, chainName: 'noble' }, // MsgSwap only
  USDNVault: { protocol: 'USDN', vault: 1, chainName: 'noble' }, // MsgSwap, MsgLock
  Aave_Avalanche: { protocol: 'Aave', chainName: 'Avalanche' },
  Aave_Ethereum: { protocol: 'Aave', chainName: 'Ethereum' },
  Aave_Optimism: { protocol: 'Aave', chainName: 'Optimism' },
  Aave_Arbitrum: { protocol: 'Aave', chainName: 'Arbitrum' },
  Aave_Base: { protocol: 'Aave', chainName: 'Base' },
  Compound_Ethereum: { protocol: 'Compound', chainName: 'Ethereum' },
  Compound_Optimism: { protocol: 'Compound', chainName: 'Optimism' },
  Compound_Arbitrum: { protocol: 'Compound', chainName: 'Arbitrum' },
  Compound_Base: { protocol: 'Compound', chainName: 'Base' },
  ...BeefyPoolPlaces,
};
harden(PoolPlaces);

/**
 * Names of places where a portfolio may have a position.
 * @typedef {InstrumentId} PoolKey
 */

/** Ext for Extensible: includes PoolKeys in future upgrades */
/** @typedef {string} PoolKeyExt */

/** Ext for Extensible: includes PoolKeys in future upgrades */
export const PoolKeyShapeExt = M.string();

export const TargetAllocationShape = M.recordOf(
  M.or(...keys(PoolPlaces)),
  M.nat(),
);

/** @type {Pattern} */
export const TargetAllocationShapeExt = M.recordOf(PoolKeyShapeExt, M.nat());

// #region vstorage keys and values

/**
 * Creates vstorage path for portfolio status under published.<instance>.portfolios.
 *
 * Portfolio status includes position counts, account mappings, and flow history.
 *
 * @param {number} id - Portfolio ID number
 * @returns {readonly [`portfolio${number}`]}
 */
export const makePortfolioPath = id => [`portfolio${id}`];

const parseSuffixNumber = (prefix, key) => {
  const match = key.match(new RegExp(`^${prefix}(\\d+)$`));
  if (!match) {
    throw Fail`bad key: ${key}`;
  }
  const num = Number(match[1]);
  (Number.isSafeInteger(num) && num >= 0) || Fail`bad key: ${key}`;
  return num;
};

/**
 * Extracts portfolio ID number from a portfolio key (e.g., a vstorage path
 * segment).
 * @param {`portfolio${number}`} portfolioKey
 */
export const portfolioIdFromKey = portfolioKey =>
  parseSuffixNumber('portfolio', portfolioKey);

/**
 * Extracts flow ID number from a flow key (e.g., a vstorage path segment).
 * @param {`flow${number}`} flowKey
 */
export const flowIdFromKey = flowKey => parseSuffixNumber('flow', flowKey);

/**
 * Extracts portfolio ID number from a vstorage path.
 *
 * @param {string | string[]} path - Either a dot-separated string or array of path segments
 * @returns {number} Portfolio ID number
 */
export const portfolioIdOfPath = path => {
  const segments = typeof path === 'string' ? path.split('.') : path;
  const where = segments.indexOf('portfolios');
  where >= 0 || Fail`bad path: ${path}`;
  const segment = segments[where + 1];
  return portfolioIdFromKey(/** @type {`portfolio${number}`} */ (segment));
};

export const FlowDetailShape = M.or(
  { type: 'withdraw', amount: AnyNatAmountShape },
  { type: 'deposit', amount: AnyNatAmountShape },
  { type: 'rebalance' },
);

/** ChainNames including those in future upgrades */
const ChainNameExtShape = M.string();

/** @type {Pattern} */
export const PortfolioStatusShapeExt = M.splitRecord(
  {
    positionKeys: M.arrayOf(PoolKeyShapeExt),
    flowCount: M.number(),
    accountIdByChain: M.recordOf(ChainNameExtShape, M.string()),
    policyVersion: M.number(),
    rebalanceCount: M.number(),
  },
  {
    depositAddress: M.string(),
    nobleForwardingAddress: M.string(),
    targetAllocation: TargetAllocationShapeExt,
    accountsPending: M.arrayOf(ChainNameExtShape),
    flowsRunning: M.recordOf(M.string(), FlowDetailShape),
  },
);

/**
 * Creates vstorage path for position transfer history.
 *
 * Position tracking shows transfer history per yield protocol.
 *
 * @param {number} parent - Portfolio ID
 * @param {string} key - PoolKey
 * @returns {readonly [string, 'positions', string]}
 */
export const makePositionPath = (parent, key) => [
  `portfolio${parent}`,
  'positions',
  key,
];

/** @type {Pattern} */
export const PositionStatusShape = M.splitRecord(
  {
    protocol: M.or(...Object.keys(YieldProtocol)), // YieldProtocol
    accountId: M.string(),
    totalIn: AnyNatAmountShape,
    totalOut: AnyNatAmountShape,
  },
  {
    netTransfers: AnyNatAmountShape, // XXX obsolete
  },
);

/**
 * Creates vstorage path for flow operation logging.
 *
 * Flow logging provides real-time operation progress for transparency.
 *
 * @param {number} parent - Portfolio ID
 * @param {number} id - Flow ID within the portfolio
 * @returns {readonly [string, 'flows', string]}
 */
export const makeFlowPath = (parent, id) => [
  `portfolio${parent}`,
  'flows',
  `flow${id}`,
];

export const makeFlowStepsPath = (parent, id, prop = 'steps') => [
  `portfolio${parent}`,
  'flows',
  `flow${id}`,
  prop,
];

const FlowDetailsProps = {
  type: M.string(),
  amount: AnyNatAmountShape,
};

/** @type {Pattern} */
export const FlowStatusShape = M.or(
  M.splitRecord(
    { state: 'run', step: M.number(), how: M.string() },
    { steps: M.arrayOf(M.number()), ...FlowDetailsProps },
  ),
  { state: 'undo', step: M.number(), how: M.string() }, // XXX Not currently used
  M.splitRecord({ state: 'done' }, FlowDetailsProps),
  M.splitRecord(
    { state: 'fail', step: M.number(), how: M.string(), error: M.string() },
    {
      next: M.record(), // XXX recursive pattern
      where: M.string(),
      ...FlowDetailsProps,
    },
    {},
  ),
);

/** @type {Pattern} */
export const FlowStepsShape = M.arrayOf({
  how: M.string(),
  amount: AnyNatAmountShape,
  src: M.string(),
  dest: M.string(),
});
// #endregion

// #region Derived reading utilities (latest entry only)

/**
 * @typedef {(path: string) => Promise<unknown>} VstorageReadLatest
 * @typedef {(path: string) => Promise<string[]>} VstorageListChildren
 */

/**
 * @typedef {object} FlowNodeLatest
 * @property {`flow${number}`} flowKey
 * @property {FlowDetail | undefined} detail
 * @property {StatusFor['flow'] | undefined} status
 * @property {FlowStep[] | undefined} steps
 * @property {StatusFor['flowOrder'] | undefined} order
 * @property {'init' | 'running' | 'done' | 'fail' | 'unknown'} phase
 */

/**
 * @typedef {object} PortfolioLatestSnapshot
 * @property {PortfolioKey} portfolioKey
 * @property {StatusFor['portfolio']} status
 * @property {Record<`flow${number}`, FlowNodeLatest>} flows
 */

/**
 * @param {FlowDetail | undefined} detail
 * @param {StatusFor['flow'] | undefined} status
 * @returns {FlowNodeLatest['phase']}
 */
const deriveFlowPhase = (detail, status) => {
  if (!status) return detail ? 'init' : 'unknown';
  switch (status.state) {
    case 'run':
    case 'undo':
      return 'running';
    case 'done':
      return 'done';
    case 'fail':
      return 'fail';
    default:
      return 'unknown';
  }
};

/**
 * @param {string} key
 * @returns {`flow${number}` | undefined}
 */
const toFlowKey = key => {
  try {
    return `flow${flowIdFromKey(/** @type {any} */ (key))}`;
  } catch {
    return undefined;
  }
};

/**
 * Read the latest portfolio + flow state, combining `flowsRunning` (portfolio
 * node) with any flow nodes under `.flows`. Derived `phase` is aligned to the
 * planner expectations:
 * - `init` when present in `flowsRunning` but no flow node is written yet
 * - `running`, `done`, `fail` when a flow node is present
 */
export const readPortfolioLatest = async ({
  readLatest,
  listChildren,
  portfoliosPathPrefix,
  portfolioKey,
  includeSteps = true,
}) => {
  const portfolioPath = `${portfoliosPathPrefix}.${portfolioKey}`;
  /** @type {StatusFor['portfolio']} */
  const status = await readLatest(portfolioPath);

  const running = status.flowsRunning || {};
  /** @type {`flow${number}`[]} */
  const runningKeys = /** @type {any} */ (Object.keys(running));

  const flowChildren = listChildren
    ? await listChildren(`${portfolioPath}.flows`)
    : [];
  /** @type {Set<`flow${number}`>} */
  const flowKeys = new Set();
  for (const key of [...runningKeys, ...flowChildren]) {
    const flowKey = toFlowKey(key);
    if (flowKey) flowKeys.add(flowKey);
  }

  /** @type {Record<`flow${number}`, FlowNodeLatest>} */
  const flows = {};
  for (const flowKey of flowKeys) {
    const detailFromRunning = running[flowKey];
    /** @type {StatusFor['flow'] | undefined} */
    let statusNode;
    /** @type {FlowStep[] | undefined} */
    let steps;
    /** @type {StatusFor['flowOrder'] | undefined} */
    let order;
    try {
      statusNode = await readLatest(`${portfolioPath}.flows.${flowKey}`);
    } catch {
      statusNode = undefined;
    }
    if (includeSteps) {
      try {
        steps = await readLatest(`${portfolioPath}.flows.${flowKey}.steps`);
      } catch {
        steps = undefined;
      }
      try {
        order = await readLatest(`${portfolioPath}.flows.${flowKey}.order`);
      } catch {
        order = undefined;
      }
    }

    flows[flowKey] = harden({
      flowKey,
      detail:
        statusNode && 'type' in statusNode && statusNode.type
          ? /** @type {FlowDetail} */ (statusNode)
          : detailFromRunning,
      status: statusNode,
      steps,
      order,
      phase: deriveFlowPhase(detailFromRunning, statusNode),
    });
  }

  return harden({ portfolioKey, status, flows });
};
// #endregion
