package vpurse

import (
	// "fmt"

	"fmt"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vpurse/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	abci "github.com/tendermint/tendermint/abci/types"
)

func NewGenesisState() *types.GenesisState {
	return &types.GenesisState{}
}

func ValidateGenesis(data *types.GenesisState) error {
	if data == nil {
		return fmt.Errorf("vpurse genesis data cannot be nil")
	}
	return nil
}

func DefaultGenesisState() *types.GenesisState {
	gs := NewGenesisState()
	return gs
}

func InitGenesis(ctx sdk.Context, keeper Keeper, data *types.GenesisState) []abci.ValidatorUpdate {
	keeper.SetGenesis(ctx, *data)
	return []abci.ValidatorUpdate{}
}

func ExportGenesis(ctx sdk.Context, k Keeper) *types.GenesisState {
	gs := k.GetGenesis(ctx)
	return &gs
}
