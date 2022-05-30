package types

import (
	"encoding/json"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

func NewStreamCell(blockHeight int64) StreamCell {
	return StreamCell{
		UpdatedBlockHeight: blockHeight,
		State:              StreamCell_STREAM_STATE_STREAMING,
		Values:             make([][]byte, 0, 1),
		Prior:              NewNilStreamCellPointer(),
	}
}

func NewStreamCellPointer(blockHeight int64, storeName string, subkey []byte) StreamCellPointer {
	return StreamCellPointer{
		BlockHeight: blockHeight,
		StoreName:   storeName,
		StoreSubkey: subkey,
	}
}

func NewNilStreamCellPointer() StreamCellPointer {
	return NewStreamCellPointer(0, "", nil)
}

func GetPriorPointer(ctx sdk.Context, state StateRef) (*StreamCellPointer, error) {
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
	priorPointer := NewStreamCellPointer(
		priorCell.UpdatedBlockHeight,
		state.StoreName(),
		state.StoreSubkey(),
	)
	return &priorPointer, nil
}
