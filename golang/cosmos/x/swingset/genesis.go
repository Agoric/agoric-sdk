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
func InitGenesis(ctx sdk.Context, k Keeper, swingStoreExportsHandler *SwingStoreExportsHandler, swingStoreExportDir string, data *types.GenesisState) bool {
	k.SetParams(ctx, data.GetParams())
	k.SetState(ctx, data.GetState())

	swingStoreExportData := data.GetSwingStoreExportData()
	if len(swingStoreExportData) == 0 {
		return true
	}

	artifactProvider, err := keeper.OpenSwingStoreExportDirectory(swingStoreExportDir)
	if err != nil {
		panic(err)
	}

	swingStore := k.GetSwingStore(ctx)

	for _, entry := range swingStoreExportData {
		swingStore.Set([]byte(entry.Key), []byte(entry.Value))
	}

	snapshotHeight := uint64(ctx.BlockHeight())

	getExportDataReader := func() (agoric.KVEntryReader, error) {
		exportDataIterator := swingStore.Iterator(nil, nil)
		return agoric.NewKVIteratorReader(exportDataIterator), nil
	}

	err = swingStoreExportsHandler.RestoreExport(
		keeper.SwingStoreExportProvider{
			BlockHeight:         snapshotHeight,
			GetExportDataReader: getExportDataReader,
			ReadNextArtifact:    artifactProvider.ReadNextArtifact,
		},
		keeper.SwingStoreRestoreOptions{
			ArtifactMode:   keeper.SwingStoreArtifactModeOperational,
			ExportDataMode: keeper.SwingStoreExportDataModeAll,
		},
	)
	if err != nil {
		panic(err)
	}

	return false
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
		keeper.SwingStoreExportOptions{
			ArtifactMode:   keeper.SwingStoreArtifactModeOperational,
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
