package vm

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
)

var committedHeight int64 = 0

// IsSimulation tells if we are simulating the transaction
func IsSimulation(ctx sdk.Context) bool {
	// If we haven't committed yet, we're still in bootstrap.
	if committedHeight == 0 {
		return false
	}
	// Otherwise, if we already committed this block, we're in simulation.
	return committedHeight == ctx.BlockHeight()
}

func SetCommittedHeight(height int64) {
	committedHeight = height
}
