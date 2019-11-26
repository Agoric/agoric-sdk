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
	"errors"
	"fmt"
	"os"

	"github.com/Agoric/cosmic-swingset/lib/daemon"
	swingset "github.com/Agoric/cosmic-swingset/x/swingset"
)

type goReturn = struct {
	str string
	err error
}

const SwingSetPort = 123

var replies = map[int]chan goReturn{}
var lastReply = 0

//export RunAG_COSMOS
func RunAG_COSMOS(nodePort C.int, toNode C.sendFunc, cosmosArgs []*C.char) C.int {
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
		daemon.RunWithController(sendToNode)
		// fmt.Fprintln(os.Stderr, "Shutting down Cosmos")
		os.Exit(0)
	}()
	// fmt.Fprintln(os.Stderr, "Done starting Cosmos")
	return SwingSetPort
}

//export ReplyToGo
func ReplyToGo(replyPort C.int, isError C.int, str C.Body) C.int {
	goStr := C.GoString(str)
	// fmt.Fprintln(os.Stderr, "Reply to Go", goStr)
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
		ret.str = goStr
	} else {
		ret.err = errors.New(goStr)
	}
	returnCh <- ret
	return C.int(0)
}

//export SendToGo
func SendToGo(port C.int, str C.Body) C.Body {
	goStr := C.GoString(str)
	// fmt.Fprintln(os.Stderr, "Send to Go", goStr)
	outstr, err := swingset.ReceiveFromNode(int(port), goStr)
	if err != nil {
		fmt.Fprintln(os.Stderr, "Cannot receive from node", err)
		return C.CString("")
	}
	return C.CString(outstr)
}

// Do nothing in main.
func main() {}
