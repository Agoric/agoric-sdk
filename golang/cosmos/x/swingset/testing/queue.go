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
	// TODO: fix this type assertion, vstorage needs interface to be updated
	// return vstoragetesting.GetQueueItems(ctx, vstorageKeeper.(vstorage.Keeper), actionQueueName)
}

// ResetActionQueue resets the action queue.
// This is a testing utility function.
func ResetActionQueue(t *testing.T, ctx sdk.Context, swingsetKeeper keeper.Keeper) error {
	vstorageKeeper := keeper.GetVstorageKeeper(t, swingsetKeeper)
	actionQueueName := keeper.StoragePathActionQueue
	return vstoragetesting.ResetQueue(ctx, vstorageKeeper, actionQueueName)
	// TODO: fix this type assertion, vstorage needs interface to be updated
	// return vstoragetesting.ResetQueue(ctx, vstorageKeeper.(vstorage.Keeper), actionQueueName)
}
