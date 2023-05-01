package keeper

import (
	"errors"
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
		blockingSend:      func(action vm.Jsonable) (string, error) { return "", nil },
	}
}

func TestSnapshotInProgress(t *testing.T) {
	swingsetSnapshotter := newTestSnapshotter()
	swingsetSnapshotter.activeSnapshot = &activeSnapshot{}
	err := swingsetSnapshotter.InitiateSnapshot(123)
	if err == nil {
		t.Error("wanted error for snapshot in progress")
	}
}

func TestNotConfigured(t *testing.T) {
	swingsetSnapshotter := newTestSnapshotter()
	swingsetSnapshotter.isConfigured = func() bool { return false }
	err := swingsetSnapshotter.InitiateSnapshot(123)
	if err == nil {
		t.Error("wanted error for unconfigured snapshot")
	}
}

func TestSecondCommit(t *testing.T) {
	swingsetSnapshotter := newTestSnapshotter()

	// Use a channel to block the snapshot goroutine after it has started but before it exits.
	ch := make(chan struct{}, 1)
	swingsetSnapshotter.blockingSend = func(action vm.Jsonable) (string, error) {
		ch <- struct{}{}
		return "", nil
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

	// drain the signaling channel to let goroutine exit
	_ = <-ch
	_ = <-ch
	close(ch)
}

func TestInitiateFails(t *testing.T) {
	swingsetSnapshotter := newTestSnapshotter()
	swingsetSnapshotter.blockingSend = func(action vm.Jsonable) (string, error) {
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
}

func TestRetrievalFails(t *testing.T) {
	swingsetSnapshotter := newTestSnapshotter()
	swingsetSnapshotter.blockingSend = func(action vm.Jsonable) (string, error) {
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
		close(ch)
	}

	err := swingsetSnapshotter.InitiateSnapshot(123)
	if err != nil {
		t.Fatal(err)
	}
	err = swingsetSnapshotter.WaitUntilSnapshotStarted()
	if err != nil {
		t.Fatal(err)
	}

	_ = <-ch
	if savedErr == nil {
		t.Fatal("wanted retrieval error")
	}
	if savedErr.Error() != "retrieve failed" {
		t.Errorf(`wanted error "retrieve failed", got "%s"`, savedErr.Error())
	}
	// goroutine has no remaining visible side-effects, so we can end the test
}
