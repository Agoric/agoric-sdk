import { Nat } from '@agoric/nat';

const makeBeans = int => ({ int: `${Nat(int)}` });

// This should roughly match the values in
// `agoric-sdk/golang/cosmos/x/swingset/types/sim-params.go`.
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

export const defaultBeansPerInboundTx = defaultBeansPerFeeUnit / 100_000n; // $0.00001
export const defaultBeansPerMessage = defaultBeansPerFeeUnit / 1_000_000n; // $0.000001
export const defaultBeansPerMessageByte = defaultBeansPerFeeUnit / 50_000_000n; // $0.0000002
export const defaultBeansPerMinFeeDebit = defaultBeansPerFeeUnit / 4n; // $0.25

export const defaultBeansPerUnit = {
  [BeansPerFeeUnit]: makeBeans(defaultBeansPerFeeUnit),
  [BeansPerInboundTx]: makeBeans(defaultBeansPerInboundTx),
  [BeansPerBlockComputeLimit]: makeBeans(defaultBeansPerBlockComputeLimit),
  [BeansPerMessage]: makeBeans(defaultBeansPerMessage),
  [BeansPerMessageByte]: makeBeans(defaultBeansPerMessageByte),
  [BeansPerMinFeeDebit]: makeBeans(defaultBeansPerMinFeeDebit),
  [BeansPerVatCreation]: makeBeans(defaultBeansPerVatCreation),
  [BeansPerXsnapComputron]: makeBeans(defaultBeansPerXsnapComputron),
};

export const defaultFeeUnitPrice = [
  {
    denom: 'urun',
    amount: '1000000',
  },
];

export const DEFAULT_SIM_SWINGSET_PARAMS = {
  beans_per_unit: defaultBeansPerUnit,
  fee_unit_price: defaultFeeUnitPrice,
};
