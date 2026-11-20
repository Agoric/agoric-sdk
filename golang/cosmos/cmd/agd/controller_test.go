package main

import (
	"context"
	"errors"
	"net"
	"net/rpc"
	"net/rpc/jsonrpc"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	"github.com/stretchr/testify/require"
)

type controllerPeer struct {
	started chan struct{}
	release chan struct{}
	stopped chan struct{}
	active  atomic.Int32
}

func (p *controllerPeer) ReceiveMessage(msg vm.Message, reply *string) error {
	p.active.Add(1)
	close(p.started)
	<-p.release
	p.active.Add(-1)
	*reply = msg.Data
	return nil
}

func (p *controllerPeer) Shutdown(msg vm.Message, reply *string) error {
	close(p.stopped)
	if p.active.Load() != 0 {
		return errors.New("shutdown overtook an active action")
	}
	*reply = "<shutdown>"
	return nil
}

func newControllerFixture(t *testing.T, timeout time.Duration) (*vmController, *controllerPeer, func()) {
	t.Helper()
	local, remote := net.Pipe()
	peer := &controllerPeer{started: make(chan struct{}), release: make(chan struct{}), stopped: make(chan struct{})}
	server := rpc.NewServer()
	require.NoError(t, server.RegisterName("agvm", peer))
	go server.ServeCodec(jsonrpc.NewServerCodec(remote))
	controller := &vmController{client: jsonrpc.NewClient(local), nodePort: 1, timeout: timeout, reap: func() error { return nil }}
	var once sync.Once
	release := func() { once.Do(func() { close(peer.release) }) }
	t.Cleanup(func() {
		release()
		_ = controller.client.Close()
		_ = remote.Close()
	})
	return controller, peer, release
}

func TestControllerShutdownDrainsActionsAndRejectsNewWork(t *testing.T) {
	controller, peer, release := newControllerFixture(t, time.Second)
	action := make(chan error, 1)
	go func() {
		reply, err := controller.send(context.Background(), true, "held action")
		if err == nil && reply != "held action" {
			err = errors.New("action reply was corrupted")
		}
		action <- err
	}()
	<-peer.started
	stopped := make(chan error, 1)
	var reaps atomic.Int32
	controller.reap = func() error { reaps.Add(1); return nil }
	go func() { stopped <- controller.shutdown() }()
	require.Eventually(t, controller.stopping.Load, time.Second, time.Millisecond)
	_, err := controller.send(context.Background(), true, "late action")
	require.ErrorContains(t, err, "shutting down")
	select {
	case <-peer.stopped:
		t.Fatal("shutdown reached VM before the active action settled")
	case <-time.After(20 * time.Millisecond):
	}
	release()
	require.NoError(t, <-action)
	require.NoError(t, <-stopped)
	<-peer.stopped
	require.NoError(t, controller.shutdown())
	require.EqualValues(t, 1, reaps.Load())
}

func TestControllerDrainTimeoutReleasesCallsAndStillReaps(t *testing.T) {
	controller, peer, _ := newControllerFixture(t, 20*time.Millisecond)
	action := make(chan error, 1)
	go func() {
		_, err := controller.send(context.Background(), true, "never settled")
		action <- err
	}()
	<-peer.started
	var reaps atomic.Int32
	reapErr := errors.New("child exit failure")
	controller.reap = func() error { reaps.Add(1); return reapErr }
	err := controller.shutdown()
	require.ErrorContains(t, err, "timed out draining")
	require.ErrorIs(t, err, reapErr)
	require.Error(t, <-action)
	require.ErrorIs(t, controller.shutdown(), reapErr)
	require.EqualValues(t, 1, reaps.Load())
	select {
	case <-peer.stopped:
		t.Fatal("must not handshake while an action failed to drain")
	default:
	}
}
