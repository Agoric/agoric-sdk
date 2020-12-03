package main

// #cgo CPPFLAGS: -I/usr/local/include/node
// #cgo LDFLAGS: -L/usr/local/lib
import "C"

import (
	"os"
	"path/filepath"

	"github.com/Agoric/cosmic-swingset/app"
	"github.com/Agoric/cosmic-swingset/lib/daemon"
)

func main() {
	userHomeDir, err := os.UserHomeDir()
	if err != nil {
		panic(err)
	}

	app.DefaultNodeHome = filepath.Join(userHomeDir, ".ag-cosmos-helper")
	daemon.Run()
}
