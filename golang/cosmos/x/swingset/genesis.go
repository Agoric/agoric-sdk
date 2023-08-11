package swingset

import (
	// "os"
	"fmt"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

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
		Params:               types.DefaultParams(),
		State:                types.State{},
		SwingStoreExportData: []*types.SwingStoreExportDataEntry{},
	}
}

// InitGenesis initializes the (Cosmos-side) SwingSet state from the GenesisState.
// Returns whether the app should send a bootstrap action to the controller.
func InitGenesis(ctx sdk.Context, keeper Keeper, data *types.GenesisState) bool {
	keeper.SetParams(ctx, data.GetParams())
	keeper.SetState(ctx, data.GetState())

	swingStoreExportData := data.GetSwingStoreExportData()
	if len(swingStoreExportData) > 0 {
		// See https://github.com/Agoric/agoric-sdk/issues/6527
		panic("genesis with swing-store state not implemented")
	}

	// TODO: bootstrap only if not restoring swing-store from genesis state
	return true
}

func ExportGenesis(ctx sdk.Context, k Keeper) *types.GenesisState {
	gs := &types.GenesisState{
		Params:               k.GetParams(ctx),
		State:                k.GetState(ctx),
		SwingStoreExportData: []*types.SwingStoreExportDataEntry{},
	}

	// Only export the swing-store shadow copy for now
	// TODO:
	// - perform state-sync export with check blockHeight (figure out how to
	//   handle export of historical height),
	// - include swing-store artifacts in genesis state
	// See https://github.com/Agoric/agoric-sdk/issues/6527
	exportDataIterator := k.GetSwingStore(ctx).Iterator(nil, nil)
	defer exportDataIterator.Close()
	for ; exportDataIterator.Valid(); exportDataIterator.Next() {
		entry := types.SwingStoreExportDataEntry{
			Key:   string(exportDataIterator.Key()),
			Value: string(exportDataIterator.Value()),
		}
		gs.SwingStoreExportData = append(gs.SwingStoreExportData, &entry)
	}
	return gs
}
