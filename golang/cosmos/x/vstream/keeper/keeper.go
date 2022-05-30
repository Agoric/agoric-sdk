package keeper

import (
	sdk "github.com/cosmos/cosmos-sdk/types"

	agoric "github.com/Agoric/agoric-sdk/golang/cosmos/types"
	streamtypes "github.com/Agoric/agoric-sdk/golang/cosmos/types/stream"
	vstoragekeeper "github.com/Agoric/agoric-sdk/golang/cosmos/x/vstorage/keeper"
	vstoragetypes "github.com/Agoric/agoric-sdk/golang/cosmos/x/vstorage/types"
)

// StorageStreamKeeper defines an interface that allows streaming via a vstorage
// path.
type StorageStreamKeeper interface {
	StorageStreamUpdate(sdk sdk.Context, path string, value string) error
	StorageStreamFinish(sdk sdk.Context, path string, value string) error
	StorageStreamFailure(sdk sdk.Context, path string, err error) error
}

var _ StorageStreamKeeper = Keeper{}
var _ streamtypes.Streamer = Keeper{}

type Keeper struct {
	storeKey       sdk.StoreKey
	vstorageKeeper vstoragekeeper.Keeper
}

// NewKeeper creates a new Keeper object with a StorageStreamKeeper
// corresponding to storeKey.  It is up to the caller either to use a fresh
// storeKey, or to supply a storeKey for an existing vstorageKeeper.
func NewKeeper(storeKey sdk.StoreKey) Keeper {
	vstorageKeeper := vstoragekeeper.NewKeeper(storeKey)
	return Keeper{storeKey, vstorageKeeper}
}

func (k Keeper) StorageStreamUpdate(ctx sdk.Context, path string, value string) error {
	state := vstoragetypes.NewStoragePathStateRef(k.vstorageKeeper, path)
	return k.StreamUpdate(ctx, state, []byte(value))
}

func (k Keeper) StorageStreamFinish(ctx sdk.Context, path string, value string) error {
	state := vstoragetypes.NewStoragePathStateRef(k.vstorageKeeper, path)
	return k.StreamFinish(ctx, state, []byte(value))
}

func (k Keeper) StorageStreamFailure(ctx sdk.Context, path string, failure error) error {
	state := vstoragetypes.NewStoragePathStateRef(k.vstorageKeeper, path)
	return k.StreamFailure(ctx, state, failure)
}

func (Keeper) StreamUpdate(ctx sdk.Context, state agoric.StateRef, value []byte) error {
	so := streamtypes.NewUpdateStreamOperation(ctx, state, value)
	prior, err := so.GetLatestPosition(ctx)
	if err != nil {
		return err
	}
	return so.Commit(ctx, *prior, false)
}

func (Keeper) StreamFinish(ctx sdk.Context, state agoric.StateRef, value []byte) error {
	so := streamtypes.NewFinishStreamOperation(ctx, state, value)
	prior, err := so.GetLatestPosition(ctx)
	if err != nil {
		return err
	}
	return so.Commit(ctx, *prior, false)
}

func (Keeper) StreamFailure(ctx sdk.Context, state agoric.StateRef, failure error) error {
	so := streamtypes.NewFailStreamOperation(ctx, state, failure)
	prior, err := so.GetLatestPosition(ctx)
	if err != nil {
		return err
	}
	return so.Commit(ctx, *prior, false)
}
