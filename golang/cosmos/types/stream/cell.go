package stream

import (
	"encoding/json"

	sdk "github.com/cosmos/cosmos-sdk/types"

	agoric "github.com/Agoric/agoric-sdk/golang/cosmos/types"
)

// NewStreamCell creates a new StreamCell at blockHeight with the specified
// prior position.
func NewStreamCell(blockHeight int64, prior StreamPosition) StreamCell {
	return StreamCell{
		UpdatedBlockHeight: blockHeight,
		EndState:           StreamCell_END_STATE_APPENDABLE,
		Values:             make([][]byte, 0, 1),
		Prior:              prior,
	}
}

func NewStreamPosition(blockHeight int64, storeName string, subkey []byte, seq uint64) StreamPosition {
	return StreamPosition{
		BlockHeight:    blockHeight,
		StoreName:      storeName,
		StoreSubkey:    subkey,
		SequenceNumber: seq,
	}
}

func NewZeroStreamPosition() StreamPosition {
	return NewStreamPosition(0, "", nil, 0)
}

// GetLatestPosition returns the position of the last value in the cell, or a
// zero stream position if the referenced cell does not exist.
func GetLatestPosition(ctx sdk.Context, state agoric.StateRef) (*StreamPosition, error) {
	if !state.Exists(ctx) {
		zeroPosition := NewZeroStreamPosition()
		return &zeroPosition, nil
	}

	var priorCell StreamCell
	data, err := state.Read(ctx)
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(data, &priorCell); err != nil {
		return nil, err
	}

	priorReference := NewStreamPosition(
		priorCell.UpdatedBlockHeight,
		state.StoreName(),
		state.StoreSubkey(),
		priorCell.Prior.SequenceNumber+uint64(len(priorCell.Values)),
	)
	return &priorReference, nil
}
