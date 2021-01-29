package main

// #cgo CPPFLAGS: -I/usr/local/include/node
// #cgo LDFLAGS: -L/usr/local/lib
import "C"

import (
	"os"
	"path/filepath"

	gaia "github.com/Agoric/agoric-sdk/golang/cosmos/app"
	"github.com/Agoric/agoric-sdk/golang/cosmos/daemon"
)

func main() {
	userHomeDir, err := os.UserHomeDir()
	if err != nil {
		panic(err)
	}

	gaia.DefaultNodeHome = filepath.Join(userHomeDir, ".ag-cosmos-helper")
	daemon.Run()
}
