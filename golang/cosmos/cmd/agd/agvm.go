package main

import (
	"fmt"
	"os"
	osexec "os/exec"

	"github.com/tendermint/tendermint/libs/log"
)

func NewVMCommand(logger log.Logger, binary string, args []string, vmFromAgd, vmToAgd *os.File) *osexec.Cmd {
	// We start our file descriptor allocations after the standard ones, including
	// Node.js IPC (fd=3).
	fdStart := 4
	agvmSpec := fmt.Sprintf(`{"agd":{"fd":[%d,%d]}}`, fdStart, fdStart+1)
	args = append(args[1:], "--vm-spec", agvmSpec)

	logger.Info("Start chain connecting to VM", "binary", binary, "args", args)
	cmd := osexec.Command(binary, args...)

	// Manage the file descriptors.
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin
	numStdFiles := 3

	cmd.ExtraFiles = make([]*os.File, fdStart - numStdFiles + 2)
	cmd.ExtraFiles[fdStart - numStdFiles] = vmFromAgd
	cmd.ExtraFiles[fdStart+1 - numStdFiles] = vmToAgd
	
	return cmd
}
