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
	BeansPerFeeUnit              = "feeUnit"
	BeansPerInboundTx            = "inboundTx"
	BeansPerBlockComputeLimit    = "blockComputeLimit"
	BeansPerMessage              = "message"
	BeansPerMessageByte          = "messageByte"
	BeansPerMinFeeDebit          = "minFeeDebit"
	BeansPerStorageByte          = "storageByte"
	BeansPerVatCreation          = "vatCreation"
	BeansPerXsnapComputron       = "xsnapComputron"
	BeansPerSmartWalletProvision = "smartWalletProvision"

	// QueueSize keys.
	// Keep up-to-date with updateQueueAllowed() in packanges/cosmic-swingset/src/launch-chain.js
	QueueInbound        = "inbound"
	QueueInboundMempool = "inbound_mempool"

	// PowerFlags.
	PowerFlagSmartWallet = "SMART_WALLET"
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

	// Fees are denominated in this unit.
	DefaultFeeUnitPrice = sdk.NewCoins(sdk.NewInt64Coin("uist", 1_000_000)) // $1

	// TODO: create the cost model we want, and update these to be more principled.
	// These defaults currently make deploying an ag-solo cost less than $1.00.
	DefaultBeansPerFeeUnit              = sdk.NewUint(1_000_000_000_000)                  // $1
	DefaultBeansPerInboundTx            = DefaultBeansPerFeeUnit.Quo(sdk.NewUint(100))    // $0.01
	DefaultBeansPerMessage              = DefaultBeansPerFeeUnit.Quo(sdk.NewUint(1_000))  // $0.001
	DefaultBeansPerMessageByte          = DefaultBeansPerFeeUnit.Quo(sdk.NewUint(50_000)) // $0.00002
	DefaultBeansPerMinFeeDebit          = DefaultBeansPerFeeUnit.Quo(sdk.NewUint(5))      // $0.2
	DefaultBeansPerStorageByte          = DefaultBeansPerFeeUnit.Quo(sdk.NewUint(500))    // $0.002
	DefaultBeansPerSmartWalletProvision = DefaultBeansPerFeeUnit                          // $1

	DefaultBootstrapVatConfig = "@agoric/vm-config/decentral-core-config.json"

	DefaultPowerFlagFees = []PowerFlagFee{
		NewPowerFlagFee(PowerFlagSmartWallet, sdk.NewCoins(sdk.NewInt64Coin("ubld", 10_000_000))),
	}

	DefaultInboundQueueMax = int32(1_000)

	DefaultQueueMax = []QueueSize{
		NewQueueSize(QueueInbound, DefaultInboundQueueMax),
	}
)

// move DefaultBeansPerUnit to a function to allow for boot overriding of the Default params
func DefaultBeansPerUnit() []StringBeans {
	return []StringBeans{
		NewStringBeans(BeansPerBlockComputeLimit, DefaultBeansPerBlockComputeLimit),
		NewStringBeans(BeansPerFeeUnit, DefaultBeansPerFeeUnit),
		NewStringBeans(BeansPerInboundTx, DefaultBeansPerInboundTx),
		NewStringBeans(BeansPerMessage, DefaultBeansPerMessage),
		NewStringBeans(BeansPerMessageByte, DefaultBeansPerMessageByte),
		NewStringBeans(BeansPerMinFeeDebit, DefaultBeansPerMinFeeDebit),
		NewStringBeans(BeansPerStorageByte, DefaultBeansPerStorageByte),
		NewStringBeans(BeansPerVatCreation, DefaultBeansPerVatCreation),
		NewStringBeans(BeansPerXsnapComputron, DefaultBeansPerXsnapComputron),
		NewStringBeans(BeansPerSmartWalletProvision, DefaultBeansPerSmartWalletProvision),
	}
}
