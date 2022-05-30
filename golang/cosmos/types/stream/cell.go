package stream

import (
	"encoding/json"

	sdk "github.com/cosmos/cosmos-sdk/types"

	agoric "github.com/Agoric/agoric-sdk/golang/cosmos/types"
)

func NewStreamCell(blockHeight int64) StreamCell {
	return StreamCell{
		UpdatedBlockHeight: blockHeight,
		EndState:           StreamCell_END_STATE_APPENDABLE,
		Values:             make([][]byte, 0, 1),
		Prior:              NewZeroStreamPosition(),
	}
}

func NewStreamPosition(blockHeight int64, storeName string, subkey []byte, valuesCount uint64) StreamPosition {
	return StreamPosition{
		BlockHeight: blockHeight,
		StoreName:   storeName,
		StoreSubkey: subkey,
		ValueOffset: valuesCount,
	}
}

func NewZeroStreamPosition() StreamPosition {
	return NewStreamPosition(0, "", nil, 0)
}

func GetLatestPosition(ctx sdk.Context, state agoric.StateRef) (*StreamPosition, error) {
	var priorCell StreamCell
	if state.Exists(ctx) {
		data, err := state.Read(ctx)
		if err != nil {
			return nil, err
		}
		if err := json.Unmarshal(data, &priorCell); err != nil {
			return nil, err
		}
	}
	priorReference := NewStreamPosition(
		priorCell.UpdatedBlockHeight,
		state.StoreName(),
		state.StoreSubkey(),
		uint64(len(priorCell.Values)),
	)
	return &priorReference, nil
}
