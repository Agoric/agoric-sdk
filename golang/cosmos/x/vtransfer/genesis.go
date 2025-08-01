package vtransfer

import (
	"fmt"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vtransfer/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

func NewGenesisState() *types.GenesisState {
	return &types.GenesisState{}
}

func ValidateGenesis(data *types.GenesisState) error {
	if data == nil {
		return fmt.Errorf("vtransfer genesis data cannot be nil")
	}
	return nil
}

func DefaultGenesisState() *types.GenesisState {
	return &types.GenesisState{}
}

func InitGenesis(ctx sdk.Context, keeper Keeper, data *types.GenesisState) {
	keeper.SetWatchedAddresses(ctx, data.GetWatchedAddresses())
}

func ExportGenesis(ctx sdk.Context, k Keeper) *types.GenesisState {
	var gs types.GenesisState
	addresses, err := k.GetWatchedAddresses(ctx)
	if err != nil {
		panic(err)
	}
	gs.WatchedAddresses = addresses
	return &gs
}
