package keeper

import (
	"io"
	"testing"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/tendermint/tendermint/libs/log"
)

func newTestExtensionSnapshotter() ExtensionSnapshotter {
	logger := log.NewNopLogger() // log.NewTMLogger(log.NewSyncWriter( /* os.Stdout*/ io.Discard)).With("module", "sdk/app")
	return ExtensionSnapshotter{
		isConfigured:             func() bool { return true },
		newRestoreContext:        func(height int64) sdk.Context { return sdk.Context{} },
		logger:                   logger,
		swingStoreExportsHandler: newTestSwingStoreSnapshotter(),
	}
}

func TestExtensionSnapshotterInProgress(t *testing.T) {
	swingsetSnapshotter := newTestExtensionSnapshotter()
	ch := make(chan struct{})
	swingsetSnapshotter.takeAppSnapshot = func(height int64) {
		<-ch
	}
	err := swingsetSnapshotter.InitiateSnapshot(123)
	if err != nil {
		t.Fatal(err)
	}
	err = WaitUntilSwingStoreExportStarted()
	if err != nil {
		t.Fatal(err)
	}

	err = swingsetSnapshotter.InitiateSnapshot(456)
	if err == nil {
		t.Error("wanted error for snapshot in progress")
	}

	err = swingsetSnapshotter.RestoreExtension(
		456, SnapshotFormat,
		func() ([]byte, error) {
			return nil, io.EOF
		})
	if err == nil {
		t.Error("wanted error for snapshot in progress")
	}

	close(ch)
	err = WaitUntilSwingStoreExportDone()
	if err != nil {
		t.Fatal(err)
	}

	err = swingsetSnapshotter.InitiateSnapshot(456)
	if err != nil {
		t.Fatal(err)
	}
}

func TestExtensionSnapshotterNotConfigured(t *testing.T) {
	swingsetSnapshotter := newTestExtensionSnapshotter()
	swingsetSnapshotter.isConfigured = func() bool { return false }
	err := swingsetSnapshotter.InitiateSnapshot(123)
	if err == nil {
		t.Error("wanted error for unconfigured snapshot manager")
	}
}

func TestExtensionSnapshotterSecondCommit(t *testing.T) {
	swingsetSnapshotter := newTestExtensionSnapshotter()

	// Use a channel to block the snapshot goroutine after it has started but before it exits.
	ch := make(chan struct{})
	swingsetSnapshotter.takeAppSnapshot = func(height int64) {
		<-ch
	}

	// First run through app.Commit()
	err := WaitUntilSwingStoreExportStarted()
	if err != nil {
		t.Fatal(err)
	}
	err = swingsetSnapshotter.InitiateSnapshot(123)
	if err != nil {
		t.Fatal(err)
	}

	// Second run through app.Commit() - should return right away
	err = WaitUntilSwingStoreExportStarted()
	if err != nil {
		t.Fatal(err)
	}

	// close the signaling channel to let goroutine exit
	close(ch)
	err = WaitUntilSwingStoreExportDone()
	if err != nil {
		t.Fatal(err)
	}
}
