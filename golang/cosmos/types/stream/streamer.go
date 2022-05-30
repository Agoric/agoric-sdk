package stream

import (
	sdk "github.com/cosmos/cosmos-sdk/types"

	agoric "github.com/Agoric/agoric-sdk/golang/cosmos/types"
)

// Streamer defines an interface that allows streaming to an arbitrary StateRef.
type Streamer interface {
	StreamUpdate(sdk sdk.Context, state agoric.StateRef, value []byte) error
	StreamFinish(sdk sdk.Context, state agoric.StateRef, value []byte) error
	StreamFailure(sdk sdk.Context, state agoric.StateRef, failure []byte) error
}

type streamerImpl struct{}

func NewStreamer() streamerImpl {
	return streamerImpl{}
}

func (streamerImpl) StreamUpdate(ctx sdk.Context, state agoric.StateRef, value []byte) error {
	so := NewUpdateStreamOperation(ctx, state, value)
	return so.CommitToCurrent(ctx)
}

func (streamerImpl) StreamFinish(ctx sdk.Context, state agoric.StateRef, value []byte) error {
	so := NewFinishStreamOperation(ctx, state, value)
	return so.CommitToCurrent(ctx)
}

func (streamerImpl) StreamFailure(ctx sdk.Context, state agoric.StateRef, failure []byte) error {
	so := NewFailStreamOperation(ctx, state, failure)
	return so.CommitToCurrent(ctx)
}
