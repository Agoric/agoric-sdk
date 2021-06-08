package vm

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
)

var committedHeight int64 = 0

// IsSimulation tells if we are simulating the transaction
func IsSimulation(ctx sdk.Context) bool {
	return committedHeight == ctx.BlockHeight()
}

func SetCommittedHeight(height int64) {
	committedHeight = height
}
