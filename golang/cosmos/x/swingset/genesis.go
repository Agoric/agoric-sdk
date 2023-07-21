package swingset

import (
	// "os"
	"fmt"

	agoric "github.com/Agoric/agoric-sdk/golang/cosmos/types"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/keeper"
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

func ExportGenesis(ctx sdk.Context, k Keeper, swingStoreExportsHandler *SwingStoreExportsHandler, swingStoreExportDir string) *types.GenesisState {
	gs := &types.GenesisState{
		Params:               k.GetParams(ctx),
		State:                k.GetState(ctx),
		SwingStoreExportData: []*types.SwingStoreExportDataEntry{},
	}

	exportDataIterator := k.GetSwingStore(ctx).Iterator(nil, nil)
	defer exportDataIterator.Close()
	for ; exportDataIterator.Valid(); exportDataIterator.Next() {
		entry := types.SwingStoreExportDataEntry{
			Key:   string(exportDataIterator.Key()),
			Value: string(exportDataIterator.Value()),
		}
		gs.SwingStoreExportData = append(gs.SwingStoreExportData, &entry)
	}

	snapshotHeight := uint64(ctx.BlockHeight())

	err := swingStoreExportsHandler.InitiateExport(
		// The export will fail if the export of a historical height was requested
		snapshotHeight,
		swingStoreGenesisEventHandler{exportDir: swingStoreExportDir, snapshotHeight: snapshotHeight},
		// The export will fail if the swing-store does not contain all replay artifacts
		keeper.SwingStoreExportOptions{
			ArtifactMode:   keeper.SwingStoreArtifactModeReplay,
			ExportDataMode: keeper.SwingStoreExportDataModeSkip,
		},
	)
	if err != nil {
		panic(err)
	}

	err = keeper.WaitUntilSwingStoreExportDone()
	if err != nil {
		panic(err)
	}

	return gs
}

type swingStoreGenesisEventHandler struct {
	exportDir      string
	snapshotHeight uint64
}

func (eventHandler swingStoreGenesisEventHandler) OnExportStarted(height uint64, retrieveSwingStoreExport func() error) error {
	return retrieveSwingStoreExport()
}

func (eventHandler swingStoreGenesisEventHandler) OnExportRetrieved(provider keeper.SwingStoreExportProvider) error {
	if eventHandler.snapshotHeight != provider.BlockHeight {
		return fmt.Errorf("snapshot block height (%d) doesn't match requested height (%d)", provider.BlockHeight, eventHandler.snapshotHeight)
	}

	artifactsProvider := keeper.SwingStoreExportProvider{
		GetExportDataReader: func() (agoric.KVEntryReader, error) {
			return nil, nil
		},
		ReadNextArtifact: provider.ReadNextArtifact,
	}

	return keeper.WriteSwingStoreExportToDirectory(artifactsProvider, eventHandler.exportDir)
}
