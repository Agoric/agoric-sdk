package swingset

import (
	"encoding/json"

	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	abci "github.com/tendermint/tendermint/abci/types"
)

type beginBlockAction struct {
	Type        string `json:"type"`
	StoragePort int    `json:"storagePort"`
	BlockHeight int64  `json:"blockHeight"`
	BlockTime   int64  `json:"blockTime"`
}

type endBlockAction struct {
	Type        string `json:"type"`
	StoragePort int    `json:"storagePort"`
	BlockHeight int64  `json:"blockHeight"`
	BlockTime   int64  `json:"blockTime"`
}

func BeginBlock(ctx sdk.Context, req abci.RequestBeginBlock, keeper Keeper) error {
	// Create a "storagePort" that the controller can use to communicate with the
	// storageHandler
	storagePort := RegisterPortHandler(NewUnlimitedStorageHandler(ctx, keeper))
	defer UnregisterPortHandler(storagePort)

	action := &beginBlockAction{
		Type:        "BEGIN_BLOCK",
		StoragePort: storagePort,
		BlockHeight: ctx.BlockHeight(),
		BlockTime:   ctx.BlockTime().Unix(),
	}
	b, err := json.Marshal(action)
	if err != nil {
		return sdkerrors.Wrap(sdkerrors.ErrJSONMarshal, err.Error())
	}

	_, err = keeper.CallToController(string(b))

	// fmt.Fprintln(os.Stderr, "Returned from SwingSet", out, err)
	return err
}

func EndBlock(ctx sdk.Context, req abci.RequestEndBlock, keeper Keeper) ([]abci.ValidatorUpdate, error) {
	// Create a "storagePort" that the controller can use to communicate with the
	// storageHandler
	storagePort := RegisterPortHandler(NewUnlimitedStorageHandler(ctx, keeper))
	defer UnregisterPortHandler(storagePort)

	action := &endBlockAction{
		Type:        "END_BLOCK",
		BlockHeight: ctx.BlockHeight(),
		BlockTime:   ctx.BlockTime().Unix(),
		StoragePort: storagePort,
	}
	b, err := json.Marshal(action)
	if err != nil {
		return nil, sdkerrors.Wrap(sdkerrors.ErrJSONMarshal, err.Error())
	}

	_, err = keeper.CallToController(string(b))

	// fmt.Fprintln(os.Stderr, "Returned from SwingSet", out, err)
	if err != nil {
		return nil, err
	}
	return []abci.ValidatorUpdate{}, nil
}
