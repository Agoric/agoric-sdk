package main

import (
	"context"
	"errors"
	"net/rpc"
	"net/rpc/jsonrpc"
	"os"
	"syscall"

	"github.com/spf13/cast"
	"github.com/tendermint/tendermint/libs/log"

	gaia "github.com/Agoric/agoric-sdk/golang/cosmos/app"
	"github.com/Agoric/agoric-sdk/golang/cosmos/daemon"
	daemoncmd "github.com/Agoric/agoric-sdk/golang/cosmos/daemon/cmd"
	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	"github.com/Agoric/agoric-sdk/golang/cosmos/vm/jsonrpcconn"
	servertypes "github.com/cosmos/cosmos-sdk/server/types"
)

func main() {
	var vmClient *rpc.Client

	nodePort := 1
	sendToNode := func(ctx context.Context, needReply bool, str string) (string, error) {
		if vmClient == nil {
			return "", errors.New("sendToVM called without VM client set up")
		}

		msg := vm.Message{
			Port: nodePort,
			NeedsReply: needReply,
			Data: str,
		}
		var reply string
		err := vmClient.Call(vm.ReceiveMessageMethod, msg, &reply)
		return reply, err
	}

	// We need to delegate to our default app for running the actual chain.
	exitCode := 0
	launchVM := func(logger log.Logger, appOpts servertypes.AppOptions) error {
		args := []string{"ag-chain-cosmos", "--home", gaia.DefaultNodeHome}
		args = append(args, os.Args[1:]...)

		binary := cast.ToString(appOpts.Get(daemoncmd.FlagSplitVm))
		if binary == "" {
			binary, lookErr := FindCosmicSwingsetBinary()
			if lookErr != nil {
				return lookErr
			}
	
			logger.Info("agd delegating to JS executable", "binary", binary, "args", args)
			return syscall.Exec(binary, args, os.Environ())
		}

		agdFromVM, vmToAgd, err := os.Pipe()
		if err != nil {
			return err
		}
		vmFromAgd, agdToVm, err := os.Pipe()
		if err != nil {
			return err
		}

		// Start the command running, then continue.
		args[0] = binary
		cmd := NewVMCommand(logger, binary, args, vmFromAgd, vmToAgd)
		if err := cmd.Start(); err != nil {
			return err
		}
		if vmFromAgd.Close() != nil {
			return err
		}
		if vmToAgd.Close() != nil {
			return err
		}

		// Multiplex bidirectional JSON-RPC over the pipes.
		agvmConn := jsonrpcconn.NewConn(agdFromVM, agdToVm)
		clientConn, serverConn := jsonrpcconn.ClientServerConn(agvmConn)

		// Set up the VM server.
		vmServer := rpc.NewServer()
		vmServer.RegisterName("agd", vm.NewAgdServer())
		go vmServer.ServeCodec(jsonrpc.NewServerCodec(serverConn))

		// Set up the VM client.
		vmClient = jsonrpc.NewClient(clientConn)

		go func() {
			// Premature exit from `agd start` should exit the process.
			cmd.Wait()
			os.Exit(exitCode)
		}()

		return nil
	}

	daemoncmd.OnExportHook = launchVM
	daemoncmd.OnStartHook = func (logger log.Logger, appOpts servertypes.AppOptions) error {
		// We tried running start, which should never exit, so exit with non-zero
		// code if we do.
		exitCode = 99
		return launchVM(logger, appOpts)
	}

	daemon.RunWithController(sendToNode)
}
