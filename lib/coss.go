package main

import (
	"C"
	"fmt"
	"os"

	"github.com/Agoric/cosmic-swingset/lib/nsd"
)

//export StartCOSS
func StartCOSS(skipArgv int) {
	fmt.Fprintln(os.Stderr, "Starting Cosmos")
	os.Args = os.Args[skipArgv:]
	go func() {
		// We run in the background, but exit when the job is over.
		nsd.Run()
		fmt.Fprintln(os.Stderr, "Shutting down Cosmos")
		os.Exit(0)
	}()
	fmt.Fprintln(os.Stderr, "Done starting Cosmos")
}

// Do nothing in main.
func main() {}