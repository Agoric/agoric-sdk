import { Nat } from '@agoric/nat';

const makeStringBeans = (key, beans) => ({ key, beans: `${Nat(beans)}` });

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

// Fees are denominated in units of $1 RUN.
export const defaultBeansPerFeeUnit = 1_000_000_000_000n; // $1

// TODO: create the cost model we want, and update these to be more principled.
// These defaults currently make deploying an ag-solo cost less than $1.00.
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

export const defaultFeeUnitPrice = [
  {
    denom: 'uist',
    amount: '1000000',
  },
];

export const defaultBootstrapVatConfig =
  '@agoric/vats/decentral-demo-config.json';

export const DEFAULT_SIM_SWINGSET_PARAMS = {
  beans_per_unit: defaultBeansPerUnit,
  fee_unit_price: defaultFeeUnitPrice,
  bootstrap_vat_config: defaultBootstrapVatConfig,
};
