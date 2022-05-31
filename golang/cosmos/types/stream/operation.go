package stream

import (
	"bytes"
	"encoding/json"
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"

	agoric "github.com/Agoric/agoric-sdk/golang/cosmos/types"
)

type StreamCellUpdater interface {
	Update(cell StreamCell) error
}

var _, _ StreamCellUpdater = AppendStreamCellUpdater{}, FailStreamCellUpdater{}

type StreamOperation struct {
	state   agoric.StateRef
	Updater StreamCellUpdater
	Prior   StreamPosition
}

func NewStreamOperation(ctx sdk.Context, state agoric.StateRef, updater StreamCellUpdater) StreamOperation {
	return StreamOperation{
		state:   state,
		Updater: updater,
		Prior:   NewZeroStreamPosition(),
	}
}

func (so StreamOperation) GetLatestPosition(ctx sdk.Context) (*StreamPosition, error) {
	return GetLatestPosition(ctx, so.state)
}

// LoadAndCheckHead returns a head satisfying prior that we can mutate.
func (so StreamOperation) LoadAndCheckHead(ctx sdk.Context, prior StreamPosition) (*StreamCell, error) {
	head := NewStreamCell(ctx.BlockHeight(), prior)
	if !so.state.Exists(ctx) {
		// No prior state, safe to use the fresh head.
		return &head, nil
	}
	// Get the current head.
	data, err := so.state.Read(ctx)
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal([]byte(data), &head); err != nil {
		return nil, err
	}
	if prior.BlockHeight != head.UpdatedBlockHeight {
		return nil, fmt.Errorf("prior block height %d does not match current %q head block height %d", prior.BlockHeight, so.state, head.UpdatedBlockHeight)
	}
	nextSequence := head.Prior.SequenceNumber + uint64(len(head.Values))
	if prior.SequenceNumber != nextSequence {
		return nil, fmt.Errorf("prior sequence number %d does not point to last value %d", prior.SequenceNumber, nextSequence)
	}
	stateStoreName := so.state.StoreName()
	if prior.StoreName != stateStoreName {
		return nil, fmt.Errorf("prior store name %s does not match state store name %s", prior.StoreName, stateStoreName)
	}
	stateStoreSubKey := so.state.StoreSubkey()
	if !bytes.Equal(prior.StoreSubkey, stateStoreSubKey) {
		return nil, fmt.Errorf("prior store subkey %s does not match state store subkey %s", prior.StoreSubkey, stateStoreSubKey)
	}
	// We can update the current head state.
	return &head, nil
}

// Commit commits the stream operation to the current state.
func (so StreamOperation) Commit(ctx sdk.Context, priorPos StreamPosition, forceOverwrite bool) error {
	head := NewStreamCell(ctx.BlockHeight(), priorPos)
	if !forceOverwrite {
		// Get the current head and assert that it's compatible with prior.
		headP, err := so.LoadAndCheckHead(ctx, priorPos)
		if err != nil {
			return err
		}
		head = *headP
	}

	if head.UpdatedBlockHeight != ctx.BlockHeight() {
		// Start a new values list.
		head.UpdatedBlockHeight = ctx.BlockHeight()
		head.Values = nil
	}

	head.Prior = priorPos

	if head.Values == nil {
		// Allocate fresh values for potential appending.
		head.Values = make([][]byte, 0, 1)
	}

	switch head.EndState {
	case StreamCell_END_STATE_APPENDABLE:
		break
	case StreamCell_END_STATE_FINISHED:
		return fmt.Errorf("cannot update stream at %s that is already done", so.state)
	case StreamCell_END_STATE_FAILURE:
		return fmt.Errorf("cannot update stream at %s that has an error: %s", so.state, head.Values[len(head.Values)-1])
	default:
		return fmt.Errorf("cannot update stream at %s with unrecognized end state %q", so.state, head.EndState)
	}

	if err := so.Updater.Update(head); err != nil {
		return err
	}

	// Convert the head to JSON.
	bz, err := json.Marshal(head)
	if err != nil {
		return err
	}

	// COMMIT POINT
	// Store the marshalled stream cell.
	if err := so.state.Write(ctx, bz); err != nil {
		return err
	}

	// Emit the advisory state change event.
	ctx.EventManager().EmitEvent(
		agoric.NewStateChangeEvent(
			so.state.StoreName(),
			so.state.StoreSubkey(),
			bz,
		),
	)
	return nil
}

// CommitToCurrent fetches the latest position and appends to it.
func (so StreamOperation) CommitToCurrent(ctx sdk.Context) error {
	prior, err := so.GetLatestPosition(ctx)
	if err != nil {
		return err
	}
	return so.Commit(ctx, *prior, false)
}

type AppendStreamCellUpdater struct {
	Done  bool
	Value []byte
}

func NewUpdateStreamOperation(ctx sdk.Context, state agoric.StateRef, value []byte) StreamOperation {
	updater := AppendStreamCellUpdater{
		Value: value,
		Done:  false,
	}
	return NewStreamOperation(ctx, state, updater)
}

func NewFinishStreamOperation(ctx sdk.Context, state agoric.StateRef, value []byte) StreamOperation {
	updater := AppendStreamCellUpdater{
		Value: value,
		Done:  true,
	}
	return NewStreamOperation(ctx, state, updater)
}

func (op AppendStreamCellUpdater) Update(cell StreamCell) error {
	// Add the new state to the batch.
	cell.Values = append(cell.Values, op.Value)
	if op.Done {
		cell.EndState = StreamCell_END_STATE_FINISHED
	}
	return nil
}

type FailStreamCellUpdater struct {
	Failure []byte
}

func (op FailStreamCellUpdater) Update(cell StreamCell) error {
	cell.Values = append(cell.Values, op.Failure)
	cell.EndState = StreamCell_END_STATE_FAILURE
	return nil
}

func NewFailStreamOperation(ctx sdk.Context, state agoric.StateRef, failure []byte) StreamOperation {
	updater := FailStreamCellUpdater{
		Failure: failure,
	}
	return NewStreamOperation(ctx, state, updater)
}
