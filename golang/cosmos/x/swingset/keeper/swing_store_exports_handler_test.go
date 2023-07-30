package keeper

import (
	"errors"
	"io"
	"testing"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	"github.com/tendermint/tendermint/libs/log"
)

func newTestSwingStoreSnapshotter() *SwingStoreExportsHandler {
	logger := log.NewNopLogger() // log.NewTMLogger(log.NewSyncWriter( /* os.Stdout*/ io.Discard)).With("module", "sdk/app")
	return &SwingStoreExportsHandler{
		logger:       logger,
		blockingSend: func(action vm.Jsonable, mustNotBeInited bool) (string, error) { return "", nil },
	}
}

type testSnapshotTaker struct {
	takeSnapshot            func(height uint64, retrieveExport func() error) error
	processExportedSnapshot func(provider SwingStoreExportProvider) error
}

func newTestSnapshotTaker() testSnapshotTaker {
	return testSnapshotTaker{
		takeSnapshot: func(height uint64, retrieveExport func() error) error {
			return retrieveExport()
		},
		processExportedSnapshot: func(provider SwingStoreExportProvider) error {
			for {
				_, err := provider.ReadArtifact()
				if err == io.EOF {
					return nil
				} else if err != nil {
					return err
				}
			}
		},
	}
}

func (taker testSnapshotTaker) ExportInitiated(height uint64, retrieveExport func() error) error {
	return taker.takeSnapshot(height, retrieveExport)
}

func (taker testSnapshotTaker) ExportRetrieved(provider SwingStoreExportProvider) error {
	return taker.processExportedSnapshot(provider)
}

func TestSwingStoreSnapshotterInProgress(t *testing.T) {
	swingStoreSnapshotter := newTestSwingStoreSnapshotter()
	ch := make(chan struct{})
	snapshotTaker := newTestSnapshotTaker()
	snapshotTaker.takeSnapshot = func(height uint64, retrieveExport func() error) error {
		<-ch
		return nil
	}
	err := swingStoreSnapshotter.InitiateExport(123, snapshotTaker, SwingStoreExportOptions{})
	if err != nil {
		t.Fatal(err)
	}
	err = WaitUntilSwingStoreExportStarted()
	if err != nil {
		t.Fatal(err)
	}

	err = swingStoreSnapshotter.InitiateExport(456, newTestSnapshotTaker(), SwingStoreExportOptions{})
	if err == nil {
		t.Error("wanted error for snapshot in progress")
	}

	err = swingStoreSnapshotter.RestoreExport(SwingStoreExportProvider{BlockHeight: 456}, SwingStoreRestoreOptions{})
	if err == nil {
		t.Error("wanted error for snapshot in progress")
	}

	close(ch)
	<-activeOperation.exportDone
	err = swingStoreSnapshotter.InitiateExport(456, newTestSnapshotTaker(), SwingStoreExportOptions{})
	if err != nil {
		t.Fatal(err)
	}
}

func TestSwingStoreSnapshotterSecondCommit(t *testing.T) {
	swingStoreSnapshotter := newTestSwingStoreSnapshotter()

	snapshotTaker := newTestSnapshotTaker()
	// Use a channel to block the snapshot goroutine after it has started but before it exits.
	ch := make(chan struct{})
	snapshotTaker.takeSnapshot = func(height uint64, retrieveExport func() error) error {
		<-ch
		return nil
	}

	// First run through app.Commit()
	err := WaitUntilSwingStoreExportStarted()
	if err != nil {
		t.Fatal(err)
	}
	err = swingStoreSnapshotter.InitiateExport(123, snapshotTaker, SwingStoreExportOptions{})
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
	<-activeOperation.exportDone
}

func TestSwingStoreSnapshotterInitiateFails(t *testing.T) {
	swingStoreSnapshotter := newTestSwingStoreSnapshotter()
	snapshotTaker := newTestSnapshotTaker()
	swingStoreSnapshotter.blockingSend = func(action vm.Jsonable, mustNotBeInited bool) (string, error) {
		if action.(*swingStoreExportAction).Request == "initiate" {
			return "", errors.New("initiate failed")
		}
		return "", nil
	}

	err := swingStoreSnapshotter.InitiateExport(123, snapshotTaker, SwingStoreExportOptions{})
	if err != nil {
		t.Fatal(err)
	}
	err = WaitUntilSwingStoreExportStarted()
	if err == nil {
		t.Fatal("wanted initiation error")
	}
	if err.Error() != "initiate failed" {
		t.Errorf(`wanted error "initiate failed", got "%s"`, err.Error())
	}
	// another wait should succeed without error
	err = WaitUntilSwingStoreExportStarted()
	if err != nil {
		t.Error(err)
	}
}

func TestSwingStoreSnapshotterRetrievalFails(t *testing.T) {
	swingStoreSnapshotter := newTestSwingStoreSnapshotter()
	var retrieveError error
	swingStoreSnapshotter.blockingSend = func(action vm.Jsonable, mustNotBeInited bool) (string, error) {
		if action.(*swingStoreExportAction).Request == "retrieve" {
			retrieveError = errors.New("retrieve failed")
			return "", retrieveError
		}
		return "", nil
	}
	snapshotTaker := newTestSnapshotTaker()
	var savedErr error
	ch := make(chan struct{})
	snapshotTaker.takeSnapshot = func(height uint64, retrieveExport func() error) error {
		savedErr = retrieveExport()
		<-ch
		return savedErr
	}

	err := swingStoreSnapshotter.InitiateExport(123, snapshotTaker, SwingStoreExportOptions{})
	if err != nil {
		t.Fatal(err)
	}
	err = WaitUntilSwingStoreExportStarted()
	if err != nil {
		t.Fatal(err)
	}

	close(ch)
	if savedErr != retrieveError {
		t.Errorf(`wanted retrieval error, got "%v"`, savedErr)
	}
	err = WaitUntilSwingStoreExportDone()
	if err != retrieveError {
		t.Errorf(`wanted retrieval error, got "%v"`, err)
	}
}

func TestSwingStoreSnapshotterDiscard(t *testing.T) {
	discardCalled := false
	swingStoreSnapshotter := newTestSwingStoreSnapshotter()
	swingStoreSnapshotter.blockingSend = func(action vm.Jsonable, mustNotBeInited bool) (string, error) {
		if action.(*swingStoreExportAction).Request == "discard" {
			discardCalled = true
		}
		return "", nil
	}

	// simulate a takeSnapshot which successfully calls retrieveExport()
	snapshotTaker := newTestSnapshotTaker()
	snapshotTaker.takeSnapshot = func(height uint64, retrieveExport func() error) error {
		activeOperation.exportRetrieved = true
		return nil
	}
	err := swingStoreSnapshotter.InitiateExport(123, snapshotTaker, SwingStoreExportOptions{})
	if err != nil {
		t.Fatal(err)
	}
	err = WaitUntilSwingStoreExportDone()
	if err != nil {
		t.Fatal(err)
	}
	if discardCalled {
		t.Error("didn't want discard called")
	}

	// simulate a takeSnapshot which doesn't call retrieveExport()
	snapshotTaker = newTestSnapshotTaker()
	snapshotTaker.takeSnapshot = func(height uint64, retrieveExport func() error) error {
		return nil
	}
	err = swingStoreSnapshotter.InitiateExport(456, snapshotTaker, SwingStoreExportOptions{})
	if err != nil {
		t.Fatal(err)
	}
	err = WaitUntilSwingStoreExportDone()
	if err != nil {
		t.Fatal(err)
	}
	if !discardCalled {
		t.Error("wanted discard called")
	}
}
