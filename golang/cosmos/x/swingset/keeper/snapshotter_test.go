package keeper

import (
	"errors"
	"io"
	"testing"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/tendermint/tendermint/libs/log"
)

func newTestSnapshotter() SwingsetSnapshotter {
	logger := log.NewNopLogger() // log.NewTMLogger(log.NewSyncWriter( /* os.Stdout*/ io.Discard)).With("module", "sdk/app")
	return SwingsetSnapshotter{
		isConfigured:      func() bool { return true },
		takeSnapshot:      func(height int64) {},
		newRestoreContext: func(height int64) sdk.Context { return sdk.Context{} },
		logger:            logger,
		blockingSend:      func(action vm.Jsonable, mustNotBeInited bool) (string, error) { return "", nil },
	}
}

func TestSnapshotInProgress(t *testing.T) {
	swingsetSnapshotter := newTestSnapshotter()
	ch := make(chan struct{})
	swingsetSnapshotter.takeSnapshot = func(height int64) {
		<-ch
	}
	err := swingsetSnapshotter.InitiateSnapshot(123)
	if err != nil {
		t.Fatal(err)
	}
	err = swingsetSnapshotter.WaitUntilSnapshotStarted()
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
	<-swingsetSnapshotter.activeSnapshot.done
	err = swingsetSnapshotter.InitiateSnapshot(456)
	if err != nil {
		t.Fatal(err)
	}
}

func TestNotConfigured(t *testing.T) {
	swingsetSnapshotter := newTestSnapshotter()
	swingsetSnapshotter.isConfigured = func() bool { return false }
	err := swingsetSnapshotter.InitiateSnapshot(123)
	if err == nil {
		t.Error("wanted error for unconfigured snapshot manager")
	}
}

func TestSecondCommit(t *testing.T) {
	swingsetSnapshotter := newTestSnapshotter()

	// Use a channel to block the snapshot goroutine after it has started but before it exits.
	ch := make(chan struct{})
	swingsetSnapshotter.takeSnapshot = func(height int64) {
		<-ch
	}

	// First run through app.Commit()
	err := swingsetSnapshotter.WaitUntilSnapshotStarted()
	if err != nil {
		t.Fatal(err)
	}
	err = swingsetSnapshotter.InitiateSnapshot(123)
	if err != nil {
		t.Fatal(err)
	}

	// Second run through app.Commit() - should return right away
	err = swingsetSnapshotter.WaitUntilSnapshotStarted()
	if err != nil {
		t.Fatal(err)
	}

	// close the signaling channel to let goroutine exit
	close(ch)
	<-swingsetSnapshotter.activeSnapshot.done
}

func TestInitiateFails(t *testing.T) {
	swingsetSnapshotter := newTestSnapshotter()
	swingsetSnapshotter.blockingSend = func(action vm.Jsonable, mustNotBeInited bool) (string, error) {
		if action.(*snapshotAction).Request == "initiate" {
			return "", errors.New("initiate failed")
		}
		return "", nil
	}

	err := swingsetSnapshotter.InitiateSnapshot(123)
	if err != nil {
		t.Fatal(err)
	}
	err = swingsetSnapshotter.WaitUntilSnapshotStarted()
	if err == nil {
		t.Fatal("wanted initiation error")
	}
	if err.Error() != "initiate failed" {
		t.Errorf(`wanted error "initiate failed", got "%s"`, err.Error())
	}
	// another wait should succeed without error
	err = swingsetSnapshotter.WaitUntilSnapshotStarted()
	if err != nil {
		t.Error(err)
	}
}

func TestRetrievalFails(t *testing.T) {
	swingsetSnapshotter := newTestSnapshotter()
	swingsetSnapshotter.blockingSend = func(action vm.Jsonable, mustNotBeInited bool) (string, error) {
		if action.(*snapshotAction).Request == "retrieve" {
			return "", errors.New("retrieve failed")
		}
		return "", nil
	}
	nilWriter := func(_ []byte) error { return nil }
	var savedErr error
	ch := make(chan struct{})
	swingsetSnapshotter.takeSnapshot = func(height int64) {
		// shortcut to the snapshot manager calling the extension
		savedErr = swingsetSnapshotter.SnapshotExtension(uint64(height), nilWriter)
		<-ch
	}

	err := swingsetSnapshotter.InitiateSnapshot(123)
	if err != nil {
		t.Fatal(err)
	}
	err = swingsetSnapshotter.WaitUntilSnapshotStarted()
	if err != nil {
		t.Fatal(err)
	}

	close(ch)
	if savedErr == nil {
		t.Fatal("wanted retrieval error")
	}
	if savedErr.Error() != "retrieve failed" {
		t.Errorf(`wanted error "retrieve failed", got "%s"`, savedErr.Error())
	}
}

func TestDiscard(t *testing.T) {
	discardCalled := false
	swingsetSnapshotter := newTestSnapshotter()
	swingsetSnapshotter.blockingSend = func(action vm.Jsonable, mustNotBeInited bool) (string, error) {
		if action.(*snapshotAction).Request == "discard" {
			discardCalled = true
		}
		return "", nil
	}

	// simulate a normal Snapshot() call which calls SnapshotExtension()
	swingsetSnapshotter.takeSnapshot = func(height int64) {
		swingsetSnapshotter.activeSnapshot.retrieved = true
	}
	err := swingsetSnapshotter.InitiateSnapshot(123)
	if err != nil {
		t.Fatal(err)
	}
	<-swingsetSnapshotter.activeSnapshot.done
	if discardCalled {
		t.Error("didn't want discard called")
	}

	// simulate a Snapshot() call which doesn't call SnapshotExtension()
	swingsetSnapshotter.takeSnapshot = func(height int64) {}
	err = swingsetSnapshotter.InitiateSnapshot(456)
	if err != nil {
		t.Fatal(err)
	}
	<-swingsetSnapshotter.activeSnapshot.done
	if !discardCalled {
		t.Error("wanted discard called")
	}
}
