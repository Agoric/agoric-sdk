package main

// #cgo CPPFLAGS: -I/usr/local/include/node
// #cgo LDFLAGS: -L/usr/local/lib
import "C"

import (
	"os"

	"github.com/Agoric/cosmic-swingset/app"
	"github.com/Agoric/cosmic-swingset/lib/daemon"
)

func main() {
	app.DefaultNodeHome = os.ExpandEnv("$HOME/.ag-cosmos-helper")
	daemon.Run()
}
