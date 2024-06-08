package vbank

import (
	"fmt"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vbank/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	abci "github.com/tendermint/tendermint/abci/types"
)

func NewGenesisState() *types.GenesisState {
	return &types.GenesisState{}
}

func ValidateGenesis(data *types.GenesisState) error {
	if data == nil {
		return fmt.Errorf("vbank genesis data cannot be nil")
	}
	if err := data.Params.ValidateBasic(); err != nil {
		return err
	}
	return nil
}

func DefaultGenesisState() *types.GenesisState {
	return &types.GenesisState{
		Params: types.DefaultParams(),
		// State is defaulted to empty.
	}
}

func InitGenesis(ctx sdk.Context, keeper Keeper, data *types.GenesisState) []abci.ValidatorUpdate {
	keeper.SetParams(ctx, data.GetParams())
	keeper.SetState(ctx, data.GetState())
	return []abci.ValidatorUpdate{}
}

func ExportGenesis(ctx sdk.Context, k Keeper) *types.GenesisState {
	var gs types.GenesisState
	gs.Params = k.GetParams(ctx)
	gs.State = k.GetState(ctx)
	return &gs
}
