package keeper

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"os"
	"path/filepath"
	"regexp"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
	vstoragetypes "github.com/Agoric/agoric-sdk/golang/cosmos/x/vstorage/types"
	"github.com/cosmos/cosmos-sdk/baseapp"
	snapshots "github.com/cosmos/cosmos-sdk/snapshots/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	"github.com/tendermint/tendermint/libs/log"
	tmproto "github.com/tendermint/tendermint/proto/tendermint/types"
)

// This module implements a Cosmos ExtensionSnapshotter to capture and restore
// state-sync Swingset state that is not part of the Cosmos DB.
// See docs/architecture/state-sync.md for a sequence diagram of how this
// module fits within the state-sync process.

var _ snapshots.ExtensionSnapshotter = &SwingsetSnapshotter{}

// SnapshotFormat 1 defines all extension payloads to be SwingStoreArtifact proto messages
const SnapshotFormat = 1

// exportManifest represents the content of the JS swing-store export manifest.
// The export is exchanged between Cosmos and JS using the file system, and only
// the directory containing the export is exchanged with a blockingSend. The
// manifest is a JSON file with the agreed upon file name of
// "export-manifest.json" in the export directory. It contains the file names
// for the "export data" (described in the godoc for exportDataFilename), and
// for the opaque artifacts of the export.
type exportManifest struct {
	// BlockHeight is the block height of the manifest.
	BlockHeight uint64 `json:"blockHeight,omitempty"`
	// Data is the filename of the export data.
	Data string `json:"data,omitempty"`
	// Artifacts is the list of [artifact name, file name] pairs.
	Artifacts [][2]string `json:"artifacts"`
}

// ExportManifestFilename is the manifest filename which must be synchronized with the JS export/import tooling
// See packages/cosmic-swingset/src/export-kernel-db.js and packages/cosmic-swingset/src/import-kernel-db.js
const ExportManifestFilename = "export-manifest.json"

// For restore operations, the swing-store "export data" is exchanged with the
// JS side as a file which encodes "export data" entries as a sequence of
// [key, value] JSON arrays each terminated by a new line.
// NB: this is not technically jsonlines since the entries are new line
// terminated instead of being new line separated, however the parsers in both
// JS and golang handle such extra whitespace.
const exportDataFilename = "export-data.jsonl"

// UntrustedExportDataArtifactName is a special artifact name to indicate the
// presence of a synthetic artifact containing untrusted "export data". This
// artifact must not end up in the list of artifacts imported by the JS import
// tooling (which would fail).
const UntrustedExportDataArtifactName = "UNTRUSTED-EXPORT-DATA"
const untrustedExportDataFilename = "untrusted-export-data.jsonl"

const exportedFilesMode = 0644

// swingStoreExportActionType is the action type used for all swing-store
// export blockingSend, and synchronized with the JS side in
// packages/internal/src/action-types.js
const swingStoreExportActionType = "SWING_STORE_EXPORT"

// initiateRequest is the request type for initiating an export
const initiateRequest = "initiate"

type swingStoreInitiateExportAction struct {
	Type        string `json:"type"`        // "SWING_STORE_EXPORT"
	Request     string `json:"request"`     // "initiate"
	BlockHeight uint64 `json:"blockHeight"` // expected blockHeight
}

// retrieveRequest is the request type for retrieving an initiated export
const retrieveRequest = "retrieve"

type swingStoreRetrieveExportAction struct {
	Type    string `json:"type"`    // "SWING_STORE_EXPORT"
	Request string `json:"request"` // "retrieve"
}
type swingStoreRetrieveResult = string

// discardRequest is the request type for discarding an initiated but an export
// that was not retrieved
const discardRequest = "discard"

type swingStoreDiscardExportAction struct {
	Type    string `json:"type"`    // "SWING_STORE_EXPORT"
	Request string `json:"request"` // "discard"
}

// restoreRequest is the request type for restoring an export
const restoreRequest = "restore"

type swingStoreRestoreExportAction struct {
	Type        string    `json:"type"`                  // "SWING_STORE_EXPORT"
	Request     string    `json:"request"`               // "restore"
	BlockHeight uint64    `json:"blockHeight,omitempty"` // empty if deferring blockHeight to the manifest
	Args        [1]string `json:"args"`                  // args[1] is the directory in which the export to restore from is located
}

var disallowedArtifactNameChar = regexp.MustCompile(`[^-_.a-zA-Z0-9]`)

// sanitizeArtifactName searches a string for all characters
// other than ASCII alphanumerics, hyphens, underscores, and dots,
// and replaces each of them with a hyphen.
func sanitizeArtifactName(name string) string {
	return disallowedArtifactNameChar.ReplaceAllString(name, "-")
}

type operationDetails struct {
	// isRestore indicates whether the operation in progress is a restore.
	// It is assigned at creation and never mutated.
	isRestore bool
	// blockHeight is the block height of this in-progress operation.
	// It is assigned at creation and never mutated.
	blockHeight uint64
	// logger is the destination for this operation's log messages.
	// It is assigned at creation and never mutated.
	logger log.Logger
	// exportStartedResult is used to synchronize the commit boundary by the
	// component performing the export operation to ensure export determinism.
	// unused for restore operations
	// It is assigned at creation and never mutated. The started goroutine
	// writes into the channel and closes it. The main goroutine reads from the
	// channel.
	exportStartedResult chan error
	// exportRetrieved is an internal flag indicating whether the JS generated
	// the "retrieve" blockingSend was performed or not, and used to control
	// whether to send a "discard" request if the JS side stayed responsible for
	// the generated but un-retrieved export.
	// It is only read or written by the export operation's goroutine.
	exportRetrieved bool
	// Internal plumbing of any error that happen during `SnapshotExtension`
	// Only read or written by the snapshot worker goroutine.
	retrieveError error
	// exportDone is a channel that is closed when the active export operation
	// is complete.
	// It is assigned at creation and never mutated. The started goroutine
	// writes into the channel and closes it. The main goroutine reads from the
	// channel.
	exportDone chan error
}

// activeOperation is a global variable reflecting a swing-store import or
// export in progress on the JS side.
// This variable is only assigned to through calls of the public methods of
// SwingsetSnapshotter, which rely on the exportDone channel getting
// closed to nil this variable.
// Only the calls to InitiateSnapshot and RestoreSnapshot set this to a non-nil
// value. The goroutine in which these calls occur is referred to as the
// "main goroutine". That goroutine may be different over time, but it's the
// caller's responsibility to ensure those goroutines do not overlap calls to
// the SwingsetSnapshotter public methods.
// See also the details of each field for the conditions under which they are
// accessed.
var activeOperation *operationDetails

// WaitUntilSwingStoreExportStarted synchronizes with an export operation in
// progress, if any.
// The JS swing-store export must have started before a new block is committed
// to ensure the content of the export is the one expected. The app must call
// this method before sending a commit action to the JS controller.
//
// Waits for a just initiated export operation to have started in its goroutine.
// If no operation is in progress (InitiateSnapshot hasn't been called or
// already completed), or if we previously checked if the operation had started,
// returns immediately.
//
// Must be called by the main goroutine
func WaitUntilSwingStoreExportStarted() error {
	operationDetails := activeOperation
	if operationDetails == nil {
		return nil
	}
	// Block until the active operation has started, saving the result.
	// The operation's goroutine only produces a value in case of an error,
	// and closes the channel once the export has started or failed.
	// Only the first call after an export was initiated will report an error.
	startErr := <-operationDetails.exportStartedResult

	// Check if the active export operation is done, and if so, nil it out so
	// future calls are faster.
	select {
	case <-operationDetails.exportDone:
		// If there was a start error, the channel is already closed at this point.
		activeOperation = nil
	default:
		// don't wait for it to finish
		// If there is no start error, the operation may take an arbitrary amount
		// of time to terminate, likely spanning multiple blocks. However this
		// function will only ever observe the expected activeOperation since the
		// internal checkNotActive() called immediately on InitiateSnapshot will
		// nil-out activeOperation if a stale value was sill sitting around.
	}

	return startErr
}

// WaitUntilSwingStoreExportDone synchronizes with the completion of an export
// operation in progress, if any.
// Only a single swing-store operation may execute at a time. Calling
// InitiateSnapshot or RestoreSnapshot will fail if a swing-store operation is
// already in progress. Furthermore, a component may need to know once an
// export it initiated has completed. Once this method call returns, the
// goroutine is guaranteed to have terminated.
//
// Reports any error that may have occurred from InitiateSnapshot.
// If no export operation is in progress (InitiateSnapshot hasn't been called or
// already completed), or if we previously checked if an export had completed,
// returns immediately.
//
// Must be called by the main goroutine
func WaitUntilSwingStoreExportDone() error {
	operationDetails := activeOperation
	if operationDetails == nil {
		return nil
	}
	// Block until the active export has completed.
	// The export operation's goroutine only produces a value in case of an error,
	// and closes the channel once the export has completed or failed.
	// Only the first call after an export was initiated will report an error.
	exportErr := <-operationDetails.exportDone
	activeOperation = nil

	return exportErr
}

// checkNotActive returns an error if there is an active operation.
//
// Always internally called by the main goroutine
func checkNotActive() error {
	operationDetails := activeOperation
	if operationDetails != nil {
		select {
		case <-operationDetails.exportDone:
			// nil-out any stale operation
			activeOperation = nil
		default:
			if operationDetails.isRestore {
				return fmt.Errorf("restore operation already in progress for height %d", operationDetails.blockHeight)
			} else {
				return fmt.Errorf("export operation already in progress for height %d", operationDetails.blockHeight)
			}
		}
	}
	return nil
}

type SwingsetSnapshotter struct {
	isConfigured            func() bool
	takeSnapshot            func(height int64)
	newRestoreContext       func(height int64) sdk.Context
	logger                  log.Logger
	getSwingStoreExportData func(ctx sdk.Context) []*vstoragetypes.DataEntry
	blockingSend            func(action vm.Jsonable, mustNotBeInited bool) (string, error)
}

// NewSwingsetSnapshotter creates a SwingsetSnapshotter which exclusively
// manages communication with the JS side for Swingset snapshots, ensuring
// insensitivity to sub-block timing, and enforcing concurrency requirements.
// The caller of this submodule must arrange block level commit synchronization,
// to ensure the results are deterministic.
//
// Some `blockingSend` calls performed by this submodule are non-deterministic.
// This submodule will send messages to JS from goroutines at unpredictable
// times, but this is safe because when handling the messages, the JS side
// does not perform operations affecting consensus and ignores state changes
// since committing the previous block.
// Some other `blockingSend` calls however do change the JS swing-store and
// must happen before the Swingset controller on the JS side was inited.
func NewSwingsetSnapshotter(
	app *baseapp.BaseApp,
	getSwingStoreExportData func(ctx sdk.Context) []*vstoragetypes.DataEntry,
	blockingSend func(action vm.Jsonable, mustNotBeInited bool) (string, error),
) SwingsetSnapshotter {
	return SwingsetSnapshotter{
		isConfigured: func() bool { return app.SnapshotManager() != nil },
		takeSnapshot: app.Snapshot,
		newRestoreContext: func(height int64) sdk.Context {
			return app.NewUncachedContext(false, tmproto.Header{Height: height})
		},
		logger:                  app.Logger().With("module", fmt.Sprintf("x/%s", types.ModuleName), "submodule", "snapshotter"),
		getSwingStoreExportData: getSwingStoreExportData,
		blockingSend:            blockingSend,
	}
}

// SnapshotName returns the name of the snapshotter, it should be unique in the manager.
// Implements ExtensionSnapshotter
func (snapshotter *SwingsetSnapshotter) SnapshotName() string {
	return types.ModuleName
}

// SnapshotFormat returns the extension specific format used to encode the
// extension payloads when creating a snapshot. It's independent of the format
// used for the overall state-sync snapshot.
// Implements ExtensionSnapshotter
func (snapshotter *SwingsetSnapshotter) SnapshotFormat() uint32 {
	return SnapshotFormat
}

// SupportedFormats returns a list of extension specific payload formats it can
// restore from.
// Implements ExtensionSnapshotter
func (snapshotter *SwingsetSnapshotter) SupportedFormats() []uint32 {
	return []uint32{SnapshotFormat}
}

// InitiateSnapshot initiates a snapshot for the given block height.
// If a snapshot is already in progress, or if no snapshot manager is
// configured, this will fail.
//
// The snapshot operation is performed in a goroutine.
// Use WaitUntilSwingStoreExportStarted to synchronize commit boundaries.
func (snapshotter *SwingsetSnapshotter) InitiateSnapshot(height int64) error {
	err := checkNotActive()
	if err != nil {
		return err
	}
	if height <= 0 {
		return fmt.Errorf("block height must not be negative or 0")
	}

	blockHeight := uint64(height)

	if !snapshotter.isConfigured() {
		return fmt.Errorf("snapshot manager not configured")
	}

	logger := snapshotter.logger.With("height", blockHeight)

	// Indicate that an export operation has been initiated by setting the global
	// activeOperation var.
	// This structure is used to synchronize with the goroutine spawned below.
	operationDetails := &operationDetails{
		blockHeight:         blockHeight,
		logger:              logger,
		exportStartedResult: make(chan error, 1),
		exportRetrieved:     false,
		exportDone:          make(chan error, 1),
	}
	activeOperation = operationDetails

	go func() {
		var err error
		var startedErr error
		defer func() {
			if err == nil {
				err = startedErr
			}
			if err != nil {
				operationDetails.exportDone <- err
			}
			// First, indicate an export is no longer in progress. This ensures that
			// for an operation with a start error, a call to WaitUntilSwingStoreExportStarted
			// waiting on exportStartedResult will always find the operation has
			// completed, and clear the active operation instead of racing if the
			// channel close order was reversed.
			close(operationDetails.exportDone)
			// Then signal the current export operation that it failed to start,
			// which will be reported to a waiting WaitUntilSwingStoreExportStarted,
			// or the next call otherwise.
			if startedErr != nil {
				operationDetails.exportStartedResult <- startedErr
				close(operationDetails.exportStartedResult)
			}
		}()

		initiateAction := &swingStoreInitiateExportAction{
			Type:        swingStoreExportActionType,
			BlockHeight: blockHeight,
			Request:     initiateRequest,
		}

		// blockingSend for SWING_STORE_EXPORT action is safe to call from a goroutine
		_, startedErr = snapshotter.blockingSend(initiateAction, false)

		if startedErr != nil {
			logger.Error("failed to initiate swing-store export", "err", startedErr)
			// The deferred function will communicate the error and close channels
			// in the appropriate order.
			return
		}

		// Signal that the export operation has started successfully in the goroutine.
		// Calls to WaitUntilSwingStoreExportStarted will no longer block.
		close(operationDetails.exportStartedResult)

		// In production this should indirectly call SnapshotExtension().
		snapshotter.takeSnapshot(height)

		// Restore any retrieve error swallowed by `takeSnapshot`
		err = activeOperation.retrieveError
		if err != nil {
			logger.Error("failed to process swing-store export", "err", err)
		}

		// Check whether the JS generated export was retrieved by SnapshotExtension
		if operationDetails.exportRetrieved {
			return
		}

		discardAction := &swingStoreDiscardExportAction{
			Type:    swingStoreExportActionType,
			Request: discardRequest,
		}
		_, discardErr := snapshotter.blockingSend(discardAction, false)

		if discardErr != nil {
			logger.Error("failed to discard swing-store export", "err", err)
		}

		if err == nil {
			err = discardErr
		} else if discardErr != nil {
			// Safe to wrap error and use detailed error info since this error
			// will not go back into swingset layers
			err = sdkerrors.Wrapf(err, "failed to discard swing-store export after failing to process export: %+v", discardErr)
		}
	}()

	return nil
}

// SnapshotExtension is the method invoked by cosmos to write extension payloads
// into the underlying protobuf stream of the state-sync snapshot.
// This method is invoked by the cosmos snapshot manager in a goroutine it
// started during the call to takeAppSnapshot. However the snapshot manager
// fully synchronizes its goroutine with the goroutine started by this
// SwingsetSnapshotter.
//
// Implements ExtensionSnapshotter
func (snapshotter *SwingsetSnapshotter) SnapshotExtension(blockHeight uint64, payloadWriter snapshots.ExtensionPayloadWriter) (err error) {
	defer func() {
		// Since the cosmos layers do a poor job of reporting errors, do our own reporting
		// `err` will be set correctly regardless if it was explicitly assigned or
		// a value was provided to a `return` statement.
		// See https://go.dev/blog/defer-panic-and-recover for details
		if err != nil {
			operationDetails := activeOperation
			if operationDetails != nil {
				operationDetails.retrieveError = err
			} else {
				snapshotter.logger.Error("swingset snapshot extension failed", "err", err)
			}
		}
	}()

	operationDetails := activeOperation
	if operationDetails == nil {
		// shouldn't happen, but return an error if it does
		return errors.New("no active swing-store export operation")
	}

	if operationDetails.blockHeight != blockHeight {
		return fmt.Errorf("swingset extension snapshot requested for unexpected height %d (expected %d)", blockHeight, operationDetails.blockHeight)
	}

	action := &swingStoreRetrieveExportAction{
		Type:    swingStoreExportActionType,
		Request: retrieveRequest,
	}
	out, err := snapshotter.blockingSend(action, false)

	if err != nil {
		return err
	}
	operationDetails.exportRetrieved = true

	var exportDir swingStoreRetrieveResult
	err = json.Unmarshal([]byte(out), &exportDir)
	if err != nil {
		return err
	}

	defer os.RemoveAll(exportDir)

	rawManifest, err := os.ReadFile(filepath.Join(exportDir, ExportManifestFilename))
	if err != nil {
		return err
	}

	var manifest exportManifest
	err = json.Unmarshal(rawManifest, &manifest)
	if err != nil {
		return err
	}

	if manifest.BlockHeight != blockHeight {
		return fmt.Errorf("export manifest blockHeight (%d) doesn't match (%d)", manifest.BlockHeight, blockHeight)
	}

	writeFileToPayload := func(fileName string, artifactName string) error {
		artifact := types.SwingStoreArtifact{Name: artifactName}

		artifact.Data, err = os.ReadFile(filepath.Join(exportDir, fileName))
		if err != nil {
			return err
		}

		payloadBytes, err := artifact.Marshal()
		if err != nil {
			return err
		}

		err = payloadWriter(payloadBytes)
		if err != nil {
			return err
		}

		return nil
	}

	for _, artifactInfo := range manifest.Artifacts {
		artifactName := artifactInfo[0]
		fileName := artifactInfo[1]
		if artifactName == UntrustedExportDataArtifactName {
			return fmt.Errorf("unexpected artifact name %s", artifactName)
		}
		err = writeFileToPayload(fileName, artifactName)
		if err != nil {
			return err
		}
	}

	if manifest.Data != "" {
		err = writeFileToPayload(manifest.Data, UntrustedExportDataArtifactName)
		if err != nil {
			return err
		}
	}

	operationDetails.logger.Info("retrieved swing-store export", "exportDir", exportDir)

	return nil
}

// RestoreExtension restores an extension state snapshot,
// the payload reader returns io.EOF when it reaches the extension boundaries.
// Implements ExtensionSnapshotter
func (snapshotter *SwingsetSnapshotter) RestoreExtension(blockHeight uint64, format uint32, payloadReader snapshots.ExtensionPayloadReader) error {
	if format != SnapshotFormat {
		return snapshots.ErrUnknownFormat
	}

	if blockHeight > math.MaxInt64 {
		return fmt.Errorf("snapshot block height %d is higher than max int64", blockHeight)
	}
	height := int64(blockHeight)

	err := checkNotActive()
	if err != nil {
		return err
	}

	// We technically don't need to create an active snapshot here since both
	// `InitiateSnapshot` and `RestoreExtension` should only be called from the
	// main thread, but it doesn't cost much to add in case things go wrong.
	operationDetails := &operationDetails{
		isRestore:   true,
		blockHeight: blockHeight,
		logger:      snapshotter.logger,
		// goroutine synchronization is unnecessary since anything checking should
		// be called from the same goroutine.
		// Effectively WaitUntilSwingStoreExportStarted would block infinitely and
		// exportsHandler.InitiateExport will error when calling checkNotActive.
		exportStartedResult: nil,
		exportDone:          nil,
	}
	activeOperation = operationDetails
	defer func() {
		activeOperation = nil
	}()

	exportDir, err := os.MkdirTemp("", fmt.Sprintf("agd-state-sync-restore-%d-*", blockHeight))
	if err != nil {
		return err
	}
	defer os.RemoveAll(exportDir)

	manifest := exportManifest{
		BlockHeight: blockHeight,
	}

	// Retrieve the SwingStore "ExportData" from the verified vstorage data.
	// At this point the content of the cosmos DB has been verified against the
	// AppHash, which means the SwingStore data it contains can be used as the
	// trusted root against which to validate the artifacts.
	ctx := snapshotter.newRestoreContext(height)
	exportDataEntries := snapshotter.getSwingStoreExportData(ctx)

	if len(exportDataEntries) > 0 {
		manifest.Data = exportDataFilename
		exportDataFile, err := os.OpenFile(filepath.Join(exportDir, exportDataFilename), os.O_CREATE|os.O_WRONLY, exportedFilesMode)
		if err != nil {
			return err
		}
		defer exportDataFile.Close()

		encoder := json.NewEncoder(exportDataFile)
		encoder.SetEscapeHTML(false)
		for _, dataEntry := range exportDataEntries {
			entry := []string{dataEntry.Path, dataEntry.Value}
			err := encoder.Encode(entry)
			if err != nil {
				return err
			}
		}

		err = exportDataFile.Sync()
		if err != nil {
			return err
		}
	}

	writeExportFile := func(filename string, data []byte) error {
		return os.WriteFile(filepath.Join(exportDir, filename), data, exportedFilesMode)
	}

	for {
		payloadBytes, err := payloadReader()
		if err == io.EOF {
			break
		} else if err != nil {
			return err
		}

		artifact := types.SwingStoreArtifact{}
		if err = artifact.Unmarshal(payloadBytes); err != nil {
			return err
		}

		if artifact.Name != UntrustedExportDataArtifactName {
			// An artifact is only verifiable by the JS swing-store import using the
			// information contained in the "export data".
			// Since we cannot trust the source of the artifact at this point,
			// including that the artifact's name is genuine, we generate a safe and
			// unique filename from the artifact's name we received, by substituting
			// any non letters-digits-hyphen-underscore-dot by a hyphen, and
			// prefixing with an incremented id.
			// The filename is not used for any purpose in the import logic.
			filename := sanitizeArtifactName(artifact.Name)
			filename = fmt.Sprintf("%d-%s", len(manifest.Artifacts), filename)
			manifest.Artifacts = append(manifest.Artifacts, [2]string{artifact.Name, filename})
			err = writeExportFile(filename, artifact.Data)
		} else {
			// Pseudo artifact containing untrusted export data which may have been
			// saved separately for debugging purposes (not referenced from the manifest)
			err = writeExportFile(untrustedExportDataFilename, artifact.Data)
		}
		if err != nil {
			return err
		}
	}

	manifestBytes, err := json.MarshalIndent(manifest, "", "  ")
	if err != nil {
		return err
	}
	err = writeExportFile(ExportManifestFilename, manifestBytes)
	if err != nil {
		return err
	}

	action := &swingStoreRestoreExportAction{
		Type:        swingStoreExportActionType,
		BlockHeight: blockHeight,
		Request:     restoreRequest,
		Args:        [1]string{exportDir},
	}

	_, err = snapshotter.blockingSend(action, true)
	if err != nil {
		return err
	}

	snapshotter.logger.Info("restored snapshot", "exportDir", exportDir, "height", blockHeight)

	return nil
}
