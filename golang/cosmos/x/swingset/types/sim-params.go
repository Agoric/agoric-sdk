package types

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// This should roughly match the values in
// `agoric-sdk/packages/cosmic-swingset/src/sim-params.js`.
//
// Nothing bad happens if they diverge, but it makes for a better simulation
// experience if they don't.
var (
	// This is how many computrons we allow before starting a new block.
	// Some analysis (#3459) suggests this leads to about 2/3rds utilization,
	// based on 5 sec voting time and up to 10 sec of computation.
	DefaultMaxComputronsPerBlock = sdk.NewInt(8000000)
	// observed: 0.385 sec
	DefaultEstimatedComputronsPerVatCreation = sdk.NewInt(300000)

	// These fee defaults are denominated in urun.
	DefaultFeeDenom = "urun"

	DefaultFeePerInboundTx   = sdk.MustNewDecFromStr("100")
	DefaultFeePerMessage     = sdk.MustNewDecFromStr("10")
	DefaultFeePerMessageSlot = sdk.MustNewDecFromStr("1")
	DefaultFeePerMessageByte = sdk.MustNewDecFromStr("0.02")
)
