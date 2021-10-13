package main

import (
	"os"
	"path/filepath"

	gaia "github.com/Agoric/agoric-sdk/golang/cosmos/app"
	"github.com/Agoric/agoric-sdk/golang/cosmos/daemon"
	daemoncmd "github.com/Agoric/agoric-sdk/golang/cosmos/daemon/cmd"
)

func main() {
	userHomeDir, err := os.UserHomeDir()
	if err != nil {
		panic(err)
	}

	gaia.DefaultNodeHome = filepath.Join(userHomeDir, ".ag-cosmos-helper")
	daemoncmd.AppName = "ag-cosmos-helper"
	daemon.Run()
}
