package main

import (
	"context"
	"errors"
	"net/rpc"
	"sync"
	"sync/atomic"
	"time"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
)

// vmController owns admission and shutdown of Go-to-VM requests. JS requires
// outstanding action replies to settle before it accepts agvm.Shutdown.
type vmController struct {
	client   *rpc.Client
	nodePort int
	reap     func() error
	timeout  time.Duration

	active   sync.RWMutex
	stopping atomic.Bool
	stopOnce sync.Once
	stopErr  error
}

func (c *vmController) send(_ context.Context, needReply bool, request string) (string, error) {
	if request == "shutdown" {
		return "", c.shutdown()
	}
	if c.stopping.Load() {
		return "", errors.New("VM controller is shutting down")
	}
	c.active.RLock()
	defer c.active.RUnlock()
	// A shutdown writer may have acquired the gate after the first check.
	if c.stopping.Load() {
		return "", errors.New("VM controller is shutting down")
	}
	message := vm.Message{Port: c.nodePort, NeedsReply: needReply, Data: request}
	var reply string
	err := c.client.Call(vm.ReceiveMessageMethod, message, &reply)
	return reply, err
}

func (c *vmController) shutdown() error {
	c.stopOnce.Do(func() {
		c.stopping.Store(true)
		drained := make(chan struct{})
		go func() {
			c.active.Lock()
			c.active.Unlock()
			close(drained)
		}()
		timer := time.NewTimer(c.timeout)
		defer timer.Stop()
		select {
		case <-drained:
			c.stopErr = requestVMShutdown(c.client, c.nodePort, c.timeout)
		case <-timer.C:
			c.stopErr = errors.New("timed out draining VM controller requests")
		}
		// Closing the client releases any RPCs that failed to drain, including
		// a handshake blocked on a write. Reaping remains mandatory on failure.
		_ = c.client.Close()
		c.stopErr = errors.Join(c.stopErr, c.reap())
	})
	return c.stopErr
}
