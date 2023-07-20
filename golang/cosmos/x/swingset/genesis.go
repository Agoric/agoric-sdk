package swingset

import (
	// "os"
	"fmt"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

func NewGenesisState() *types.GenesisState {
	return &types.GenesisState{}
}

func ValidateGenesis(data *types.GenesisState) error {
	if data == nil {
		return fmt.Errorf("swingset genesis data cannot be nil")
	}
	if err := data.Params.ValidateBasic(); err != nil {
		return err
	}
	return nil
}

func DefaultGenesisState() *types.GenesisState {
	return &types.GenesisState{
		Params: types.DefaultParams(),
	}
}

// InitGenesis initializes the (Cosmos-side) SwingSet state from the GenesisState.
// Returns whether the app should send a bootstrap action to the controller.
func InitGenesis(ctx sdk.Context, keeper Keeper, data *types.GenesisState) bool {
	keeper.SetParams(ctx, data.GetParams())
	keeper.SetState(ctx, data.GetState())

	// TODO: bootstrap only if not restoring swing-store from genesis state
	return true
}

func ExportGenesis(ctx sdk.Context, k Keeper) *types.GenesisState {
	gs := NewGenesisState()
	gs.Params = k.GetParams(ctx)
	gs.State = k.GetState(ctx)
	return gs
}
