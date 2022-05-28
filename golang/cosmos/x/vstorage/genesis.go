package vstorage

import (
	"fmt"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vstorage/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	abci "github.com/tendermint/tendermint/abci/types"
)

func NewGenesisState() *types.GenesisState {
	return &types.GenesisState{
		Data: []*types.DataEntry{},
	}
}

func ValidateGenesis(data *types.GenesisState) error {
	if data == nil {
		return nil
	}
	for _, entry := range data.Data {
		if entry.Value == "" {
			return fmt.Errorf("genesis vstorage.data entry %q has no data", entry.Path)
		}
	}
	return nil
}

func DefaultGenesisState() *types.GenesisState {
	return &types.GenesisState{
		Data: []*types.DataEntry{},
	}
}

func InitGenesis(ctx sdk.Context, keeper Keeper, data *types.GenesisState) []abci.ValidatorUpdate {
	keeper.ImportStorage(ctx, data.Data)
	return []abci.ValidatorUpdate{}
}

func ExportGenesis(ctx sdk.Context, keeper Keeper) *types.GenesisState {
	gs := NewGenesisState()
	gs.Data = keeper.ExportStorage(ctx)
	return gs
}
