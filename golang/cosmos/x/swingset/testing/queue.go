package testing

import (
	"testing"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/keeper"
	vstoragetesting "github.com/Agoric/agoric-sdk/golang/cosmos/x/vstorage/testing"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// GetActionQueueRecords returns the records in the action queue.
// This is a testing utility function.
func GetActionQueueRecords(t *testing.T, ctx sdk.Context, swingsetKeeper keeper.Keeper) ([]string, error) {
	vstorageKeeper := keeper.GetVstorageKeeper(t, swingsetKeeper)
	actionQueueName := keeper.StoragePathActionQueue
	return vstoragetesting.GetQueueItems(ctx, vstorageKeeper, actionQueueName)
}
