package main

// /* These comments before the import "C" are included in the C output. */
// #include <stdlib.h>
// typedef const char* Body;
// typedef int (*sendFunc)(int, int, Body);
// inline int invokeSendFunc(sendFunc send, int port, int reply, Body str) {
//    return send(port, reply, str);
// }
import "C"

import (
	"context"
	"encoding/json"
	"net/rpc"
	"os"
	"path/filepath"
	"runtime/debug"

	"cosmossdk.io/log"

	gaia "github.com/Agoric/agoric-sdk/golang/cosmos/app"
	"github.com/Agoric/agoric-sdk/golang/cosmos/daemon"
	daemoncmd "github.com/Agoric/agoric-sdk/golang/cosmos/daemon/cmd"
	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	servertypes "github.com/cosmos/cosmos-sdk/server/types"
)

// Taken from sysexits.h
const (
	EX_SOFTWARE = 70 /* internal software error */
)

var logger = log.NewLogger(os.Stderr).With("module", "cmd/libdaemon")

var vmClientCodec *vm.ClientCodec
var agdServer *vm.AgdServer

// ConnectVMClientCodec creates an RPC client codec and a sender to the
// in-process implementation of the VM.
func ConnectVMClientCodec(ctx context.Context, sendFunc func(int, int, string)) (*vm.ClientCodec, vm.Sender) {
	vmClientCodec = vm.NewClientCodec(ctx, sendFunc)
	vmClient := rpc.NewClientWithCodec(vmClientCodec)

	var sendToNode vm.Sender = func(ctx context.Context, needReply bool, jsonRequest string) (jsonReply string, err error) {
		if jsonRequest == "shutdown" {
			return "", vmClientCodec.Close()
		}

		msg := vm.Message{
			Port:       1,
			NeedsReply: needReply,
			Data:       jsonRequest,
		}
		var reply string
		err = vmClient.Call(vm.ReceiveMessageMethod, msg, &reply)
		return reply, err
	}

	return vmClientCodec, sendToNode
}

// handlePanic is a helper function to recover from panics, log them, and exit the process.
func handlePanic(caller string) {
	if r := recover(); r != nil {
		defer func() {
			if err := recover(); err != nil {
				// If we panic again, we will exit the process without logging the error or stack.
				os.Stderr.WriteString("Double panic in exported Go function: " + caller + "\n")
				os.Exit(EX_SOFTWARE)
			}
		}()

		// Log the panic with the caller information.
		logger.Error("Panic in exported Go function", "caller", caller, "error", r, "stack", debug.Stack())

		// Exit the process with a non-zero exit code.
		os.Exit(EX_SOFTWARE)
	}
}

//export RunAgCosmosDaemon
func RunAgCosmosDaemon(toNode C.sendFunc, cosmosArgs []*C.char) {
	defer handlePanic("RunAgCosmosDaemon")

	userHomeDir, err := os.UserHomeDir()
	if err != nil {
		panic(err)
	}

	gaia.DefaultNodeHome = filepath.Join(userHomeDir, ".ag-chain-cosmos")
	daemoncmd.AppName = "ag-chain-cosmos"
	if err := os.Setenv(daemoncmd.EmbeddedVmEnvVar, "libdaemon"); err != nil {
		panic(err)
	}

	var sendToNode vm.Sender

	sendFunc := func(port int, reply int, str string) {
		C.invokeSendFunc(toNode, C.int(port), C.int(reply), C.CString(str))
	}

	vmClientCodec, sendToNode = ConnectVMClientCodec(
		context.Background(),
		sendFunc,
	)

	args := make([]string, len(cosmosArgs))
	for i, s := range cosmosArgs {
		args[i] = C.GoString(s)
	}

	os.Args = args
	go func() {
		defer handlePanic("daemon.RunWithController")

		// We run in the background, but exit when the job is over.
		exitCode := 0
		daemoncmd.OnAppHook = func(srv *vm.AgdServer, logger log.Logger, appOpts servertypes.AppOptions) error {
			agdServer = srv
			return nil
		}
		daemoncmd.OnStartHook = func(_ *vm.AgdServer, _ log.Logger, _ servertypes.AppOptions) error {
			// start should not return without an explicit shutdown.
			exitCode = 99
			return nil
		}
		daemon.RunWithController(sendToNode)
		// A c-shared Go runtime runs alongside Node's main thread. On Darwin,
		// os.Exit uses libc exit, whose process-wide cleanup can race Node's
		// teardown (observed as an inspector mutex abort after export). Match
		// immediate process termination without running libc exit handlers here.
		C._Exit(C.int(exitCode))
	}()
}

//export ReplyToGo
func ReplyToGo(replyPort C.int, isError C.int, resp C.Body) C.int {
	defer handlePanic("ReplyToGo")
	respStr := C.GoString(resp)
	if err := vmClientCodec.Receive(int(replyPort), int(isError) != 0, respStr); err != nil {
		return C.int(1)
	}
	return C.int(0)
}

type errorWrapper struct {
	Error string `json:"error"`
}

//export SendToGo
func SendToGo(port C.int, msg C.Body, isError *C.int) C.Body {
	defer handlePanic("SendToGo")
	msgStr := C.GoString(msg)
	var respStr string
	message := &vm.Message{
		Port:       int(port),
		NeedsReply: true,
		Data:       msgStr,
	}

	err := agdServer.ReceiveMessage(message, &respStr)
	*isError = 0
	if err == nil {
		return C.CString(respStr)
	}

	*isError = 1
	errResp := errorWrapper{
		Error: err.Error(),
	}
	respBytes, err := json.Marshal(&errResp)
	if err != nil {
		panic(err)
	}
	return C.CString(string(respBytes))
}

// Do nothing in main.
func main() {}
