package main

import (
	"os"
	"os/exec"
	"path/filepath"
	"syscall"

	"github.com/tendermint/tendermint/libs/log"

	gaia "github.com/Agoric/agoric-sdk/golang/cosmos/app"
	"github.com/Agoric/agoric-sdk/golang/cosmos/daemon"
	daemoncmd "github.com/Agoric/agoric-sdk/golang/cosmos/daemon/cmd"
)

func main() {
	userHomeDir, err := os.UserHomeDir()
	if err != nil {
		panic(err)
	}

	gaia.DefaultNodeHome = filepath.Join(userHomeDir, ".agoricd")

	oldAppName := daemoncmd.AppName
	daemoncmd.AppName = "agoricd"

	if daemoncmd.AppName != oldAppName {
		// We need to delegate to our default app for running the actual chain.
		daemoncmd.OnStartHook = func(logger log.Logger) {
			logger.Info("Start chain delegating to another executable",
				"startApp", oldAppName,
			)

			binary, lookErr := exec.LookPath(oldAppName)
			if lookErr != nil {
				panic(lookErr)
			}

			args := append([]string{oldAppName}, "--home", gaia.DefaultNodeHome)
			args = append(args, os.Args[1:]...)

			execErr := syscall.Exec(binary, args, os.Environ())
			if execErr != nil {
				panic(execErr)
			}
		}
	}

	daemon.RunWithController(nil)
}
