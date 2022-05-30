package keeper

import (
	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vstream/types"
)

// StreamKeeper defines an interface that allows streaming to an arbitrary State
// object.  It does not rely on any implicit keeper state.
type StreamKeeper interface {
	StreamUpdate(sdk sdk.Context, state types.StateRef, value []byte) error
	StreamFinish(sdk sdk.Context, state types.StateRef, value []byte) error
	StreamFailure(sdk sdk.Context, state types.StateRef, failure error) error
}

var _ StreamKeeper = Keeper{}

func (Keeper) StreamUpdate(ctx sdk.Context, state types.StateRef, value []byte) error {
	so := types.NewUpdateStreamOperation(ctx, state, value)
	prior, err := so.GetCurrentAsPointer(ctx)
	if err != nil {
		return err
	}
	return so.Commit(ctx, *prior)
}

func (Keeper) StreamFinish(ctx sdk.Context, state types.StateRef, value []byte) error {
	so := types.NewFinishStreamOperation(ctx, state, value)
	prior, err := so.GetCurrentAsPointer(ctx)
	if err != nil {
		return err
	}
	return so.Commit(ctx, *prior)
}

func (Keeper) StreamFailure(ctx sdk.Context, state types.StateRef, failure error) error {
	so := types.NewFailStreamOperation(ctx, state, failure)
	prior, err := so.GetCurrentAsPointer(ctx)
	if err != nil {
		return err
	}
	return so.Commit(ctx, *prior)
}
