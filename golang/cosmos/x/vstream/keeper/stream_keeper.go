package keeper

import (
	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vstream/types"
)

var _ types.Streamer = Keeper{}

func (Keeper) StreamUpdate(ctx sdk.Context, state types.StateRef, value []byte) error {
	so := types.NewUpdateStreamOperation(ctx, state, value)
	prior, err := so.GetPrior(ctx)
	if err != nil {
		return err
	}
	return so.Commit(ctx, *prior)
}

func (Keeper) StreamFinish(ctx sdk.Context, state types.StateRef, value []byte) error {
	so := types.NewFinishStreamOperation(ctx, state, value)
	prior, err := so.GetPrior(ctx)
	if err != nil {
		return err
	}
	return so.Commit(ctx, *prior)
}

func (Keeper) StreamFailure(ctx sdk.Context, state types.StateRef, failure error) error {
	so := types.NewFailStreamOperation(ctx, state, failure)
	prior, err := so.GetPrior(ctx)
	if err != nil {
		return err
	}
	return so.Commit(ctx, *prior)
}
