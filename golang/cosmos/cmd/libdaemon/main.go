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
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	servertypes "github.com/cosmos/cosmos-sdk/server/types"
	log "github.com/tendermint/tendermint/libs/log"

	gaia "github.com/Agoric/agoric-sdk/golang/cosmos/app"
	"github.com/Agoric/agoric-sdk/golang/cosmos/daemon"
	daemoncmd "github.com/Agoric/agoric-sdk/golang/cosmos/daemon/cmd"
	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
)

var controller vm.Target

//export RunAgCosmosDaemon
func RunAgCosmosDaemon(nodePort C.int, toNode C.sendFunc, cosmosArgs []*C.char) {
	userHomeDir, err := os.UserHomeDir()
	if err != nil {
		panic(err)
	}

	gaia.DefaultNodeHome = filepath.Join(userHomeDir, ".ag-chain-cosmos")
	daemoncmd.AppName = "ag-chain-cosmos"

	sendToVM := func (msg vm.Message) error {
		// fmt.Fprintf(os.Stderr, "sendToVM: %v\n", msg)
		var port C.int
		if msg.Port == vm.BootstrapPort {
			port = nodePort
		} else {
			port = C.int(msg.Port)
		}
		code := int(C.invokeSendFunc(toNode, port, C.int(msg.ReplyPort), C.CString(msg.Data)))
		if code != 0 {
			return fmt.Errorf("sendToVM failed: %d", code)
		}
		return nil
	}
	controller = vm.NewTarget(sendToVM)

	args := make([]string, len(cosmosArgs))
	for i, s := range cosmosArgs {
		args[i] = C.GoString(s)
	}
	// fmt.Fprintln(os.Stderr, "Starting Cosmos", args)
	os.Args = args
	go func() {
		// We run in the background, but exit when the job is over.
		// swingset.SendToNode("hello from Initial Go!")
		exitCode := 0
		daemoncmd.OnStartHook = func(log.Logger, servertypes.AppOptions) error {
			// We tried running start, which should never exit, so exit with non-zero
			// code if we ever stop.
			exitCode = 99
			return nil
		}
		daemon.RunWithController(controller)
		// fmt.Fprintln(os.Stderr, "Shutting down Cosmos")
		os.Exit(exitCode)
	}()
	// fmt.Fprintln(os.Stderr, "Done starting Cosmos")
}

//export ReplyToGo
func ReplyToGo(replyPort C.int, isError C.int, resp C.Body) C.int {
	respStr := C.GoString(resp)
	msg := vm.Message{Port: vm.Port(replyPort), Data: respStr}
	if int(isError) == 0 {
		msg.Kind = vm.Reply
	} else {
		msg.Kind = vm.ReplyError
	}
	if err := controller.Receive(msg); err != nil {
		return C.int(1)
	}
	return C.int(0)
}

type errorWrapper struct {
	Error string `json:"error"`
}

//export SendToGo
func SendToGo(port C.int, msg C.Body) C.Body {
	msgStr := C.GoString(msg)
	// fmt.Fprintln(os.Stderr, "Send to Go", port, msgStr)
	sent := vm.Message{Port: vm.Port(port), Data: msgStr, Kind: vm.Send}
	var respStr string
	err := controller.Dispatch(sent, func(resp vm.Message) error {
		// fmt.Fprintln(os.Stderr, "Received from controller", resp)
		switch (resp.Kind) {
			case vm.Reply:
				respStr = resp.Data
				return nil
			case vm.ReplyError:
				// fmt.Fprintln(os.Stderr, "Cannot receive from controller", err)
				errResp := errorWrapper{
					Error: resp.Data,
				}
				respBytes, err := json.Marshal(&errResp)
				if err != nil {
					return err
				}
				// fmt.Fprintln(os.Stderr, "Marshaled", errResp, respBytes)
				respStr = string(respBytes)
				return nil
			default:
				return fmt.Errorf("unknown response kind %d", resp.Kind)
			}
		})
	if err != nil {
		panic(err)
	}
	return C.CString(respStr)
}

// Do nothing in main.
func main() {}
