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

	"github.com/Agoric/cosmic-swingset/lib/nsd"
	"github.com/Agoric/cosmic-swingset/x/nameservice"
)

type goReturn = struct {
	str string
	err error
}

const CosmosPort = 123

var replies = map[int]chan goReturn{}
var lastReply = 0

//export StartCOSS
func StartCOSS(toNode C.sendFunc, cosmosArgs []*C.char) C.int {
	// FIXME: Decouple the sending logic from the Cosmos app.
	nameservice.NodeMessageSender = func(port int, needReply bool, str string) (string, error) {
		rPort := -1
		defer delete(replies, rPort)
		if needReply {
			lastReply++
			rPort := lastReply
			replies[rPort] = make(chan goReturn)
		}

		// Send the message and return immediately
		C.invokeSendFunc(toNode, C.int(port), C.int(rPort), C.CString(str))
		if !needReply {
			return "<no-reply-requested>", nil
		}

		// Block the sending goroutine while we wait for the reply
		ret := <-replies[rPort]
		return ret.str, ret.err
	}

	args := make([]string, len(cosmosArgs))
	for i, s := range cosmosArgs {
		args[i] = C.GoString(s)
	}
	fmt.Fprintln(os.Stderr, "Starting Cosmos", args)
	os.Args = args
	go func() {
		// We run in the background, but exit when the job is over.
		nameservice.SendToNode("hello from Initial Go!")
		nsd.Run()
		fmt.Fprintln(os.Stderr, "Shutting down Cosmos")
		os.Exit(0)
	}()
	fmt.Fprintln(os.Stderr, "Done starting Cosmos")
	return CosmosPort
}

//export ReplyToGo
func ReplyToGo(replyPort C.int, isError C.int, str C.Body) C.int {
	goStr := C.GoString(str)
	fmt.Fprintln(os.Stderr, "Reply to Go", goStr)
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
	fmt.Fprintln(os.Stderr, "Send to Go", goStr)
	switch port {
	case CosmosPort:
		return C.CString("Would dispatch Cosmos")
	}
	return C.CString("FIXME: implement port " + string(port))
}

// Do nothing in main.
func main() {}
