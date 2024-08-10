package swingset

import (
	// "os"
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"hash"
	"strings"

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
	if len(swingStoreExportData) == 0 && data.SwingStoreExportDataHash == "" {
		return true
	} else if data.SwingStoreExportDataHash != "" && len(swingStoreExportData) > 0 {
		panic("Swingset genesis state cannot have both export data and hash of export data")
	}

	artifactProvider, err := keeper.OpenSwingStoreExportDirectory(swingStoreExportDir)
	if err != nil {
		panic(err)
	}

	swingStore := k.GetSwingStore(ctx)

	snapshotHeight := uint64(ctx.BlockHeight())

	var getExportDataReader func() (agoric.KVEntryReader, error)

	if len(swingStoreExportData) > 0 {
		for _, entry := range swingStoreExportData {
			swingStore.Set([]byte(entry.Key), []byte(entry.Value))
		}
		getExportDataReader = func() (agoric.KVEntryReader, error) {
			exportDataIterator := swingStore.Iterator(nil, nil)
			return agoric.NewKVIteratorReader(exportDataIterator), nil
		}
	} else {
		hashParts := strings.SplitN(data.SwingStoreExportDataHash, ":", 2)
		if len(hashParts) != 2 {
			panic(fmt.Errorf("invalid swing-store export data hash %s", data.SwingStoreExportDataHash))
		}
		if hashParts[0] != "sha256" {
			panic(fmt.Errorf("invalid swing-store export data hash algorithm %s, expected sha256", hashParts[0]))
		}
		sha256Hash, err := hex.DecodeString(hashParts[1])
		if err != nil {
			panic(err)
		}
		getExportDataReader = func() (agoric.KVEntryReader, error) {
			kvReader, err := artifactProvider.GetExportDataReader()
			if err != nil {
				return nil, err
			}

			if kvReader == nil {
				return nil, fmt.Errorf("swing-store export has no export data")
			}

			hasher := sha256.New()
			encoder := json.NewEncoder(hasher)
			encoder.SetEscapeHTML(false)

			return agoric.NewKVHookingReader(kvReader, func(entry agoric.KVEntry) error {
				key := []byte(entry.Key())

				if !entry.HasValue() {
					swingStore.Delete(key)
				} else {
					swingStore.Set(key, []byte(entry.StringValue()))
				}

				return encoder.Encode(entry)
			}, func() error {
				sum := hasher.Sum(nil)
				if !bytes.Equal(sum, sha256Hash) {
					return fmt.Errorf("swing-store data sha256sum didn't match. expected %x, got %x", sha256Hash, sum)
				}
				return nil
			}), nil
		}
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
		SwingStoreExportData: nil,
	}

	snapshotHeight := uint64(ctx.BlockHeight())

	eventHandler := swingStoreGenesisEventHandler{exportDir: swingStoreExportDir, snapshotHeight: snapshotHeight, swingStore: k.GetSwingStore(ctx), hasher: sha256.New()}

	err := swingStoreExportsHandler.InitiateExport(
		// The export will fail if the export of a historical height was requested
		snapshotHeight,
		eventHandler,
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

	gs.SwingStoreExportDataHash = fmt.Sprintf("sha256:%x", eventHandler.hasher.Sum(nil))

	return gs
}

type swingStoreGenesisEventHandler struct {
	exportDir      string
	snapshotHeight uint64
	swingStore     sdk.KVStore
	hasher         hash.Hash
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
			exportDataIterator := eventHandler.swingStore.Iterator(nil, nil)
			kvReader := agoric.NewKVIteratorReader(exportDataIterator)
			eventHandler.hasher.Reset()
			encoder := json.NewEncoder(eventHandler.hasher)
			encoder.SetEscapeHTML(false)

			return agoric.NewKVHookingReader(kvReader, func(entry agoric.KVEntry) error {
				return encoder.Encode(entry)
			}, func() error {
				return nil
			}), nil
		},
		ReadNextArtifact: provider.ReadNextArtifact,
	}

	return keeper.WriteSwingStoreExportToDirectory(artifactsProvider, eventHandler.exportDir)
}
