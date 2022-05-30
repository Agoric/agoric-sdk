package types

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
)

type StreamCellUpdater interface {
	Update(cell StreamCell) error
}

var _, _ StreamCellUpdater = AppendUpdater{}, FailUpdater{}

type AppendUpdater struct {
	Done  bool
	Value []byte
}

func NewUpdateStreamOperation(ctx sdk.Context, state StateRef, value []byte) StreamOperation {
	updater := AppendUpdater{
		Value: value,
		Done:  true,
	}
	return NewStreamOperation(ctx, state, updater)
}

func NewFinishStreamOperation(ctx sdk.Context, state StateRef, value []byte) StreamOperation {
	updater := AppendUpdater{
		Value: value,
		Done:  true,
	}
	return NewStreamOperation(ctx, state, updater)
}

func (op AppendUpdater) Update(cell StreamCell) error {
	// Add the new state to the batch.
	cell.Values = append(cell.Values, op.Value)
	if op.Done {
		cell.State = StreamCell_STREAM_STATE_FINISHED
	} else {
		cell.State = StreamCell_STREAM_STATE_STREAMING
	}
	return nil
}

type FailUpdater struct {
	Failure error
}

func (op FailUpdater) Update(cell StreamCell) error {
	cell.State = StreamCell_STREAM_STATE_FAILURE
	cell.Error = op.Failure.Error()
	return nil
}

func NewFailStreamOperation(ctx sdk.Context, state StateRef, failure error) StreamOperation {
	updater := FailUpdater{
		Failure: failure,
	}
	return NewStreamOperation(ctx, state, updater)
}
