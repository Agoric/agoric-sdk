package main

import (
	"context"
	"errors"
	"fmt"
	"net/rpc"
	"net/rpc/jsonrpc"
	"os"
	"os/exec"
	"sync"
	"sync/atomic"
	"syscall"
	"time"

	"cosmossdk.io/log"
	"github.com/spf13/cast"

	gaia "github.com/Agoric/agoric-sdk/golang/cosmos/app"
	"github.com/Agoric/agoric-sdk/golang/cosmos/daemon"
	daemoncmd "github.com/Agoric/agoric-sdk/golang/cosmos/daemon/cmd"
	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	"github.com/Agoric/agoric-sdk/golang/cosmos/vm/jsonrpcconn"
	servertypes "github.com/cosmos/cosmos-sdk/server/types"
)

// TerminateSubprocessGracePeriod is how long we wait between closing the pipe
// waiting for it to exit, then sending a termination signal.
const TerminateSubprocessGracePeriod = 3 * time.Second

// KillSubprocessGracePeriod is how long we wait between sending a subprocess a
// termination signal, waiting for it to exit, then killing it.
const KillSubprocessGracePeriod = 5 * time.Second

// requestVMShutdown bounds the handshake, including a potentially blocked pipe
// write. The caller still closes the connection and reaps the child on failure.
func requestVMShutdown(client *rpc.Client, nodePort int, timeout time.Duration) error {
	done := make(chan error, 1)
	go func() {
		var reply string
		done <- client.Call(vm.ShutdownMethod, vm.Message{Port: nodePort}, &reply)
	}()
	timer := time.NewTimer(timeout)
	defer timer.Stop()
	select {
	case err := <-done:
		return err
	case <-timer.C:
		return errors.New("timed out requesting VM shutdown")
	}
}

// makeShutdown reaps a started VM once, sharing its exit result with shutdown
// and the unexpected-exit observer. Shutdown is idempotent and cancels escalation
// as soon as the process exits.
func makeShutdown(cmd *exec.Cmd, writer *os.File) (func() error, <-chan struct{}) {
	done := make(chan struct{})
	var waitErr error
	go func() {
		waitErr = cmd.Wait()
		close(done)
	}()
	var once sync.Once
	shutdown := func() error {
		once.Do(func() {
			_ = writer.Close()
			go func() {
				timer := time.NewTimer(TerminateSubprocessGracePeriod)
				defer timer.Stop()
				select {
				case <-done:
					return
				case <-timer.C:
					_ = cmd.Process.Signal(os.Interrupt)
				}
				timer.Reset(KillSubprocessGracePeriod)
				select {
				case <-done:
					return
				case <-timer.C:
					_ = cmd.Process.Kill()
				}
			}()
		})
		<-done
		return waitErr
	}
	return shutdown, done
}

// main is the entry point of the agd daemon.  It determines whether to
// initialize JSON-RPC communications with the separate `--split-vm` VM process,
// or just to give up control entirely to another binary.
func main() {
	var vmClient *rpc.Client
	var shutdown func() error
	var shuttingDown atomic.Bool

	nodePort := 1
	var sendToNode vm.Sender = func(ctx context.Context, needReply bool, jsonRequest string) (jsonReply string, err error) {
		if vmClient == nil {
			return "", errors.New("sendToVM called without VM client set up")
		}

		if jsonRequest == "shutdown" {
			if shutdown != nil {
				shuttingDown.Store(true)
				requestErr := requestVMShutdown(vmClient, nodePort, TerminateSubprocessGracePeriod)
				return "", errors.Join(requestErr, shutdown())
			}
			return "", nil
		}

		msg := vm.Message{
			Port:       nodePort,
			NeedsReply: needReply,
			Data:       jsonRequest,
		}
		var reply string
		err = vmClient.Call(vm.ReceiveMessageMethod, msg, &reply)
		return reply, err
	}

	exitCode := 0
	launchVM := func(agdServer *vm.AgdServer, logger log.Logger, appOpts servertypes.AppOptions) error {
		argv := []string{"ag-chain-cosmos", "--home", gaia.DefaultNodeHome}
		argv = append(argv, os.Args[1:]...)

		binary := cast.ToString(appOpts.Get(daemoncmd.FlagVMPath))
		if binary == "" {
			var lookErr error
			binary, lookErr = FindCosmicSwingsetBinary()
			if lookErr != nil {
				return lookErr
			}
		}
		// Validate discovered and explicitly selected programs alike. Resolve PATH
		// names before syscall.Exec, which does not perform a PATH search.
		binary, err := exec.LookPath(binary)
		if err != nil {
			return fmt.Errorf("cannot execute Agoric VM: %s", err)
		}

		if !cast.ToBool(appOpts.Get(daemoncmd.FlagSplitVm)) {
			// We completely delegate to our default app for running the actual chain.
			logger.Info("agd delegating to JS executable", "binary", binary, "args", argv)
			return syscall.Exec(binary, argv, os.Environ())
		}

		// Split the execution between us and the VM.
		agdFromVm, vmToAgd, err := os.Pipe()
		if err != nil {
			return err
		}
		vmFromAgd, agdToVm, err := os.Pipe()
		if err != nil {
			return err
		}

		// Start the command running, then continue.
		cmd := NewVMCommand(logger, binary, argv[1:], vmFromAgd, vmToAgd)
		if err := cmd.Start(); err != nil {
			return err
		}
		var vmExited <-chan struct{}
		shutdown, vmExited = makeShutdown(cmd, agdToVm)
		if vmFromAgd.Close() != nil {
			return err
		}
		if vmToAgd.Close() != nil {
			return err
		}

		// Multiplex bidirectional JSON-RPC over the pipes.
		agvmConn := jsonrpcconn.NewConn(agdFromVm, agdToVm)
		clientConn, serverConn := jsonrpcconn.ClientServerConn(agvmConn)

		// Set up the VM server.
		vmServer := rpc.NewServer()
		if err := vmServer.RegisterName("agd", agdServer); err != nil {
			return err
		}
		go vmServer.ServeCodec(jsonrpc.NewServerCodec(serverConn))

		// Set up the VM client.
		vmClient = jsonrpc.NewClient(clientConn)

		go func() {
			// Premature exit from `agd start` should exit the process.
			<-vmExited
			if !shuttingDown.Load() {
				if err := shutdown(); err != nil && exitCode == 0 {
					os.Exit(1)
				}
				os.Exit(exitCode)
			}
		}()

		return nil
	}

	daemoncmd.OnExportHook = launchVM
	daemoncmd.OnStartHook = func(agdServer *vm.AgdServer, logger log.Logger, appOpts servertypes.AppOptions) error {
		// We tried running start, which should never exit, so exit with non-zero
		// code if we do.
		exitCode = 99
		return launchVM(agdServer, logger, appOpts)
	}

	daemon.RunWithController(sendToNode)
}
