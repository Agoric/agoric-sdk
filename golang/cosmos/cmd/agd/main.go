package main

import (
	"os"
	"syscall"

	"github.com/tendermint/tendermint/libs/log"

	gaia "github.com/Agoric/agoric-sdk/golang/cosmos/app"
	"github.com/Agoric/agoric-sdk/golang/cosmos/daemon"
	daemoncmd "github.com/Agoric/agoric-sdk/golang/cosmos/daemon/cmd"
	servertypes "github.com/cosmos/cosmos-sdk/server/types"
)

func main() {
	// We need to delegate to our default app for running the actual chain.
	launchVM := func(logger log.Logger, appOpts servertypes.AppOptions) error {
		args := []string{"ag-chain-cosmos", "--home", gaia.DefaultNodeHome}
		args = append(args, os.Args[1:]...)

		binary, lookErr := FindCosmicSwingsetBinary()
		if lookErr != nil {
			return lookErr
		}

		logger.Info("agd delegating to JS executable", "binary", binary, "args", args)
		execErr := syscall.Exec(binary, args, os.Environ())
		if execErr != nil {
			return execErr
		}
		return nil
	}

	daemoncmd.OnStartHook = launchVM
	daemoncmd.OnExportHook = launchVM

	daemon.RunWithController(nil)
}
