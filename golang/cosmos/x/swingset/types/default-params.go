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
	DefaultFeeUnitPrice = sdk.NewCoins(sdk.NewInt64Coin("uist", 1000000))

	// TODO: create the cost model we want, and update these to be more principled.
	// These defaults currently make deploying an ag-solo cost less than $1.00.
	DefaultBeansPerFeeUnit     = sdk.NewUint(1000000000000)                     // $1
	DefaultBeansPerInboundTx   = DefaultBeansPerFeeUnit.Quo(sdk.NewUint(100))   // $0.01
	DefaultBeansPerMessage     = DefaultBeansPerFeeUnit.Quo(sdk.NewUint(1000))  // $0.001
	DefaultBeansPerMessageByte = DefaultBeansPerFeeUnit.Quo(sdk.NewUint(50000)) // $0.0002
	DefaultBeansPerMinFeeDebit = DefaultBeansPerFeeUnit.Quo(sdk.NewUint(5))     // $0.2

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

	DefaultBootstrapVatConfig = "@agoric/vats/decentral-core-config.json"
)
