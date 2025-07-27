package vbank

import (
	"fmt"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vbank/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
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

func InitGenesis(ctx sdk.Context, keeper Keeper, data *types.GenesisState) {
	keeper.SetParams(ctx, data.GetParams())
	keeper.SetState(ctx, data.GetState())
}

func ExportGenesis(ctx sdk.Context, k Keeper) (*types.GenesisState, error) {
	params := k.GetParams(ctx)
	state, err := k.GetState(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to export vbank state: %s", err)
	}
	gs := &types.GenesisState{
		Params: params,
		State:  state,
	}
	return gs, nil
}
