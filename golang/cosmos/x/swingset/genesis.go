package swingset

import (
	// "fmt"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	abci "github.com/tendermint/tendermint/abci/types"
)

func NewGenesisState() *types.GenesisState {
	return &types.GenesisState{
		Storage: make(map[string]string),
	}
}

func ValidateGenesis(data *types.GenesisState) error {
	return nil
}

func DefaultGenesisState() *types.GenesisState {
	gs := NewGenesisState()
	return gs
}

func InitGenesis(ctx sdk.Context, keeper Keeper, data *types.GenesisState) []abci.ValidatorUpdate {
	var storage types.Storage
	for key, value := range data.Storage {
		storage.Value = value
		keeper.SetStorage(ctx, key, &storage)
	}
	return []abci.ValidatorUpdate{}
}

func ExportGenesis(ctx sdk.Context, k Keeper) *types.GenesisState {
	gs := NewGenesisState()
	gs.Storage = k.ExportStorage(ctx)
	return gs
}
