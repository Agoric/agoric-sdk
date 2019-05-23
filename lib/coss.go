package main

// /* These comments before the import "C" are included in the C output. */
// #include <stdlib.h>
// typedef void (*dispatchFunc)(int, char*);
// inline void invokeDispatchFunc(dispatchFunc df, int instance, char *str) {
//    df(instance, str);
// }
import "C"

import (
	"fmt"
	"os"

	"github.com/Agoric/cosmic-swingset/lib/nsd"
)

//export StartCOSS
func StartCOSS(instance int, toNode C.dispatchFunc, cosmosArgs []*C.char) {
	args := make([]string, len(cosmosArgs))
	for i, s := range cosmosArgs {
		args[i] = C.GoString(s)
	}
	fmt.Fprintln(os.Stderr, "Starting Cosmos", args)
	os.Args = args
	go func() {
		// We run in the background, but exit when the job is over.
		cInStr := C.CString("hello from Initial Go!")
		C.invokeDispatchFunc(toNode, C.int(instance), cInStr)
		nsd.Run()
		fmt.Fprintln(os.Stderr, "Shutting down Cosmos")
		os.Exit(0)
	}()
	fmt.Fprintln(os.Stderr, "Done starting Cosmos")
}

//export DispatchToCosmos
func DispatchToCosmos(instance int, in *C.char) *C.char {
	return C.CString("hello, from Go!")
}

// Do nothing in main.
func main() {}
