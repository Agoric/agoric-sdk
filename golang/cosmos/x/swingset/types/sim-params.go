package types

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// This should roughly match the values in
// `agoric-sdk/packages/cosmic-swingset/src/sim-params.js`.
//
// Nothing bad happens if they diverge, but it makes for a truer simulation
// experience if they don't.

const (
	BeansPerFeeUnit           = "feeUnit"
	BeansPerInboundTx         = "inboundTx"
	BeansPerBlockComputeLimit = "blockComputeLimit"
	BeansPerMessage           = "message"
	BeansPerMessageByte       = "messageByte"
	BeansPerMinFeeDebit       = "minFeeDebit"
	BeansPerVatCreation       = "vatCreation"
	BeansPerXsnapComputron    = "xsnapComputron"
)

var (
	DefaultBeansPerXsnapComputron = sdk.NewUint(100)

	// DefaultBeansPerBlockComputeLimit is how many computron beans we allow
	// before starting a new block.  Some analysis (#3459) suggests this leads to
	// about 2/3rds utilization, based on 5 sec voting time and up to 10 sec of
	// computation.
	DefaultBeansPerBlockComputeLimit = sdk.NewUint(8000000).Mul(DefaultBeansPerXsnapComputron)
	// observed: 0.385 sec
	DefaultBeansPerVatCreation = sdk.NewUint(300000).Mul(DefaultBeansPerXsnapComputron)

	// Fees are denominated in units of $1 RUN.
	DefaultFeeUnitPrice = sdk.NewCoins(sdk.NewInt64Coin("urun", 1000000))

	DefaultBeansPerFeeUnit     = sdk.NewUint(1000000000000)                        // $1
	DefaultBeansPerInboundTx   = DefaultBeansPerFeeUnit.Quo(sdk.NewUint(100000))   // $0.00001
	DefaultBeansPerMessage     = DefaultBeansPerFeeUnit.Quo(sdk.NewUint(1000000))  // $0.000001
	DefaultBeansPerMessageByte = DefaultBeansPerFeeUnit.Quo(sdk.NewUint(50000000)) // $0.0000002
	DefaultBeansPerMinFeeDebit = DefaultBeansPerFeeUnit.Quo(sdk.NewUint(4))        // $0.25

	DefaultBeansPerUnit = []StringBeans{
		NewStringBeans(BeansPerBlockComputeLimit, DefaultBeansPerBlockComputeLimit),
		NewStringBeans(BeansPerFeeUnit, DefaultBeansPerFeeUnit),
		NewStringBeans(BeansPerInboundTx, DefaultBeansPerInboundTx),
		NewStringBeans(BeansPerMessage, DefaultBeansPerMessage),
		NewStringBeans(BeansPerMessageByte, DefaultBeansPerMessageByte),
		NewStringBeans(BeansPerMinFeeDebit, DefaultBeansPerMinFeeDebit),
		NewStringBeans(BeansPerVatCreation, DefaultBeansPerVatCreation),
		NewStringBeans(BeansPerXsnapComputron, DefaultBeansPerXsnapComputron),
	}
)
