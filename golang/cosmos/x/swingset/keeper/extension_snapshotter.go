package keeper

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
	vstoragetypes "github.com/Agoric/agoric-sdk/golang/cosmos/x/vstorage/types"
	"github.com/cosmos/cosmos-sdk/baseapp"
	snapshots "github.com/cosmos/cosmos-sdk/snapshots/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/tendermint/tendermint/libs/log"
	tmproto "github.com/tendermint/tendermint/proto/tendermint/types"
)

var _ snapshots.ExtensionSnapshotter = &ExtensionSnapshotter{}

// SnapshotFormat 1 defines all extension payloads to be SwingStoreArtifact proto messages
const SnapshotFormat = 1

// snapshotDetails describes an in-progress state-sync snapshot
type snapshotDetails struct {
	// blockHeight is the block height of this in-progress snapshot.
	blockHeight uint64
	// logger is the destination for this snapshot's log messages.
	logger log.Logger
	// retrieveExport is the callback provided by the SwingStoreExportsHandler to
	// retrieve the SwingStore's export provider which allows to read the export's
	// artifacts used to populate this state-sync extension's payloads.
	retrieveExport func() error
	// payloadWriter is the callback provided by the state-sync snapshot manager
	// to write the extension's payloads into the under-construction snapshot
	// stream. It may be called multiple times, and often is (currently once per
	// SwingStore export artifact).
	payloadWriter snapshots.ExtensionPayloadWriter
}

// ExtensionSnapshotter is the cosmos state-sync extension snapshotter for the
// x/swingset module.
// It handles the Swingset state that is not part of the Cosmos DB. Currently
// that state is solely composed of the SwingStore artifacts, as a copy of the
// SwingStore "export data" is streamed into the cosmos DB during execution.
// When performing a snapshot, the extension leverages the SwingStoreExportsHandler
// to retrieve the needed SwingStore artifacts. When restoring a snapshot,
// the extension combines the artifacts from the state-sync snapshot with the
// SwingStore "export data" from the already restored cosmos DB, to produce a
// full SwingStore export that can be imported to create a new JS swing-store DB.
//
// The SwingStoreExportsHandler also helps with the synchronization needed to
// generate consistent exports, even while other SwingSet activities are performed
// during the next block. However this relies on the application calling
// WaitUntilSwingStoreExportStarted before instructing swingset to commit a new
// block.
type ExtensionSnapshotter struct {
	isConfigured                      func() bool
	takeAppSnapshot                   func(height int64)
	newRestoreContext                 func(height int64) sdk.Context
	swingStoreExportsHandler          *SwingStoreExportsHandler
	getSwingStoreExportDataShadowCopy func(ctx sdk.Context) []*vstoragetypes.DataEntry
	logger                            log.Logger
	activeSnapshot                    *snapshotDetails
}

// NewExtensionSnapshotter creates a new swingset ExtensionSnapshotter
func NewExtensionSnapshotter(app *baseapp.BaseApp, swingStoreExportsHandler *SwingStoreExportsHandler, getSwingStoreExportDataShadowCopy func(ctx sdk.Context) []*vstoragetypes.DataEntry) *ExtensionSnapshotter {
	return &ExtensionSnapshotter{
		isConfigured:    func() bool { return app.SnapshotManager() != nil },
		takeAppSnapshot: app.Snapshot,
		newRestoreContext: func(height int64) sdk.Context {
			return app.NewUncachedContext(false, tmproto.Header{Height: height})
		},
		logger:                            app.Logger().With("module", fmt.Sprintf("x/%s", types.ModuleName), "submodule", "extension snapshotter"),
		swingStoreExportsHandler:          swingStoreExportsHandler,
		getSwingStoreExportDataShadowCopy: getSwingStoreExportDataShadowCopy,
		activeSnapshot:                    nil,
	}
}

// SnapshotName returns the name of the snapshotter, it should be unique in the manager.
// Implements ExtensionSnapshotter
func (snapshotter *ExtensionSnapshotter) SnapshotName() string {
	return types.ModuleName
}

// SnapshotFormat returns the default format the extension snapshotter uses to encode the
// payloads when taking a snapshot.
// It's defined within the extension, different from the global format for the whole state-sync snapshot.
// Implements ExtensionSnapshotter
func (snapshotter *ExtensionSnapshotter) SnapshotFormat() uint32 {
	return SnapshotFormat
}

// SupportedFormats returns a list of formats it can restore from.
// Implements ExtensionSnapshotter
func (snapshotter *ExtensionSnapshotter) SupportedFormats() []uint32 {
	return []uint32{SnapshotFormat}
}

// InitiateSnapshot initiates a snapshot for the given block height.
// If a snapshot is already in progress, or if no snapshot manager is
// configured, this will fail.
// The snapshot operation is performed in a goroutine managed by the
// SwingStoreExportsHandler. Use WaitUntilSwingStoreExportStarted to
// synchronize commit boundaries.
func (snapshotter *ExtensionSnapshotter) InitiateSnapshot(height int64) error {
	if !snapshotter.isConfigured() {
		return fmt.Errorf("snapshot manager not configured")
	}
	if height <= 0 {
		return fmt.Errorf("block height must not be negative or 0")
	}

	blockHeight := uint64(height)

	return snapshotter.swingStoreExportsHandler.InitiateExport(blockHeight, snapshotter, SwingStoreExportOptions{
		ExportMode:        "current",
		IncludeExportData: false,
	})
}

// ExportInitiated performs the actual cosmos state-sync app snapshot.
// The cosmos implementation will ultimately call SnapshotExtension, which can
// retrieve and process the SwingStore artifacts.
// This method is invoked by the SwingStoreExportsHandler in a goroutine
// started by InitiateExport, only if no other SwingStore export operation is
// already in progress.
//
// Implements SwingStoreExportEventHandler
func (snapshotter *ExtensionSnapshotter) ExportInitiated(blockHeight uint64, retrieveExport func() error) error {
	logger := snapshotter.logger.With("height", blockHeight)

	if blockHeight > math.MaxInt64 {
		return fmt.Errorf("snapshot block height %d is higher than max int64", blockHeight)
	}
	height := int64(blockHeight)

	// We assume SwingStoreSnapshotter correctly guarded against concurrent snapshots
	snapshotDetails := snapshotDetails{
		blockHeight:    blockHeight,
		logger:         logger,
		retrieveExport: retrieveExport,
	}
	snapshotter.activeSnapshot = &snapshotDetails

	snapshotter.takeAppSnapshot(height)

	snapshotter.activeSnapshot = nil

	// Unfortunately Cosmos BaseApp.Snapshot() does not report its errors.
	return nil
}

// SnapshotExtension writes extension payloads into the underlying protobuf stream.
// This operation is invoked by the snapshot manager in the goroutine started by
// the SwingStoreSnapshotter, during the call to ExportInitiated, and delegates
// actually writing extension payloads to ExportRetrieved.
// Implements ExtensionSnapshotter
func (snapshotter *ExtensionSnapshotter) SnapshotExtension(blockHeight uint64, payloadWriter snapshots.ExtensionPayloadWriter) error {
	logError := func(err error) error {
		// The cosmos layers do a poor job of reporting errors, however
		// SwingStoreExportsHandler arranges to report retrieve errors swallowed by
		// takeAppSnapshot, so we manually report unexpected errors.
		snapshotter.logger.Error("swingset snapshot extension failed", "err", err)
		return err
	}

	snapshotDetails := snapshotter.activeSnapshot
	if snapshotDetails == nil {
		// shouldn't happen, but return an error if it does
		return logError(errors.New("no active swingset snapshot"))
	}

	if snapshotDetails.blockHeight != blockHeight {
		return logError(fmt.Errorf("swingset extension snapshot requested for unexpected height %d (expected %d)", blockHeight, snapshotDetails.blockHeight))
	}

	snapshotDetails.payloadWriter = payloadWriter

	return snapshotDetails.retrieveExport()
}

// ExportRetrieved handles the SwingStore export retrieved by the SwingStoreExportsHandler
// and writes it out to the SnapshotExtension's payloadWriter.
// This operation is invoked by the SwingStoreExportsHandler nested in the
// goroutine started by InitiateExport.
//
// Implements SwingStoreExportEventHandler
func (snapshotter *ExtensionSnapshotter) ExportRetrieved(provider SwingStoreExportProvider) error {
	snapshotDetails := snapshotter.activeSnapshot
	if snapshotDetails == nil || snapshotDetails.payloadWriter == nil {
		// shouldn't happen, but return an error if it does
		return errors.New("no active swingset snapshot")
	}

	if snapshotDetails.blockHeight != provider.BlockHeight {
		return fmt.Errorf("SwingStore export received for unexpected block height %d (app snapshot height is %d)", provider.BlockHeight, snapshotDetails.blockHeight)
	}

	writeArtifactToPayload := func(artifact types.SwingStoreArtifact) error {
		payloadBytes, err := artifact.Marshal()
		if err != nil {
			return err
		}

		err = snapshotDetails.payloadWriter(payloadBytes)
		if err != nil {
			return err
		}

		return nil
	}

	for {
		artifact, err := provider.ReadArtifact()
		if err == io.EOF {
			break
		} else if err != nil {
			return err
		}

		err = writeArtifactToPayload(artifact)
		if err != nil {
			return err
		}
	}

	swingStoreExportDataEntries, err := provider.GetExportData()
	if err == io.EOF {
		return nil
	} else if err != nil {
		return err
	}

	// For debugging, write out any retrieved export data as a single untrusted artifact
	// which has the same encoding as the internal SwingStore export data representation:
	// a sequence of [key, value] JSON arrays each terminated by a new line.
	exportDataArtifact := types.SwingStoreArtifact{Name: UntrustedExportDataArtifactName}

	var encodedExportData bytes.Buffer
	encoder := json.NewEncoder(&encodedExportData)
	encoder.SetEscapeHTML(false)
	for _, dataEntry := range swingStoreExportDataEntries {
		entry := []string{dataEntry.Path, dataEntry.Value}
		err := encoder.Encode(entry)
		if err != nil {
			return err
		}
	}
	exportDataArtifact.Data = encodedExportData.Bytes()

	err = writeArtifactToPayload(exportDataArtifact)
	encodedExportData.Reset()
	if err != nil {
		return err
	}
	return nil
}

// RestoreExtension restores an extension state snapshot,
// the payload reader returns io.EOF when it reaches the extension boundaries.
// Implements ExtensionSnapshotter
func (snapshotter *ExtensionSnapshotter) RestoreExtension(blockHeight uint64, format uint32, payloadReader snapshots.ExtensionPayloadReader) error {
	if format != SnapshotFormat {
		return snapshots.ErrUnknownFormat
	}

	if blockHeight > math.MaxInt64 {
		return fmt.Errorf("snapshot block height %d is higher than max int64", blockHeight)
	}
	height := int64(blockHeight)

	// Retrieve the SwingStore "ExportData" from the verified vstorage data.
	// At this point the content of the cosmos DB has been verified against the
	// AppHash, which means the SwingStore data it contains can be used as the
	// trusted root against which to validate the artifacts.
	getExportData := func() ([]*vstoragetypes.DataEntry, error) {
		ctx := snapshotter.newRestoreContext(height)
		exportData := snapshotter.getSwingStoreExportDataShadowCopy(ctx)
		return exportData, nil
	}

	readArtifact := func() (artifact types.SwingStoreArtifact, err error) {
		payloadBytes, err := payloadReader()
		if err != nil {
			return artifact, err
		}

		err = artifact.Unmarshal(payloadBytes)
		return artifact, err
	}

	return snapshotter.swingStoreExportsHandler.RestoreExport(
		SwingStoreExportProvider{BlockHeight: blockHeight, GetExportData: getExportData, ReadArtifact: readArtifact},
		SwingStoreRestoreOptions{IncludeHistorical: false},
	)
}
