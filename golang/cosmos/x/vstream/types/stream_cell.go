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
		Prior:              NewEmptyStreamCellReference(),
	}
}

func NewStreamCellReference(blockHeight int64, storeName string, subkey []byte, valuesCount uint64) StreamCellReference {
	return StreamCellReference{
		BlockHeight: blockHeight,
		StoreName:   storeName,
		StoreSubkey: subkey,
		ValuesCount: valuesCount,
	}
}

func NewEmptyStreamCellReference() StreamCellReference {
	return NewStreamCellReference(0, "", nil, 0)
}

func GetStreamCellReference(ctx sdk.Context, state StateRef) (*StreamCellReference, error) {
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
	priorReference := NewStreamCellReference(
		priorCell.UpdatedBlockHeight,
		state.StoreName(),
		state.StoreSubkey(),
		uint64(len(priorCell.Values)),
	)
	return &priorReference, nil
}
