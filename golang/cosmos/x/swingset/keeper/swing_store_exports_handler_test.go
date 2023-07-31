package keeper

import (
	"errors"
	"io"
	"testing"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	"github.com/tendermint/tendermint/libs/log"
)

func newTestSwingStoreExportsHandler() *SwingStoreExportsHandler {
	logger := log.NewNopLogger() // log.NewTMLogger(log.NewSyncWriter( /* os.Stdout*/ io.Discard)).With("module", "sdk/app")
	return &SwingStoreExportsHandler{
		logger:       logger,
		blockingSend: func(action vm.Jsonable, mustNotBeInited bool) (string, error) { return "", nil },
	}
}

var _ SwingStoreExportEventHandler = testSwingStoreEventHandler{}

type testSwingStoreEventHandler struct {
	exportInitiated func(height uint64, retrieveExport func() error) error
	exportRetrieved func(provider SwingStoreExportProvider) error
}

func newTestSwingStoreEventHandler() testSwingStoreEventHandler {
	return testSwingStoreEventHandler{
		exportInitiated: func(height uint64, retrieveExport func() error) error {
			return retrieveExport()
		},
		exportRetrieved: func(provider SwingStoreExportProvider) error {
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

func (taker testSwingStoreEventHandler) ExportInitiated(height uint64, retrieveExport func() error) error {
	return taker.exportInitiated(height, retrieveExport)
}

func (taker testSwingStoreEventHandler) ExportRetrieved(provider SwingStoreExportProvider) error {
	return taker.exportRetrieved(provider)
}

func TestSwingStoreSnapshotterInProgress(t *testing.T) {
	exportsHandler := newTestSwingStoreExportsHandler()
	ch := make(chan struct{})
	exportEventHandler := newTestSwingStoreEventHandler()
	exportEventHandler.exportInitiated = func(height uint64, retrieveExport func() error) error {
		<-ch
		return nil
	}
	err := exportsHandler.InitiateExport(123, exportEventHandler, SwingStoreExportOptions{})
	if err != nil {
		t.Fatal(err)
	}
	err = WaitUntilSwingStoreExportStarted()
	if err != nil {
		t.Fatal(err)
	}

	err = exportsHandler.InitiateExport(456, newTestSwingStoreEventHandler(), SwingStoreExportOptions{})
	if err == nil {
		t.Error("wanted error for export operation in progress")
	}

	err = exportsHandler.RestoreExport(SwingStoreExportProvider{BlockHeight: 456}, SwingStoreRestoreOptions{})
	if err == nil {
		t.Error("wanted error for export operation in progress")
	}

	close(ch)
	err = WaitUntilSwingStoreExportDone()
	if err != nil {
		t.Fatal(err)
	}
	err = exportsHandler.InitiateExport(456, exportEventHandler, SwingStoreExportOptions{})
	if err != nil {
		t.Fatal(err)
	}
	err = WaitUntilSwingStoreExportDone()
	if err != nil {
		t.Fatal(err)
	}
}

func TestSwingStoreSnapshotterSecondCommit(t *testing.T) {
	exportsHandler := newTestSwingStoreExportsHandler()

	exportEventHandler := newTestSwingStoreEventHandler()
	// Use a channel to block the snapshot goroutine after it has started but before it exits.
	ch := make(chan struct{})
	exportEventHandler.exportInitiated = func(height uint64, retrieveExport func() error) error {
		<-ch
		return nil
	}

	// First run through app.Commit()
	err := WaitUntilSwingStoreExportStarted()
	if err != nil {
		t.Fatal(err)
	}
	err = exportsHandler.InitiateExport(123, exportEventHandler, SwingStoreExportOptions{})
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

func TestSwingStoreSnapshotterInitiateFails(t *testing.T) {
	exportsHandler := newTestSwingStoreExportsHandler()
	exportEventHandler := newTestSwingStoreEventHandler()
	exportsHandler.blockingSend = func(action vm.Jsonable, mustNotBeInited bool) (string, error) {
		if action.(*swingStoreExportAction).Request == "initiate" {
			return "", errors.New("initiate failed")
		}
		return "", nil
	}

	err := exportsHandler.InitiateExport(123, exportEventHandler, SwingStoreExportOptions{})
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
	err = WaitUntilSwingStoreExportDone()
	if err != nil {
		t.Fatal(err)
	}
}

func TestSwingStoreSnapshotterRetrievalFails(t *testing.T) {
	exportsHandler := newTestSwingStoreExportsHandler()
	var retrieveError error
	exportsHandler.blockingSend = func(action vm.Jsonable, mustNotBeInited bool) (string, error) {
		if action.(*swingStoreExportAction).Request == "retrieve" {
			retrieveError = errors.New("retrieve failed")
			return "", retrieveError
		}
		return "", nil
	}
	exportEventHandler := newTestSwingStoreEventHandler()
	var savedErr error
	ch := make(chan struct{})
	exportEventHandler.exportInitiated = func(height uint64, retrieveExport func() error) error {
		savedErr = retrieveExport()
		<-ch
		return savedErr
	}

	err := exportsHandler.InitiateExport(123, exportEventHandler, SwingStoreExportOptions{})
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
	exportsHandler := newTestSwingStoreExportsHandler()
	exportsHandler.blockingSend = func(action vm.Jsonable, mustNotBeInited bool) (string, error) {
		if action.(*swingStoreExportAction).Request == "discard" {
			discardCalled = true
		}
		return "", nil
	}

	// simulate a exportInitiated which successfully calls retrieveExport()
	exportEventHandler := newTestSwingStoreEventHandler()
	exportEventHandler.exportInitiated = func(height uint64, retrieveExport func() error) error {
		activeOperation.exportRetrieved = true
		return nil
	}
	err := exportsHandler.InitiateExport(123, exportEventHandler, SwingStoreExportOptions{})
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

	// simulate a exportInitiated which doesn't call retrieveExport()
	exportEventHandler = newTestSwingStoreEventHandler()
	exportEventHandler.exportInitiated = func(height uint64, retrieveExport func() error) error {
		return nil
	}
	err = exportsHandler.InitiateExport(456, exportEventHandler, SwingStoreExportOptions{})
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
