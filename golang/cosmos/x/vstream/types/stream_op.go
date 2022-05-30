package types

import (
	"bytes"
	"encoding/json"
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

type StreamState string

type StreamOperation struct {
	state              StateRef
	Updater            StreamCellUpdater
	Prior              StreamCellReference
	ForceOverwriteHead bool
}

func NewStreamOperation(ctx sdk.Context, state StateRef, updater StreamCellUpdater) StreamOperation {
	return StreamOperation{
		state:   state,
		Updater: updater,
		Prior:   NewEmptyStreamCellReference(),
	}
}

func (so StreamOperation) GetPrior(ctx sdk.Context) (*StreamCellReference, error) {
	return GetStreamCellReference(ctx, so.state)
}

// GetMutableHead returns a head we can mutate that matches prior.
func (so StreamOperation) GetMutableHead(ctx sdk.Context, prior StreamCellReference) (*StreamCell, error) {
	head := NewStreamCell(ctx.BlockHeight())
	if !so.state.Exists(ctx) {
		// No prior state, safe to update the uninitialised one.
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
	stateStoreName := so.state.StoreName()
	if prior.StoreName != stateStoreName {
		return nil, fmt.Errorf("prior store name %s does not match state store name %s", prior.StoreName, stateStoreName)
	}
	stateStoreSubKey := so.state.StoreSubkey()
	if !bytes.Equal(prior.StoreSubkey, stateStoreSubKey) {
		return nil, fmt.Errorf("prior store subkey %s does not match state store subkey %s", prior.StoreSubkey, stateStoreSubKey)
	}
	if int(prior.ValuesCount) != len(head.Values) {
		return nil, fmt.Errorf("prior values count %d does not match current values count %d", prior.ValuesCount, len(head.Values))
	}
	// We can update the current head state.
	return &head, nil
}

func (so StreamOperation) Commit(ctx sdk.Context, prior StreamCellReference) error {
	head := NewStreamCell(ctx.BlockHeight())
	if !so.ForceOverwriteHead {
		mutableHead, err := so.GetMutableHead(ctx, prior)
		if err != nil {
			return err
		}
		head = *mutableHead
	}

	if head.UpdatedBlockHeight != ctx.BlockHeight() {
		// Start a new values list.
		head.UpdatedBlockHeight = ctx.BlockHeight()
		head.Values = nil
	}

	// Set the prior reference.
	head.Prior = prior

	if head.Values == nil {
		// Allocate fresh values for potential appending.
		head.Values = make([][]byte, 0, 1)
	}

	switch head.State {
	case StreamCell_STREAM_STATE_UNSPECIFIED:
		// Set to active.
		head.State = StreamCell_STREAM_STATE_STREAMING
	case StreamCell_STREAM_STATE_STREAMING:
		break
	case StreamCell_STREAM_STATE_FINISHED:
		return fmt.Errorf("cannot update stream at %s that is already done", so.state)
	case StreamCell_STREAM_STATE_FAILURE:
		return fmt.Errorf("cannot publish stream at %s that has an error: %s", so.state, head.Error)
	default:
		return fmt.Errorf("cannot publish stream at %s with unrecognized state %q", so.state, head.State)
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
	// Store and announce the marshalled stream cell.
	if err := so.state.Write(ctx, bz); err != nil {
		return err
	}

	// Emit the conventional state change.
	ctx.EventManager().EmitEvent(
		NewStateChangeEvent(
			so.state.StoreName(),
			so.state.StoreSubkey(),
			bz,
		),
	)
	return nil
}

func (so StreamOperation) CommitToCurrent(ctx sdk.Context) error {
	prior, err := so.GetPrior(ctx)
	if err != nil {
		return err
	}
	return so.Commit(ctx, *prior)
}
