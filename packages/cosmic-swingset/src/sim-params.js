// @jessie-check
// @ts-check

import { Fail } from '@endo/errors';
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

export const BeansPerXsnapComputron = 'xsnapComputron';
export const BeansPerBlockComputeLimit = 'blockComputeLimit';
export const BeansPerVatCreation = 'vatCreation';

export const BeansPerFeeUnit = 'feeUnit';
export const BeansPerInboundTx = 'inboundTx';
export const BeansPerMessage = 'message';
export const BeansPerMessageByte = 'messageByte';
export const BeansPerMinFeeDebit = 'minFeeDebit';
export const BeansPerStorageByte = 'storageByte';
export const BeansPerSmartWalletProvision = 'smartWalletProvision';

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
export const defaultFeeUnitPrice = [makeCoin('ubld', 1_000_000n)]; // 1 BLD

// TODO: create the cost model we want, and update these to be more principled.
export const defaultBeansPerFeeUnit = 1_000_000_000_000n; // 1e12
export const defaultBeansPerInboundTx = defaultBeansPerFeeUnit / 100n; // 10e9, ~$0.01
export const defaultBeansPerMessage = defaultBeansPerFeeUnit / 1_000n; // 1e9, ~$0.001
export const defaultBeansPerMessageByte = defaultBeansPerFeeUnit / 50_000n; // 20e6, ~$0.0002
export const defaultBeansPerMinFeeDebit = defaultBeansPerFeeUnit / 5n; // 200e9, ~$0.2
export const defaultBeansPerStorageByte = defaultBeansPerFeeUnit / 500n; // 2e9, ~$0.002
export const defaultBeansPerSmartWalletProvision = defaultBeansPerFeeUnit; // 1e12, ~$1

export const defaultBeansPerUnit = [
  makeStringBeans(BeansPerXsnapComputron, defaultBeansPerXsnapComputron),
  makeStringBeans(BeansPerBlockComputeLimit, defaultBeansPerBlockComputeLimit),
  makeStringBeans(BeansPerVatCreation, defaultBeansPerVatCreation),

  makeStringBeans(BeansPerFeeUnit, defaultBeansPerFeeUnit),
  makeStringBeans(BeansPerInboundTx, defaultBeansPerInboundTx),
  makeStringBeans(BeansPerMessage, defaultBeansPerMessage),
  makeStringBeans(BeansPerMessageByte, defaultBeansPerMessageByte),
  makeStringBeans(BeansPerMinFeeDebit, defaultBeansPerMinFeeDebit),
  makeStringBeans(BeansPerStorageByte, defaultBeansPerStorageByte),
  makeStringBeans(
    BeansPerSmartWalletProvision,
    defaultBeansPerSmartWalletProvision,
  ),
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
 * @enum {(typeof VatCleanupPhase)[keyof typeof VatCleanupPhase]}
 */
export const VatCleanupPhase = /** @type {const} */ ({
  Default: 'default',
  Exports: 'exports',
  Imports: 'imports',
  Promises: 'promises',
  Kv: 'kv',
  Snapshots: 'snapshots',
  Transcripts: 'transcripts',
});

/** @typedef {Partial<Record<keyof typeof VatCleanupPhase, number>>} VatCleanupKeywordsRecord */

/** @type {VatCleanupKeywordsRecord} */
export const VatCleanupDefaults = {
  Default: 5,
  Kv: 50,
};

/**
 * @param {VatCleanupKeywordsRecord} keywordsRecord
 * @returns {import('@agoric/cosmic-proto/swingset/swingset.js').ParamsSDKType['vat_cleanup_budget']}
 */
export const makeVatCleanupBudgetFromKeywords = keywordsRecord => {
  return Object.entries(keywordsRecord).map(([keyName, value]) => {
    Object.hasOwn(VatCleanupPhase, keyName) ||
      Fail`unknown vat cleanup phase keyword ${keyName}`;
    return {
      key: Reflect.get(VatCleanupPhase, keyName),
      value: `${Nat(value)}`,
    };
  });
};

export const defaultVatCleanupBudget =
  makeVatCleanupBudgetFromKeywords(VatCleanupDefaults);

/**
 * @type {import('@agoric/cosmic-proto/swingset/swingset.js').ParamsSDKType}
 */
export const DEFAULT_SIM_SWINGSET_PARAMS = {
  beans_per_unit: defaultBeansPerUnit,
  fee_unit_price: defaultFeeUnitPrice,
  bootstrap_vat_config: defaultBootstrapVatConfig,
  power_flag_fees: defaultPowerFlagFees,
  queue_max: defaultQueueMax,
  vat_cleanup_budget: defaultVatCleanupBudget,
};
