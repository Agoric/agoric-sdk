package swingset

import (
	// "fmt"

	"github.com/Agoric/cosmic-swingset/x/swingset/internal/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	abci "github.com/tendermint/tendermint/abci/types"
)

type GenesisState struct {
	Storage map[string]string `json:"storage"`
}

func NewGenesisState() GenesisState {
	return GenesisState{
		Storage: make(map[string]string),
	}
}

func ValidateGenesis(data GenesisState) error {
	return nil
}

func DefaultGenesisState() GenesisState {
	return GenesisState{
		Storage: make(map[string]string),
	}
}

func InitGenesis(ctx sdk.Context, keeper Keeper, data GenesisState) []abci.ValidatorUpdate {
	var storage types.Storage
	for key, value := range data.Storage {
		storage.Value = value
		keeper.SetStorage(ctx, key, storage)
	}
	return []abci.ValidatorUpdate{}
}

func ExportGenesis(ctx sdk.Context, k Keeper) GenesisState {
	gs := NewGenesisState()
	gs.Storage = k.ExportStorage(ctx)
	return gs
}
