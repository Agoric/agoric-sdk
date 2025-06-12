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
	BeansPerBlockComputeLimit = "blockComputeLimit"
	BeansPerVatCreation       = "vatCreation"
	BeansPerXsnapComputron    = "xsnapComputron"

	BeansPerFeeUnit              = "feeUnit"
	BeansPerInboundTx            = "inboundTx"
	BeansPerMessage              = "message"
	BeansPerMessageByte          = "messageByte"
	BeansPerMinFeeDebit          = "minFeeDebit"
	BeansPerStorageByte          = "storageByte"
	BeansPerSmartWalletProvision = "smartWalletProvision"

	// PowerFlags.
	PowerFlagSmartWallet = "SMART_WALLET"

	// QueueSize keys.
	// Keep up-to-date with updateQueueAllowed() in packages/cosmic-swingset/src/launch-chain.js
	QueueInbound        = "inbound"
	QueueInboundMempool = "inbound_mempool"

	// Vat cleanup budget keys.
	// Keep up-to-date with CleanupBudget in packages/cosmic-swingset/src/launch-chain.js
	VatCleanupDefault     = "default"
	VatCleanupExports     = "exports"
	VatCleanupImports     = "imports"
	VatCleanupPromises    = "promises"
	VatCleanupKv          = "kv"
	VatCleanupSnapshots   = "snapshots"
	VatCleanupTranscripts = "transcripts"
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

	// Fees are represented as integer "beans", where each bean is a uniform
	// fraction of this `fee_unit_price` as controlled by the below
	// `beans_per_unit` "feeUnit".
	// TODO: create the cost model we want, and update these to be more principled.
	DefaultFeeUnitPrice = sdk.NewCoins(sdk.NewInt64Coin("ubld", 1_000_000)) // 1 BLD

	// The count of "beans" into which `fee_unit_price` is divided.
	// Larger numbers make for smaller beans, and we expect values to be rather
	// large for representing fees precisely in beans that each approximate
	// a "picoUSD"--one trillionth of a USD.
	DefaultBeansPerFeeUnit = sdk.NewUint(1_000_000_000_000) // 1e12 (assumes $1 per BLD)

	DefaultBeansPerInboundTx            = DefaultBeansPerFeeUnit.Quo(sdk.NewUint(100))    //  10e09, ~$0.01
	DefaultBeansPerMessage              = DefaultBeansPerFeeUnit.Quo(sdk.NewUint(1_000))  //   1e09, ~$0.001
	DefaultBeansPerMessageByte          = DefaultBeansPerFeeUnit.Quo(sdk.NewUint(50_000)) //  20e06, ~$0.00002
	DefaultBeansPerMinFeeDebit          = DefaultBeansPerFeeUnit.Quo(sdk.NewUint(5))      // 200e09, ~$0.2
	DefaultBeansPerStorageByte          = DefaultBeansPerFeeUnit.Quo(sdk.NewUint(500))    //   2e09, ~$0.002
	DefaultBeansPerSmartWalletProvision = DefaultBeansPerFeeUnit                          //   1e12, ~$1

	DefaultBootstrapVatConfig = "@agoric/vm-config/decentral-core-config.json"

	DefaultPowerFlagFees = []PowerFlagFee{
		NewPowerFlagFee(PowerFlagSmartWallet, sdk.NewCoins(sdk.NewInt64Coin("ubld", 10_000_000))),
	}

	DefaultInboundQueueMax = int32(1_000)
	DefaultQueueMax        = []QueueSize{
		NewQueueSize(QueueInbound, DefaultInboundQueueMax),
	}

	DefaultVatCleanupDefault = sdk.NewUint(5)
	// DefaultVatCleanupExports     = DefaultVatCleanupDefault
	// DefaultVatCleanupImports     = DefaultVatCleanupDefault
	// DefaultVatCleanupPromises    = DefaultVatCleanupDefault
	DefaultVatCleanupKv = sdk.NewUint(50)
	// DefaultVatCleanupSnapshots   = DefaultVatCleanupDefault
	// DefaultVatCleanupTranscripts = DefaultVatCleanupDefault
	DefaultVatCleanupBudget = []UintMapEntry{
		UintMapEntry{VatCleanupDefault, DefaultVatCleanupDefault},
		// UintMapEntry{VatCleanupExports, DefaultVatCleanupExports},
		// UintMapEntry{VatCleanupImports, DefaultVatCleanupImports},
		// UintMapEntry{VatCleanupPromises, DefaultVatCleanupPromises},
		UintMapEntry{VatCleanupKv, DefaultVatCleanupKv},
		// UintMapEntry{VatCleanupSnapshots, DefaultVatCleanupSnapshots},
		// UintMapEntry{VatCleanupTranscripts, DefaultVatCleanupTranscripts},
	}
)

// move DefaultBeansPerUnit to a function to allow for boot overriding of the Default params
func DefaultBeansPerUnit() []StringBeans {
	return []StringBeans{
		NewStringBeans(BeansPerXsnapComputron, DefaultBeansPerXsnapComputron),
		NewStringBeans(BeansPerBlockComputeLimit, DefaultBeansPerBlockComputeLimit),
		NewStringBeans(BeansPerVatCreation, DefaultBeansPerVatCreation),

		NewStringBeans(BeansPerFeeUnit, DefaultBeansPerFeeUnit),
		NewStringBeans(BeansPerInboundTx, DefaultBeansPerInboundTx),
		NewStringBeans(BeansPerMessage, DefaultBeansPerMessage),
		NewStringBeans(BeansPerMessageByte, DefaultBeansPerMessageByte),
		NewStringBeans(BeansPerMinFeeDebit, DefaultBeansPerMinFeeDebit),
		NewStringBeans(BeansPerStorageByte, DefaultBeansPerStorageByte),
		NewStringBeans(BeansPerSmartWalletProvision, DefaultBeansPerSmartWalletProvision),
	}
}
