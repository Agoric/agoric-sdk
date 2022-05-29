package keeper

import (
	"encoding/json"
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"

	vstoragekeeper "github.com/Agoric/agoric-sdk/golang/cosmos/x/vstorage/keeper"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vstream/types"
)

type StreamState string

type PublishCommiter interface {
	Commit(ctx sdk.Context, pr PublishRequest, cell types.StreamCell)
}

type PublishRequest struct {
	VstorageKeeper vstoragekeeper.Keeper
	StoreName      string
	Path           string
	Committer      PublishCommiter
}

func NewPublishRequest(ctx sdk.Context, keeper Keeper, path string, committer PublishCommiter) PublishRequest {
	return PublishRequest{
		VstorageKeeper: keeper.vstorageKeeper,
		StoreName:      keeper.storeKey.String(),
		Path:           path,
		Committer:      committer,
	}
}

func (pr PublishRequest) Commit(ctx sdk.Context) {
	var head types.StreamCell

	// Find the prior cell, if any.
	// Only try unmarshalling if we have non-empty data stored.
	if data := pr.VstorageKeeper.GetData(ctx, pr.Path); len(data) > 0 {
		var priorCell types.StreamCell
		if err := json.Unmarshal([]byte(data), &priorCell); err != nil {
			panic(err)
		}
		// Update the current head with defaults.
		head = priorCell
	}

	if head.PublishedInBlock != ctx.BlockHeight() {
		// Link the fresh publishing chunk to the history.
		head.LastPublishedInBlock = head.PublishedInBlock
		head.PublishedInBlock = ctx.BlockHeight()
		head.Values = nil
	}

	if head.Values == nil {
		// Allocate fresh values.
		head.Values = make([][]byte, 0, 1)
	}

	switch head.Streaming {
	case types.StreamCell_STREAM_STATE_UNSPECIFIED:
		// Set to active.
		head.Streaming = types.StreamCell_STREAM_STATE_ACTIVE
	case types.StreamCell_STREAM_STATE_FAILURE:
		panic(fmt.Errorf("cannot publish to a path %q that has an error: %s", pr.Path, head.Error))
	case types.StreamCell_STREAM_STATE_FINISHED:
		panic(fmt.Errorf("cannot publish to a path %q that is already done", pr.Path))
	case types.StreamCell_STREAM_STATE_ACTIVE:
		break
	default:
		panic(fmt.Errorf("cannot publish to a path %q with unrecognized streaming state %q", pr.Path, head.Streaming))
	}

	pr.Committer.Commit(ctx, pr, head)

	// Upsert the batch.
	bz, err := json.Marshal(head)
	if err != nil {
		panic(err)
	}

	pr.VstorageKeeper.SetStorage(ctx, pr.Path, string(bz))

	// Our stream has changed, so emit the new head in an event.
	encodedKey := pr.VstorageKeeper.PathToEncodedKey(pr.Path)
	ctx.EventManager().EmitEvent(
		types.NewStateChangeEvent(pr.StoreName, encodedKey, bz),
	)
}

type PublishUpdateCommitter struct {
	Done  bool
	State []byte
}

func NewUpdatePublishRequest(ctx sdk.Context, k Keeper, path string, state []byte) PublishRequest {
	committer := PublishUpdateCommitter{
		State: state,
		Done:  true,
	}
	return NewPublishRequest(ctx, k, path, committer)
}

func NewFinishPublishRequest(ctx sdk.Context, k Keeper, path string, state []byte) PublishRequest {
	committer := PublishUpdateCommitter{
		State: state,
		Done:  true,
	}
	return NewPublishRequest(ctx, k, path, committer)
}

func (op PublishUpdateCommitter) Commit(ctx sdk.Context, pr PublishRequest, cell types.StreamCell) {
	pr.VstorageKeeper.SetStorage(ctx, pr.Path, string(op.State))

	// Add the new state to the batch.
	cell.Values = append(cell.Values, op.State)
	if op.Done {
		cell.Streaming = types.StreamCell_STREAM_STATE_FINISHED
	} else {
		cell.Streaming = types.StreamCell_STREAM_STATE_ACTIVE
	}
}

type PublishFailCommitter struct {
	Error error
}

func (op PublishFailCommitter) Commit(ctx sdk.Context, pr PublishRequest, cell types.StreamCell) {
	cell.Streaming = types.StreamCell_STREAM_STATE_FAILURE
	cell.Error = op.Error.Error()
}

func NewFailPublishRequest(ctx sdk.Context, keeper Keeper, path string, err error) PublishRequest {
	commiter := PublishFailCommitter{
		Error: err,
	}
	return NewPublishRequest(ctx, keeper, path, commiter)
}
