// @jessie-check
// @ts-check

import { Nat } from '@endo/nat';

const makeStringBeans = (key, beans) => ({ key, beans: `${Nat(beans)}` });
const makeCoin = (denom, amount) => ({ denom, amount: `${Nat(amount)}` });
/**
 * @param {string} key
 * @param {number} size
 */
const makeQueueSize = (key, size) => ({ key, size });

// This should roughly match the values in
// `agoric-sdk/golang/cosmos/x/swingset/types/default-params.go`.
//
// Nothing bad happens if they diverge, but it makes for a truer simulation
// experience if they don't.

export const BeansPerBlockComputeLimit = 'blockComputeLimit';
export const BeansPerFeeUnit = 'feeUnit';
export const BeansPerInboundTx = 'inboundTx';
export const BeansPerMessage = 'message';
export const BeansPerMessageByte = 'messageByte';
export const BeansPerMinFeeDebit = 'minFeeDebit';
export const BeansPerVatCreation = 'vatCreation';
export const BeansPerXsnapComputron = 'xsnapComputron';

export const defaultBeansPerXsnapComputron = 100n;

// DefaultBeansPerBlockComputeLimit is how many computron beans we allow before
// starting a new block.  Some analysis (#3459) suggests this leads to about
// 2/3rds utilization, based on 5 sec voting time and up to 10 sec of
// computation.
export const defaultBeansPerBlockComputeLimit =
  8_000_000n * defaultBeansPerXsnapComputron;
// observed: 0.385 sec
export const defaultBeansPerVatCreation =
  300_000n * defaultBeansPerXsnapComputron;

// Fees are denominated in this unit.
export const defaultFeeUnitPrice = [makeCoin('uist', 1_000_000n)]; // $1

// TODO: create the cost model we want, and update these to be more principled.
// These defaults currently make deploying an ag-solo cost less than $1.00.
export const defaultBeansPerFeeUnit = 1_000_000_000_000n; // $1
export const defaultBeansPerInboundTx = defaultBeansPerFeeUnit / 100n; // $0.01
export const defaultBeansPerMessage = defaultBeansPerFeeUnit / 1_000n; // $0.001
export const defaultBeansPerMessageByte = defaultBeansPerFeeUnit / 50_000n; // $0.0002
export const defaultBeansPerMinFeeDebit = defaultBeansPerFeeUnit / 5n; // $0.2

export const defaultBeansPerUnit = [
  makeStringBeans(BeansPerFeeUnit, defaultBeansPerFeeUnit),
  makeStringBeans(BeansPerInboundTx, defaultBeansPerInboundTx),
  makeStringBeans(BeansPerBlockComputeLimit, defaultBeansPerBlockComputeLimit),
  makeStringBeans(BeansPerMessage, defaultBeansPerMessage),
  makeStringBeans(BeansPerMessageByte, defaultBeansPerMessageByte),
  makeStringBeans(BeansPerMinFeeDebit, defaultBeansPerMinFeeDebit),
  makeStringBeans(BeansPerVatCreation, defaultBeansPerVatCreation),
  makeStringBeans(BeansPerXsnapComputron, defaultBeansPerXsnapComputron),
];

const defaultBootstrapVatConfig =
  '@agoric/vm-config/decentral-demo-config.json';

/** @type {import('@agoric/cosmic-proto/swingset/swingset.js').PowerFlagFeeSDKType[]} */
export const defaultPowerFlagFees = [
  { power_flag: 'SMART_WALLET', fee: [makeCoin('ubld', 10_000_000n)] },
];

export const QueueInbound = 'inbound';

export const defaultInboundQueueMax = 1_000;

export const defaultQueueMax = [
  makeQueueSize(QueueInbound, defaultInboundQueueMax),
];

/**
 * @type {import('@agoric/cosmic-proto/swingset/swingset.js').ParamsSDKType}
 */
export const DEFAULT_SIM_SWINGSET_PARAMS = {
  beans_per_unit: defaultBeansPerUnit,
  fee_unit_price: defaultFeeUnitPrice,
  bootstrap_vat_config: defaultBootstrapVatConfig,
  power_flag_fees: defaultPowerFlagFees,
  queue_max: defaultQueueMax,
};
