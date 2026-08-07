/// <reference types="ses" />

// TODO(AGO-1030): This shouldn't be hard-coded
export const GAS_UNITS_PER_SWAP = 60_000_000n;

// TODO(AGO-625): Get real numbers, and link to examples.
// These addresses just came from https://ymax.app/reward-token-rates
export const GAS_UNITS_PER_CLAIM: Record<string, bigint> = harden({
  // COMP on Arbitrum
  '0x354a6da3fcde098f8389cad84b0182725c6c91de': 1_000_000n,
  // COMP on Base
  '0x9e1028f5f1d5ede59748ffcee5532509976840e0': 1_000_000n,
  // COMP on Ethereum
  '0xc00e94cb662c3520282e6f5717214004a7f26888': 1_000_000n,
  // COMP on Optimism
  '0x7e7d4467112689329f7e06571ed0e8cbad4910ee': 1_000_000n,

  // MORPHO on Arbitrum
  '0x40bd670a58238e6e230c430bbb5ce6ec0d40df48': 1_000_000n,
  // MORPHO on Ethereum
  '0x58d97b57bb95320f9a05dc918aef65434969c2b2': 1_000_000n,

  // OP on Optimism
  '0x4200000000000000000000000000000000000042': 1_000_000n,

  // SEAM on Base
  '0x1c7a460413dd4e964f96d8dfc56e7223ce88cd85': 1_000_000n,
});
