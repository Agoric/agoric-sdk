package main

import (
	"C"
	"fmt"
	"os"

	"github.com/Agoric/cosmic-swingset/lib/nsd"
)

//export StartCOSS
func StartCOSS(instance int, dispatch func(int, string) string, cosmosArgs []string) {
	fmt.Fprintln(os.Stderr, "Starting Cosmos", cosmosArgs)
	os.Args = cosmosArgs
	go func() {
		// We run in the background, but exit when the job is over.
		nsd.Run()
		fmt.Fprintln(os.Stderr, "Shutting down Cosmos")
		os.Exit(0)
	}()
	fmt.Fprintln(os.Stderr, "Done starting Cosmos")
}

//export DispatchToCosmos
func DispatchToCosmos(instance int, in string) string {
	return "hello, from Go!"
}

// Do nothing in main.
func main() {}
