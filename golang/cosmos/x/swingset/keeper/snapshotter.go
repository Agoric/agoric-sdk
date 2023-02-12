package keeper

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
	vstoragetypes "github.com/Agoric/agoric-sdk/golang/cosmos/x/vstorage/types"
	"github.com/cosmos/cosmos-sdk/baseapp"
	snapshots "github.com/cosmos/cosmos-sdk/snapshots/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/tendermint/tendermint/libs/log"
	tmproto "github.com/tendermint/tendermint/proto/tendermint/types"
)

var _ snapshots.ExtensionSnapshotter = &SwingsetSnapshotter{}

const SnapshotFormat = 1

type activeSnapshot struct {
	// The block height of the snapshot in progress
	height int64
	// The logger for this snapshot
	logger log.Logger
	// Use to synchronize the commit boundary
	startedResult chan error
	// Internal flag indicating whether the cosmos driven snapshot process completed
	retrieved bool
}

type SwingStoreExporter interface {
	ExportSwingStore(ctx sdk.Context) []*vstoragetypes.DataEntry
}

type SwingsetSnapshotter struct {
	app            *baseapp.BaseApp
	logger         log.Logger
	exporter       SwingStoreExporter
	blockingSend   func(action vm.Jsonable) (string, error)
	activeSnapshot *activeSnapshot
}

type snapshotAction struct {
	Type        string            `json:"type"` // COSMOS_SNAPSHOT
	BlockHeight int64             `json:"blockHeight"`
	Request     string            `json:"request"` // "initiate", "discard", "retrieve", or "restore"
	Args        []json.RawMessage `json:"args,omitempty"`
}

func NewSwingsetSnapshotter(app *baseapp.BaseApp, exporter SwingStoreExporter, sendToController func(bool, string) (string, error)) SwingsetSnapshotter {
	// The sendToController performed by this submodule are non-deterministic.
	// This submodule will send messages to JS from goroutines at unpredictable
	// times, but this is safe because when handling the messages, the JS side
	// does not perform operations affecting consensus and ignores state changes
	// since committing the previous block.
	// Since this submodule implements block level commit synchronization, the
	// processing and results are both insensitive to sub-block timing of messages.

	blockingSend := func(action vm.Jsonable) (string, error) {
		bz, err := json.Marshal(action)
		if err != nil {
			return "", err
		}
		return sendToController(true, string(bz))
	}

	return SwingsetSnapshotter{
		app:            app,
		logger:         app.Logger().With("module", fmt.Sprintf("x/%s", types.ModuleName), "submodule", "snapshotter"),
		exporter:       exporter,
		blockingSend:   blockingSend,
		activeSnapshot: nil,
	}
}

// InitiateSnapshot synchronously initiates a snapshot for the given height.
// If a snapshot is already in progress, or if no snapshot manager is configured,
// this will fail.
// The snapshot operation is performed in a goroutine, and synchronized with the
// main thread through the `WaitUntilSnapshotStarted` method.
func (snapshotter *SwingsetSnapshotter) InitiateSnapshot(height int64) error {
	if snapshotter.activeSnapshot != nil {
		return fmt.Errorf("snapshot already in progress for height %d", snapshotter.activeSnapshot.height)
	}

	if snapshotter.app.SnapshotManager() == nil {
		return fmt.Errorf("snapshot manager not configured")
	}

	logger := snapshotter.logger.With("height", height)

	// Indicate that a snapshot has been initiated by setting `activeSnapshot`.
	// This structure is used to synchronize with the goroutine spawned below.
	// It's nilled-out before exiting (and is the only code that does so).
	snapshotter.activeSnapshot = &activeSnapshot{
		height:        height,
		logger:        logger,
		startedResult: make(chan error, 1),
		retrieved:     false,
	}

	go func(startedResult chan error) {
		action := &snapshotAction{
			Type:        "COSMOS_SNAPSHOT",
			BlockHeight: snapshotter.activeSnapshot.height,
			Request:     "initiate",
		}

		// blockingSend for COSMOS_SNAPSHOT action is safe to call from a goroutine
		_, err := snapshotter.blockingSend(action)

		if err != nil {
			// First indicate a snapshot is no longer in progress if the call to
			// `WaitUntilSnapshotStarted` has't happened yet.
			snapshotter.activeSnapshot = nil
			// Then signal the current snapshot operation if a call to
			// `WaitUntilSnapshotStarted` was already waiting.
			startedResult <- err
			close(startedResult)
			logger.Error("failed to initiate swingset snapshot", "err", err)
			return
		}

		// Signal that the snapshot operation has started in the goroutine. Calls to
		// `WaitUntilSnapshotStarted` will no longer block.
		close(startedResult)

		snapshotter.app.Snapshot(height)

		// Check whether the cosmos Snapshot() method successfully handled our extension
		if snapshotter.activeSnapshot.retrieved {
			snapshotter.activeSnapshot = nil
			return
		}

		logger.Error("failed to make swingset snapshot")
		action = &snapshotAction{
			Type:        "COSMOS_SNAPSHOT",
			BlockHeight: snapshotter.activeSnapshot.height,
			Request:     "discard",
		}
		_, err = snapshotter.blockingSend(action)

		if err != nil {
			logger.Error("failed to discard of swingset snapshot", "err", err)
		}

		snapshotter.activeSnapshot = nil
	}(snapshotter.activeSnapshot.startedResult)

	return nil
}

// WaitUntilSnapshotStarted synchronizes with a snapshot in progress, if any.
// The JS SwingStore export must have started before a new block is committed.
// The app must call this method before sending a commit action to SwingSet.
//
// Waits for a just initiated snapshot to have started in its goroutine.
// If no snapshot is in progress (`InitiateSnapshot` hasn't been called or
// already completed), or if we previously checked if the snapshot had started,
// returns immediately.
func (snapshotter *SwingsetSnapshotter) WaitUntilSnapshotStarted() error {
	// First, copy the synchronization structure in case the snapshot operation
	// completes while we check its status
	activeSnapshot := snapshotter.activeSnapshot

	if activeSnapshot == nil {
		return nil
	}

	// The snapshot goroutine only produces a value in case of an error,
	// and closes the channel once the snapshot has started or failed.
	// Only the first call after a snapshot was initiated will report an error.
	return <-activeSnapshot.startedResult
}

// SnapshotName returns the name of snapshotter, it should be unique in the manager.
// Implements ExtensionSnapshotter
func (snapshotter *SwingsetSnapshotter) SnapshotName() string {
	return types.ModuleName
}

// SnapshotFormat returns the default format the extension snapshotter uses to encode the
// payloads when taking a snapshot.
// It's defined within the extension, different from the global format for the whole state-sync snapshot.
// Implements ExtensionSnapshotter
func (snapshotter *SwingsetSnapshotter) SnapshotFormat() uint32 {
	return SnapshotFormat
}

// SupportedFormats returns a list of formats it can restore from.
// Implements ExtensionSnapshotter
func (snapshotter *SwingsetSnapshotter) SupportedFormats() []uint32 {
	return []uint32{SnapshotFormat}
}

// SnapshotExtension writes extension payloads into the underlying protobuf stream.
// This operation is invoked by the snapshot manager in the goroutine started by
// `InitiateSnapshot`.
// Implements ExtensionSnapshotter
func (snapshotter *SwingsetSnapshotter) SnapshotExtension(height uint64, payloadWriter snapshots.ExtensionPayloadWriter) (err error) {
	defer func() {
		// Since the cosmos layers do a poor job of reporting errors, do our own reporting
		// `err` will be set correctly regardless if it was explicitly assigned or
		// a value was provided to a `return` statement.
		// See https://go.dev/blog/defer-panic-and-recover for details
		if err != nil {
			var logger log.Logger
			if snapshotter.activeSnapshot != nil {
				logger = snapshotter.activeSnapshot.logger
			} else {
				logger = snapshotter.logger
			}

			logger.Error("swingset snapshot extension failed", "err", err)
		}
	}()

	if snapshotter.activeSnapshot == nil {
		return errors.New("no active swingset snapshot")
	}

	if snapshotter.activeSnapshot.height != int64(height) {
		return fmt.Errorf("swingset snapshot requested for unexpected height %d (expected %d)", height, snapshotter.activeSnapshot.height)
	}

	action := &snapshotAction{
		Type:        "COSMOS_SNAPSHOT",
		BlockHeight: snapshotter.activeSnapshot.height,
		Request:     "retrieve",
	}
	out, err := snapshotter.blockingSend(action)

	if err != nil {
		return err
	}

	var exportDir string
	err = json.Unmarshal([]byte(out), &exportDir)
	if err != nil {
		return err
	}

	defer os.RemoveAll(exportDir)
	snapshotter.activeSnapshot.retrieved = true

	// FIXME: actually do something with the snapshot

	return errors.New("not implemented")
}

// RestoreExtension restores an extension state snapshot,
// the payload reader returns `io.EOF` when it reaches the extension boundaries.
// Implements ExtensionSnapshotter
func (snapshotter *SwingsetSnapshotter) RestoreExtension(height uint64, format uint32, payloadReader snapshots.ExtensionPayloadReader) error {
	if format != SnapshotFormat {
		return snapshots.ErrUnknownFormat
	}

	ctx := snapshotter.app.NewUncachedContext(false, tmproto.Header{Height: int64(height)})

	_ = snapshotter.exporter.ExportSwingStore(ctx)

	return errors.New("not implemented")
}
