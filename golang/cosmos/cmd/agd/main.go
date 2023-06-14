package main

import (
	"os"
	"syscall"

	servertypes "github.com/cosmos/cosmos-sdk/server/types"
	"github.com/tendermint/tendermint/libs/log"

	gaia "github.com/Agoric/agoric-sdk/golang/cosmos/app"
	"github.com/Agoric/agoric-sdk/golang/cosmos/daemon"
	daemoncmd "github.com/Agoric/agoric-sdk/golang/cosmos/daemon/cmd"
)

func main() {
	// We need to delegate to our default app for running the actual chain.
	exitCode := 0
	daemoncmd.OnStartHook = func(logger log.Logger, appOpts servertypes.AppOptions) error {
		// We tried running start, which should never exit, so exit with non-zero
		// code if we ever stop.
		exitCode = 99

		args := []string{"ag-chain-cosmos", "--home", gaia.DefaultNodeHome}
		binary, lookErr := FindCosmicSwingsetBinary()
		if lookErr != nil {
			return lookErr
		}

		args = append(args, os.Args[1:]...)

		logger.Info("Start chain delegating to JS executable", "binary", binary, "args", args)
		return syscall.Exec(binary, args, os.Environ())
	}

	daemon.Run()
	os.Exit(exitCode)
}
