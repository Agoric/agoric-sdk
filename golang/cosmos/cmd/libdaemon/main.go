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
	"errors"
	"os"
	"path/filepath"

	log "github.com/tendermint/tendermint/libs/log"

	gaia "github.com/Agoric/agoric-sdk/golang/cosmos/app"
	"github.com/Agoric/agoric-sdk/golang/cosmos/daemon"
	daemoncmd "github.com/Agoric/agoric-sdk/golang/cosmos/daemon/cmd"
	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
)

type goReturn = struct {
	str string
	err error
}

const SwingSetPort = 123

var replies = map[int]chan goReturn{}
var lastReply = 0

//export RunAgCosmosDaemon
func RunAgCosmosDaemon(nodePort C.int, toNode C.sendFunc, cosmosArgs []*C.char) C.int {
	userHomeDir, err := os.UserHomeDir()
	if err != nil {
		panic(err)
	}

	gaia.DefaultNodeHome = filepath.Join(userHomeDir, ".ag-chain-cosmos")
	daemoncmd.AppName = "ag-chain-cosmos"

	// FIXME: Decouple the sending logic from the Cosmos app.
	sendToNode := func(needReply bool, str string) (string, error) {
		var rPort int
		if needReply {
			lastReply++
			rPort = lastReply
			replies[rPort] = make(chan goReturn)
		}

		// Send the message
		C.invokeSendFunc(toNode, nodePort, C.int(rPort), C.CString(str))
		if !needReply {
			// Return immediately
			// fmt.Fprintln(os.Stderr, "Don't wait")
			return "<no-reply-requested>", nil
		}

		// Block the sending goroutine while we wait for the reply
		// fmt.Fprintln(os.Stderr, "Waiting for", rPort)
		ret := <-replies[rPort]
		delete(replies, rPort)
		// fmt.Fprintln(os.Stderr, "Woken, got", ret)
		return ret.str, ret.err
	}

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
		daemoncmd.OnStartHook = func(logger log.Logger) {
			// We tried running start, which should never exit, so exit with non-zero
			// code if we ever stop.
			exitCode = 99
		}
		daemon.RunWithController(sendToNode)
		// fmt.Fprintln(os.Stderr, "Shutting down Cosmos")
		os.Exit(exitCode)
	}()
	// fmt.Fprintln(os.Stderr, "Done starting Cosmos")
	return SwingSetPort
}

//export ReplyToGo
func ReplyToGo(replyPort C.int, isError C.int, resp C.Body) C.int {
	respStr := C.GoString(resp)
	// fmt.Fprintln(os.Stderr, "Reply to Go", respStr)
	returnCh := replies[int(replyPort)]
	if returnCh == nil {
		// Unexpected reply.
		// This is okay, since the caller decides whether or
		// not she wants to listen for replies.
		return C.int(0)
	}
	// Wake up the waiting goroutine
	ret := goReturn{}
	if int(isError) == 0 {
		ret.str = respStr
	} else {
		ret.err = errors.New(respStr)
	}
	returnCh <- ret
	return C.int(0)
}

type errorWrapper struct {
	Error string `json:"error"`
}

//export SendToGo
func SendToGo(port C.int, msg C.Body) C.Body {
	msgStr := C.GoString(msg)
	// fmt.Fprintln(os.Stderr, "Send to Go", msgStr)
	respStr, err := vm.ReceiveFromController(int(port), msgStr)
	if err != nil {
		// fmt.Fprintln(os.Stderr, "Cannot receive from controller", err)
		errResp := errorWrapper{
			Error: err.Error(),
		}
		respBytes, err := json.Marshal(&errResp)
		if err != nil {
			panic(err)
		}
		// fmt.Fprintln(os.Stderr, "Marshaled", errResp, respBytes)
		respStr = string(respBytes)
	}
	return C.CString(respStr)
}

// Do nothing in main.
func main() {}
