package keeper

import (
	"bytes"
	"encoding/json"
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"

	vstoragekeeper "github.com/Agoric/agoric-sdk/golang/cosmos/x/vstorage/keeper"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vstream/types"
)

type StreamState string

type CellUpdater interface {
	Update(cell types.StreamCell) error
}

type PublishRequest struct {
	VstorageKeeper     vstoragekeeper.Keeper
	StoreName          string
	Path               string
	CellUpdater        CellUpdater
	Prior              types.StreamCellPointer
	ForceOverwriteHead bool
}

func NewPublishRequest(ctx sdk.Context, keeper Keeper, path string, updater CellUpdater) PublishRequest {
	return PublishRequest{
		VstorageKeeper: keeper.vstorageKeeper,
		StoreName:      keeper.storeKey.String(),
		Path:           path,
		CellUpdater:    updater,
		Prior:          NewNilStreamCellPointer(),
	}
}

func NewStreamCell(blockHeight int64) types.StreamCell {
	return types.StreamCell{
		UpdatedBlockHeight: blockHeight,
		State:              types.StreamCell_STREAM_STATE_STREAMING,
		Values:             make([][]byte, 0, 1),
		Prior:              NewNilStreamCellPointer(),
	}
}

func NewStreamCellPointer(blockHeight int64, storeName string, subkey []byte) types.StreamCellPointer {
	return types.StreamCellPointer{
		BlockHeight: blockHeight,
		StoreName:   storeName,
		StoreSubkey: subkey,
	}
}

func NewNilStreamCellPointer() types.StreamCellPointer {
	return NewStreamCellPointer(0, "", nil)
}

func (pr *PublishRequest) GetPriorFromPath(ctx sdk.Context, path string) (*types.StreamCellPointer, error) {
	var priorCell types.StreamCell
	if data := pr.VstorageKeeper.GetData(ctx, path); len(data) > 0 {
		if err := json.Unmarshal([]byte(data), &priorCell); err != nil {
			return nil, err
		}
	}
	priorPointer := NewStreamCellPointer(
		priorCell.UpdatedBlockHeight,
		pr.StoreName,
		pr.VstorageKeeper.PathToEncodedKey(path),
	)
	return &priorPointer, nil
}

// GetMutableHead returns a head we can mutate that matches prior.
func (pr PublishRequest) GetMutableHead(ctx sdk.Context, prior types.StreamCellPointer) (*types.StreamCell, error) {
	head := NewStreamCell(ctx.BlockHeight())
	data := pr.VstorageKeeper.GetData(ctx, pr.Path)
	if data == "" {
		// No prior state, safe to update the uninitialised one.
		return &head, nil
	}
	// Get the current head.
	if err := json.Unmarshal([]byte(data), &head); err != nil {
		return nil, err
	}
	if prior.BlockHeight != head.UpdatedBlockHeight {
		return nil, fmt.Errorf("prior block height %d does not match path %q head block height %d", prior.BlockHeight, pr.Path, head.UpdatedBlockHeight)
	}
	if prior.StoreName != pr.StoreName {
		return nil, fmt.Errorf("prior store name %s does not match current store name %s", prior.StoreName, pr.StoreName)
	}
	encodedKey := pr.VstorageKeeper.PathToEncodedKey(pr.Path)
	if !bytes.Equal(prior.StoreSubkey, encodedKey) {
		return nil, fmt.Errorf("prior store subkey %s does not match current store subkey %s", prior.StoreSubkey, encodedKey)
	}
	if int(prior.LastValueIndex) != len(head.Values) {
		return nil, fmt.Errorf("prior last value index %d does not match current last value index %d", prior.LastValueIndex, len(head.Values))
	}
	// We can update the current head state.
	return &head, nil
}

func (pr PublishRequest) Commit(ctx sdk.Context, prior types.StreamCellPointer) error {
	head := NewStreamCell(ctx.BlockHeight())
	if !pr.ForceOverwriteHead {
		mutableHead, err := pr.GetMutableHead(ctx, prior)
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

	// Set the prior pointer.
	head.Prior = prior

	if head.Values == nil {
		// Allocate fresh values for potential appending.
		head.Values = make([][]byte, 0, 1)
	}

	switch head.State {
	case types.StreamCell_STREAM_STATE_UNSPECIFIED:
		// Set to active.
		head.State = types.StreamCell_STREAM_STATE_STREAMING
	case types.StreamCell_STREAM_STATE_STREAMING:
		break
	case types.StreamCell_STREAM_STATE_FINISHED:
		return fmt.Errorf("cannot publish to a path %q that is already done", pr.Path)
	case types.StreamCell_STREAM_STATE_FAILURE:
		return fmt.Errorf("cannot publish to a path %q that has an error: %s", pr.Path, head.Error)
	default:
		return fmt.Errorf("cannot publish to a path %q with unrecognized.State state %q", pr.Path, head.State)
	}

	if err := pr.CellUpdater.Update(head); err != nil {
		return err
	}

	// Convert the head to JSON.
	bz, err := json.Marshal(head)
	if err != nil {
		return err
	}

	// COMMIT POINT
	// Store and announce the marshalled stream cell.
	pr.VstorageKeeper.SetStorage(ctx, pr.Path, string(bz))
	ctx.EventManager().EmitEvent(
		types.NewStateChangeEvent(pr.StoreName, pr.VstorageKeeper.PathToEncodedKey(pr.Path), bz),
	)
	return nil
}

type AppendUpdater struct {
	Done  bool
	State []byte
}

func NewUpdatePublishRequest(ctx sdk.Context, k Keeper, path string, state []byte) PublishRequest {
	updater := AppendUpdater{
		State: state,
		Done:  true,
	}
	return NewPublishRequest(ctx, k, path, updater)
}

func NewFinishPublishRequest(ctx sdk.Context, k Keeper, path string, state []byte) PublishRequest {
	updater := AppendUpdater{
		State: state,
		Done:  true,
	}
	return NewPublishRequest(ctx, k, path, updater)
}

func (op AppendUpdater) Update(cell types.StreamCell) error {
	// Add the new state to the batch.
	cell.Values = append(cell.Values, op.State)
	if op.Done {
		cell.State = types.StreamCell_STREAM_STATE_FINISHED
	} else {
		cell.State = types.StreamCell_STREAM_STATE_STREAMING
	}
	return nil
}

type FailUpdater struct {
	Failure error
}

func (op FailUpdater) Update(cell types.StreamCell) error {
	cell.State = types.StreamCell_STREAM_STATE_FAILURE
	cell.Error = op.Failure.Error()
	return nil
}

func NewFailPublishRequest(ctx sdk.Context, keeper Keeper, path string, failure error) PublishRequest {
	updater := FailUpdater{
		Failure: failure,
	}
	return NewPublishRequest(ctx, keeper, path, updater)
}
